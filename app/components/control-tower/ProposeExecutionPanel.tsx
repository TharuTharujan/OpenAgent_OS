"use client";

import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ActionManifest } from "../../../shared/contracts";

const DEFAULT_INPUT_BY_ACTION: Record<string, string> = {
  publish_readiness_packet: JSON.stringify(
    {
      observation: "Payment API is degraded; planning rollback after operator review.",
      selectedNextAction: "rollback_deployment",
      rationaleForHuman: "Structured world state shows high error rate; rolling back to last known good reduces blast radius.",
      confidence: 0.82,
    },
    null,
    2,
  ),
  observe_world: JSON.stringify({ note: "operator smoke test" }, null, 2),
  increment_counter: JSON.stringify({ resourceKey: "demo:counter", delta: 1 }, null, 2),
  bump_counter_batch: JSON.stringify({ resourceKey: "demo:counter", amount: 10 }, null, 2),
  rollback_deployment: JSON.stringify(
    {
      resourceKey: "service:payment-api",
      targetVersion: "v41",
      reason: "operator demo rollback",
    },
    null,
    2,
  ),
};

const ACTION_LABELS: Record<string, string> = {
  publish_readiness_packet: "Share a readiness note (safe, trace only)",
  observe_world: "Leave an audit note",
  increment_counter: "Increase counter by a small step",
  bump_counter_batch: "Increase counter by a larger batch",
  rollback_deployment: "Simulate rolling back a service",
};

const READINESS_NEXT_ACTIONS = [
  { value: "rollback_deployment", label: "Plan a rollback next" },
  { value: "observe_world", label: "Gather more observations next" },
  { value: "increment_counter", label: "Adjust a counter next" },
] as const;

const SIMPLE_FORM_ACTIONS = new Set([
  "publish_readiness_packet",
  "observe_world",
  "increment_counter",
  "bump_counter_batch",
  "rollback_deployment",
]);

type Props = {
  disabled: boolean;
  agentId: Id<"agents"> | null;
  manifests: ActionManifest[] | undefined;
  onProposed?: (executionId: string) => void;
};

function parseObject(json: string): Record<string, unknown> | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as Record<string, unknown>;
  } catch {
    return null;
  }
}

function defaultObjectForAction(actionName: string): Record<string, unknown> {
  const raw = DEFAULT_INPUT_BY_ACTION[actionName];
  if (!raw) return {};
  return parseObject(raw) ?? {};
}

function payloadMatchesDefault(actionName: string, inputJson: string): boolean {
  const def = DEFAULT_INPUT_BY_ACTION[actionName];
  if (!def) return false;
  const a = parseObject(inputJson);
  const b = parseObject(def);
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatInputSummary(actionName: string, inputJson: string): string {
  const parsed = parseObject(inputJson);
  const d = parsed ?? defaultObjectForAction(actionName);

  if (parsed === null && inputJson.trim().length > 0) {
    return "The raw request has a formatting problem — open Advanced to fix it.";
  }

  switch (actionName) {
    case "publish_readiness_packet": {
      const obs = typeof d.observation === "string" ? d.observation : "";
      const short = obs.length > 80 ? `${obs.slice(0, 80)}…` : obs;
      const next = typeof d.selectedNextAction === "string" ? d.selectedNextAction : "next step";
      return short
        ? `Shares a readiness note (“${short}”) and points to “${next}” as the likely follow-up.`
        : `Points to “${next}” as the likely follow-up (observation left blank).`;
    }
    case "observe_world": {
      const note = typeof d.note === "string" ? d.note : "";
      const short = note.length > 72 ? `${note.slice(0, 72)}…` : note;
      return short ? `Leaves an audit note: “${short}”` : "Leaves an empty audit note.";
    }
    case "increment_counter": {
      const key = typeof d.resourceKey === "string" ? d.resourceKey : "demo:counter";
      const delta = typeof d.delta === "number" && Number.isFinite(d.delta) ? d.delta : 1;
      return `Adds ${delta} to counter “${key}”.`;
    }
    case "bump_counter_batch": {
      const key = typeof d.resourceKey === "string" ? d.resourceKey : "demo:counter";
      const amount = typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : 10;
      return `Adds ${amount} to counter “${key}” in one go.`;
    }
    case "rollback_deployment": {
      const key = typeof d.resourceKey === "string" ? d.resourceKey : "service";
      const ver = typeof d.targetVersion === "string" ? d.targetVersion : "target";
      return `Requests rolling “${key}” back toward ${ver}.`;
    }
    default:
      return "Open Advanced to edit the raw request for this action.";
  }
}

export function ProposeExecutionPanel({ disabled, agentId, manifests, onProposed }: Props) {
  const proposeExecution = useMutation(api.kernel.proposeExecution);

  const names = useMemo(() => {
    if (!manifests?.length) return [];
    return [...new Set(manifests.map((m) => m.name))].sort((a, b) => a.localeCompare(b));
  }, [manifests]);

  const [actionName, setActionName] = useState("bump_counter_batch");
  const [inputJson, setInputJson] = useState(DEFAULT_INPUT_BY_ACTION.bump_counter_batch ?? "{}");
  /** Keeps simple fields stable while Advanced JSON is temporarily invalid. */
  const [fieldMirror, setFieldMirror] = useState<Record<string, unknown>>(() =>
    defaultObjectForAction("bump_counter_batch"),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasSimpleForm = SIMPLE_FORM_ACTIONS.has(actionName);

  useEffect(() => {
    if (names.length === 0) return;
    if (!names.includes(actionName)) {
      const next = names.includes("bump_counter_batch") ? "bump_counter_batch" : names[0];
      setActionName(next);
    }
  }, [names, actionName]);

  useEffect(() => {
    setInputJson(DEFAULT_INPUT_BY_ACTION[actionName] ?? JSON.stringify({}, null, 2));
    setFieldMirror(defaultObjectForAction(actionName));
    setJsonError(null);
    setSubmitError(null);
  }, [actionName]);

  const canSubmit = !disabled && Boolean(agentId) && names.length > 0 && !busy;

  function mergeAndSetInput(patch: Record<string, unknown>) {
    const parsed = parseObject(inputJson);
    const base = parsed ?? fieldMirror;
    const next = { ...base, ...patch };
    setFieldMirror(next);
    setInputJson(JSON.stringify(next, null, 2));
    setJsonError(null);
    setSubmitError(null);
  }

  const formBase = fieldMirror;

  async function handlePropose() {
    setJsonError(null);
    setSubmitError(null);
    if (!agentId) {
      setSubmitError("Start the demo first so this page has a session to attach this request to.");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      const raw: unknown = JSON.parse(inputJson);
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        setJsonError("Advanced area must contain a single {...} object, not a list or plain text.");
        return;
      }
      parsed = raw as Record<string, unknown>;
    } catch {
      setJsonError("That does not look like valid JSON — fix the Advanced editor or use the simple fields above.");
      return;
    }

    setBusy(true);
    try {
      const result = await proposeExecution({
        agentId,
        actionName,
        input: parsed,
      });
      onProposed?.(result.executionId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const inputSummary = formatInputSummary(actionName, inputJson);
  const usingSuggestedDefaults = payloadMatchesDefault(actionName, inputJson);

  return (
    <section className="panel">
      <h2>Send a sample request</h2>
      <p className="panel-subtitle--plain">
        Pick what should happen, adjust the plain-English fields if you like, then send — it appears in runs and
        approvals just like a real agent request. You almost never need the Advanced section.
      </p>
      {!agentId && !disabled ? (
        <p className="panel-hint">
          Use <strong>Start demo</strong> in Get started first; then each try-out attaches to that pretend agent.
        </p>
      ) : null}
      {names.length === 0 ? (
        <p className="panel-placeholder" role="status">
          {manifests === undefined ? "Loading manifests…" : "No actions loaded yet. Start the demo."}
        </p>
      ) : (
        <>
          <div className="form-row">
            <label className="form-label" htmlFor="propose-action">
              What should happen?
            </label>
            <select
              id="propose-action"
              className="form-select"
              value={actionName}
              disabled={disabled || names.length === 0}
              onChange={(e) => setActionName(e.target.value)}
            >
              {names.map((n) => (
                <option key={n} value={n}>
                  {ACTION_LABELS[n] ?? n}
                </option>
              ))}
            </select>
          </div>

          {hasSimpleForm ? (
            <div className="form-row form-row--simple-fields">
              <span className="form-row__section-label">Simple fields</span>
              <p className="form-stack-intro">Defaults are safe for demos. Change them only if you are exploring edge cases.</p>
              {actionName === "publish_readiness_packet" ? (
                <>
                  <label className="form-field">
                    <span className="form-field__label">What the agent noticed</span>
                    <textarea
                      className="form-textarea form-textarea--compact"
                      rows={3}
                      disabled={disabled}
                      value={typeof formBase.observation === "string" ? formBase.observation : ""}
                      onChange={(e) => mergeAndSetInput({ observation: e.target.value })}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Suggested next step</span>
                    <select
                      className="form-select"
                      disabled={disabled}
                      value={(() => {
                        const v =
                          typeof formBase.selectedNextAction === "string"
                            ? formBase.selectedNextAction
                            : READINESS_NEXT_ACTIONS[0].value;
                        return READINESS_NEXT_ACTIONS.some((o) => o.value === v)
                          ? v
                          : v || READINESS_NEXT_ACTIONS[0].value;
                      })()}
                      onChange={(e) => mergeAndSetInput({ selectedNextAction: e.target.value })}
                    >
                      {(() => {
                        const v =
                          typeof formBase.selectedNextAction === "string"
                            ? formBase.selectedNextAction
                            : READINESS_NEXT_ACTIONS[0].value;
                        const known = READINESS_NEXT_ACTIONS.some((o) => o.value === v);
                        return (
                          <>
                            {!known && v ? (
                              <option value={v}>
                                {v} (from advanced JSON)
                              </option>
                            ) : null}
                            {READINESS_NEXT_ACTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </>
                        );
                      })()}
                    </select>
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Why a human should care</span>
                    <textarea
                      className="form-textarea form-textarea--compact"
                      rows={3}
                      disabled={disabled}
                      value={typeof formBase.rationaleForHuman === "string" ? formBase.rationaleForHuman : ""}
                      onChange={(e) => mergeAndSetInput({ rationaleForHuman: e.target.value })}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">How sure is the agent? (0–1)</span>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      disabled={disabled}
                      value={
                        typeof formBase.confidence === "number" && Number.isFinite(formBase.confidence)
                          ? formBase.confidence
                          : 0.82
                      }
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        mergeAndSetInput({ confidence: Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0 });
                      }}
                    />
                    <span className="form-field__hint">1 means very confident; 0 means uncertain.</span>
                  </label>
                </>
              ) : null}
              {actionName === "observe_world" ? (
                <label className="form-field">
                  <span className="form-field__label">Short note for the audit log</span>
                  <input
                    className="form-input"
                    type="text"
                    disabled={disabled}
                    value={typeof formBase.note === "string" ? formBase.note : ""}
                    onChange={(e) => mergeAndSetInput({ note: e.target.value })}
                  />
                </label>
              ) : null}
              {actionName === "increment_counter" ? (
                <>
                  <label className="form-field">
                    <span className="form-field__label">How much to add</span>
                    <input
                      className="form-input"
                      type="number"
                      disabled={disabled}
                      value={
                        typeof formBase.delta === "number" && Number.isFinite(formBase.delta)
                          ? formBase.delta
                          : 1
                      }
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        mergeAndSetInput({ delta: Number.isFinite(n) ? n : 0 });
                      }}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Which counter</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.resourceKey === "string" ? formBase.resourceKey : ""}
                      onChange={(e) => mergeAndSetInput({ resourceKey: e.target.value })}
                    />
                    <span className="form-field__hint">Demo default is demo:counter — change only if you know the id.</span>
                  </label>
                </>
              ) : null}
              {actionName === "bump_counter_batch" ? (
                <>
                  <label className="form-field">
                    <span className="form-field__label">How many to add at once</span>
                    <input
                      className="form-input"
                      type="number"
                      disabled={disabled}
                      value={
                        typeof formBase.amount === "number" && Number.isFinite(formBase.amount)
                          ? formBase.amount
                          : 10
                      }
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        mergeAndSetInput({ amount: Number.isFinite(n) ? n : 0 });
                      }}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Which counter</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.resourceKey === "string" ? formBase.resourceKey : ""}
                      onChange={(e) => mergeAndSetInput({ resourceKey: e.target.value })}
                    />
                    <span className="form-field__hint">Demo default is demo:counter.</span>
                  </label>
                </>
              ) : null}
              {actionName === "rollback_deployment" ? (
                <>
                  <label className="form-field">
                    <span className="form-field__label">Service or resource name</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.resourceKey === "string" ? formBase.resourceKey : ""}
                      onChange={(e) => mergeAndSetInput({ resourceKey: e.target.value })}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Version to roll back toward</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.targetVersion === "string" ? formBase.targetVersion : ""}
                      onChange={(e) => mergeAndSetInput({ targetVersion: e.target.value })}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Reason (shown in the trace)</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.reason === "string" ? formBase.reason : ""}
                      onChange={(e) => mergeAndSetInput({ reason: e.target.value })}
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}

          <p className="form-input-summary" aria-live="polite">
            {hasSimpleForm ? (
              <>
                <span className="form-input-summary__label">In plain language:</span> {inputSummary}
              </>
            ) : (
              inputSummary
            )}
          </p>

          {usingSuggestedDefaults ? (
            <p className="form-defaults-note" role="status">
              Using the suggested values for this action — open Advanced only if you need to see or edit the raw
              request.
            </p>
          ) : null}

          <details className="details-advanced" key={actionName}>
            <summary className="details-advanced__summary">Advanced: raw request (JSON)</summary>
            <div className="details-advanced__body">
              <label className="form-label" htmlFor="propose-input">
                Raw request body
              </label>
              <textarea
                id="propose-input"
                className="form-textarea mono"
                rows={8}
                spellCheck={false}
                disabled={disabled}
                value={inputJson}
                onChange={(e) => {
                  const v = e.target.value;
                  setInputJson(v);
                  setJsonError(null);
                  setSubmitError(null);
                  const parsed = parseObject(v);
                  if (parsed) {
                    setFieldMirror({ ...defaultObjectForAction(actionName), ...parsed });
                  }
                }}
              />
              <p className="panel-hint details-advanced__hint">
                {hasSimpleForm
                  ? "Most walkthroughs never open this — the fields above already match what the system expects."
                  : "Edit the JSON object sent with this action name."}
              </p>
            </div>
          </details>

          {jsonError ? (
            <p className="form-error" role="alert">
              {jsonError}
            </p>
          ) : null}
          {submitError ? (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          ) : null}
          <div className="panel-actions panel-actions--stack">
            <button type="button" className="btn-primary" disabled={!canSubmit} onClick={() => void handlePropose()}>
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
          <details className="developer-details">
            <summary>Developer reference</summary>
            <div className="developer-details__body">
              <p>
                Convex mutation <code className="mono">kernel.proposeExecution</code> with <code className="mono">actionName</code> and{" "}
                <code className="mono">input</code>.
              </p>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

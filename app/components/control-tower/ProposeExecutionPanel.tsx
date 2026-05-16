"use client";

import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ActionManifest } from "../../../shared/contracts";

const DEFAULT_INPUT_BY_ACTION: Record<string, string> = {
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
  observe_world: "Observe world (audit note)",
  increment_counter: "Increment counter",
  bump_counter_batch: "Bump counter (batch)",
  rollback_deployment: "Rollback deployment (simulated)",
};

const SIMPLE_FORM_ACTIONS = new Set([
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
    return "JSON has errors — expand Advanced to fix the payload.";
  }

  switch (actionName) {
    case "observe_world": {
      const note = typeof d.note === "string" ? d.note : "";
      const short = note.length > 72 ? `${note.slice(0, 72)}…` : note;
      return short ? `Leaves an audit note: “${short}”` : "Leaves an empty audit note.";
    }
    case "increment_counter": {
      const key = typeof d.resourceKey === "string" ? d.resourceKey : "demo:counter";
      const delta = typeof d.delta === "number" && Number.isFinite(d.delta) ? d.delta : 1;
      return `Adds ${delta} to “${key}”.`;
    }
    case "bump_counter_batch": {
      const key = typeof d.resourceKey === "string" ? d.resourceKey : "demo:counter";
      const amount = typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : 10;
      return `Increases “${key}” by ${amount} in one batch.`;
    }
    case "rollback_deployment": {
      const key = typeof d.resourceKey === "string" ? d.resourceKey : "service";
      const ver = typeof d.targetVersion === "string" ? d.targetVersion : "target";
      return `Requests rolling “${key}” back toward ${ver}.`;
    }
    default:
      return "Open Advanced to edit JSON parameters for this action.";
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
      setSubmitError("Start the demo first so this page has a demo agent id to attach.");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      const raw: unknown = JSON.parse(inputJson);
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        setJsonError("Input must be a JSON object (not an array or primitive).");
        return;
      }
      parsed = raw as Record<string, unknown>;
    } catch {
      setJsonError("Invalid JSON — fix the Advanced editor and try again.");
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
    <section className="panel panel--span">
      <h2>Try an agent action</h2>
      <p className="panel-subtitle">
        Start the demo above first, pick what should happen, then send a proposal — it shows up in runs and approvals
        the same way a real agent request would.
      </p>
      {!agentId && !disabled ? (
        <p className="panel-hint">
          Use <strong>Start demo</strong> in Demo setup first; then this form can attach each try-out to that demo
          agent.
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
              <span className="form-label">Parameters</span>
              {actionName === "observe_world" ? (
                <label className="form-field">
                  <span className="form-field__label">Note</span>
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
                    <span className="form-field__label">Delta</span>
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
                    <span className="form-field__label">Resource key</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.resourceKey === "string" ? formBase.resourceKey : ""}
                      onChange={(e) => mergeAndSetInput({ resourceKey: e.target.value })}
                    />
                  </label>
                </>
              ) : null}
              {actionName === "bump_counter_batch" ? (
                <>
                  <label className="form-field">
                    <span className="form-field__label">Amount</span>
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
                    <span className="form-field__label">Resource key</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.resourceKey === "string" ? formBase.resourceKey : ""}
                      onChange={(e) => mergeAndSetInput({ resourceKey: e.target.value })}
                    />
                  </label>
                </>
              ) : null}
              {actionName === "rollback_deployment" ? (
                <>
                  <label className="form-field">
                    <span className="form-field__label">Resource key</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.resourceKey === "string" ? formBase.resourceKey : ""}
                      onChange={(e) => mergeAndSetInput({ resourceKey: e.target.value })}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Target version</span>
                    <input
                      className="form-input"
                      type="text"
                      disabled={disabled}
                      value={typeof formBase.targetVersion === "string" ? formBase.targetVersion : ""}
                      onChange={(e) => mergeAndSetInput({ targetVersion: e.target.value })}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-field__label">Reason</span>
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
                <span className="form-input-summary__label">Current payload:</span> {inputSummary}
              </>
            ) : (
              inputSummary
            )}
          </p>

          {usingSuggestedDefaults ? (
            <p className="form-defaults-note" role="status">
              Using suggested parameters for this action — expand Advanced only if you need custom JSON.
            </p>
          ) : null}

          <details className="details-advanced" key={actionName}>
            <summary className="details-advanced__summary">Advanced: edit raw JSON</summary>
            <div className="details-advanced__body">
              <label className="form-label" htmlFor="propose-input">
                Kernel input object
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
                  ? "Most demos never need this — the quick fields (or their defaults) already match what the kernel expects."
                  : "Edit the JSON object passed to the kernel for this action name."}
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
            <button type="button" disabled={!canSubmit} onClick={() => void handlePropose()}>
              {busy ? "Sending…" : "Send proposal"}
            </button>
            <span className="text-muted text-muted--mono">kernel:proposeExecution</span>
          </div>
        </>
      )}
    </section>
  );
}

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { ActionManifest, Execution, WorldObject } from "../shared/contracts";

/**
 * OpenAgentOS agent runner.
 *
 * Smoke mode (no `OPENAI_API_KEY`):
 *   Seeds demo, proposes observe/increment/bump, auto-approves pending risky execution, prints traces.
 *
 * Live LLM mode (`OPENAI_API_KEY` in environment or `.env.local`):
 *   Seeds demo, reads world + manifests, calls OpenAI for a strict JSON plan, publishes readiness packet,
 *   proposes the selected action. High-risk executions stay `pending_approval` unless `AGENT_RUNNER_AUTO_APPROVE=1`.
 *
 * Usage:
 *   npm install
 *   npx convex dev
 *   set CONVEX_URL / export CONVEX_URL=...
 *   npm run agent:run
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Load `.env.local` into `process.env` when keys are not already set (tsx does not load Next env files). */
function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  let text: string;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/** Kernel execution statuses that are safe to treat as "finished" for CLI polling. */
const TERMINAL_EXECUTION_STATUSES = new Set<Execution["status"]>([
  "succeeded",
  "failed",
  "denied",
  "rejected",
]);

function formatPollingTimeoutMessage(
  executionId: Id<"executions">,
  status: Execution["status"],
  waitedMs: number,
): string {
  const base = `Execution ${executionId} did not reach a terminal status within ${waitedMs}ms (last status: ${status}).`;
  if (status === "awaiting_host") {
    return `${base} Start the host executor in another terminal: \`npm run executor:run\` (needs OPENAGENTOS_EXECUTOR_ROOT and HOST_EXECUTOR_SECRET matching Convex).`;
  }
  if (status === "pending_approval") {
    return `${base} Approve or reject in the Control Tower, or set AGENT_RUNNER_AUTO_APPROVE=1 for scripted approval.`;
  }
  return `${base} Check Convex for stuck states (running / approved / proposed).`;
}

async function waitForTerminalExecution(
  client: ConvexHttpClient,
  executionId: Id<"executions">,
  opts: { maxAttempts?: number; delayMs?: number } = {},
): Promise<Execution> {
  const maxAttempts = opts.maxAttempts ?? 240;
  const delayMs = opts.delayMs ?? 500;
  const terminal = TERMINAL_EXECUTION_STATUSES;

  for (let i = 0; i < maxAttempts; i++) {
    const ex = await client.query(api.executions.get, { id: executionId });
    if (ex && terminal.has(ex.status)) return ex;
    await sleep(delayMs);
  }

  const last = await client.query(api.executions.get, { id: executionId });
  if (!last) throw new Error("Execution disappeared while polling");
  if (!terminal.has(last.status)) {
    throw new Error(formatPollingTimeoutMessage(executionId, last.status, maxAttempts * delayMs));
  }
  return last;
}

async function printTrace(client: ConvexHttpClient, executionId: Id<"executions">): Promise<void> {
  const events = await client.query(api.events.listByExecution, { executionId });
  console.log("\n--- Trace (events:listByExecution) ---");
  for (const ev of events) {
    console.log(`${new Date(ev.ts).toISOString()}  ${ev.type}`);
    console.dir(ev.payload, { depth: 6 });
  }
  console.log("--- End trace ---\n");
}

type LlmPlan = {
  observation: string;
  selectedActionName: string;
  input: Record<string, unknown>;
  confidence: number | undefined;
  rationaleForHuman: string;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseLlmPlanJson(text: string): LlmPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }
  if (!isPlainObject(parsed)) {
    throw new Error("LLM JSON must be an object.");
  }
  const observation = parsed.observation;
  const selectedActionName = parsed.selectedActionName;
  const input = parsed.input;
  const rationaleForHuman = parsed.rationaleForHuman;
  const confidence = parsed.confidence;

  if (typeof observation !== "string" || !observation.trim()) {
    throw new Error('LLM JSON missing non-empty string "observation".');
  }
  if (typeof selectedActionName !== "string" || !selectedActionName.trim()) {
    throw new Error('LLM JSON missing non-empty string "selectedActionName".');
  }
  if (typeof rationaleForHuman !== "string" || !rationaleForHuman.trim()) {
    throw new Error('LLM JSON missing non-empty string "rationaleForHuman".');
  }
  if (input !== undefined && !isPlainObject(input)) {
    throw new Error('LLM JSON "input" must be an object when present.');
  }
  if (
    confidence !== undefined &&
    (typeof confidence !== "number" || !Number.isFinite(confidence))
  ) {
    throw new Error('LLM JSON "confidence" must be a finite number when present.');
  }

  return {
    observation: observation.trim(),
    selectedActionName: selectedActionName.trim(),
    input: isPlainObject(input) ? input : {},
    confidence: confidence === undefined ? undefined : confidence,
    rationaleForHuman: rationaleForHuman.trim(),
  };
}

async function callOpenAiJson(args: {
  system: string;
  user: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content.");
  }
  return content.trim();
}

function manifestNames(manifests: ActionManifest[]): Set<string> {
  return new Set(manifests.map((m) => m.name));
}

function autoApproveFromCli(): boolean {
  const v = process.env.AGENT_RUNNER_AUTO_APPROVE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function runSmokePath(client: ConvexHttpClient, agentId: Id<"agents">): Promise<void> {
  const observe = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "observe_world",
    input: { note: "agent-runner smoke" },
  });
  console.log("observe_world propose:", observe);
  if ("executionId" in observe) {
    const fin = await waitForTerminalExecution(client, observe.executionId);
    console.log("observe_world final:", fin.status);
    await printTrace(client, observe.executionId);
  }

  const tick = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "increment_counter",
    input: { resourceKey: "demo:counter", delta: 1 },
  });
  console.log("increment_counter propose:", tick);
  if ("executionId" in tick) {
    const fin = await waitForTerminalExecution(client, tick.executionId);
    console.log("increment_counter final:", fin.status);
    await printTrace(client, tick.executionId);
  }

  const risky = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "bump_counter_batch",
    input: { resourceKey: "demo:counter", amount: 10 },
  });
  console.log("bump_counter_batch propose:", risky);

  if (risky.status === "pending_approval" && "executionId" in risky) {
    const approved = await client.mutation(api.kernel.approveExecution, {
      executionId: risky.executionId,
      operatorHint: "agent-runner-cli",
    });
    console.log("approveExecution:", approved);
    const fin = await waitForTerminalExecution(client, risky.executionId);
    console.log("bump_counter_batch final:", fin.status);
    await printTrace(client, risky.executionId);
  } else if ("executionId" in risky) {
    const fin = await waitForTerminalExecution(client, risky.executionId);
    console.log("bump_counter_batch final:", fin.status);
    await printTrace(client, risky.executionId);
  }

  const world = await client.query(api.world.list, {});
  console.log("world:list count:", world.length);
}

async function runLiveLlmPath(
  client: ConvexHttpClient,
  agentId: Id<"agents">,
  world: WorldObject[],
  manifests: ActionManifest[],
): Promise<void> {
  const names = manifestNames(manifests);
  const manifestSummary = manifests.map((m) => ({
    name: m.name,
    description: m.description,
    risk: m.risk,
    requiresApproval: m.requiresApproval,
    resourceType: m.resourceType,
  }));

  const system = [
    "You are an autonomous agent operating through OpenAgentOS.",
    "You must choose exactly ONE next action from the allowed action names provided by the user.",
    "Prefer rollback_deployment when world shows service:payment-api is degraded and a safer previous version exists (e.g. v41).",
    "Return ONLY valid JSON with keys: observation, selectedActionName, input, confidence, rationaleForHuman.",
    "input must be a JSON object suitable for kernel:proposeExecution (no secrets, no API keys).",
    "Do not include markdown fences or prose outside JSON.",
  ].join(" ");

  const user = [
    "Allowed action names (choose selectedActionName from this list only):",
    JSON.stringify([...names].sort()),
    "",
    "Current world objects (structured state; do not invent resourceKeys):",
    JSON.stringify(world, null, 2),
    "",
    "Action manifests (metadata):",
    JSON.stringify(manifestSummary, null, 2),
  ].join("\n");

  const raw = await callOpenAiJson({ system, user });
  const plan = parseLlmPlanJson(raw);

  if (!names.has(plan.selectedActionName)) {
    throw new Error(
      `LLM selected unknown action "${plan.selectedActionName}". Allowed: ${[...names].sort().join(", ")}`,
    );
  }

  if (plan.selectedActionName === "publish_readiness_packet") {
    throw new Error(
      'LLM must not select "publish_readiness_packet" as the primary action; that step is published separately.',
    );
  }

  console.log("\n=== Live LLM plan (not stored in Convex until proposals) ===");
  console.log(JSON.stringify(plan, null, 2));

  const readiness = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "publish_readiness_packet",
    input: {
      observation: plan.observation,
      selectedNextAction: plan.selectedActionName,
      rationaleForHuman: plan.rationaleForHuman,
      ...(plan.confidence !== undefined ? { confidence: plan.confidence } : {}),
    },
  });
  console.log("\npublish_readiness_packet propose:", readiness);
  if ("executionId" in readiness) {
    const fin = await waitForTerminalExecution(client, readiness.executionId);
    console.log("publish_readiness_packet final:", fin.status);
    await printTrace(client, readiness.executionId);
  }

  const proposed = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: plan.selectedActionName,
    input: plan.input,
  });
  console.log(`\n${plan.selectedActionName} propose:`, proposed);

  if (!("executionId" in proposed)) {
    throw new Error("proposeExecution did not return executionId");
  }

  if (proposed.status === "pending_approval") {
    console.log("\n>>> Judge demo: this execution is pending human approval.");
    console.log(">>> Open the Control Tower, use Approval Inbox, then Approve or Reject.");
    console.log(`>>> executionId: ${proposed.executionId}`);
    if (!autoApproveFromCli()) {
      await printTrace(client, proposed.executionId);
    }

    if (autoApproveFromCli()) {
      const approved = await client.mutation(api.kernel.approveExecution, {
        executionId: proposed.executionId,
        operatorHint: "agent-runner-cli-auto",
      });
      console.log("approveExecution (AGENT_RUNNER_AUTO_APPROVE):", approved);
      const fin = await waitForTerminalExecution(client, proposed.executionId);
      console.log(`${plan.selectedActionName} final:`, fin.status);
      await printTrace(client, proposed.executionId);
    }
  } else {
    const fin = await waitForTerminalExecution(client, proposed.executionId);
    console.log(`${plan.selectedActionName} final:`, fin.status);
    await printTrace(client, proposed.executionId);
  }

  const worldAfter = await client.query(api.world.list, {});
  console.log("world:list count:", worldAfter.length);
}

async function main(): Promise<void> {
  loadEnvLocal();

  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL.");
  }

  const client = new ConvexHttpClient(url);

  const seeded = await client.mutation(api.kernel.seedDemo, {});
  if (!("agentId" in seeded) || !seeded.agentId) {
    throw new Error("seedDemo did not return agentId");
  }

  const agentId = seeded.agentId;
  const useLlm = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (useLlm) {
    console.log("Live LLM mode: OPENAI_API_KEY detected (key value is never printed).");
    const world = await client.query(api.world.list, {});
    const manifests = await client.query(api.manifests.list, {});
    await runLiveLlmPath(client, agentId, world, manifests);
    return;
  }

  console.log("Smoke mode: no OPENAI_API_KEY — running scripted proposals + CLI approval.");
  await runSmokePath(client, agentId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { Execution } from "../shared/contracts";

/**
 * Minimal agent runner for OpenAgentOS.
 *
 * Usage:
 *   npm install
 *   npx convex dev   # in another terminal, note the deployment URL
 *   set CONVEX_URL / export CONVEX_URL=...
 *   npm run agent:run
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTerminalExecution(
  client: ConvexHttpClient,
  executionId: Id<"executions">,
  opts: { maxAttempts?: number; delayMs?: number } = {},
): Promise<Execution> {
  const maxAttempts = opts.maxAttempts ?? 60;
  const delayMs = opts.delayMs ?? 500;
  const terminal = new Set(["succeeded", "failed", "denied", "rejected"]);

  for (let i = 0; i < maxAttempts; i++) {
    const ex = await client.query(api.executions.get, { id: executionId });
    if (ex && terminal.has(ex.status)) return ex;
    await sleep(delayMs);
  }

  const last = await client.query(api.executions.get, { id: executionId });
  if (!last) throw new Error("Execution disappeared while polling");
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

async function main(): Promise<void> {
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

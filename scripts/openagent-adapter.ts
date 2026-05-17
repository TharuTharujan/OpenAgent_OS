import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

/**
 * Framework-agnostic OpenAgentOS adapter (CLI).
 *
 * Any agent that can invoke shell commands can use the same surface:
 * world:list, manifests:list, propose, execution status, traces.
 *
 * Approve/reject are gated behind OPENAGENTOS_ADAPTER_TEST_APPROVE=1 so production demos use the Control Tower.
 *
 * Usage:
 *   set CONVEX_URL=... (or NEXT_PUBLIC_CONVEX_URL)
 *   npx tsx scripts/openagent-adapter.ts <command> [args]
 */

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

function getClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL.");
  }
  return new ConvexHttpClient(url);
}

function assertTestApproveEnabled(): void {
  const v = process.env.OPENAGENTOS_ADAPTER_TEST_APPROVE?.trim();
  if (v !== "1" && v !== "true" && v !== "yes") {
    throw new Error(
      "Approve/reject from the adapter is disabled. Set OPENAGENTOS_ADAPTER_TEST_APPROVE=1 for scripted test mode only.",
    );
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = "true";
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const client = getClient();
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);
  const flags = parseArgs(rest);

  if (!cmd || cmd === "help" || cmd === "-h") {
    console.log(`OpenAgentOS adapter (framework-agnostic CLI)

Commands:
  seed
  world:list
  manifests:list
  executions:list [--limit N]
  execution:get --id <executionId>
  events --executionId <executionId>
  propose --agentId <agentsId> --action <actionName> --input '<json>'
  approve --executionId <id> [--hint "text"]   (requires OPENAGENTOS_ADAPTER_TEST_APPROVE=1)
  reject --executionId <id> [--reason "text"]  (requires OPENAGENTOS_ADAPTER_TEST_APPROVE=1)

Environment:
  CONVEX_URL or NEXT_PUBLIC_CONVEX_URL
`);
    return;
  }

  if (cmd === "seed") {
    const res = await client.mutation(api.kernel.seedDemo, {});
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === "world:list") {
    const rows = await client.query(api.world.list, {});
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (cmd === "manifests:list") {
    const rows = await client.query(api.manifests.list, {});
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (cmd === "executions:list") {
    const limit = flags.limit ? Number(flags.limit) : 30;
    const rows = await client.query(api.executions.list, { limit });
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (cmd === "execution:get") {
    const id = flags.id;
    if (!id) throw new Error("Missing --id");
    const row = await client.query(api.executions.get, { id: id as Id<"executions"> });
    console.log(JSON.stringify(row, null, 2));
    return;
  }

  if (cmd === "events") {
    const executionId = flags.executionId;
    if (!executionId) throw new Error("Missing --executionId");
    const rows = await client.query(api.events.listByExecution, {
      executionId: executionId as Id<"executions">,
    });
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (cmd === "awaiting-host:list") {
    const limit = flags.limit ? Number(flags.limit) : 20;
    const rows = await client.query(api.hostExecutor.listAwaitingHost, { limit });
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  if (cmd === "propose") {
    const agentId = flags.agentId;
    const action = flags.action;
    const inputRaw = flags.input ?? "{}";
    if (!agentId || !action) throw new Error("Missing --agentId or --action");
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(inputRaw) as Record<string, unknown>;
    } catch {
      throw new Error("--input must be valid JSON");
    }
    const res = await client.mutation(api.kernel.proposeExecution, {
      agentId: agentId as Id<"agents">,
      actionName: action,
      input,
    });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === "approve") {
    assertTestApproveEnabled();
    const executionId = flags.executionId;
    if (!executionId) throw new Error("Missing --executionId");
    const res = await client.mutation(api.kernel.approveExecution, {
      executionId: executionId as Id<"executions">,
      operatorHint: flags.hint,
    });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === "reject") {
    assertTestApproveEnabled();
    const executionId = flags.executionId;
    if (!executionId) throw new Error("Missing --executionId");
    const res = await client.mutation(api.kernel.rejectExecution, {
      executionId: executionId as Id<"executions">,
      reason: flags.reason,
    });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}. Try: help`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

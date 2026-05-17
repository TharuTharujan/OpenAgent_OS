import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { Execution } from "../shared/contracts";

/**
 * Judge-oriented host demo: seeds Convex, writes sample clutter into OPENAGENTOS_EXECUTOR_ROOT,
 * proposes scan + plan + apply, then stops at approval unless AUTO_APPROVE_HOST_DEMO=1.
 *
 * Run in parallel terminal: npm run executor:run
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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function autoApprove(): boolean {
  const v = process.env.AUTO_APPROVE_HOST_DEMO?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const TERMINAL_EXECUTION_STATUSES = new Set<Execution["status"]>([
  "succeeded",
  "failed",
  "denied",
  "rejected",
]);

function pollTimeoutMessage(id: Id<"executions">, status: Execution["status"], waitedSec: number): string {
  const base = `Execution ${id} did not reach a terminal status within ${waitedSec}s (last status: ${status}).`;
  if (status === "awaiting_host") {
    return `${base} Run \`npm run executor:run\` in another terminal (OPENAGENTOS_EXECUTOR_ROOT + HOST_EXECUTOR_SECRET).`;
  }
  if (status === "pending_approval") {
    return `${base} Approve in Control Tower or set AUTO_APPROVE_HOST_DEMO=1 for scripted approval.`;
  }
  return base;
}

async function pollExecution(client: ConvexHttpClient, id: Id<"executions">): Promise<Execution> {
  const terminal = TERMINAL_EXECUTION_STATUSES;
  const maxIterations = 180;
  for (let i = 0; i < maxIterations; i++) {
    const ex = await client.query(api.executions.get, { id });
    if (ex && terminal.has(ex.status)) return ex;
    await sleep(1000);
  }
  const last = await client.query(api.executions.get, { id });
  if (!last) throw new Error("Execution disappeared");
  if (!terminal.has(last.status)) {
    throw new Error(pollTimeoutMessage(id, last.status, maxIterations));
  }
  return last;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL.");
  const root = process.env.OPENAGENTOS_EXECUTOR_ROOT?.trim();
  if (!root) {
    throw new Error("Set OPENAGENTOS_EXECUTOR_ROOT to an absolute sandbox path for the host demo.");
  }

  const client = new ConvexHttpClient(url);

  const seeded = await client.mutation(api.kernel.seedDemo, {});
  if (!("agentId" in seeded) || !seeded.agentId) throw new Error("seedDemo missing agentId");
  const agentId = seeded.agentId;
  console.log("Seeded demo. agentId:", agentId);

  await mkdir(root, { recursive: true });
  await writeFile(join(root, "messy_invoice.txt"), "demo clutter file A\n", "utf8");
  await writeFile(join(root, "messy_notes.txt"), "demo clutter file B\n", "utf8");
  await writeFile(join(root, "readme_junk.md"), "# temp\n", "utf8");
  console.log("Wrote sample files into sandbox:", root);

  const scan = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "scan_demo_folder",
    input: { note: "host-demo-flow" },
  });
  if (!("executionId" in scan)) throw new Error("scan propose failed");
  console.log("scan_demo_folder proposed:", scan.executionId);
  console.log(">>> If status stays awaiting_host, run `npm run executor:run` in another terminal.");
  const scanFinal = await pollExecution(client, scan.executionId);
  console.log("scan_demo_folder final:", scanFinal.status);

  const plan = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "propose_file_organization",
    input: {
      planSummary:
        "Move invoices and notes into an organized/ subfolder with clearer names (sandbox-only).",
      movesPreview: [
        { from: "messy_invoice.txt", to: "organized/invoice_demo.txt" },
        { from: "messy_notes.txt", to: "organized/notes_demo.txt" },
        { from: "readme_junk.md", to: "organized/readme_demo.md" },
      ],
    },
  });
  if ("executionId" in plan) {
    const fin = await pollExecution(client, plan.executionId);
    console.log("propose_file_organization final:", fin.status);
  }

  const apply = await client.mutation(api.kernel.proposeExecution, {
    agentId,
    actionName: "apply_file_organization",
    input: {
      plan: {
        moves: [
          { from: "messy_invoice.txt", to: "organized/invoice_demo.txt" },
          { from: "messy_notes.txt", to: "organized/notes_demo.txt" },
          { from: "readme_junk.md", to: "organized/readme_demo.md" },
        ],
      },
    },
  });
  if (!("executionId" in apply)) throw new Error("apply propose failed");
  console.log("apply_file_organization proposed:", apply.executionId, apply.status);

  if (apply.status === "pending_approval") {
    console.log(">>> Approve in Control Tower, then ensure executor is running.");
    if (autoApprove()) {
      await client.mutation(api.kernel.approveExecution, {
        executionId: apply.executionId,
        operatorHint: "host-demo-flow-auto",
      });
      console.log("AUTO_APPROVE_HOST_DEMO approved apply execution.");
      const fin = await pollExecution(client, apply.executionId);
      console.log("apply_file_organization final:", fin.status);
    }
  }

  const events = await client.query(api.events.listByExecution, {
    executionId: apply.executionId,
  });
  console.log("\n--- Trace (apply execution) ---");
  for (const ev of events) {
    console.log(`${new Date(ev.ts).toISOString()} ${ev.type}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

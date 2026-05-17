import { readFileSync, existsSync } from "node:fs";
import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { dirname, join, resolve, relative, sep } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { Execution } from "../shared/contracts";

/**
 * Local OpenAgentOS host executor: polls Convex for executions in `awaiting_host`,
 * performs filesystem work only under OPENAGENTOS_EXECUTOR_ROOT, then submits results.
 *
 * Env:
 *   CONVEX_URL or NEXT_PUBLIC_CONVEX_URL
 *   OPENAGENTOS_EXECUTOR_ROOT  absolute path to sandbox folder
 *   HOST_EXECUTOR_SECRET       must match Convex deployment env HOST_EXECUTOR_SECRET
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

function getSandboxRoot(): string {
  const raw = process.env.OPENAGENTOS_EXECUTOR_ROOT?.trim();
  if (!raw) {
    throw new Error("Set OPENAGENTOS_EXECUTOR_ROOT to an absolute sandbox directory.");
  }
  return resolve(raw);
}

function getSecret(): string {
  const s = process.env.HOST_EXECUTOR_SECRET?.trim();
  if (!s) {
    throw new Error("Set HOST_EXECUTOR_SECRET (must match Convex dashboard env).");
  }
  return s;
}

function assertUnderRoot(root: string, rel: string): string {
  const abs = resolve(root, rel);
  const rootResolved = resolve(root);
  const relFrom = relative(rootResolved, abs);
  if (relFrom.startsWith("..") || relFrom.split(sep).includes("..")) {
    throw new Error(`Path escapes sandbox: ${rel}`);
  }
  return abs;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL.");
  const root = getSandboxRoot();
  const secret = getSecret();
  const client = new ConvexHttpClient(url);

  await mkdir(root, { recursive: true });

  console.log(`OpenAgentOS OS executor online. Sandbox: ${root}`);
  console.log("Polling for awaiting_host executions…");

  for (;;) {
    try {
      await client.mutation(api.hostExecutor.pulse, {
        secret,
        message: "poll",
      });
    } catch (e) {
      console.warn("pulse failed:", e instanceof Error ? e.message : e);
    }

    let pending: Execution[] = [];
    try {
      pending = await client.query(api.hostExecutor.listAwaitingHost, { limit: 10 });
    } catch (e) {
      console.warn("listAwaitingHost failed:", e instanceof Error ? e.message : e);
      await sleep(2000);
      continue;
    }

    for (const ex of pending) {
      const full = await client.query(api.executions.get, { id: ex.id as Id<"executions"> });
      if (!full || full.status !== "awaiting_host") continue;

      try {
        if (full.actionName === "scan_demo_folder") {
          const names = await readdir(root);
          const scanFiles: Array<{ relativePath: string; size: number }> = [];
          for (const name of names.slice(0, 200)) {
            const abs = join(root, name);
            try {
              const st = await stat(abs);
              if (st.isFile()) {
                scanFiles.push({ relativePath: name, size: st.size });
              }
            } catch {
              // skip unreadable
            }
          }
          await client.mutation(api.hostExecutor.submitHostResult, {
            secret,
            executionId: full.id as Id<"executions">,
            outcome: "succeeded",
            summary: `Scanned sandbox; ${scanFiles.length} files (top-level).`,
            scanFiles,
          });
          console.log(`Completed scan execution ${full.id}`);
        } else if (full.actionName === "apply_file_organization") {
          const input = full.input as Record<string, unknown>;
          const plan = input.plan as Record<string, unknown> | undefined;
          const moves = plan?.moves;
          if (!Array.isArray(moves)) {
            await client.mutation(api.hostExecutor.submitHostResult, {
              secret,
              executionId: full.id as Id<"executions">,
              outcome: "failed",
              summary: "Invalid plan.moves array",
            });
            continue;
          }
          const applied: Array<{ from: string; to: string }> = [];
          for (const m of moves) {
            if (!m || typeof m !== "object") throw new Error("Invalid move entry");
            const rec = m as Record<string, unknown>;
            if (typeof rec.from !== "string" || typeof rec.to !== "string") {
              throw new Error("Move requires string from and to");
            }
            const fromAbs = assertUnderRoot(root, rec.from);
            const toAbs = assertUnderRoot(root, rec.to);
            await mkdir(dirname(toAbs), { recursive: true });
            await rename(fromAbs, toAbs);
            applied.push({ from: rec.from, to: rec.to });
          }
          await client.mutation(api.hostExecutor.submitHostResult, {
            secret,
            executionId: full.id as Id<"executions">,
            outcome: "succeeded",
            summary: `Applied ${applied.length} move(s) under sandbox.`,
            appliedMoves: applied,
          });
          console.log(`Completed apply execution ${full.id}`);
        } else {
          await client.mutation(api.hostExecutor.submitHostResult, {
            secret,
            executionId: full.id as Id<"executions">,
            outcome: "failed",
            summary: `Unsupported action for host executor: ${full.actionName}`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Executor error on ${full.id}:`, msg);
        try {
          await client.mutation(api.hostExecutor.submitHostResult, {
            secret,
            executionId: full.id as Id<"executions">,
            outcome: "failed",
            summary: msg,
          });
        } catch (e2) {
          console.error("Failed to submit failure:", e2);
        }
      }
    }

    await sleep(1500);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

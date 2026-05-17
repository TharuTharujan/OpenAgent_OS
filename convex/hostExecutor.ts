import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { appendEvent } from "./lib/events";
import { toExecution } from "./lib/shapes";

function assertExecutorSecret(secret: string): void {
  const expected = process.env.HOST_EXECUTOR_SECRET;
  if (!expected || !expected.trim()) {
    throw new Error(
      "HOST_EXECUTOR_SECRET is not set on the Convex deployment. Add it in the Convex dashboard environment variables.",
    );
  }
  if (secret !== expected) {
    throw new Error("Invalid executor secret.");
  }
}

/**
 * List executions waiting for the local host OS executor (poll from `scripts/os-executor.ts`).
 * Convex path: `api.hostExecutor.listAwaitingHost`
 */
export const listAwaitingHost = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const docs = await ctx.db
      .query("executions")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_host"))
      .take(limit);
    docs.sort((a, b) => a.createdAt - b.createdAt);
    return docs.map(toExecution);
  },
});

const fileEntry = v.object({
  relativePath: v.string(),
  size: v.number(),
});

/**
 * Host executor: submit scan or apply results. Permission and lifecycle remain in Convex.
 * Convex path: `api.hostExecutor.submitHostResult`
 */
export const submitHostResult = mutation({
  args: {
    secret: v.string(),
    executionId: v.id("executions"),
    outcome: v.union(v.literal("succeeded"), v.literal("failed")),
    summary: v.string(),
    /** For scan_demo_folder: inventory under sandbox root (bounded). */
    scanFiles: v.optional(v.array(fileEntry)),
    /** For apply_file_organization: operations actually performed (bounded). */
    appliedMoves: v.optional(
      v.array(
        v.object({
          from: v.string(),
          to: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    assertExecutorSecret(args.secret);

    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");
    if (execution.status !== "awaiting_host") {
      throw new Error(`Execution is not awaiting host (status: ${execution.status})`);
    }

    const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max)}…`);
    const summary = clip(args.summary, 2000);

    await appendEvent(ctx, {
      executionId: args.executionId,
      type: "host.executor_report",
      payload: {
        eventSource: "kernel",
        outcome: args.outcome,
        summary,
        scanFileCount: args.scanFiles?.length,
        appliedMoveCount: args.appliedMoves?.length,
        actionName: execution.actionName,
      },
    });

    const now = Date.now();

    if (execution.actionName === "scan_demo_folder") {
      const host = await ctx.db
        .query("worldObjects")
        .withIndex("by_resourceKey", (q) => q.eq("resourceKey", "host:demo-folder"))
        .unique();
      if (host) {
        const files = (args.scanFiles ?? []).slice(0, 200);
        const state = { ...(host.state as Record<string, unknown>) };
        state.lastScanAt = now;
        state.fileCount = files.length;
        state.files = files.map((f) => ({
          relativePath: f.relativePath,
          size: f.size,
        }));
        state.executorStatus = "online";
        state.lastExecutorReportAt = now;
        await ctx.db.patch(host._id, { state, updatedAt: now });
      }
    }

    if (execution.actionName === "apply_file_organization") {
      const host = await ctx.db
        .query("worldObjects")
        .withIndex("by_resourceKey", (q) => q.eq("resourceKey", "host:demo-folder"))
        .unique();
      if (host) {
        const state = { ...(host.state as Record<string, unknown>) };
        state.lastApplyAt = now;
        state.lastApplyOutcome = args.outcome;
        state.lastApplySummary = summary;
        state.lastAppliedMoves = (args.appliedMoves ?? []).slice(0, 100);
        state.executorStatus = "online";
        state.lastExecutorReportAt = now;
        await ctx.db.patch(host._id, { state, updatedAt: now });
      }
    }

    if (args.outcome === "succeeded") {
      await ctx.db.patch(args.executionId, {
        status: "succeeded",
        finishedAt: now,
      });
      await appendEvent(ctx, {
        executionId: args.executionId,
        type: "execution.succeeded",
        payload: {
          actionName: execution.actionName,
          eventSource: "kernel",
          completedBy: "host_executor",
        },
      });
    } else {
      await ctx.db.patch(args.executionId, {
        status: "failed",
        finishedAt: now,
      });
      await appendEvent(ctx, {
        executionId: args.executionId,
        type: "execution.failed",
        payload: {
          reason: summary || "host_executor_failed",
          eventSource: "kernel",
          completedBy: "host_executor",
        },
      });
    }

    return { ok: true as const, executionId: args.executionId, status: args.outcome };
  },
});

/**
 * Lightweight heartbeat so the Control Tower can show the executor is connected.
 * Convex path: `api.hostExecutor.pulse`
 */
export const pulse = mutation({
  args: {
    secret: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertExecutorSecret(args.secret);
    const now = Date.now();
    const host = await ctx.db
      .query("worldObjects")
      .withIndex("by_resourceKey", (q) => q.eq("resourceKey", "host:demo-folder"))
      .unique();
    if (host) {
      const state = { ...(host.state as Record<string, unknown>) };
      state.executorStatus = "online";
      state.lastExecutorPingAt = now;
      if (args.message) {
        state.lastExecutorPingMessage = String(args.message).slice(0, 200);
      }
      await ctx.db.patch(host._id, { state, updatedAt: now });
    }
    return { ok: true as const, ts: now };
  },
});

import { v } from "convex/values";
import { query } from "./_generated/server";
import { toEvent } from "./lib/shapes";

/**
 * Contract: `events:listByExecution`
 * Convex path: `api.events.listByExecution`
 */
export const listByExecution = query({
  args: { executionId: v.id("executions") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("events")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .take(500);
    docs.sort((a, b) => a.ts - b.ts);
    return docs.map(toEvent);
  },
});

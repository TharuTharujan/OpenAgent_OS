import { v } from "convex/values";
import { query } from "./_generated/server";
import { toExecution } from "./lib/shapes";

/**
 * Contract: `executions:list`
 * Convex path: `api.executions.list`
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const docs = await ctx.db.query("executions").collect();
    docs.sort((a, b) => b.createdAt - a.createdAt);
    return docs.slice(0, limit).map(toExecution);
  },
});

/**
 * Contract: `executions:get`
 * Convex path: `api.executions.get`
 */
export const get = query({
  args: { id: v.id("executions") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    return toExecution(doc);
  },
});

import { query } from "./_generated/server";
import { toExecution } from "./lib/shapes";

/**
 * Contract: `approvals:listPending`
 * Convex path: `api.approvals.listPending`
 *
 * Pending human approvals are executions awaiting `kernel:approveExecution`.
 */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("executions")
      .withIndex("by_status", (q) => q.eq("status", "pending_approval"))
      .order("desc")
      .collect();
    return docs.map(toExecution);
  },
});

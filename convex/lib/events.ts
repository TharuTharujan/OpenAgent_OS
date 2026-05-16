import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function appendEvent(
  ctx: MutationCtx,
  args: {
    executionId: Id<"executions">;
    type: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const ts = Date.now();
  await ctx.db.insert("events", {
    executionId: args.executionId,
    type: args.type,
    ts,
    payload: args.payload ?? {},
  });
}

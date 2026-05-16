import { query } from "./_generated/server";
import { toWorldObject } from "./lib/shapes";

/**
 * Contract: `world:list`
 * Convex path: `api.world.list`
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("worldObjects").take(200);
    docs.sort((a, b) => a.resourceKey.localeCompare(b.resourceKey));
    return docs.map(toWorldObject);
  },
});

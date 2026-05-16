import { query } from "./_generated/server";
import { toManifest } from "./lib/shapes";

/**
 * Contract: `manifests:list`
 * Convex path: `api.manifests.list`
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("actionManifests").take(100);
    docs.sort((a, b) => a.name.localeCompare(b.name));
    return docs.map(toManifest);
  },
});

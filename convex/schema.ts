import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const risk = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"));

const executionStatus = v.union(
  v.literal("proposed"),
  v.literal("pending_approval"),
  v.literal("approved"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("denied"),
  v.literal("rejected"),
);

export default defineSchema({
  agents: defineTable({
    name: v.string(),
  }),

  worldObjects: defineTable({
    resourceKey: v.string(),
    type: v.string(),
    state: v.record(v.string(), v.any()),
    updatedAt: v.number(),
  }).index("by_resourceKey", ["resourceKey"]),

  actionManifests: defineTable({
    name: v.string(),
    description: v.string(),
    resourceType: v.string(),
    risk,
    requiresApproval: v.boolean(),
    inputSchema: v.record(v.string(), v.any()),
    outputSchema: v.record(v.string(), v.any()),
  }).index("by_name", ["name"]),

  permissions: defineTable({
    agentId: v.id("agents"),
    actionName: v.string(),
    effect: v.union(v.literal("allow"), v.literal("deny")),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_action", ["agentId", "actionName"]),

  executions: defineTable({
    agentId: v.id("agents"),
    actionName: v.string(),
    input: v.record(v.string(), v.any()),
    status: executionStatus,
    createdAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_agent", ["agentId"]),

  events: defineTable({
    executionId: v.id("executions"),
    type: v.string(),
    ts: v.number(),
    payload: v.record(v.string(), v.any()),
  }).index("by_execution", ["executionId"]),
});

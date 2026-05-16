import type { ActionManifest, Event, Execution, WorldObject } from "../../../shared/contracts";

/** Contract-shaped mocks when `NEXT_PUBLIC_CONVEX_URL` is unset (see docs/CONTRACT.md). */
export const MOCK_WORLD_OBJECTS: WorldObject[] = [
  {
    id: "mock:world:demo-counter",
    resourceKey: "demo:counter",
    type: "DEMO",
    state: { counter: 0, label: "Shared demo counter" },
    updatedAt: Date.now() - 120_000,
  },
  {
    id: "mock:world:payment-api",
    resourceKey: "service:payment-api",
    type: "SERVICE",
    state: {
      status: "degraded",
      latestDeployment: "v42",
      previousDeployment: "v41",
      errorRate: 12,
      latencyP95: "8.2s",
      dependencies: ["database:orders", "service:checkout"],
    },
    updatedAt: Date.now() - 60_000,
  },
];

export const MOCK_MANIFESTS: ActionManifest[] = [
  {
    id: "mock:manifest:observe",
    name: "observe_world",
    description: "Append-only observation with no world mutation.",
    resourceType: "ANY",
    risk: "LOW",
    requiresApproval: false,
    inputSchema: { note: "string" },
    outputSchema: { observed: "boolean" },
  },
  {
    id: "mock:manifest:increment",
    name: "increment_counter",
    description: "Increment a demo counter on a world object (safe).",
    resourceType: "DEMO",
    risk: "LOW",
    requiresApproval: false,
    inputSchema: { resourceKey: "string", delta: "number" },
    outputSchema: { counter: "number" },
  },
  {
    id: "mock:manifest:bump",
    name: "bump_counter_batch",
    description: "Apply a larger counter bump (riskier, requires approval).",
    resourceType: "DEMO",
    risk: "HIGH",
    requiresApproval: true,
    inputSchema: { resourceKey: "string", amount: "number" },
    outputSchema: { counter: "number" },
  },
  {
    id: "mock:manifest:rollback",
    name: "rollback_deployment",
    description: "Rollback a service to a previous deployment version (simulated).",
    resourceType: "SERVICE",
    risk: "HIGH",
    requiresApproval: true,
    inputSchema: { targetVersion: "string", reason: "string", resourceKey: "string" },
    outputSchema: { status: "string", verificationResult: "string" },
  },
];

export const MOCK_EXECUTIONS: Execution[] = [
  {
    id: "mock:exec:pending",
    agentId: "mock:agent:1",
    actionName: "bump_counter_batch",
    input: { resourceKey: "demo:counter", amount: 10 },
    status: "pending_approval",
    createdAt: Date.now() - 120_000,
  },
  {
    id: "mock:exec:ok",
    agentId: "mock:agent:1",
    actionName: "observe_world",
    input: { note: "mock trace" },
    status: "succeeded",
    createdAt: Date.now() - 300_000,
    finishedAt: Date.now() - 299_000,
  },
];

export const MOCK_EVENTS_BY_EXECUTION: Record<string, Event[]> = {
  "mock:exec:pending": [
    {
      id: "mock:ev:1",
      type: "execution.proposed",
      ts: Date.now() - 120_000,
      executionId: "mock:exec:pending",
      payload: {
        actionName: "bump_counter_batch",
        input: { resourceKey: "demo:counter", amount: 10 },
        eventSource: "agent",
        actorHint: "agent:mock-agent",
      },
    },
    {
      id: "mock:ev:2",
      type: "approval.requested",
      ts: Date.now() - 119_000,
      executionId: "mock:exec:pending",
      payload: {
        risk: "HIGH",
        requiresApproval: true,
        actionName: "bump_counter_batch",
        eventSource: "kernel",
      },
    },
  ],
  "mock:exec:ok": [
    {
      id: "mock:ev:3",
      type: "execution.proposed",
      ts: Date.now() - 300_000,
      executionId: "mock:exec:ok",
      payload: { actionName: "observe_world", eventSource: "agent" },
    },
    {
      id: "mock:ev:4",
      type: "execution.running",
      ts: Date.now() - 299_500,
      executionId: "mock:exec:ok",
      payload: { actionName: "observe_world", eventSource: "kernel" },
    },
    {
      id: "mock:ev:5",
      type: "effect.observe_world",
      ts: Date.now() - 299_200,
      executionId: "mock:exec:ok",
      payload: { note: "No world mutation.", eventSource: "kernel" },
    },
    {
      id: "mock:ev:6",
      type: "execution.succeeded",
      ts: Date.now() - 299_000,
      executionId: "mock:exec:ok",
      payload: { actionName: "observe_world", eventSource: "kernel" },
    },
  ],
};

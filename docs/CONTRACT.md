# OpenAgentOS Contract

OpenAgentOS is a Convex-powered agent-native operating substrate. Instead of forcing AI agents to read dashboards, click buttons, and parse human UI, it gives them structured world state, typed action manifests, explicit permissions, approval workflows, executions, and replayable traces.

Core thesis: agents waste tokens and latency when they operate through software surfaces built for humans. OpenAgentOS should shrink what an agent needs to read and reduce the number of fragile steps it takes by exposing small machine-readable world objects and action contracts. Treat the "10x" claim as an architectural goal or measured demo hypothesis, not as an unverified production benchmark.

## Ownership Boundary

Person A owns the Convex kernel, security, permissions, execution state machine, events, traces, seed/reset flow, and agent-facing SDK or runner.

Person B owns the Control Tower UI and product story. Person B consumes the contracts in this file and should not implement permission enforcement in the client.

Convex is the realtime kernel and source of truth. The client can request actions, approvals, and reads, but permission and risk checks must happen inside Convex functions.

## Convex Function Contracts

Use these names as the shared contract between the kernel and UI. Implementation can map them to the repo's file/module style later, but both teammates should keep these semantics stable.

| Function | Type | Purpose | Owner |
| --- | --- | --- | --- |
| `world:list` | query | Return visible world objects for the Control Tower and agent surface. | Person A |
| `manifests:list` | query | Return available action manifests. | Person A |
| `executions:list` | query | Return recent executions with status. | Person A |
| `executions:get` | query | Return one execution by id. | Person A |
| `approvals:listPending` | query | Return pending human approval requests. | Person A |
| `events:listByExecution` | query | Return trace events for one execution. | Person A |
| `kernel:proposeExecution` | mutation | Agent syscall to propose or request an action execution. | Person A |
| `kernel:approveExecution` | mutation | Human syscall to approve a pending execution. | Person A |
| `kernel:rejectExecution` | mutation | Human syscall to reject a pending execution. | Person A |
| `kernel:seedDemo` | mutation | Seed repeatable demo world objects, manifests, and agents. | Person A |
| `kernel:resetDemo` | mutation | Reset demo data so the walkthrough can run again. | Person A |

## Shared Shapes

Person B can build mock JSON and UI props from these shapes before Convex is fully implemented. Person A should make Convex return these field names.

```ts
export type WorldObject = {
  id: string;
  resourceKey: string;
  type: string;
  state: Record<string, unknown>;
  updatedAt: number;
};
```

```ts
export type ActionManifest = {
  id: string;
  name: string;
  description: string;
  resourceType: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};
```

```ts
export type Execution = {
  id: string;
  agentId: string;
  actionName: string;
  input: Record<string, unknown>;
  status:
    | "proposed"
    | "pending_approval"
    | "approved"
    | "running"
    | "succeeded"
    | "failed"
    | "denied"
    | "rejected";
  createdAt: number;
  finishedAt?: number;
};
```

```ts
export type Event = {
  id: string;
  type: string;
  ts: number;
  executionId?: string;
  payload: Record<string, unknown>;
};
```

## Execution Lifecycle

The core successful path is:

```txt
proposed -> pending_approval -> approved -> running -> succeeded
```

Low-risk actions may skip approval:

```txt
proposed -> running -> succeeded
```

Failure branches:

```txt
proposed -> denied
pending_approval -> rejected
running -> failed
```

Every lifecycle transition should write an `Event` so the action is replayable in the Control Tower.

## UI Integration Rules

- Build UI components against the shared shapes first, using mock JSON if Convex functions are not ready.
- Replace mocks with Convex queries and mutations as Person A ships them.
- Approval buttons should only call `kernel:approveExecution` or `kernel:rejectExecution`.
- The client must not decide whether an action is allowed. It can display risk and approval state, but Convex enforces the rule.
- Do not show secrets or environment values in world state, events, traces, screenshots, or recordings.

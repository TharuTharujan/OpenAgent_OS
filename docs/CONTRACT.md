# OpenAgentOS Contract

OpenAgentOS is a Convex-powered agent-native operating substrate. Instead of forcing AI agents to read dashboards, click buttons, and parse human UI, it gives them structured world state, typed action manifests, explicit permissions, approval workflows, executions, and replayable traces.

Core thesis: agents waste tokens and latency when they operate through software surfaces built for humans. OpenAgentOS should shrink what an agent needs to read and reduce the number of fragile steps it takes by exposing small machine-readable world objects and action contracts. Treat the "10x" claim as an architectural goal or measured demo hypothesis, not as an unverified production benchmark.

## Ownership Boundary

Person A owns the Convex kernel, security, permissions, execution state machine, events, traces, seed/reset flow, and agent-facing SDK or runner.

Person B owns the Control Tower UI and product story. Person B consumes the contracts in this file and should not implement permission enforcement in the client.

Convex is the realtime kernel and source of truth. The client can request actions, approvals, and reads, but permission and risk checks must happen inside Convex functions.

## Convex Function Contracts

Use these names as the shared contract between the kernel, UI, CLI adapter, agent runner, and host executor. In this repo they are implemented as Convex module exports; see [`docs/CONVEX_API.md`](CONVEX_API.md) for exact `api.<module>.<export>` paths.

| Function | Type | Purpose | Owner |
| --- | --- | --- | --- |
| `world:list` | query | Return visible world objects for the Control Tower and agent surface. | Person A |
| `manifests:list` | query | Return available action manifests. | Person A |
| `executions:list` | query | Return recent executions with status. | Person A |
| `executions:get` | query | Return one execution by id. | Person A |
| `approvals:listPending` | query | Return pending human approval requests. | Person A |
| `events:listByExecution` | query | Return trace events for one execution. | Person A |
| `kernel:proposeExecution` | mutation | Agent syscall to propose or request an action execution. | Person A |
| `kernel:approveExecution` | mutation | Human syscall to approve a pending execution. Optional `operatorHint` (max 200 chars) is stored on the approval event for audit demos. | Person A |
| `kernel:rejectExecution` | mutation | Human syscall to reject a pending execution. Optional `reason` is stored on the rejection event. | Person A |
| `kernel:seedDemo` | mutation | Seed repeatable demo world objects, manifests, and agents. | Person A |
| `kernel:resetDemo` | mutation | Reset demo data so the walkthrough can run again. | Person A |
| `hostExecutor:listAwaitingHost` | query | List executions with status `awaiting_host` for the local OS executor poller. | Person A |
| `hostExecutor:submitHostResult` | mutation | Host executor callback: completes `awaiting_host` executions (requires `HOST_EXECUTOR_SECRET` on Convex). | Person A |
| `hostExecutor:pulse` | mutation | Host executor heartbeat; updates `host:demo-folder` world state timestamps. | Person A |

## Shared Shapes

Control Tower props, mock preview data, agent outputs, and Convex DTO mappers should keep these field names stable.

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
    | "awaiting_host"
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

Current Convex events are execution-scoped and include `executionId`. The shared TypeScript DTO keeps it optional so future non-execution kernel events can use the same shape without breaking clients.

### Event payload conventions (optional keys)

Convex may attach these keys inside `payload` for demo traceability. They are not required for all events:

- `eventSource`: `"kernel"` | `"agent"` | `"control_tower"` — who emitted the event.
- `actorHint`: short string such as `agent:openagentos-demo-agent` or a human operator label from `operatorHint`.

### Permissions model (MVP)

- Each execution is evaluated against the `permissions` table for `(agentId, actionName)`.
- **Default deny**: if there is no explicit `allow` row for that pair, the execution is **denied** (unless you add a row).
- An explicit `deny` row always wins over `allow` for the same pair.
- `kernel:seedDemo` inserts `allow` rows for the demo agent so the packaged walkthrough works out of the box.
- Packaged demo manifests include `publish_readiness_packet` (low-risk trace-only readiness summary), `observe_world`, `increment_counter`, `bump_counter_batch`, `rollback_deployment`, plus host demo actions `scan_demo_folder`, `propose_file_organization`, and `apply_file_organization`.

### Current demo clients

- **Control Tower** uses the contract through `convex/react` hooks in `app/page.tsx`.
- **Agent runner** uses the contract through `ConvexHttpClient` in `scripts/agent-runner.ts`.
- **Adapter CLI** exposes shell-friendly commands in `scripts/openagent-adapter.ts` for agents that cannot import Convex code directly.
- **Host executor** polls `hostExecutor:listAwaitingHost` and submits results through `hostExecutor:submitHostResult`; it never receives permission authority from the client.

### Unimplemented simulator effects

If an action manifest exists but the kernel has no simulator `applyEffect` branch, the kernel records `effect.unimplemented` and completes the execution as **`failed`** with `execution.failed` payload reason `effect_not_implemented` (not `succeeded`).

## Execution Lifecycle

The core successful path is:

```txt
proposed -> pending_approval -> approved -> running -> succeeded
```

Low-risk actions may skip approval:

```txt
proposed -> running -> succeeded
```

Host-deferred actions (local filesystem) may transition like:

```txt
proposed -> running -> awaiting_host -> succeeded
```

High-risk host apply path:

```txt
proposed -> pending_approval -> approved -> running -> awaiting_host -> succeeded
```

Failure branches:

```txt
proposed -> denied
pending_approval -> rejected
running -> failed
```

Every lifecycle transition should write an `Event` so the action is replayable in the Control Tower.

## UI Integration Rules

- Build UI components against the shared shapes and keep preview mocks aligned with seeded Convex data.
- Treat Convex queries and mutations as the primary runtime path; mocks are only for disconnected preview mode.
- Approval buttons should only call `kernel:approveExecution` or `kernel:rejectExecution`.
- The client must not decide whether an action is allowed. It can display risk and approval state, but Convex enforces the rule.
- Do not show secrets or environment values in world state, events, traces, screenshots, or recordings.

## Convex import paths

Contract rows like `world:list` are implemented as Convex modules (for example `api.world.list`). See [CONVEX_API.md](CONVEX_API.md).

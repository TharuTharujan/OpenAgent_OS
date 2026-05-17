# Convex API paths

`docs/CONTRACT.md` uses shorthand names like `world:list`. In code, Convex exposes them as `api.<module>.<export>`.

| Contract | Convex path |
| --- | --- |
| `world:list` | `api.world.list` |
| `manifests:list` | `api.manifests.list` |
| `executions:list` | `api.executions.list` |
| `executions:get` | `api.executions.get` |
| `approvals:listPending` | `api.approvals.listPending` |
| `events:listByExecution` | `api.events.listByExecution` |
| `kernel:seedDemo` | `api.kernel.seedDemo` |
| `kernel:resetDemo` | `api.kernel.resetDemo` |
| `kernel:proposeExecution` | `api.kernel.proposeExecution` |
| `kernel:approveExecution` | `api.kernel.approveExecution` (args: `{ executionId, operatorHint? }`) |
| `kernel:rejectExecution` | `api.kernel.rejectExecution` (args: `{ executionId, reason? }`) |
| `hostExecutor:listAwaitingHost` | `api.hostExecutor.listAwaitingHost` (args: `{ limit? }`) |
| `hostExecutor:submitHostResult` | `api.hostExecutor.submitHostResult` (requires `secret`; completes `awaiting_host`) |
| `hostExecutor:pulse` | `api.hostExecutor.pulse` (requires `secret`; marks host executor online) |

## CLI surfaces

The Convex API above is also exposed through local TypeScript CLIs:

- `npm run agent:run`: reference agent runner with smoke mode and optional OpenAI live mode.
- `npm run adapter -- <command>`: framework-agnostic command surface for reads, proposals, traces, and test-gated approve/reject.
- `npm run executor:run`: local sandbox executor for host-deferred actions.
- `npm run demo:host`: scripted sandbox demo flow.

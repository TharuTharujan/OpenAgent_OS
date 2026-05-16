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
| `kernel:rejectExecution` | `api.kernel.rejectExecution` |

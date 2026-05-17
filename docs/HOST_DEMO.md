# Host demo scope (MVP freeze)

OpenAgentOS proves an **agent-native layer** above the human OS with one contained task.

This flow is implemented by:

- `convex/hostExecutor.ts` for executor polling, heartbeat, and result submission.
- `scripts/os-executor.ts` for local filesystem work inside the sandbox root.
- `scripts/host-demo-flow.ts` for a judge-oriented scripted scan/plan/apply walkthrough.
- `scripts/openagent-adapter.ts` for framework-agnostic agent commands.

## Frozen demo story

**Organize files inside a configured sandbox folder** (`OPENAGENTOS_EXECUTOR_ROOT`).

1. Agent (CLI adapter or `npm run agent:run`) calls `world:list` and `manifests:list`.
2. Agent proposes `scan_demo_folder` (low risk). Convex defers to **awaiting_host**; the local **OS executor** scans the folder and submits results to Convex.
3. Agent proposes `propose_file_organization` with a trace-only plan summary (low risk, completes in Convex).
4. Agent proposes `apply_file_organization` with a JSON plan of **relative** `from` → `to` moves (high risk). Convex requires **human approval** in the Control Tower.
5. After approval, execution is **awaiting_host**; the OS executor performs moves only under the sandbox root, then submits **succeeded** or **failed**.
6. **Trace timeline** shows every step; world object `host:demo-folder` reflects scan inventory and executor heartbeat.

## Out of scope for this sprint

- Full desktop automation, arbitrary shell, or apps outside the sandbox.
- Framework-specific plugins (OpenClaw, CrewAI, etc.). Any agent that can run CLI or HTTP can use the same adapter.

## Environment

| Variable | Purpose |
| --- | --- |
| `OPENAGENTOS_EXECUTOR_ROOT` | Absolute path to the demo folder (executor refuses paths outside it). |
| `HOST_EXECUTOR_SECRET` | Shared secret; set the same value in Convex dashboard env and locally for `submitHostResult`. |
| `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL. |

Do not store secrets or raw `.env` values in world state, events, or traces.

## Run order

1. Start Convex: `npx convex dev`.
2. Start the Control Tower: `npm run dev`.
3. Set `OPENAGENTOS_EXECUTOR_ROOT` to an absolute sandbox folder.
4. Set `HOST_EXECUTOR_SECRET` both locally and in the Convex dashboard environment for the same dev deployment.
5. Run the executor: `npm run executor:run`.
6. Seed data from the Control Tower or `npm run adapter -- seed`.
7. Use the Control Tower, adapter CLI, or `npm run demo:host` to propose scan/plan/apply actions.

## Safety model

- Convex decides permission, approval, and lifecycle state.
- The browser and adapter can request actions but cannot authorize risky work.
- The executor validates paths under `OPENAGENTOS_EXECUTOR_ROOT` before moving files.
- `apply_file_organization` must be approved before it can reach `awaiting_host`.

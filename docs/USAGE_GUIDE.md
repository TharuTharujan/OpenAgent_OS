# OpenAgentOS usage guide

This guide explains how to run, test, debug, and understand the local OpenAgentOS demo.

OpenAgentOS has three core pieces, plus an optional fourth for the **host sandbox** story:

- **Convex kernel**: source of truth for world state, manifests, permissions, executions, approvals, and trace events.
- **Control Tower UI**: the human dashboard at `http://localhost:3000`.
- **Agent runner** (`npm run agent:run`): a script that behaves like an agent client and calls the Convex kernel.
- **Host OS executor** (`npm run executor:run`, optional): polls for `awaiting_host` executions and completes filesystem work under `OPENAGENTOS_EXECUTOR_ROOT` (see [`docs/HOST_DEMO.md`](HOST_DEMO.md)).

Current state: these pieces are implemented in this repo and share the same Convex contract. Mock data is only used by the Control Tower when `NEXT_PUBLIC_CONVEX_URL` is missing.

For a full variable and script index, see [`docs/TOOLS_AND_SERVICES.md`](TOOLS_AND_SERVICES.md).

## Quick start

Run these in separate terminals from the repo root.

### 1. Install dependencies

```sh
npm install
```

### 2. Start Convex

```sh
npx convex dev
```

Wait until it says Convex functions are ready. Copy the Convex deployment URL printed by Convex.

### 3. Set environment variables

Copy the example file and add the deployment URL from `npx convex dev` as `NEXT_PUBLIC_CONVEX_URL`:

```sh
cp .env.local.example .env.local   # macOS/Linux
```

Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Minimal `.env.local` for the Control Tower and scripts that read it:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Rules:

- Do not commit `.env.local`.
- Do not paste secrets or private tokens into world state, events, traces, screenshots, or docs.
- `NEXT_PUBLIC_CONVEX_URL` is used by the Next.js Control Tower (`ConvexProvider`).
- `CONVEX_URL` is used by `npm run agent:run`, `npm run adapter`, `npm run executor:run`, and `npm run demo:host` when set; otherwise those scripts fall back to `NEXT_PUBLIC_CONVEX_URL` from `.env.local`.

Optional keys (commented in `.env.local.example`): `OPENAI_API_KEY`, `OPENAI_MODEL`, `HOST_EXECUTOR_SECRET`, `OPENAGENTOS_EXECUTOR_ROOT`, `AGENT_RUNNER_AUTO_APPROVE`, `OPENAGENTOS_ADAPTER_TEST_APPROVE`, `AUTO_APPROVE_HOST_DEMO` — see [`docs/TOOLS_AND_SERVICES.md`](TOOLS_AND_SERVICES.md).

### 4. Start the Control Tower

```sh
npm run dev
```

Open:

```txt
http://localhost:3000/
```

## What you are looking at

The page is the **Control Tower**. It is the human supervision screen for the Convex kernel.

### Demo setup

Use **Start demo** / **Reset demo** (Convex: `kernel:seedDemo` / `kernel:resetDemo`) to prepare or wipe demo data.

- **Start demo** (`kernel:seedDemo`): clears old demo data and creates demo world objects, action manifests, a demo agent, and explicit allow permission rows. After it succeeds, the page remembers the demo `agentId` for proposals below.
- **Reset demo** (`kernel:resetDemo`): clears the demo tables. This is destructive for demo data only (confirm in the browser).
- Pending-approval count under the buttons reflects `api.approvals.listPending`.

### Try an agent action (Control Tower)

After **Start demo**, use **Try an agent action** (`ProposeExecutionPanel`) to call `api.kernel.proposeExecution` from the browser: pick a manifest, edit JSON input, and send. The newest execution is selected so the **Executions** and **Trace timeline** panels update. This is the judge-friendly path for proposing `bump_counter_batch`, `rollback_deployment`, or host actions without opening the Convex dashboard.

### World state

This shows structured objects from `api.world.list`.

Agents should read this instead of scraping a human dashboard. Example demo objects include:

- `demo:counter`: simple counter state.
- `service:payment-api`: simulated service health/deployment state.
- `host:demo-folder`: host sandbox metadata (inventory, executor heartbeat) when you run the host demo; see [`docs/HOST_DEMO.md`](HOST_DEMO.md).

If the panel says it is using mock data, the app is not connected to Convex. Check `NEXT_PUBLIC_CONVEX_URL`.

### Action manifests

This shows typed action contracts from `api.manifests.list`.

Each manifest tells the agent:

- action name
- description
- resource type
- risk level
- whether approval is required
- expected input/output schema shape

Important demo actions:

- `observe_world`: low risk, no approval.
- `increment_counter`: low risk, no approval.
- `publish_readiness_packet`: low risk, trace-only readiness summary (no secrets stored).
- `bump_counter_batch`: high risk, requires approval.
- `rollback_deployment`: high risk, requires approval (simulated service rollback).
- `scan_demo_folder`: low risk, host scan — kernel moves execution to **`awaiting_host`** until `npm run executor:run` reports results.
- `propose_file_organization`: low risk, trace-only organization plan.
- `apply_file_organization`: high risk — approval in the Control Tower, then **`awaiting_host`** for the executor to apply moves under the sandbox root.

### Approval inbox

This shows executions from `api.approvals.listPending`.

Use it when a risky action reaches `pending_approval`.

- **Approve** calls `api.kernel.approveExecution` (the browser may prompt for an optional operator hint for the audit trail).
- **Reject** calls `api.kernel.rejectExecution` (optional rejection reason).

The UI does not decide whether an action is allowed. Convex does permission and risk checks.

### Executions

This shows recent executions from `api.executions.list` (latest rows; the UI currently loads a bounded recent window).

Statuses you may see:

- `proposed`: execution was created.
- `pending_approval`: risky action is waiting for a human.
- `approved`: human approved a risky execution (or kernel advanced approval internally).
- `running`: kernel is applying the demo effect.
- `awaiting_host`: kernel handed off to the **local OS executor** (host scan/apply). Start `npm run executor:run` with matching `HOST_EXECUTOR_SECRET` and `OPENAGENTOS_EXECUTOR_ROOT`, or the row stays here.
- `succeeded`: effect completed (including after host submit).
- `failed`: effect or manifest failed.
- `denied`: permission check denied the action.
- `rejected`: human rejected it.

Click an execution row to load its trace timeline and header details.

### Trace timeline

This shows trace events from `api.events.listByExecution`.

Use this to explain the demo:

1. What the agent proposed.
2. Whether the kernel requested approval.
3. Whether the human approved or rejected.
4. What effect the kernel applied.
5. What terminal status the execution reached.

This is the main proof that OpenAgentOS is observable and auditable.

## Main demo workflow

Use this path when showing the project to a judge.

### Terminal A

```sh
npx convex dev
```

Keep it running.

### Terminal B

```sh
npm run dev
```

Open `http://localhost:3000/`.

### Browser

1. Click **Start demo** (or run `api.kernel.seedDemo` from the Convex dashboard).
2. Confirm **World state** shows live Convex rows (not the mock banner).
3. Confirm manifests appear in the catalog panel.

### Terminal C

Set the same Convex URL for the runner, then run it.

Windows PowerShell:

```powershell
$env:CONVEX_URL="https://your-convex-url.convex.cloud"
npm run agent:run
```

macOS/Linux:

```sh
export CONVEX_URL="https://your-convex-url.convex.cloud"
npm run agent:run
```

If your terminal already has `NEXT_PUBLIC_CONVEX_URL` exported, the runner can use that instead. The runner loads `.env.local` on startup (same keys as Next), so `NEXT_PUBLIC_CONVEX_URL` and `OPENAI_API_KEY` can live there without exporting them manually.

Do not paste secret tokens into the shell for Convex URL; it should only be the public deployment URL.

1. Seed demo data.
2. Propose `observe_world`.
3. Propose `increment_counter`.
4. Propose `bump_counter_batch`.
5. Auto-approve the risky execution for the smoke test.
6. Print trace events in the terminal.

**Live LLM mode** (`OPENAI_API_KEY` in `.env.local` or the shell; optionally `OPENAI_MODEL`):

1. Seed demo data.
2. Read `world:list` and `manifests:list`.
3. Call OpenAI for a strict JSON plan (observation + selected action + input).
4. Propose `publish_readiness_packet` (trace-only readiness summary; no secrets stored).
5. Propose the model-selected action (often `rollback_deployment` when `service:payment-api` is degraded).
6. Leave high-risk executions in **`pending_approval`** so you approve in the Control Tower (unless `AGENT_RUNNER_AUTO_APPROVE=1`).

### Browser again

1. Watch **Executions** update.
2. Click the newest execution (or the one you care about).
3. Read the **Trace timeline**.
4. Check **World state** to see the counter change (or service / host objects depending on the action).

Say this during the demo:

> The agent did not click buttons. It read structured world state, chose a typed action manifest, proposed an execution, passed through kernel permission and approval rules, and left a replayable trace for the human operator.

## Manual approval workflow

**Smoke** `npm run agent:run` auto-approves the high-risk action so the smoke test finishes end-to-end without an API key.

**Live LLM** `npm run agent:run` (with `OPENAI_API_KEY`) leaves high-risk executions pending so you can approve them in the Control Tower for judges.

### Option A: Use the Control Tower form

1. In the Control Tower, click **Start demo** if you have not already.
2. Under **Try an agent action**, choose `bump_counter_batch` or `rollback_deployment`, adjust JSON if needed, and submit.
3. Use **Approval inbox** → **Approve** / **Reject** when status is `pending_approval`.
4. Select the execution row and read the **Trace timeline**.

### Option B: Use Convex dashboard

1. Open the Convex dashboard from the URL shown by `npx convex dev`.
2. Run `api.kernel.seedDemo` if needed (same as **Start demo** in the UI).
3. Copy the returned `agentId`.
4. Run `api.kernel.proposeExecution` with:

```json
{
  "agentId": "paste-demo-agent-id-here",
  "actionName": "bump_counter_batch",
  "input": {
    "resourceKey": "demo:counter",
    "amount": 10
  }
}
```

5. Go to `http://localhost:3000/`.
6. The Approval Inbox should show the pending execution.
7. Click **Approve** or **Reject**.
8. Click the execution row and read the Trace Timeline.

### Option C: Use the agent runner

**Smoke** (no `OPENAI_API_KEY`): run `npm run agent:run` for a fast end-to-end proof; it auto-approves the risky action so there may be no pending inbox rows.

**Live LLM** (`OPENAI_API_KEY` set): run `npm run agent:run` and then approve the pending execution in the Control Tower (unless `AGENT_RUNNER_AUTO_APPROVE=1`).

## Testing checklist

Run this before recording or submitting.

### Static checks

```sh
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

Expected:

- TypeScript check exits with no errors.
- ESLint (`next lint`) passes.
- Next build completes.

This repo may ship bootstrap files under `convex/_generated/` so TypeScript works before the first Convex sync; after `npx convex dev` connects, prefer the regenerated outputs it writes.

### Live app checks

1. `npx convex dev` is running.
2. `.env.local` has `NEXT_PUBLIC_CONVEX_URL`.
3. `npm run dev` opens `http://localhost:3000/`.
4. The banner about missing `NEXT_PUBLIC_CONVEX_URL` is not shown.
5. **Start demo** populates World State and Action Manifests.
6. `npm run agent:run` creates executions and trace events.
7. Selecting an execution shows trace events in order.
8. **Reset demo** clears demo data.
9. Running **Start demo** again works without manual cleanup.

### Demo acceptance checks

Also use `docs/DEMO_ACCEPTANCE.md` before final judging or recording.

## Debugging guide

### Page shows mock data

Cause: `NEXT_PUBLIC_CONVEX_URL` is missing or the Next dev server was started before `.env.local` was updated.

Fix:

1. Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
2. Stop `npm run dev`.
3. Start `npm run dev` again.
4. Refresh `http://localhost:3000/`.

### Buttons are disabled

Cause: the app thinks Convex is not connected.

Fix:

- Check `.env.local`.
- Restart the Next dev server.
- Confirm `npx convex dev` is running.

### `npm run agent:run` says Convex URL is missing

Cause: neither `CONVEX_URL` nor `NEXT_PUBLIC_CONVEX_URL` is available to the script.

Fix on Windows PowerShell:

```powershell
$env:CONVEX_URL="https://your-convex-url.convex.cloud"
npm run agent:run
```

On macOS/Linux:

```sh
export CONVEX_URL="https://your-convex-url.convex.cloud"
npm run agent:run
```

### No executions appear

Possible causes:

- Demo data was reset.
- Agent runner has not been run.
- Convex URL points to a different deployment.

Fix:

1. Click **Start demo**.
2. Run `npm run agent:run`.
3. Refresh the page.
4. Verify both UI and runner use the same Convex URL.

### Approval inbox is empty

This can be normal.

The smoke runner auto-approves `bump_counter_batch`, so the pending approval may disappear quickly.

To test the inbox manually, propose a high-risk execution from the Convex dashboard and do not approve it there. Then approve/reject from the Control Tower.

### Execution is `denied`

Cause: permission check failed. The kernel defaults to deny if no explicit allow row exists.

Fix:

- Click **Start demo** (or run `kernel:seedDemo` from the dashboard).
- Use the `agentId` returned by seed (shown in the Demo setup panel when connected).
- Use one of the seeded manifest names.

### Execution is `failed`

Common causes:

- Unknown world `resourceKey`.
- Unknown action manifest.
- Manifest exists but no simulator effect exists in `convex/kernel.ts`.

How to debug:

1. Click the execution row.
2. Read the Trace Timeline.
3. Look for `execution.failed`.
4. Read the `reason` in the event payload.

### Execution stays `awaiting_host`

Cause: a host action (`scan_demo_folder`, `apply_file_organization` after approval, etc.) is waiting for the local executor.

Fix:

1. Set `OPENAGENTOS_EXECUTOR_ROOT` to an absolute sandbox folder and use the same `HOST_EXECUTOR_SECRET` in Convex dashboard env and locally (see [`docs/HOST_DEMO.md`](HOST_DEMO.md)).
2. Run `npm run executor:run` in another terminal with `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` pointing at this deployment.
3. Refresh the Control Tower and re-read the trace for `host.executor_report` events.

### Convex functions are stale

Cause: generated API files are out of date.

Fix:

```sh
npx convex dev
```

Wait for Convex to regenerate files and print that functions are ready.

### Build fails

Use the first TypeScript or Next error as the source of truth.

Recommended order:

```sh
npx tsc --noEmit --incremental false
npm run build
```

Fix TypeScript errors first, then rerun the build.

## Where to inspect data

### In the UI

- World objects: World State panel.
- Manifests: Action Manifests panel.
- Pending risky actions: Approval Inbox panel.
- Recent executions: Executions panel.
- Event replay: Trace Timeline panel.

### In Convex dashboard

Use this when you need lower-level debugging:

- Inspect `worldObjects`.
- Inspect `actionManifests`.
- Inspect `permissions`.
- Inspect `executions`.
- Inspect `events`.
- Manually run `api.kernel.seedDemo`.
- Manually run `api.kernel.proposeExecution`.
- For host flows: `api.hostExecutor.listAwaitingHost` (executor poller) and `api.hostExecutor.submitHostResult` (normally invoked by `scripts/os-executor.ts`, not by hand unless you are debugging).

### In terminal logs

Watch:

- `npx convex dev`: Convex function compile/runtime errors.
- `npm run dev`: Next.js page/runtime errors.
- `npm run agent:run`: agent smoke output and printed traces.
- `npm run adapter -- …`: framework-agnostic CLI reads/proposals.
- `npm run executor:run`: local host executor polling loop.

## Host sandbox demo + framework-agnostic adapter

See [`docs/HOST_DEMO.md`](docs/HOST_DEMO.md) for the frozen story (scan → plan → approve → apply under the sandbox root).

### Configure Convex + secrets

1. In the Convex dashboard for your dev deployment, add environment variable **`HOST_EXECUTOR_SECRET`** (any long random string).
2. Copy the same value into `.env.local` as `HOST_EXECUTOR_SECRET=` (never commit).
3. Set `OPENAGENTOS_EXECUTOR_ROOT` in `.env.local` or the shell to an **absolute** path of the demo folder the executor is allowed to touch.

### Terminal layout (judge demo)

- **Terminal A**: `npx convex dev`
- **Terminal B**: `npm run dev` (Control Tower)
- **Terminal C**: `npm run executor:run` (requires `OPENAGENTOS_EXECUTOR_ROOT` + `HOST_EXECUTOR_SECRET` + Convex URL via `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`)
- **Terminal D** (optional): `npm run demo:host` after seeding from the UI or via `npm run adapter -- seed`. For a fully scripted dry run without clicking **Approve** in the UI, set `AUTO_APPROVE_HOST_DEMO=1` (test-only; see `.env.local.example`).

### Adapter CLI (no Control Tower required for reads)

```powershell
$env:CONVEX_URL="https://....convex.cloud"
npm run adapter -- seed
npm run adapter -- world:list
npm run adapter -- manifests:list
npm run adapter -- awaiting-host:list
```

Use `npm run adapter -- propose --agentId <from_seed> --action scan_demo_folder --input "{}"` then watch **Executions** for `awaiting_host` until the executor completes the scan.

Scripted approve/reject from the adapter is **disabled by default**. Enable only for tests:

```powershell
$env:OPENAGENTOS_ADAPTER_TEST_APPROVE="1"
npm run adapter -- approve --executionId <id>
```

## Important files

| Purpose | File |
| --- | --- |
| Control Tower page | `app/page.tsx` |
| Demo setup + pending count | `app/components/control-tower/DemoControlsPanel.tsx` |
| Propose execution form | `app/components/control-tower/ProposeExecutionPanel.tsx` |
| Execution list + detail | `app/components/control-tower/ExecutionPanel.tsx` |
| Other Control Tower panels | `app/components/control-tower/*` |
| Convex schema | `convex/schema.ts` |
| Kernel mutations/lifecycle | `convex/kernel.ts` |
| World query | `convex/world.ts` |
| Manifests query | `convex/manifests.ts` |
| Executions query | `convex/executions.ts` |
| Approvals query | `convex/approvals.ts` |
| Trace query | `convex/events.ts` |
| Host executor | `convex/hostExecutor.ts` |
| Agent runner | `scripts/agent-runner.ts` |
| Agent adapter CLI | `scripts/openagent-adapter.ts` |
| OS executor | `scripts/os-executor.ts` |
| Host demo flow | `scripts/host-demo-flow.ts` |
| Shared types | `shared/contracts.ts` |
| API map | `docs/CONVEX_API.md` |
| Demo checklist | `docs/DEMO_ACCEPTANCE.md` |

## Fast mental model

Think of the workflow like this:

```txt
Agent reads world:list
Agent reads manifests:list
Agent proposes kernel:proposeExecution
Convex checks permission and risk
Low risk runs immediately
High risk waits in approvals:listPending
Human approves or rejects in Control Tower
Convex applies demo effect (or defers to awaiting_host for host actions)
Host executor completes awaiting_host when configured
Execution status updates
Trace events explain every step
```

If you can show that loop on screen, the demo is working.

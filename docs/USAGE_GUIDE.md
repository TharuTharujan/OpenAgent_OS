# OpenAgentOS usage guide

This guide explains how to run, test, debug, and understand the local OpenAgentOS demo.

OpenAgentOS has three moving pieces:

- **Convex kernel**: source of truth for world state, manifests, permissions, executions, approvals, and trace events.
- **Control Tower UI**: the human dashboard at `http://localhost:3000`.
- **Agent runner**: a small script that behaves like an agent client and calls the Convex kernel.

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

### 3. Set the browser environment variable

Create `.env.local` from the example file and set the Convex URL for the Control Tower:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
```

Rules:

- Do not commit `.env.local`.
- Do not paste secrets or private tokens into world state, events, traces, screenshots, or docs.
- `NEXT_PUBLIC_CONVEX_URL` is used by the browser UI.
- `CONVEX_URL` is used by `npm run agent:run`; set it in the shell before running the script.

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

### Demo controls

Use this panel to prepare or reset the demo.

- `kernel:seedDemo`: clears old demo data and creates demo world objects, action manifests, a demo agent, and explicit allow permission rows.
- `kernel:resetDemo`: clears the demo tables. This is destructive for demo data only.
- `Pending approvals`: shows how many risky executions are waiting for a human.

### World state

This shows structured objects from `api.world.list`.

Agents should read this instead of scraping a human dashboard. Example demo objects include:

- `demo:counter`: simple counter state.
- `service:payment-api`: simulated service health/deployment state.

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
- `increment_counter`: low risk, auto-runs.
- `bump_counter_batch`: high risk, requires approval.
- `rollback_deployment`: high risk, requires approval.

### Approval inbox

This shows executions from `api.approvals.listPending`.

Use it when a risky action reaches `pending_approval`.

- **Approve** calls `api.kernel.approveExecution`.
- **Reject** calls `api.kernel.rejectExecution`.

The UI does not decide whether an action is allowed. Convex does permission and risk checks.

### Executions

This shows recent executions from `api.executions.list`.

Statuses you may see:

- `proposed`: execution was created.
- `pending_approval`: risky action is waiting for a human.
- `approved`: human or low-risk auto approval happened.
- `running`: kernel is applying the demo effect.
- `succeeded`: effect completed.
- `failed`: effect or manifest failed.
- `denied`: permission check denied the action.
- `rejected`: human rejected it.

Click an execution row to load its trace timeline.

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

1. Click `kernel:seedDemo`.
2. Confirm World State shows live Convex data.
3. Confirm Action Manifests are visible.

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

If your terminal already has `NEXT_PUBLIC_CONVEX_URL` exported, the runner can use that instead.

Do not paste secret tokens here; this value should only be the public Convex deployment URL.

The runner will:

1. Seed demo data.
2. Propose `observe_world`.
3. Propose `increment_counter`.
4. Propose `bump_counter_batch`.
5. Auto-approve the risky execution for the smoke test.
6. Print trace events in the terminal.

### Browser again

1. Watch Executions update.
2. Click the newest execution.
3. Read the Trace Timeline.
4. Check World State to see the counter change.

Say this during the demo:

> The agent did not click buttons. It read structured world state, chose a typed action manifest, proposed an execution, passed through kernel permission and approval rules, and left a replayable trace for the human operator.

## Manual approval workflow

The current `npm run agent:run` script auto-approves the high-risk action so the smoke test finishes end-to-end. For a manual approval demo, create a pending high-risk execution without immediately approving it.

### Option A: Use Convex dashboard

1. Open the Convex dashboard from the URL shown by `npx convex dev`.
2. Run `api.kernel.seedDemo` if needed.
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

### Option B: Temporarily use the smoke runner only as a full auto-flow

If you only need proof that the backend works, run:

```sh
npm run agent:run
```

This is faster, but it may leave no pending approvals because it approves the risky action automatically.

## Testing checklist

Run this before recording or submitting.

### Static checks

```sh
npx tsc --noEmit --incremental false
npm run build
```

Expected:

- TypeScript check exits with no errors.
- Next build completes.

### Live app checks

1. `npx convex dev` is running.
2. `.env.local` has `NEXT_PUBLIC_CONVEX_URL`.
3. `npm run dev` opens `http://localhost:3000/`.
4. The banner about missing `NEXT_PUBLIC_CONVEX_URL` is not shown.
5. `kernel:seedDemo` populates World State and Action Manifests.
6. `npm run agent:run` creates executions and trace events.
7. Selecting an execution shows trace events in order.
8. `kernel:resetDemo` clears demo data.
9. Running `kernel:seedDemo` again works without manual cleanup.

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

1. Click `kernel:seedDemo`.
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

- Run `kernel:seedDemo` again.
- Use the `agentId` returned by `seedDemo`.
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

### In terminal logs

Watch:

- `npx convex dev`: Convex function compile/runtime errors.
- `npm run dev`: Next.js page/runtime errors.
- `npm run agent:run`: agent smoke output and printed traces.

## Important files

| Purpose | File |
| --- | --- |
| Control Tower page | `app/page.tsx` |
| Control Tower panels | `app/components/control-tower/*` |
| Convex schema | `convex/schema.ts` |
| Kernel mutations/lifecycle | `convex/kernel.ts` |
| World query | `convex/world.ts` |
| Manifests query | `convex/manifests.ts` |
| Executions query | `convex/executions.ts` |
| Approvals query | `convex/approvals.ts` |
| Trace query | `convex/events.ts` |
| Agent runner | `scripts/agent-runner.ts` |
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
Convex applies demo effect
Execution status updates
Trace events explain every step
```

If you can show that loop on screen, the demo is working.

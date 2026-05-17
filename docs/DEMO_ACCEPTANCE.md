# Demo acceptance and freeze checklist

Use this before judging, recording, or submitting the hackathon build.

## One-sentence pitch check

- [ ] A new listener can explain OpenAgentOS in **one sentence** after the demo (kernel + human approvals + traces).

## Functional demo path

- [ ] `npx convex dev` runs and prints a deployment URL.
- [ ] `.env.local` sets `NEXT_PUBLIC_CONVEX_URL` to that URL (copy `.env.local.example`, add the public URL, never commit real secrets).
- [ ] `npm run dev` opens the Control Tower with **live** data (not mocks).
- [ ] `kernel:seedDemo` creates world objects, manifests, demo agent, and allow rules.
- [ ] `kernel:resetDemo` clears data; seed can run again without manual DB edits.
- [ ] **World** panel lists `WorldObject` rows from `world:list`.
- [ ] **Manifests** panel lists manifests with risk and schema preview from `manifests:list`.
- [ ] Agent or UI path creates an execution that reaches **`pending_approval`** for a HIGH risk action.
- [ ] **Approval inbox** lists pending rows; **Approve** / **Reject** call Convex mutations only.
- [ ] After approval, execution reaches a **terminal** state (`succeeded` / `failed` / `rejected` / `denied`) with believable demo semantics (host actions may pass through **`awaiting_host`** while the local executor runs).
- [ ] **Executions** table shows statuses; selecting a row loads **trace** events via `events:listByExecution`.
- [ ] Trace shows `execution.proposed`, approval/effect steps, and terminal event in order.

## Agent runner path

### Smoke mode (default)

- [ ] With `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` set and **without** `OPENAI_API_KEY`, `npm run agent:run`:
  - [ ] Seeds demo.
  - [ ] Proposes `observe_world`, `increment_counter`, and `bump_counter_batch`.
  - [ ] Auto-approves the pending high-risk execution from the CLI (smoke only).
  - [ ] Prints final status and **trace** sections without errors.

### Live LLM mode (judge demo)

- [ ] Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, e.g. `gpt-4o-mini`) in `.env.local` or the shell. Never commit keys.
- [ ] Run `npm run agent:run` with the same Convex URL as the Control Tower.
- [ ] Runner publishes `publish_readiness_packet` then proposes a model-chosen action (typically `rollback_deployment` when the payment API world object is degraded).
- [ ] High-risk executions remain **`pending_approval`** until a human approves in the Control Tower (unless you explicitly set `AGENT_RUNNER_AUTO_APPROVE=1` for scripted end-to-end only).

## Security and safety

- [ ] No API keys, tokens, or `.env` values appear in world state, events, traces, logs, screenshots, or repo docs.
- [ ] `kernel:resetDemo` is understood as **destructive demo scope** only (documented in UI copy).

## Permissions sanity

- [ ] Unknown actions or agents without explicit **allow** rows are **denied** by the kernel (default deny).
- [ ] `kernel:seedDemo` includes allow rows for the packaged demo agent so the walkthrough still works.

## Unimplemented effects

- [ ] Actions with manifests but **no** simulator branch in `convex/kernel.ts` end as **`failed`** with `effect_not_implemented` (not silent success).

## Host demo scope

- [ ] Demo scope for host filesystem work follows [`docs/HOST_DEMO.md`](HOST_DEMO.md).

## Host demo + adapter checks

- [ ] Convex dashboard defines **`HOST_EXECUTOR_SECRET`** (server-side) and `.env.local` matches for local scripts.
- [ ] `npm run adapter -- world:list` returns JSON including `host:demo-folder` after `kernel:seedDemo`.
- [ ] `npm run adapter -- manifests:list` includes `scan_demo_folder`, `propose_file_organization`, `apply_file_organization`.
- [ ] `npm run adapter -- awaiting-host:list` returns pending host-deferred executions when any are waiting.
- [ ] Proposing `scan_demo_folder` reaches **`awaiting_host`**, then succeeds after `npm run executor:run` (with `OPENAGENTOS_EXECUTOR_ROOT` set).
- [ ] Proposing `apply_file_organization` reaches **`pending_approval`**, appears in the Control Tower inbox, and after approval reaches **`awaiting_host`** then **succeeded** with the executor running.
- [ ] World object `host:demo-folder` shows `executorStatus` **online** after executor pulse/submit.
- [ ] Trace includes `execution.awaiting_host`, `host.executor_report`, and terminal `execution.succeeded` / `execution.failed` as appropriate.

## Freeze rules (T-2 hours)

- [ ] Stop feature work; only demo-breaking bugfixes.
- [ ] Re-run seed → risky propose → approve → trace replay **twice in a row**.
- [ ] Capture README screenshots or a short screen recording as fallback if live demo fails.

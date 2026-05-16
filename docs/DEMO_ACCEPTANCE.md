# Demo acceptance and freeze checklist

Use this before judging, recording, or submitting the hackathon build.

## One-sentence pitch check

- [ ] A new listener can explain OpenAgentOS in **one sentence** after the demo (kernel + human approvals + traces).

## Functional demo path

- [ ] `npx convex dev` runs and prints a deployment URL.
- [ ] `.env.local` sets `NEXT_PUBLIC_CONVEX_URL` to that URL (never committed).
- [ ] `npm run dev` opens the Control Tower with **live** data (not mocks).
- [ ] `kernel:seedDemo` creates world objects, manifests, demo agent, and allow rules.
- [ ] `kernel:resetDemo` clears data; seed can run again without manual DB edits.
- [ ] **World** panel lists `WorldObject` rows from `world:list`.
- [ ] **Manifests** panel lists manifests with risk and schema preview from `manifests:list`.
- [ ] Agent or UI path creates an execution that reaches **`pending_approval`** for a HIGH risk action.
- [ ] **Approval inbox** lists pending rows; **Approve** / **Reject** call Convex mutations only.
- [ ] After approval, execution reaches a **terminal** state (`succeeded` / `failed` / `rejected` / `denied`) with believable demo semantics.
- [ ] **Executions** table shows statuses; selecting a row loads **trace** events via `events:listByExecution`.
- [ ] Trace shows `execution.proposed`, approval/effect steps, and terminal event in order.

## Agent runner path

- [ ] With `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` set, `npm run agent:run`:
  - [ ] Seeds demo.
  - [ ] Proposes `observe_world`, `increment_counter`, and `bump_counter_batch`.
  - [ ] Approves pending execution when required.
  - [ ] Prints final status and **trace** sections without errors.

## Security and safety

- [ ] No API keys, tokens, or `.env` values appear in world state, events, traces, logs, screenshots, or repo docs.
- [ ] `kernel:resetDemo` is understood as **destructive demo scope** only (documented in UI copy).

## Permissions sanity

- [ ] Unknown actions or agents without explicit **allow** rows are **denied** by the kernel (default deny).
- [ ] `kernel:seedDemo` includes allow rows for the packaged demo agent so the walkthrough still works.

## Unimplemented effects

- [ ] Actions with manifests but **no** simulator branch in `convex/kernel.ts` end as **`failed`** with `effect_not_implemented` (not silent success).

## Freeze rules (T-2 hours)

- [ ] Stop feature work; only demo-breaking bugfixes.
- [ ] Re-run seed → risky propose → approve → trace replay **twice in a row**.
- [ ] Capture README screenshots or a short screen recording as fallback if live demo fails.

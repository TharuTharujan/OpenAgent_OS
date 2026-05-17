# OpenAgentOS Team Split And Ownership

One-line instruction for your teammate:

> Clone the repo, open it in Cursor, read `docs/CONTRACT.md` and `docs/TEAM_SPLIT.md`, work on your branch; the chat in my Cursor is not the source of truth, the repo is.

## Current Project State

The initial hackathon split has produced a working MVP:

- Convex owns the kernel state: world objects, action manifests, permissions, executions, and trace events.
- The Control Tower uses live Convex queries/mutations when `NEXT_PUBLIC_CONVEX_URL` is configured, and falls back to contract-shaped mocks only for preview mode.
- The agent runner, adapter CLI, host executor, and scripted host demo are implemented under `scripts/`.
- The host filesystem story is intentionally scoped to one sandbox folder controlled by `OPENAGENTOS_EXECUTOR_ROOT`.

Use this file as an ownership guide for follow-up work, not as a fresh hour-by-hour build plan.

## Working Model

The team should work in two parallel tracks:

- Person A: Convex kernel and agent surface.
- Person B: Human Control Tower and product story.

Avoid constant sync. Use the contract in `docs/CONTRACT.md` so both people can build independently.

## Person A: Kernel And Agent Track

Person A owns the technical core and should keep these implemented surfaces reliable:

- Convex schema and indexes.
- Kernel queries and mutations.
- Permission and risk enforcement inside Convex.
- Execution state machine.
- Append-only events and traces.
- Agent runner or SDK wrapper.
- Seed and reset flow for repeatable demos.
- Framework-agnostic adapter CLI.
- Host executor Convex API and local sandbox executor.

Person A should now prioritize hardening rather than adding broad new primitives:

- Keep `docs/CONTRACT.md` and `docs/CONVEX_API.md` in sync with Convex exports.
- Preserve default-deny permission behavior.
- Keep host actions sandboxed and approval-gated.
- Make repeated seed/reset/demo runs deterministic.

Person A should avoid owning:

- UI polish.
- Slide design.
- Long pitch writing.
- Styling details that Person B can own.

## Person B: Control Tower And Product Track

Person B owns what humans and judges see:

- Control Tower app shell.
- World State viewer.
- Action Manifest catalog.
- Approval inbox.
- Execution list and status badges.
- Trace timeline and detail panel.
- README/pitch copy.
- Screenshots or fallback recording.

Person B should keep mock JSON aligned with `docs/CONTRACT.md`, but live Convex data is now the primary path. Mock mode exists only so the UI remains explorable when `NEXT_PUBLIC_CONVEX_URL` is absent.

Person B must not implement permission logic in the client. The UI can display risk, status, and approval requirements, but all real enforcement belongs in Convex.

## Suggested Branches

- Person A: `feat/kernel`
- Person B: `feat/control-tower`

Pull and merge often. Keep changes focused to avoid conflicts:

- Person A mostly touches `convex/`, agent runner files, and shared kernel client helpers.
- Person B mostly touches app UI files, README copy, screenshots, and presentation docs.

## Sync Points

Use short syncs around contract changes and demo readiness:

- Before changing shared shapes in `docs/CONTRACT.md` or `shared/contracts.ts`.
- Before adding or renaming Convex functions.
- Before changing host executor security behavior.
- Before recording or submitting the demo; use `docs/DEMO_ACCEPTANCE.md`.

## Current Follow-Up Checklist

### Person A

- Verify `npx convex dev`, `npm run agent:run`, `npm run adapter -- world:list`, and `npm run executor:run` still use the same contract.
- Keep `HOST_EXECUTOR_SECRET` out of logs, traces, docs, and screenshots.
- Add new action manifests only with explicit permissions and clear demo semantics.
- Avoid broad schema rewrites unless a migration plan exists.

### Person B

- Keep Control Tower copy aligned with what the live demo can show.
- Keep `mock-data.ts` aligned with seeded Convex world objects and manifests.
- Update README, usage docs, and acceptance docs whenever demo flow changes.
- Capture screenshots or a short fallback recording only after the acceptance checklist passes.

### Together

- Practice the Control Tower path: seed -> propose high-risk action -> approve -> trace replay.
- Practice the host path: seed -> scan -> plan -> approve apply -> executor completes.
- Stop feature work before judging; fix only demo-breaking bugs.

## Shared Rules

- The repo is the source of truth, not Cursor chat.
- Convex is the realtime kernel and source of truth.
- Permission enforcement belongs in Convex, not the client.
- Person B can keep preview mocks, but mocks must match the contract and seeded Convex data.
- Do not expose secrets, tokens, `.env` values, or private credentials.
- Keep the MVP small, working, and demo-safe.

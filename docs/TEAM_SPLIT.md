# OpenAgentOS Team Split

One-line instruction for your teammate:

> Clone the repo, open it in Cursor, read `docs/CONTRACT.md` and `docs/TEAM_SPLIT.md`, work on your branch; the chat in my Cursor is not the source of truth, the repo is.

## Working Model

The team should work in two parallel tracks:

- Person A: Convex kernel and agent surface.
- Person B: Human Control Tower and product story.

Avoid constant sync. Use the contract in `docs/CONTRACT.md` so both people can build independently.

## Person A: Kernel And Agent Track

Person A owns the technical core:

- Convex schema and indexes.
- Kernel queries and mutations.
- Permission and risk enforcement inside Convex.
- Execution state machine.
- Append-only events and traces.
- Agent runner or SDK wrapper.
- Seed and reset flow for repeatable demos.

Person A should make the function contracts in `docs/CONTRACT.md` available as early stubs first, then replace them with real implementation. This lets Person B wire the UI without waiting for the full backend.

Person A should not spend early hours on:

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

Person B should start with mock JSON matching `docs/CONTRACT.md`. When Person A ships Convex functions, replace the mocks with real queries and mutations.

Person B must not implement permission logic in the client. The UI can display risk, status, and approval requirements, but all real enforcement belongs in Convex.

## Suggested Branches

- Person A: `feat/kernel`
- Person B: `feat/control-tower`

Pull and merge often. Keep changes focused to avoid conflicts:

- Person A mostly touches `convex/`, agent runner files, and shared kernel client helpers.
- Person B mostly touches app UI files, README copy, screenshots, and presentation docs.

## Sync Points

Use short 15-minute syncs only:

- Hour 1: Contract frozen. Person B has mock fixtures. Person A has stub function names.
- Hour 6: Person B wires first real `world:list` and `manifests:list`.
- Hour 12: Approvals and executions wire to real mutations.
- Hour 18: Joint run through agent runner plus Control Tower.
- Hour 22: Freeze features. Polish, record, and fix only critical bugs.

## 23-Hour Work Plan

### Hours 0-2: Scaffold And Contracts

Person A:

- Choose project structure for Convex and app.
- Stub listed queries and mutations.
- Create seed data shape.

Person B:

- Build dashboard layout with mock data.
- Create the five main panels: World, Manifests, Approvals, Executions, Trace.
- Use field names from `docs/CONTRACT.md`.

### Hours 2-7: Kernel Foundation

Person A:

- Implement schema for world objects, action manifests, agents, executions, approvals, and events.
- Implement `world:list`, `manifests:list`, and seed data.
- Add event write helper.

Person B:

- Replace world and manifest mocks with Convex queries when ready.
- Add loading and empty states.
- Keep the UI understandable without a spoken explanation.

### Hours 7-12: Execution And Approvals

Person A:

- Implement `kernel:proposeExecution`.
- Implement `kernel:approveExecution` and `kernel:rejectExecution`.
- Enforce risk rules server-side.
- Write events for every transition.

Person B:

- Build approval inbox.
- Build execution status list.
- Wire approve/reject buttons to mutations.

### Hours 12-16: Agent Surface

Person A:

- Build minimal agent runner or SDK helper.
- Agent reads world state, finds an action manifest, proposes execution, and watches status.

Person B:

- Build trace detail view.
- Add simple explanation of what the agent saw, proposed, and what changed.

### Hours 16-19: Product Clarity

Person A:

- Add idempotent `kernel:resetDemo`.
- Harden repeated demo runs.

Person B:

- Add product copy around the five primitives: World State, Action Manifests, Permissions, Events/Traces, Human Control Tower.
- Add the token/latency thesis as a clear product benefit.

### Hours 19-23: Freeze And Present

Person A:

- Fix only demo-breaking kernel bugs.
- Ensure no secrets or `.env` values are written into events or traces.

Person B:

- Polish UI.
- Finish README and submission copy.
- Record screenshots or fallback demo video.

Together:

- Practice the walkthrough.
- Stop adding features after hour 22 unless something critical is broken.

## Shared Rules

- The repo is the source of truth, not Cursor chat.
- Convex is the realtime kernel and source of truth.
- Permission enforcement belongs in Convex, not the client.
- Person B can mock early, but mocks must match the contract.
- Do not expose secrets, tokens, `.env` values, or private credentials.
- Keep the first version small, working, and demo-safe.

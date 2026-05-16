# OpenAgentOS

**Stop making agents click buttons. Give them a world they can read and act in.**

OpenAgentOS is a Convex-powered operating substrate for AI agents. Instead of forcing agents to parse human dashboards, navigate screens, and click UI controls, it gives them structured world state, typed action manifests, explicit permissions, human approvals, executions, and replayable traces.

The core idea is simple: human UIs cost agents tokens, latency, and reliability. OpenAgentOS makes Convex the realtime kernel where agents read machine-readable state, propose typed actions, and leave an auditable trail while humans supervise through a Control Tower dashboard.

## Start Here

If you are joining the project:

1. Read [`docs/CONTRACT.md`](docs/CONTRACT.md) for shared API shapes, Convex function names, and ownership boundaries.
2. Read [`docs/TEAM_SPLIT.md`](docs/TEAM_SPLIT.md) for the Person A / Person B checklist, branches, and sync times.
3. Work from the repo docs, not from someone else's Cursor chat.

## Development

This repo is currently being prepared for the first OpenAgentOS build. Once the app scaffold is added, the expected development flow is:

```sh
npm install
```

Run Convex locally during development:

```sh
npx convex dev
```

Run the app with the package script added by the scaffold:

```sh
npm run dev
```

Do not use `npx convex deploy` for local development.

## Build Priorities

The first version should prove the kernel:

- World State: structured objects agents read instead of dashboards.
- Action Manifests: typed contracts agents invoke instead of buttons.
- Permissions: server-side capability and risk checks.
- Approvals: human-in-the-loop control for risky actions.
- Events and Traces: replayable history of what the agent saw, proposed, and executed.
- Control Tower: a human dashboard over the same Convex state.

## Team Branches

Suggested branches:

- `feat/kernel` for Convex kernel, permissions, executions, traces, and agent runner work.
- `feat/control-tower` for Control Tower UI, product copy, README updates, and demo assets.

Merge or pull often to avoid conflicts. Keep permission enforcement in Convex, not in the client.

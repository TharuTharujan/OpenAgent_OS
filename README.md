# OpenAgentOS

**Stop making agents click buttons. Give them a world they can read and act in.**

OpenAgentOS is a Convex-powered operating substrate for AI agents. Instead of forcing agents to parse human dashboards, navigate screens, and click UI controls, it gives them structured world state, typed action manifests, explicit permissions, human approvals, executions, and replayable traces.

The core idea is simple: human UIs cost agents tokens, latency, and reliability. OpenAgentOS makes Convex the realtime kernel where agents read machine-readable state, propose typed actions, and leave an auditable trail while humans supervise through a Control Tower dashboard.

## Start Here

If you are joining the project:

1. Read [`docs/CONTRACT.md`](docs/CONTRACT.md) for shared API shapes, Convex function names, and ownership boundaries.
2. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for system diagrams and trust boundaries.
3. Read [`docs/USAGE_GUIDE.md`](docs/USAGE_GUIDE.md) for how to run, test, debug, and demo the app.
4. Read [`docs/TOOLS_AND_SERVICES.md`](docs/TOOLS_AND_SERVICES.md) for runtime stack, scripts, and env vars.
5. Read [`docs/DEMO_ACCEPTANCE.md`](docs/DEMO_ACCEPTANCE.md) before recording or judging the MVP demo.
6. Read [`docs/TEAM_SPLIT.md`](docs/TEAM_SPLIT.md) for the Person A / Person B checklist, branches, and sync times.
7. Work from the repo docs, not from someone else's Cursor chat.

## Development

```sh
npm install
```

In one terminal, start Convex (this configures your deployment and regenerates `convex/_generated`):

```sh
npx convex dev
```

Copy the deployment URL into `.env.local`:

```sh
cp .env.local.example .env.local
# set NEXT_PUBLIC_CONVEX_URL to the URL printed by `npx convex dev`
```

In another terminal, run the Control Tower:

```sh
npm run dev
```

Optional: run the minimal agent smoke script (requires the same Convex URL):

```sh
set CONVEX_URL=...   # Windows
export CONVEX_URL=... # macOS/Linux
npm run agent:run
```

Do not use `npx convex deploy` for local development.

**Note:** This repo includes bootstrap `convex/_generated/*` files so TypeScript and `next build` work before the first `npx convex dev`. After Convex connects, prefer the regenerated outputs from `npx convex dev`.

## Convex module paths

See [`docs/CONVEX_API.md`](docs/CONVEX_API.md) for how contract names like `world:list` map to `api.world.list`.

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

## Remaining demo steps

For a repeatable judge-ready walkthrough, follow [`docs/DEMO_ACCEPTANCE.md`](docs/DEMO_ACCEPTANCE.md): seed the kernel, propose a risky execution from the Control Tower, approve it in the inbox, and confirm the trace and world state updates.

Optional: add screenshots under `docs/assets/` (create the folder if needed) before submission; none are committed in-repo by default.

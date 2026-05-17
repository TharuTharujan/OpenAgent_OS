# Tools and services (OpenAgentOS MVP)

## Runtime services

| Service | Role |
| --- | --- |
| **Convex** | Realtime database, queries, mutations, generated client types, source of truth for world, manifests, permissions, executions, events. |
| **Next.js** | Control Tower app host (App Router). |
| **React** | UI for operators and judges. |

## Languages and tooling

| Tool | Role |
| --- | --- |
| **TypeScript** | Shared typing across Convex, Next.js, and scripts. |
| **Node.js** | Runs `next dev` / `next build` and `scripts/*.ts` runners. |
| **npm** | Package install and scripts (`package.json`). |
| **tsx** | Executes TypeScript CLIs (`npm run agent:run`, `npm run adapter`, …). |

## Primary npm scripts

| Script | Command |
| --- | --- |
| Control Tower dev | `npm run dev` |
| Production build | `npm run build` |
| Production start | `npm run start` |
| Agent smoke | `npm run agent:run` |
| Agent adapter (CLI) | `npm run adapter -- <command>` |
| Host OS executor | `npm run executor:run` |
| Host demo orchestrator | `npm run demo:host` |
| Convex dev | `npx convex dev` (regenerates `convex/_generated`, connects deployment) |

## Environment variables

| Variable | Consumer | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js / `ConvexProvider` | Public Convex deployment URL for the browser. |
| `CONVEX_URL` | `scripts/agent-runner.ts`, `scripts/openagent-adapter.ts`, `scripts/os-executor.ts`, `scripts/host-demo-flow.ts` | Same URL for HTTP client (falls back to `NEXT_PUBLIC_CONVEX_URL`). |
| `OPENAI_API_KEY` | `scripts/agent-runner.ts` | Optional. When set, enables **live LLM** mode: model reads world + manifests and proposes executions. Never commit; never log the value. |
| `OPENAI_MODEL` | `scripts/agent-runner.ts` | Optional OpenAI chat model id (defaults to `gpt-4o-mini`). |
| `AGENT_RUNNER_AUTO_APPROVE` | `scripts/agent-runner.ts` | Optional. Set to `1` in live mode to auto-approve pending executions from the CLI (default: unset so judges approve in the Control Tower). |
| `OPENAGENTOS_EXECUTOR_ROOT` | `scripts/os-executor.ts`, `scripts/host-demo-flow.ts` | Absolute path to the sandbox folder for host demo moves. |
| `HOST_EXECUTOR_SECRET` | Convex (`hostExecutor` mutations) + `scripts/os-executor.ts` | Shared secret; must match the value configured in the Convex deployment environment. Never commit real values. |
| `OPENAGENTOS_ADAPTER_TEST_APPROVE` | `scripts/openagent-adapter.ts` | Set to `1` only for scripted tests to allow `approve` / `reject` subcommands from the adapter CLI. |
| `AUTO_APPROVE_HOST_DEMO` | `scripts/host-demo-flow.ts` | Set to `1` to auto-approve the high-risk apply step without using the Control Tower (optional). |

Never commit `.env.local` or real deployment secrets. Use `.env.local.example` as a template only.

`NEXT_PUBLIC_CONVEX_URL` is required for live Control Tower data. If it is absent, the UI intentionally runs in preview mode with local mock data.

## Optional hosting (hackathon)

- **Vercel** (or similar) for the Next.js Control Tower preview build.
- **Convex** cloud deployment for the kernel (prefer `npx convex dev` for local hackathon work; avoid `npx convex deploy` unless targeting production).

## Documentation map

- Product + setup: `README.md`
- Usage, testing, debugging, and viewing workflow: `docs/USAGE_GUIDE.md`
- API contract: `docs/CONTRACT.md`
- Convex path map: `docs/CONVEX_API.md`
- Team split: `docs/TEAM_SPLIT.md`
- Architecture diagrams: `docs/ARCHITECTURE.md`
- Demo acceptance: `docs/DEMO_ACCEPTANCE.md`
- Host sandbox demo scope: `docs/HOST_DEMO.md`

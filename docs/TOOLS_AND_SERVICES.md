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
| **Node.js** | Runs `next dev` / `next build` and `scripts/agent-runner.ts`. |
| **npm** | Package install and scripts (`package.json`). |
| **tsx** | Executes the TypeScript agent runner (`npm run agent:run`). |

## Primary npm scripts

| Script | Command |
| --- | --- |
| Control Tower dev | `npm run dev` |
| Production build | `npm run build` |
| Agent smoke | `npm run agent:run` |
| Convex dev | `npx convex dev` (regenerates `convex/_generated`, connects deployment) |

## Environment variables

| Variable | Consumer | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js / `ConvexProvider` | Public Convex deployment URL for the browser. |
| `CONVEX_URL` | `scripts/agent-runner.ts` | Same URL for HTTP client (falls back to `NEXT_PUBLIC_CONVEX_URL`). |

Never commit `.env.local` or real deployment secrets. Use `.env.local.example` as a template only.

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

# OpenAgentOS architecture

This document mirrors the MVP architecture plan: Convex is the realtime kernel; the Control Tower and agent runner are clients of the same contract (`docs/CONTRACT.md`).

## System context

```mermaid
flowchart LR
  AgentDeveloper[AgentDeveloper] --> AgentRunner[AgentRunner]
  HumanOperator[HumanOperator] --> ControlTower[ControlTowerUI]
  Judge[Judge] --> ControlTower
  AgentRunner -->|"queries mutations"| ConvexKernel[ConvexKernel]
  ControlTower -->|"queries mutations"| ConvexKernel
  ConvexKernel --> ConvexDatabase[ConvexDatabase]
  ConvexDatabase --> WorldState[WorldObjects]
  ConvexDatabase --> ActionManifests[ActionManifests]
  ConvexDatabase --> Permissions[Permissions]
  ConvexDatabase --> Executions[Executions]
  ConvexDatabase --> TraceEvents[TraceEvents]
```

## Component view

```mermaid
flowchart TB
  subgraph frontend [NextControlTower]
    DashboardShell[DashboardShell]
    WorldPanel[WorldPanel]
    ManifestCatalog[ManifestCatalog]
    ApprovalInbox[ApprovalInbox]
    ExecutionPanel[ExecutionPanel]
    TraceTimeline[TraceTimeline]
  end

  subgraph agentSurface [AgentSurface]
    AgentRunner[AgentRunnerScript]
    AgentClient[ConvexHttpClient]
  end

  subgraph convex [ConvexBackend]
    QueryModules[QueryModules]
    KernelMutations[KernelMutations]
    PermissionEngine[PermissionEngine]
    EffectSimulator[DemoEffects]
    EventWriter[EventWriter]
  end

  subgraph storage [Tables]
    AgentsTable[agents]
    WorldTable[worldObjects]
    ManifestsTable[actionManifests]
    PermissionsTable[permissions]
    ExecutionsTable[executions]
    EventsTable[events]
  end

  DashboardShell --> WorldPanel
  DashboardShell --> ManifestCatalog
  DashboardShell --> ApprovalInbox
  DashboardShell --> ExecutionPanel
  DashboardShell --> TraceTimeline
  WorldPanel --> QueryModules
  ManifestCatalog --> QueryModules
  ApprovalInbox --> KernelMutations
  ExecutionPanel --> QueryModules
  TraceTimeline --> QueryModules
  AgentRunner --> AgentClient
  AgentClient --> QueryModules
  AgentClient --> KernelMutations
  KernelMutations --> PermissionEngine
  KernelMutations --> EffectSimulator
  KernelMutations --> EventWriter
  QueryModules --> storage
  PermissionEngine --> PermissionsTable
  EffectSimulator --> WorldTable
  EventWriter --> EventsTable
  KernelMutations --> ExecutionsTable
```

## Execution sequence

```mermaid
sequenceDiagram
  participant Agent as AgentRunner
  participant Kernel as ConvexKernel
  participant DB as ConvexTables
  participant UI as ControlTower
  participant Human as HumanOperator

  Agent->>Kernel: world:list
  Kernel->>DB: Read worldObjects
  DB-->>Kernel: WorldObject records
  Kernel-->>Agent: Machine readable world
  Agent->>Kernel: manifests:list
  Kernel->>DB: Read actionManifests
  DB-->>Kernel: ActionManifest records
  Kernel-->>Agent: Typed action contracts
  Agent->>Kernel: kernel:proposeExecution
  Kernel->>DB: Check permissions and manifest risk
  Kernel->>DB: Create execution and event
  alt Requires approval
    Kernel-->>Agent: pending_approval
    UI->>Kernel: approvals:listPending
    Kernel-->>UI: Pending risky execution
    Human->>UI: Approve or reject
    UI->>Kernel: kernel:approveExecution or rejectExecution
  else Low risk allowed
    Kernel-->>Agent: running
  end
  Kernel->>DB: Apply sandboxed demo effect
  Kernel->>DB: Update execution status
  Kernel->>DB: Append trace events
  UI->>Kernel: events:listByExecution
  Kernel-->>UI: Replayable trace timeline
```

## Execution lifecycle

```mermaid
stateDiagram-v2
  [*] --> proposed
  proposed --> denied: permission denied
  proposed --> pending_approval: risky action
  proposed --> running: low risk allowed
  pending_approval --> rejected: human rejects
  pending_approval --> approved: human approves
  approved --> running
  running --> succeeded: effect applied
  running --> failed: effect error
  denied --> [*]
  rejected --> [*]
  succeeded --> [*]
  failed --> [*]
```

## Trust boundaries

- **Convex kernel** enforces permissions (default deny), risk/approval gating, execution transitions, and trace writes.
- **Control Tower** is display and human intent only; it must not decide authorization.
- **Agent runner** is the reference integration: reads world/manifests, proposes executions, optionally approves in demos, prints traces.

## Key files

| Area | Path |
| --- | --- |
| Schema | `convex/schema.ts` |
| Kernel / lifecycle | `convex/kernel.ts` |
| Events helper | `convex/lib/events.ts` |
| DTO mappers | `convex/lib/shapes.ts` |
| Shared TS shapes | `shared/contracts.ts` |
| Contract doc | `docs/CONTRACT.md` |
| API map | `docs/CONVEX_API.md` |
| Control Tower | `app/page.tsx`, `app/components/control-tower/*` |
| Agent smoke | `scripts/agent-runner.ts` |

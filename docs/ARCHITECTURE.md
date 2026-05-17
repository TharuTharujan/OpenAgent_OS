# OpenAgentOS architecture

This document mirrors the implemented MVP architecture: Convex is the realtime kernel; the Control Tower, agent runner, adapter CLI, and local host executor are clients of the same contract (`docs/CONTRACT.md`).

## System context

```mermaid
flowchart LR
  AgentDeveloper[AgentDeveloper] --> AgentRunner[AgentRunner]
  AgentDeveloper --> AdapterCLI[AdapterCLI]
  HostOperator[HostOperator] --> HostExecutor[LocalHostExecutor]
  HumanOperator[HumanOperator] --> ControlTower[ControlTowerUI]
  Judge[Judge] --> ControlTower
  AgentRunner -->|"queries mutations"| ConvexKernel[ConvexKernel]
  AdapterCLI -->|"queries mutations"| ConvexKernel
  ControlTower -->|"queries mutations"| ConvexKernel
  HostExecutor -->|"polls awaiting_host submits result"| ConvexKernel
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
    AdapterCli[OpenAgentAdapterCLI]
    HostDemoFlow[HostDemoFlowScript]
    AgentClient[ConvexHttpClient]
  end

  subgraph hostSurface [LocalHostSurface]
    HostExecutor[OSExecutorScript]
    SandboxFolder[SandboxFolder]
  end

  subgraph convex [ConvexBackend]
    QueryModules[QueryModules]
    KernelMutations[KernelMutations]
    PermissionEngine[PermissionEngine]
    EffectSimulator[DemoEffectsAndHostDeferral]
    HostExecutorApi[HostExecutorApi]
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
  AdapterCli --> AgentClient
  HostDemoFlow --> AgentClient
  AgentClient --> QueryModules
  AgentClient --> KernelMutations
  AgentClient --> HostExecutorApi
  HostExecutor --> SandboxFolder
  HostExecutor --> AgentClient
  KernelMutations --> PermissionEngine
  KernelMutations --> EffectSimulator
  KernelMutations --> EventWriter
  HostExecutorApi --> EventWriter
  HostExecutorApi --> WorldTable
  HostExecutorApi --> ExecutionsTable
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
  participant HostExecutor as LocalHostExecutor

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
  opt Host-deferred action
    Kernel->>DB: Mark execution awaiting_host
    HostExecutor->>Kernel: hostExecutor:listAwaitingHost
    HostExecutor->>Kernel: hostExecutor:submitHostResult
  end
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
  running --> awaiting_host: local OS executor required
  awaiting_host --> succeeded: host reports success
  awaiting_host --> failed: host reports failure
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
- **Agent runner and adapter CLI** are reference agent integrations: they read world/manifests, propose executions, and inspect traces without scraping the UI.
- **Local host executor** is the only component allowed to touch the filesystem, and it must stay under `OPENAGENTOS_EXECUTOR_ROOT`.

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
| Adapter CLI | `scripts/openagent-adapter.ts` |
| Local host executor | `scripts/os-executor.ts`, `convex/hostExecutor.ts` |
| Scripted host demo | `scripts/host-demo-flow.ts` |

"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { Event, Execution, WorldObject } from "../shared/contracts";
import { ApprovalInboxPanel } from "./components/control-tower/ApprovalInboxPanel";
import { DemoControlsPanel } from "./components/control-tower/DemoControlsPanel";
import { ExecutionPanel } from "./components/control-tower/ExecutionPanel";
import { ManifestCatalogPanel } from "./components/control-tower/ManifestCatalogPanel";
import { ProposeExecutionPanel } from "./components/control-tower/ProposeExecutionPanel";
import {
  MOCK_EVENTS_BY_EXECUTION,
  MOCK_EXECUTIONS,
  MOCK_MANIFESTS,
  MOCK_WORLD_OBJECTS,
} from "./components/control-tower/mock-data";
import { TraceTimelinePanel } from "./components/control-tower/TraceTimelinePanel";
import { WorldStateViewer } from "./components/control-tower/WorldStateViewer";

export default function HomePage() {
  const missingUrl = !process.env.NEXT_PUBLIC_CONVEX_URL;

  const worldFromConvex = useQuery(api.world.list, missingUrl ? "skip" : {});
  const manifestsFromConvex = useQuery(api.manifests.list, missingUrl ? "skip" : {});
  const executionsFromConvex = useQuery(api.executions.list, missingUrl ? "skip" : { limit: 30 });
  const pendingFromConvex = useQuery(api.approvals.listPending, missingUrl ? "skip" : {});

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [lastSeededAgentId, setLastSeededAgentId] = useState<Id<"agents"> | null>(null);

  const executionDetailFromConvex = useQuery(
    api.executions.get,
    !missingUrl && selectedExecutionId
      ? { id: selectedExecutionId as Id<"executions"> }
      : "skip",
  );

  const seedDemo = useMutation(api.kernel.seedDemo);
  const resetDemo = useMutation(api.kernel.resetDemo);
  const approveExecution = useMutation(api.kernel.approveExecution);
  const rejectExecution = useMutation(api.kernel.rejectExecution);

  const worldDisplay: WorldObject[] | undefined = missingUrl ? MOCK_WORLD_OBJECTS : worldFromConvex;

  const manifestsDisplay = missingUrl ? MOCK_MANIFESTS : manifestsFromConvex;

  const executionsDisplay: Execution[] | undefined = missingUrl ? MOCK_EXECUTIONS : executionsFromConvex;

  const pendingDisplay: Execution[] | undefined = missingUrl
    ? MOCK_EXECUTIONS.filter((e) => e.status === "pending_approval")
    : pendingFromConvex;

  useEffect(() => {
    if (!executionsDisplay || executionsDisplay.length === 0) return;
    setSelectedExecutionId((current) => {
      if (current && executionsDisplay.some((e) => e.id === current)) return current;
      return executionsDisplay[0]?.id ?? null;
    });
  }, [executionsDisplay]);

  const eventsFromConvex = useQuery(
    api.events.listByExecution,
    !missingUrl && selectedExecutionId
      ? { executionId: selectedExecutionId as Id<"executions"> }
      : "skip",
  );

  const traceEvents: Event[] | undefined = useMemo(() => {
    if (!selectedExecutionId) return undefined;
    if (missingUrl) {
      return MOCK_EVENTS_BY_EXECUTION[selectedExecutionId] ?? [];
    }
    return eventsFromConvex;
  }, [missingUrl, selectedExecutionId, eventsFromConvex]);

  const executionDetailBlock = useMemo(() => {
    if (!selectedExecutionId) {
      return { phase: "idle" as const, detail: undefined as Execution | null | undefined };
    }
    if (missingUrl) {
      const row = executionsDisplay?.find((e) => e.id === selectedExecutionId) ?? null;
      return { phase: "ready" as const, detail: row };
    }
    if (executionDetailFromConvex === undefined) {
      return { phase: "loading" as const, detail: undefined as Execution | null | undefined };
    }
    return { phase: "ready" as const, detail: executionDetailFromConvex };
  }, [missingUrl, selectedExecutionId, executionsDisplay, executionDetailFromConvex]);

  const traceExecutionSummary = useMemo((): Execution | null => {
    if (!selectedExecutionId) return null;
    if (missingUrl) {
      return executionsDisplay?.find((e) => e.id === selectedExecutionId) ?? null;
    }
    if (executionDetailFromConvex !== undefined) {
      return executionDetailFromConvex;
    }
    return executionsDisplay?.find((e) => e.id === selectedExecutionId) ?? null;
  }, [missingUrl, selectedExecutionId, executionsDisplay, executionDetailFromConvex]);

  const pendingCountLabel = missingUrl
    ? String(pendingDisplay?.length ?? 0)
    : pendingDisplay === undefined
      ? "…"
      : String(pendingDisplay.length);

  async function handleApprove(executionId: string) {
    if (missingUrl) return;
    const hint =
      typeof window !== "undefined"
        ? window.prompt("Optional operator hint for audit trail (leave blank to skip):", "") || undefined
        : undefined;
    await approveExecution({
      executionId: executionId as Id<"executions">,
      operatorHint: hint,
    });
  }

  async function handleReject(executionId: string) {
    if (missingUrl) return;
    const reason =
      typeof window !== "undefined"
        ? window.prompt("Rejection reason (optional):", "rejected") || undefined
        : undefined;
    await rejectExecution({
      executionId: executionId as Id<"executions">,
      reason,
    });
  }

  return (
    <main>
      <header className="page-header">
        <div>
          <h1>Control Tower</h1>
          <p className="page-hero__tagline">Watch agent activity, approve sensitive steps, and review what happened — in one place.</p>
        </div>
        <details className="developer-details">
          <summary>For developers: Convex and contracts</summary>
          <div className="developer-details__body">
            <p>
              With <code className="mono">NEXT_PUBLIC_CONVEX_URL</code> set, this page reads live kernel data from Convex.
              Exact payload shapes live in <code className="mono">docs/CONTRACT.md</code> in the repo.
            </p>
          </div>
        </details>
      </header>

      <div className="callout" role="region" aria-label="What this screen is for">
        <p className="callout__text">
          This screen is your review desk: see what an automated agent suggested, approve or decline anything sensitive,
          and scroll the timeline so the outcome is never a mystery.
        </p>
      </div>

      <ol className="quick-steps" aria-label="How to explore the demo">
        <li>
          <span>
            <strong>Start the demo</strong> to load sample data and a pretend agent.
          </span>
        </li>
        <li>
          <span>
            <strong>Send a sample request</strong> using the simple fields (defaults are safe).
          </span>
        </li>
        <li>
          <span>
            <strong>Approve or reject</strong> anything waiting in the inbox, then follow the run in executions and the
            timeline.
          </span>
        </li>
      </ol>

      {missingUrl ? (
        <div className="banner" role="status">
          <strong className="banner__title">Preview mode — sample data only</strong>
          The dashboard is not connected to your live backend yet. You can still click through every panel using safe
          sample data. To use real data, add <code>NEXT_PUBLIC_CONVEX_URL</code> to <code>.env.local</code> with the URL
          from your Convex dev deployment (<code>npx convex dev</code> shows it).
        </div>
      ) : null}

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <DemoControlsPanel
            disabled={missingUrl}
            pendingCountLabel={pendingCountLabel}
            demoAgentId={lastSeededAgentId}
            onSeed={async () => {
              const result = await seedDemo({});
              if (result.agentId) {
                setLastSeededAgentId(result.agentId);
              }
            }}
            onReset={() => {
              if (typeof window !== "undefined" && !window.confirm("Reset all demo kernel data?")) return;
              void (async () => {
                await resetDemo({});
                setLastSeededAgentId(null);
              })();
            }}
          />

          <ProposeExecutionPanel
            disabled={missingUrl}
            agentId={lastSeededAgentId}
            manifests={manifestsDisplay}
            onProposed={(executionId) => setSelectedExecutionId(executionId)}
          />

          <ManifestCatalogPanel manifests={manifestsDisplay} />
        </aside>

        <div className="dashboard-main">
          <section className="panel">
            <h2>Live snapshot</h2>
            <p className="panel-subtitle--plain">
              Counters, services, and other values the agent can read or change — your ground truth for the demo.
            </p>
            <details className="developer-details">
              <summary>API reference</summary>
              <div className="developer-details__body">
                <p>
                  Convex query <code className="mono">api.world.list</code> · contract <code className="mono">world:list</code>
                </p>
              </div>
            </details>
            <WorldStateViewer objects={worldDisplay} source={missingUrl ? "mock" : "convex"} />
          </section>

          <ApprovalInboxPanel
            pending={pendingDisplay}
            disabled={missingUrl}
            onApprove={(id) => void handleApprove(id)}
            onReject={(id) => void handleReject(id)}
          />

          <div className="dashboard-split">
            <ExecutionPanel
              executions={executionsDisplay}
              selectedId={selectedExecutionId}
              onSelect={(id) => setSelectedExecutionId(id)}
              detail={executionDetailBlock.detail}
              detailPhase={!selectedExecutionId ? "idle" : executionDetailBlock.phase}
            />

            <TraceTimelinePanel
              events={traceEvents}
              executionId={selectedExecutionId}
              executionSummary={traceExecutionSummary}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

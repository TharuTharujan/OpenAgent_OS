"use client";

import type { Event, Execution } from "../../../shared/contracts";
import { formatJson, formatTs } from "../../lib/format";
import { summarizeTraceEvent } from "./traceEventNarrative";

export function TraceTimelinePanel({
  events,
  executionId,
  executionSummary,
}: {
  events: Event[] | undefined;
  executionId: string | null;
  /** Optional detail from `executions:get` (or mock row) for compact context above the trace. */
  executionSummary?: Execution | null;
}) {
  return (
    <section className="panel">
      <h2>Activity timeline</h2>
      <p className="panel-subtitle--plain">
        A step-by-step replay of the selected run — plain language first, raw details when you expand an entry.
      </p>
      <details className="developer-details">
        <summary>API reference</summary>
        <div className="developer-details__body">
          <p>
            <code className="mono">events.listByExecution</code>
          </p>
        </div>
      </details>
      {executionId && executionSummary ? (
        <p className="panel-hint">
          <span className="mono">{executionSummary.actionName}</span> · {executionSummary.status}
          {executionSummary.finishedAt !== undefined ? (
            <> · finished {formatTs(executionSummary.finishedAt)}</>
          ) : (
            <> · created {formatTs(executionSummary.createdAt)}</>
          )}
        </p>
      ) : null}
      {!executionId ? (
        <p className="panel-placeholder">Pick a run in the table above to replay its timeline.</p>
      ) : events === undefined ? (
        <p className="panel-placeholder" role="status">
          Loading trace for <code className="mono">{executionId}</code>…
        </p>
      ) : events.length === 0 ? (
        <p className="panel-placeholder">No events for this execution yet.</p>
      ) : (
        <ol className="trace-list">
          {events.map((ev) => (
            <li key={ev.id} className="trace-item">
              <div className="trace-item__head">
                <span className="trace-type mono">{ev.type}</span>
                <span className="trace-ts">{formatTs(ev.ts)}</span>
              </div>
              <p className="trace-narrative">{summarizeTraceEvent(ev.type, ev.payload)}</p>
              <pre className="trace-payload">{formatJson(ev.payload, true)}</pre>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

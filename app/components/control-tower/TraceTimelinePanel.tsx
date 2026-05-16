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
    <section className="panel panel--span">
      <h2>Trace timeline</h2>
      <p className="panel-subtitle">events:listByExecution</p>
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
        <p className="panel-placeholder">Select an execution above to replay its events.</p>
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

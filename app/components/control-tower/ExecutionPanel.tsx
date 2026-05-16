"use client";

import type { Execution } from "../../../shared/contracts";
import { formatJson, formatTs } from "../../lib/format";

function statusClass(status: Execution["status"]): string {
  switch (status) {
    case "succeeded":
      return "status-badge status-badge--ok";
    case "failed":
    case "denied":
    case "rejected":
      return "status-badge status-badge--bad";
    case "pending_approval":
      return "status-badge status-badge--warn";
    case "running":
    case "approved":
    case "proposed":
    default:
      return "status-badge status-badge--neutral";
  }
}

export function ExecutionPanel({
  executions,
  selectedId,
  onSelect,
  detail,
  detailPhase,
}: {
  executions: Execution[] | undefined;
  selectedId: string | null;
  onSelect: (executionId: string) => void;
  /** Resolved execution for `executions:get` (Convex) or the mock row. */
  detail: Execution | null | undefined;
  /** `idle` when nothing selected; `loading` while Convex get resolves. */
  detailPhase: "idle" | "loading" | "ready";
}) {
  if (executions === undefined) {
    return (
      <section className="panel panel--span">
        <h2>Executions</h2>
        <p className="panel-subtitle">executions:list · executions:get</p>
        <p className="panel-placeholder" role="status">
          Loading executions…
        </p>
      </section>
    );
  }

  return (
    <section className="panel panel--span">
      <h2>Executions</h2>
      <p className="panel-subtitle">Select a row to load its trace and details (executions:get).</p>
      {selectedId && detailPhase === "loading" ? (
        <p className="panel-placeholder" role="status">
          Loading execution <code className="mono">{selectedId}</code>…
        </p>
      ) : null}
      {selectedId && detailPhase === "ready" && detail === null ? (
        <p className="panel-placeholder" role="status">
          Execution <code className="mono">{selectedId}</code> not found.
        </p>
      ) : null}
      {selectedId && detailPhase === "ready" && detail ? (
        <div className="exec-detail">
          <div>
            <strong className="mono">{detail.actionName}</strong>{" "}
            <span className={statusClass(detail.status)}>{detail.status}</span>
          </div>
          <div className="exec-detail__meta">
            <span>Created {formatTs(detail.createdAt)}</span>
            {detail.finishedAt !== undefined ? <span>Finished {formatTs(detail.finishedAt)}</span> : null}
            <span>
              Agent <code className="mono">{detail.agentId}</code>
            </span>
          </div>
        </div>
      ) : null}
      {executions.length === 0 ? (
        <p className="panel-placeholder">No executions yet. Seed the demo, then propose one above.</p>
      ) : (
        <div className="exec-table-wrap">
          <table className="exec-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Action</th>
                <th>Created</th>
                <th>Input</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((ex) => (
                <tr
                  key={ex.id}
                  className={selectedId === ex.id ? "exec-row exec-row--selected" : "exec-row"}
                  onClick={() => onSelect(ex.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(ex.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>
                    <span className={statusClass(ex.status)}>{ex.status}</span>
                  </td>
                  <td className="mono">{ex.actionName}</td>
                  <td>{formatTs(ex.createdAt)}</td>
                  <td className="exec-input-cell">
                    <code>{formatJson(ex.input)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

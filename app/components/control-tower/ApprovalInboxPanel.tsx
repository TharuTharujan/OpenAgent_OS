"use client";

import type { Execution } from "../../../shared/contracts";
import { formatJson, formatTs } from "../../lib/format";

export function ApprovalInboxPanel({
  pending,
  disabled,
  onApprove,
  onReject,
}: {
  pending: Execution[] | undefined;
  disabled: boolean;
  onApprove: (executionId: string) => void;
  onReject: (executionId: string) => void;
}) {
  if (pending === undefined) {
    return (
      <section className="panel">
        <h2>Needs your OK</h2>
        <p className="panel-subtitle--plain">Loading items that are waiting for a human decision…</p>
        <details className="developer-details">
          <summary>API reference</summary>
          <div className="developer-details__body">
            <p>
              <code className="mono">approvals.listPending</code> · approve / reject via{" "}
              <code className="mono">kernel.approveExecution</code> / <code className="mono">kernel.rejectExecution</code>
            </p>
          </div>
        </details>
        <p className="panel-placeholder" role="status">
          Loading…
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Needs your OK</h2>
      <p className="panel-subtitle--plain">
        Anything sensitive stops here until you approve or reject. Approve only when the details match what you expect.
      </p>
      <details className="developer-details">
        <summary>API reference</summary>
        <div className="developer-details__body">
          <p>
            <code className="mono">approvals.listPending</code> · <code className="mono">kernel.approveExecution</code> /{" "}
            <code className="mono">kernel.rejectExecution</code>
          </p>
        </div>
      </details>
      {disabled ? (
        <p className="panel-placeholder">Connect Convex to approve or reject live requests from this screen.</p>
      ) : null}
      {pending.length === 0 ? (
        <p className="panel-placeholder">Nothing is waiting on you right now.</p>
      ) : (
        <ul className="approval-list">
          {pending.map((ex) => (
            <li key={ex.id} className="approval-card">
              <div className="approval-card__row">
                <span className="approval-card__action">{ex.actionName}</span>
                <span className="approval-card__time">{formatTs(ex.createdAt)}</span>
              </div>
              <div className="approval-card__meta mono">Request id: {ex.id}</div>
              <details className="details-advanced">
                <summary className="details-advanced__summary">View full request details</summary>
                <div className="details-advanced__body">
                  <pre className="approval-card__input">{formatJson(ex.input, true)}</pre>
                </div>
              </details>
              <div className="approval-card__actions">
                <button
                  type="button"
                  className="btn-approve btn-primary"
                  disabled={disabled}
                  onClick={() => onApprove(ex.id)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={disabled}
                  onClick={() => onReject(ex.id)}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

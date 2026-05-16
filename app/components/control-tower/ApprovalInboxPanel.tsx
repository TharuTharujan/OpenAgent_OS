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
        <h2>Approval inbox</h2>
        <p className="panel-subtitle">approvals:listPending · kernel:approveExecution / rejectExecution</p>
        <p className="panel-placeholder" role="status">
          Loading pending approvals…
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Approval inbox</h2>
      <p className="panel-subtitle">approvals:listPending · kernel:approveExecution / rejectExecution</p>
      {disabled ? (
        <p className="panel-placeholder">Connect Convex to approve or reject live executions.</p>
      ) : null}
      {pending.length === 0 ? (
        <p className="panel-placeholder">No pending approvals.</p>
      ) : (
        <ul className="approval-list">
          {pending.map((ex) => (
            <li key={ex.id} className="approval-card">
              <div className="approval-card__row">
                <span className="approval-card__action">{ex.actionName}</span>
                <span className="approval-card__time">{formatTs(ex.createdAt)}</span>
              </div>
              <div className="approval-card__meta mono">execution: {ex.id}</div>
              <pre className="approval-card__input">{formatJson(ex.input, true)}</pre>
              <div className="approval-card__actions">
                <button
                  type="button"
                  className="btn-approve"
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

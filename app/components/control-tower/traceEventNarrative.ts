/**
 * One-line human summaries for trace events (kernel + demo). Keep in sync with `docs/CONTRACT.md` types.
 */
export function summarizeTraceEvent(type: string, payload: Record<string, unknown>): string {
  const actionName = typeof payload.actionName === "string" ? payload.actionName : undefined;
  const resourceKey = typeof payload.resourceKey === "string" ? payload.resourceKey : undefined;
  const reason = typeof payload.reason === "string" ? payload.reason : undefined;
  const risk = typeof payload.risk === "string" ? payload.risk : undefined;
  const mode = typeof payload.mode === "string" ? payload.mode : undefined;
  const actorHint = typeof payload.actorHint === "string" ? payload.actorHint : undefined;
  const verificationResult =
    typeof payload.verificationResult === "string" ? payload.verificationResult : undefined;
  const bump = typeof payload.bump === "number" ? payload.bump : undefined;
  const counter = typeof payload.counter === "number" ? payload.counter : undefined;
  const targetVersion = typeof payload.targetVersion === "string" ? payload.targetVersion : undefined;
  const message = typeof payload.message === "string" ? payload.message : undefined;

  switch (type) {
    case "execution.proposed":
      return actionName
        ? `Agent proposed action “${actionName}”${actorHint ? ` (${actorHint})` : ""}.`
        : "Agent proposed a new execution.";
    case "approval.requested":
      return risk
        ? `Human approval requested (${risk} risk)${actionName ? ` for “${actionName}”` : ""}.`
        : `Human approval requested${actionName ? ` for “${actionName}”` : ""}.`;
    case "approval.approved":
      return mode
        ? `Approval recorded (${mode}).`
        : `Operator approved the execution${actorHint ? ` (${actorHint})` : ""}.`;
    case "approval.rejected":
      return reason ? `Operator rejected: ${reason}.` : "Operator rejected the execution.";
    case "execution.approved":
      return mode ? `Execution approved (${mode}).` : "Execution approved; proceeding.";
    case "execution.running":
      return actionName ? `Kernel started running “${actionName}”.` : "Kernel started running the action.";
    case "execution.succeeded":
      return actionName ? `Execution finished successfully (“${actionName}”).` : "Execution finished successfully.";
    case "execution.failed":
      return reason ? `Execution failed: ${reason}.` : "Execution failed.";
    case "execution.denied":
      return reason ? `Execution denied: ${reason}.` : "Execution denied by policy.";
    case "effect.observe_world":
      return "Effect: observation recorded (no world mutation).";
    case "effect.world_patched":
      if (resourceKey !== undefined && counter !== undefined) {
        return bump !== undefined
          ? `Effect: updated ${resourceKey} counter to ${counter} (+${bump}).`
          : `Effect: updated ${resourceKey} counter to ${counter}.`;
      }
      return resourceKey ? `Effect: patched world object ${resourceKey}.` : "Effect: patched a world object.";
    case "effect.rollback_started":
      return targetVersion && resourceKey
        ? `Effect: rollback started on ${resourceKey} toward ${targetVersion}.`
        : "Effect: rollback started.";
    case "effect.rollback_verified":
      return verificationResult
        ? `Effect: rollback verified (${verificationResult}).`
        : "Effect: rollback verified.";
    case "effect.unimplemented":
      return message ? `Effect not implemented: ${message}` : "Effect not implemented for this action.";
    default:
      return "Event recorded.";
  }
}

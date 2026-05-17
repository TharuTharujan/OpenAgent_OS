/**
 * Shared API shapes for Control Tower and agent clients.
 * Source of truth: `docs/CONTRACT.md`
 */
export type WorldObject = {
  id: string;
  resourceKey: string;
  type: string;
  state: Record<string, unknown>;
  updatedAt: number;
};

export type ActionManifest = {
  id: string;
  name: string;
  description: string;
  resourceType: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export type Execution = {
  id: string;
  agentId: string;
  actionName: string;
  input: Record<string, unknown>;
  status:
    | "proposed"
    | "pending_approval"
    | "approved"
    | "running"
    | "awaiting_host"
    | "succeeded"
    | "failed"
    | "denied"
    | "rejected";
  createdAt: number;
  finishedAt?: number;
};

export type Event = {
  id: string;
  type: string;
  ts: number;
  executionId?: string;
  /** May include `eventSource`, `actorHint`, and action-specific fields per docs/CONTRACT.md */
  payload: Record<string, unknown>;
};

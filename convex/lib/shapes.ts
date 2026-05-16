import type { Doc, Id } from "../_generated/dataModel";

/** Mirrors `docs/CONTRACT.md` shared shapes for mapping DB docs to API. */
export type WorldObjectDTO = {
  id: string;
  resourceKey: string;
  type: string;
  state: Record<string, unknown>;
  updatedAt: number;
};

export type ActionManifestDTO = {
  id: string;
  name: string;
  description: string;
  resourceType: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export type ExecutionDTO = {
  id: string;
  agentId: string;
  actionName: string;
  input: Record<string, unknown>;
  status:
    | "proposed"
    | "pending_approval"
    | "approved"
    | "running"
    | "succeeded"
    | "failed"
    | "denied"
    | "rejected";
  createdAt: number;
  finishedAt?: number;
};

export type EventDTO = {
  id: string;
  type: string;
  ts: number;
  executionId?: string;
  /** See docs/CONTRACT.md for optional payload keys like eventSource and actorHint. */
  payload: Record<string, unknown>;
};

export function toWorldObject(doc: Doc<"worldObjects">): WorldObjectDTO {
  return {
    id: doc._id,
    resourceKey: doc.resourceKey,
    type: doc.type,
    state: doc.state as Record<string, unknown>,
    updatedAt: doc.updatedAt,
  };
}

export function toManifest(doc: Doc<"actionManifests">): ActionManifestDTO {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    resourceType: doc.resourceType,
    risk: doc.risk,
    requiresApproval: doc.requiresApproval,
    inputSchema: doc.inputSchema as Record<string, unknown>,
    outputSchema: doc.outputSchema as Record<string, unknown>,
  };
}

export function toExecution(doc: Doc<"executions">): ExecutionDTO {
  return {
    id: doc._id,
    agentId: doc.agentId,
    actionName: doc.actionName,
    input: doc.input as Record<string, unknown>,
    status: doc.status,
    createdAt: doc.createdAt,
    finishedAt: doc.finishedAt,
  };
}

export function toEvent(doc: Doc<"events">): EventDTO {
  return {
    id: doc._id,
    type: doc.type,
    ts: doc.ts,
    executionId: doc.executionId,
    payload: doc.payload as Record<string, unknown>,
  };
}

export type IdAgents = Id<"agents">;
export type IdExecutions = Id<"executions">;

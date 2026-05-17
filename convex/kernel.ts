import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { appendEvent } from "./lib/events";

async function wipeAll(ctx: MutationCtx): Promise<void> {
  for (const row of await ctx.db.query("events").collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db.query("executions").collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db.query("permissions").collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db.query("worldObjects").collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db.query("actionManifests").collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db.query("agents").collect()) {
    await ctx.db.delete(row._id);
  }
}

function requiresHumanApproval(manifest: Doc<"actionManifests">): boolean {
  if (manifest.risk === "LOW" && !manifest.requiresApproval) return false;
  return true;
}

async function evaluatePermission(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  actionName: string,
): Promise<"allow" | "deny"> {
  const rules = await ctx.db
    .query("permissions")
    .withIndex("by_agent_action", (q) =>
      q.eq("agentId", agentId).eq("actionName", actionName),
    )
    .collect();

  if (rules.some((r) => r.effect === "deny")) return "deny";
  if (rules.some((r) => r.effect === "allow")) return "allow";
  return "deny";
}

async function getManifestByName(
  ctx: MutationCtx,
  actionName: string,
): Promise<Doc<"actionManifests"> | null> {
  return await ctx.db
    .query("actionManifests")
    .withIndex("by_name", (q) => q.eq("name", actionName))
    .unique();
}

/** Kernel effect outcome. `deferred_host` means the local OS executor must finish the work. */
async function applyEffect(
  ctx: MutationCtx,
  execution: Doc<"executions">,
  manifest: Doc<"actionManifests">,
): Promise<"implemented" | "unimplemented" | "deferred_host"> {
  const input = execution.input as Record<string, unknown>;
  const actionName = execution.actionName;

  if (actionName === "observe_world") {
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.observe_world",
      payload: {
        note: "No world mutation. Structured read path only.",
        eventSource: "kernel",
      },
    });
    return "implemented";
  }

  if (actionName === "publish_readiness_packet") {
    const clip = (s: unknown, max: number): string => {
      const str = typeof s === "string" ? s : String(s ?? "");
      return str.length <= max ? str : `${str.slice(0, max)}…`;
    };
    const observation = clip(input.observation, 1500);
    const selectedNextAction = clip(input.selectedNextAction, 200);
    const rationaleForHuman = clip(input.rationaleForHuman, 1500);
    const confidence =
      typeof input.confidence === "number" && Number.isFinite(input.confidence)
        ? input.confidence
        : undefined;
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.readiness_published",
      payload: {
        observation,
        selectedNextAction,
        rationaleForHuman,
        ...(confidence !== undefined ? { confidence } : {}),
        eventSource: "kernel",
        note: "Structured readiness only; no API keys or raw prompts stored.",
      },
    });
    return "implemented";
  }

  if (actionName === "increment_counter") {
    const resourceKey = String(input.resourceKey ?? "demo:counter");
    const delta = Number(input.delta ?? 1);
    const doc = await ctx.db
      .query("worldObjects")
      .withIndex("by_resourceKey", (q) => q.eq("resourceKey", resourceKey))
      .unique();
    if (!doc) {
      throw new Error(`Unknown world resourceKey: ${resourceKey}`);
    }
    const state = { ...doc.state } as Record<string, unknown>;
    const current = Number(state.counter ?? 0);
    state.counter = current + delta;
    await ctx.db.patch(doc._id, {
      state,
      updatedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.world_patched",
      payload: { resourceKey, counter: state.counter, eventSource: "kernel" },
    });
    return "implemented";
  }

  if (actionName === "bump_counter_batch") {
    const resourceKey = String(input.resourceKey ?? "demo:counter");
    const doc = await ctx.db
      .query("worldObjects")
      .withIndex("by_resourceKey", (q) => q.eq("resourceKey", resourceKey))
      .unique();
    if (!doc) {
      throw new Error(`Unknown world resourceKey: ${resourceKey}`);
    }
    const state = { ...doc.state } as Record<string, unknown>;
    const current = Number(state.counter ?? 0);
    const bump = Number(input.amount ?? 10);
    state.counter = current + bump;
    await ctx.db.patch(doc._id, {
      state,
      updatedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.world_patched",
      payload: { resourceKey, counter: state.counter, bump, eventSource: "kernel" },
    });
    return "implemented";
  }

  if (actionName === "scan_demo_folder") {
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.host_deferred",
      payload: {
        eventSource: "kernel",
        actionName,
        reason: "scan_requires_local_executor",
        note: "Local executor should read OPENAGENTOS_EXECUTOR_ROOT and call hostExecutor.submitHostResult.",
      },
    });
    return "deferred_host";
  }

  if (actionName === "propose_file_organization") {
    const clip = (s: unknown, max: number): string => {
      const str = typeof s === "string" ? s : String(s ?? "");
      return str.length <= max ? str : `${str.slice(0, max)}…`;
    };
    const planSummary = clip(input.planSummary, 2000);
    const moves = Array.isArray(input.movesPreview) ? input.movesPreview.slice(0, 50) : [];
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.file_plan_proposed",
      payload: {
        eventSource: "kernel",
        planSummary,
        movesPreview: moves,
        note: "Trace-only plan; host filesystem is not modified by Convex.",
      },
    });
    return "implemented";
  }

  if (actionName === "apply_file_organization") {
    const plan = input.plan as Record<string, unknown> | undefined;
    const movesRaw = plan?.moves;
    if (!Array.isArray(movesRaw)) {
      throw new Error("apply_file_organization requires input.plan.moves as an array.");
    }
    const moves = movesRaw.slice(0, 50).map((m) => {
      if (!m || typeof m !== "object") throw new Error("Each move must be an object with from and to strings.");
      const rec = m as Record<string, unknown>;
      if (typeof rec.from !== "string" || typeof rec.to !== "string") {
        throw new Error("Each move must have string from and to (relative paths under sandbox).");
      }
      return { from: rec.from, to: rec.to };
    });
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.host_deferred",
      payload: {
        eventSource: "kernel",
        actionName,
        reason: "apply_requires_local_executor",
        moveCount: moves.length,
        note: "Local executor validates paths under OPENAGENTOS_EXECUTOR_ROOT then calls submitHostResult.",
      },
    });
    return "deferred_host";
  }

  if (actionName === "rollback_deployment") {
    const resourceKey = String(input.resourceKey ?? "service:payment-api");
    const targetVersion = String(input.targetVersion ?? "");
    const reason = String(input.reason ?? "");
    const doc = await ctx.db
      .query("worldObjects")
      .withIndex("by_resourceKey", (q) => q.eq("resourceKey", resourceKey))
      .unique();
    if (!doc) {
      throw new Error(`Unknown world resourceKey: ${resourceKey}`);
    }
    const prev = (doc.state as Record<string, unknown>).latestDeployment;
    const state: Record<string, unknown> = {
      ...(doc.state as Record<string, unknown>),
      status: "recovering",
      previousDeployment: prev,
      latestDeployment: targetVersion,
      lastRollbackReason: reason,
    };
    await ctx.db.patch(doc._id, {
      state,
      updatedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.rollback_started",
      payload: { resourceKey, targetVersion, eventSource: "kernel" },
    });
    state.status = "healthy";
    state.errorRate = 0.8;
    state.latencyP95 = "340ms";
    await ctx.db.patch(doc._id, {
      state,
      updatedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId: execution._id,
      type: "effect.rollback_verified",
      payload: { resourceKey, verificationResult: "health_checks_passed", eventSource: "kernel" },
    });
    return "implemented";
  }

  await appendEvent(ctx, {
    executionId: execution._id,
    type: "effect.unimplemented",
    payload: {
      actionName,
      manifestName: manifest.name,
      message:
        "No simulator effect implemented for this action yet. Add a handler in convex/kernel.ts.",
      eventSource: "kernel",
    },
  });
  return "unimplemented";
}

async function runApprovedExecution(
  ctx: MutationCtx,
  executionId: Id<"executions">,
): Promise<void> {
  const execution = await ctx.db.get(executionId);
  if (!execution) throw new Error("Execution not found");

  const manifest = await getManifestByName(ctx, execution.actionName);
  if (!manifest) {
    await ctx.db.patch(executionId, {
      status: "failed",
      finishedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId,
      type: "execution.failed",
      payload: { reason: "missing_manifest_at_execute", eventSource: "kernel" },
    });
    return;
  }

  await ctx.db.patch(executionId, { status: "running" });
  await appendEvent(ctx, {
    executionId,
    type: "execution.running",
    payload: { actionName: execution.actionName, eventSource: "kernel" },
  });

  let effectResult: "implemented" | "unimplemented" | "deferred_host";
  try {
    effectResult = await applyEffect(ctx, execution, manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.db.patch(executionId, {
      status: "failed",
      finishedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId,
      type: "execution.failed",
      payload: { reason: message, eventSource: "kernel" },
    });
    return;
  }

  if (effectResult === "unimplemented") {
    await ctx.db.patch(executionId, {
      status: "failed",
      finishedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId,
      type: "execution.failed",
      payload: {
        reason: "effect_not_implemented",
        actionName: execution.actionName,
        eventSource: "kernel",
      },
    });
    return;
  }

  if (effectResult === "deferred_host") {
    await ctx.db.patch(executionId, { status: "awaiting_host" });
    await appendEvent(ctx, {
      executionId,
      type: "execution.awaiting_host",
      payload: {
        actionName: execution.actionName,
        eventSource: "kernel",
        note: "Waiting for local OS executor (scripts/os-executor.ts).",
      },
    });
    return;
  }

  await ctx.db.patch(executionId, {
    status: "succeeded",
    finishedAt: Date.now(),
  });
  await appendEvent(ctx, {
    executionId,
    type: "execution.succeeded",
    payload: { actionName: execution.actionName, eventSource: "kernel" },
  });
}

/**
 * Contract: `kernel:resetDemo`
 * Convex path: `api.kernel.resetDemo`
 */
export const resetDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await wipeAll(ctx);
    return { ok: true as const };
  },
});

/**
 * Contract: `kernel:seedDemo`
 * Convex path: `api.kernel.seedDemo`
 */
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await wipeAll(ctx);

    const agentId = await ctx.db.insert("agents", {
      name: "openagentos-demo-agent",
    });

    await ctx.db.insert("worldObjects", {
      resourceKey: "demo:counter",
      type: "DEMO",
      state: { counter: 0, label: "Shared demo counter" },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("worldObjects", {
      resourceKey: "service:payment-api",
      type: "SERVICE",
      state: {
        status: "degraded",
        latestDeployment: "v42",
        previousDeployment: "v41",
        errorRate: 12,
        latencyP95: "8.2s",
        dependencies: ["database:orders", "service:checkout"],
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("worldObjects", {
      resourceKey: "host:demo-folder",
      type: "HOST",
      state: {
        demoScope: "sandbox_folder_organization",
        note: "Point OPENAGENTOS_EXECUTOR_ROOT at a demo folder and run scripts/os-executor.ts with HOST_EXECUTOR_SECRET.",
        fileCount: 0,
        files: [],
        executorStatus: "offline",
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("actionManifests", {
      name: "publish_readiness_packet",
      description:
        "Publish a trace-only readiness summary (observation, planned next action, rationale). No secrets; no raw prompts.",
      resourceType: "ANY",
      risk: "LOW",
      requiresApproval: false,
      inputSchema: {
        observation: "string",
        selectedNextAction: "string",
        rationaleForHuman: "string",
        confidence: "number?",
      },
      outputSchema: { published: "boolean" },
    });

    await ctx.db.insert("actionManifests", {
      name: "observe_world",
      description: "Append-only observation with no world mutation.",
      resourceType: "ANY",
      risk: "LOW",
      requiresApproval: false,
      inputSchema: { note: "string" },
      outputSchema: { observed: "boolean" },
    });

    await ctx.db.insert("actionManifests", {
      name: "increment_counter",
      description: "Increment a demo counter on a world object (safe).",
      resourceType: "DEMO",
      risk: "LOW",
      requiresApproval: false,
      inputSchema: { resourceKey: "string", delta: "number" },
      outputSchema: { counter: "number" },
    });

    await ctx.db.insert("actionManifests", {
      name: "bump_counter_batch",
      description: "Apply a larger counter bump (riskier, requires approval).",
      resourceType: "DEMO",
      risk: "HIGH",
      requiresApproval: true,
      inputSchema: { resourceKey: "string", amount: "number" },
      outputSchema: { counter: "number" },
    });

    await ctx.db.insert("actionManifests", {
      name: "rollback_deployment",
      description: "Rollback a service to a previous deployment version (simulated).",
      resourceType: "SERVICE",
      risk: "HIGH",
      requiresApproval: true,
      inputSchema: { targetVersion: "string", reason: "string", resourceKey: "string" },
      outputSchema: { status: "string", verificationResult: "string" },
    });

    await ctx.db.insert("actionManifests", {
      name: "scan_demo_folder",
      description:
        "Scan the configured local demo folder (OPENAGENTOS_EXECUTOR_ROOT) and publish file inventory to world state. Deferred to local executor.",
      resourceType: "HOST",
      risk: "LOW",
      requiresApproval: false,
      inputSchema: { note: "string?" },
      outputSchema: { fileCount: "number", files: "array" },
    });

    await ctx.db.insert("actionManifests", {
      name: "propose_file_organization",
      description:
        "Publish a trace-only file organization plan (summary + optional move preview). Does not touch the host filesystem.",
      resourceType: "HOST",
      risk: "LOW",
      requiresApproval: false,
      inputSchema: { planSummary: "string", movesPreview: "array?" },
      outputSchema: { published: "boolean" },
    });

    await ctx.db.insert("actionManifests", {
      name: "apply_file_organization",
      description:
        "Apply a relative-path move plan under the sandbox folder. High risk; requires human approval; completed by local executor.",
      resourceType: "HOST",
      risk: "HIGH",
      requiresApproval: true,
      inputSchema: { plan: { moves: "array<{from:string,to:string}>" } },
      outputSchema: { applied: "boolean" },
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "publish_readiness_packet",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "bump_counter_batch",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "rollback_deployment",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "observe_world",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "increment_counter",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "scan_demo_folder",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "propose_file_organization",
      effect: "allow",
    });

    await ctx.db.insert("permissions", {
      agentId,
      actionName: "apply_file_organization",
      effect: "allow",
    });

    return { ok: true as const, agentId };
  },
});

/**
 * Contract: `kernel:proposeExecution`
 * Convex path: `api.kernel.proposeExecution`
 */
export const proposeExecution = mutation({
  args: {
    agentId: v.id("agents"),
    actionName: v.string(),
    input: v.record(v.string(), v.any()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Unknown agentId");
    }

    const now = Date.now();
    const executionId = await ctx.db.insert("executions", {
      agentId: args.agentId,
      actionName: args.actionName,
      input: args.input,
      status: "proposed",
      createdAt: now,
    });

    await appendEvent(ctx, {
      executionId,
      type: "execution.proposed",
      payload: {
        actionName: args.actionName,
        input: args.input,
        eventSource: "agent",
        actorHint: `agent:${agent.name}`,
      },
    });

    const manifest = await getManifestByName(ctx, args.actionName);
    if (!manifest) {
      await ctx.db.patch(executionId, {
        status: "failed",
        finishedAt: Date.now(),
      });
      await appendEvent(ctx, {
        executionId,
        type: "execution.failed",
        payload: { reason: "unknown_action_manifest", eventSource: "kernel" },
      });
      return { executionId, status: "failed" as const };
    }

    const permission = await evaluatePermission(ctx, args.agentId, args.actionName);
    if (permission === "deny") {
      await ctx.db.patch(executionId, {
        status: "denied",
        finishedAt: Date.now(),
      });
      await appendEvent(ctx, {
        executionId,
        type: "execution.denied",
        payload: { reason: "permission_denied", eventSource: "kernel" },
      });
      return { executionId, status: "denied" as const };
    }

    if (requiresHumanApproval(manifest)) {
      await ctx.db.patch(executionId, { status: "pending_approval" });
      await appendEvent(ctx, {
        executionId,
        type: "approval.requested",
        payload: {
          risk: manifest.risk,
          requiresApproval: manifest.requiresApproval,
          actionName: manifest.name,
          eventSource: "kernel",
        },
      });
      return { executionId, status: "pending_approval" as const };
    }

    await ctx.db.patch(executionId, { status: "approved" });
    await appendEvent(ctx, {
      executionId,
      type: "execution.approved",
      payload: { mode: "auto_low_risk", eventSource: "kernel" },
    });

    await runApprovedExecution(ctx, executionId);
    const final = await ctx.db.get(executionId);
    return { executionId, status: final?.status ?? "unknown" };
  },
});

/**
 * Contract: `kernel:approveExecution`
 * Convex path: `api.kernel.approveExecution`
 */
export const approveExecution = mutation({
  args: {
    executionId: v.id("executions"),
    operatorHint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");
    if (execution.status !== "pending_approval") {
      throw new Error(`Cannot approve execution in status: ${execution.status}`);
    }

    const hint =
      args.operatorHint && args.operatorHint.length > 200
        ? args.operatorHint.slice(0, 200)
        : args.operatorHint;

    await ctx.db.patch(args.executionId, { status: "approved" });
    await appendEvent(ctx, {
      executionId: args.executionId,
      type: "approval.approved",
      payload: {
        eventSource: "control_tower",
        actorHint: hint ?? "human_operator",
      },
    });

    await runApprovedExecution(ctx, args.executionId);
    const final = await ctx.db.get(args.executionId);
    return { executionId: args.executionId, status: final?.status ?? "unknown" };
  },
});

/**
 * Contract: `kernel:rejectExecution`
 * Convex path: `api.kernel.rejectExecution`
 */
export const rejectExecution = mutation({
  args: {
    executionId: v.id("executions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");
    if (execution.status !== "pending_approval") {
      throw new Error(`Cannot reject execution in status: ${execution.status}`);
    }

    await ctx.db.patch(args.executionId, {
      status: "rejected",
      finishedAt: Date.now(),
    });
    await appendEvent(ctx, {
      executionId: args.executionId,
      type: "approval.rejected",
      payload: {
        reason: args.reason ?? "rejected",
        eventSource: "control_tower",
        actorHint: "human_operator",
      },
    });
    return { executionId: args.executionId, status: "rejected" as const };
  },
});

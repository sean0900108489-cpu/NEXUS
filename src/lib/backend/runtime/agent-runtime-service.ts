import type {
  AgentRuntimeSessionRecord,
  AgentTaskCancelResponse,
  AgentTaskCreateRequest,
  AgentTaskCreateResponse,
  AgentTaskRecord,
  AgentTaskStatusResponse,
} from "@/lib/nexus-types";
import { NEXUS_MODEL_CATALOG } from "@/lib/nexus-registry";

import { ApiError } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";
import { getDefaultObservabilityService } from "../observability/observability-service";
import { SecretBoundaryService } from "../security/secret-boundary-service";
import type { PermissionService } from "../security/permission-service";
import { createWorkspaceStatePermissionService } from "../workspace/workspace-permission";

import {
  createAgentRuntimeRepository,
  type AgentRuntimeRepository,
} from "./agent-runtime-repository";
import {
  isAgentTaskType,
  isTerminalAgentTaskStatus,
} from "./runtime-constants";

export type AgentRuntimeContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export type CreateTaskOptions = {
  initialStatus?: AgentTaskRecord["status"];
  skipPermissionCheck?: boolean;
};

export type StreamTaskInput = {
  agentId: string;
  workspaceId: string;
  provider?: string;
  model?: string;
  taskId?: string;
  sessionId?: string;
  outputMessageId?: string;
  metadata?: Record<string, unknown>;
};

export class AgentRuntimeService {
  private readonly repository: AgentRuntimeRepository;
  private readonly secretBoundaryService: SecretBoundaryService;
  private readonly permissionService: PermissionService;

  constructor(dependencies: {
    repository?: AgentRuntimeRepository;
    secretBoundaryService?: SecretBoundaryService;
    permissionService?: PermissionService;
  } = {}) {
    this.repository = dependencies.repository ?? createAgentRuntimeRepository();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
    this.permissionService =
      dependencies.permissionService ?? createWorkspaceStatePermissionService();
  }

  async createTask(
    agentId: string,
    input: AgentTaskCreateRequest,
    context: AgentRuntimeContext = {},
    options: CreateTaskOptions = {},
  ): Promise<AgentTaskCreateResponse> {
    if (!isAgentTaskType(input.taskType)) {
      throw new ApiError("VALIDATION_FAILED", "Agent task type is invalid.", 400, {
        issues: [
          {
            code: "invalid_enum",
            message: "Agent task type is invalid.",
            path: ["taskType"],
          },
        ],
      });
    }

    const userId = context.userId?.trim();

    if (!userId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    if (!options.skipPermissionCheck) {
      await this.assertEditorPermission({
        action: "agent_task.create",
        agentId,
        context,
        userId,
        workspaceId: input.workspaceId,
      });
    }

    const model = input.model ? assertRegisteredModel(input.model) : undefined;
    const provider = input.provider?.trim() || undefined;
    const metadata = this.sanitizeRuntimeRecord({
      ...(input.metadata ?? {}),
      taskType: input.taskType,
    });
    const sessionResult = await this.getOrCreateSession({
      agentId,
      metadata: {
        taskType: input.taskType,
      },
      model,
      provider,
      userId,
      workspaceId: input.workspaceId,
    });
    const task = await this.repository.createTask({
      agentId,
      inputMessageId: input.inputMessageId,
      metadata,
      outputMessageId: input.outputMessageId,
      parentTaskId: input.parentTaskId,
      sessionId: sessionResult.session.id,
      status: options.initialStatus ?? "created",
      taskType: input.taskType,
      workspaceId: input.workspaceId,
    });

    await this.emitAgentEvent("agent.task.created", task, context, {
      provider,
      sessionId: sessionResult.session.id,
      sessionReused: sessionResult.reused,
    });

    return {
      session: sessionResult.session,
      sessionReused: sessionResult.reused,
      task,
    };
  }

  async getTask(
    input: { agentId: string; taskId: string; workspaceId: string },
  ): Promise<AgentTaskStatusResponse> {
    const task = await this.requireTask(input.taskId);

    this.assertTaskScope(task, input);

    return { task };
  }

  async cancelTask(
    input: { agentId: string; taskId: string; workspaceId: string },
    context: AgentRuntimeContext = {},
  ): Promise<AgentTaskCancelResponse> {
    const task = await this.requireTask(input.taskId);

    this.assertTaskScope(task, input);

    if (isTerminalAgentTaskStatus(task.status)) {
      return {
        cancelled: false,
        task,
      };
    }

    const cancelled = await this.repository.patchTask(task.id, {
      status: "cancelled",
    });

    await this.emitAgentEvent("agent.task.cancelled", cancelled, context, {
      previousStatus: task.status,
    });

    return {
      cancelled: true,
      task: cancelled,
    };
  }

  async prepareStreamTask(
    input: StreamTaskInput,
    context: AgentRuntimeContext = {},
  ) {
    const userId = context.userId?.trim();

    if (!userId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    await this.assertEditorPermission({
      action: "workspace.update",
      agentId: input.agentId,
      context,
      userId,
      workspaceId: input.workspaceId,
    });

    let task: AgentTaskRecord;
    let session: AgentRuntimeSessionRecord | null = null;
    let sessionReused = false;

    if (input.taskId) {
      task = await this.requireTask(input.taskId);
      this.assertTaskScope(task, {
        agentId: input.agentId,
        taskId: input.taskId,
        workspaceId: input.workspaceId,
      });
      session = await this.requireSessionForTask(task, {
        agentId: input.agentId,
        model: input.model,
        provider: input.provider,
        sessionId: input.sessionId,
        userId,
        workspaceId: input.workspaceId,
      });
      if (isTerminalAgentTaskStatus(task.status)) {
        throw new ApiError("VALIDATION_FAILED", "Terminal agent tasks cannot be streamed.", 409);
      }
    } else {
      const created = await this.createTask(
        input.agentId,
        {
          metadata: input.metadata,
          model: input.model,
          outputMessageId: input.outputMessageId,
          provider: input.provider,
          taskType: "chat",
          workspaceId: input.workspaceId,
        },
        context,
        {
          skipPermissionCheck: true,
        },
      );
      task = created.task;
      session = created.session;
      sessionReused = created.sessionReused;
    }

    const streaming = await this.repository.patchTask(task.id, {
      attemptCount: task.attemptCount + 1,
      outputMessageId: input.outputMessageId ?? task.outputMessageId,
      status: "streaming",
    });
    await this.appendRuntimeEvent({
      eventType: "stream_started",
      payload: {
        model: input.model,
        provider: input.provider,
        sessionId: streaming.sessionId,
      },
      taskId: streaming.id,
    });

    return {
      session,
      sessionReused,
      task: streaming,
    };
  }

  async markFirstToken(taskId: string, payload: Record<string, unknown> = {}) {
    await this.appendRuntimeEvent({
      eventType: "first_token",
      payload,
      taskId,
    });
  }

  async markFallbackUsed(taskId: string, payload: Record<string, unknown>) {
    await this.appendRuntimeEvent({
      eventType: "fallback_used",
      payload,
      taskId,
    });
  }

  async completeTask(
    taskId: string,
    context: AgentRuntimeContext = {},
    payload: Record<string, unknown> = {},
  ) {
    const current = await this.requireTask(taskId);

    if (isTerminalAgentTaskStatus(current.status)) {
      return current;
    }

    const task = await this.repository.patchTask(taskId, {
      status: "completed",
    });
    await this.appendRuntimeEvent({
      eventType: "stream_completed",
      payload,
      taskId,
    });
    getDefaultObservabilityService().recordUsageMetric({
      agentId: task.agentId,
      costEstimate: numberOrNull(payload.costEstimate),
      inputTokens: numberOrNull(payload.inputTokens),
      latencyMs: numberOrNull(payload.latencyMs),
      model: stringOrNull(payload.model),
      outputTokens: numberOrNull(payload.outputTokens),
      provider: stringOrNull(payload.provider),
      taskId: task.id,
      workspaceId: task.workspaceId,
    });
    await this.emitAgentEvent("agent.task.completed", task, context, payload);

    return task;
  }

  async failTask(
    taskId: string,
    errorCode: string,
    context: AgentRuntimeContext = {},
    payload: Record<string, unknown> = {},
  ) {
    const current = await this.requireTask(taskId);

    if (isTerminalAgentTaskStatus(current.status)) {
      return current;
    }

    const task = await this.repository.patchTask(taskId, {
      errorCode,
      status: "failed",
    });
    await this.appendRuntimeEvent({
      eventType: "stream_failed",
      payload: {
        ...payload,
        errorCode,
      },
      taskId,
    });
    await this.emitAgentEvent("agent.task.failed", task, context, {
      ...payload,
      errorCode,
    });

    return task;
  }

  async createMemoryCompressTaskQueued(input: {
    agentId: string;
    workspaceId: string;
    model?: string;
    provider?: string;
    metadata?: Record<string, unknown>;
  }, context: AgentRuntimeContext) {
    return this.createTask(
      input.agentId,
      {
        metadata: input.metadata,
        model: input.model,
        provider: input.provider,
        taskType: "memory_compress",
        workspaceId: input.workspaceId,
      },
      context,
      {
        initialStatus: "queued",
      },
    );
  }

  private async getOrCreateSession(input: {
    workspaceId: string;
    agentId: string;
    userId: string;
    provider?: string | null;
    model?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const active = await this.repository.findActiveSession(input);

    if (active) {
      return {
        reused: true,
        session: active,
      };
    }

    const session = await this.repository.createSession({
      ...input,
      metadata: this.sanitizeRuntimeRecord(input.metadata ?? {}),
    });

    return {
      reused: false,
      session,
    };
  }

  private async requireTask(taskId: string) {
    const task = await this.repository.findTask(taskId);

    if (!task) {
      throw new ApiError("AGENT_TASK_NOT_FOUND", "Agent task was not found.", 404);
    }

    return task;
  }

  private async requireSessionForTask(
    task: AgentTaskRecord,
    input: {
      workspaceId: string;
      agentId: string;
      userId: string;
      sessionId?: string;
      provider?: string;
      model?: string;
    },
  ) {
    if (!task.sessionId) {
      throw new ApiError(
        "AGENT_RUNTIME_UNAVAILABLE",
        "Agent task is not bound to a runtime session.",
        409,
      );
    }

    if (input.sessionId && input.sessionId !== task.sessionId) {
      throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403);
    }

    const session = await this.repository.findSession(task.sessionId);

    if (!session) {
      throw new ApiError(
        "AGENT_RUNTIME_UNAVAILABLE",
        "Agent runtime session was not found.",
        409,
      );
    }

    if (
      session.workspaceId !== input.workspaceId ||
      session.agentId !== input.agentId ||
      session.userId !== input.userId ||
      session.status !== "active" ||
      session.endedAt
    ) {
      throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403);
    }

    if (
      (input.model && session.model && input.model !== session.model) ||
      (input.provider && session.provider && input.provider !== session.provider)
    ) {
      throw new ApiError("VALIDATION_FAILED", "Runtime context does not match the task session.", 400, {
        issues: [
          {
            code: "runtime_context_mismatch",
            message: "Runtime context does not match the task session.",
            path: ["sessionId"],
          },
        ],
      });
    }

    return session;
  }

  private async appendRuntimeEvent(input: {
    taskId: string;
    eventType: Parameters<AgentRuntimeRepository["appendEvent"]>[0]["eventType"];
    payload?: Record<string, unknown>;
  }) {
    await this.repository.appendEvent({
      eventType: input.eventType,
      payload: this.sanitizeRuntimeRecord(input.payload ?? {}),
      taskId: input.taskId,
    });
  }

  private sanitizeRuntimeRecord(value: Record<string, unknown>) {
    const redacted = this.secretBoundaryService.redact(value);
    const record = isRecord(redacted) ? redacted : {};

    this.secretBoundaryService.assertNoSecrets(record);

    return record;
  }

  private assertTaskScope(
    task: AgentTaskRecord,
    scope: { workspaceId: string; agentId: string; taskId: string },
  ) {
    if (task.workspaceId !== scope.workspaceId || task.agentId !== scope.agentId) {
      throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403);
    }
  }

  private async assertEditorPermission(input: {
    workspaceId: string;
    agentId: string;
    userId: string;
    action: string;
    context: AgentRuntimeContext;
  }) {
    const decision = await this.permissionService.check(
      {
        action: input.action,
        resourceId: input.agentId,
        resourceType: "workspace",
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
      {
        requestId: input.context.requestId,
        traceId: input.context.traceId,
      },
    );

    if (decision.decision !== "allow") {
      throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403, {
        reasonCode: decision.reasonCode,
      });
    }
  }

  private async emitAgentEvent(
    name: string,
    task: AgentTaskRecord,
    context: AgentRuntimeContext,
    payload: Record<string, unknown>,
  ) {
    if (!context.requestId || !context.traceId) {
      return;
    }

    await emitBackendEvent({
      name,
      payload: this.sanitizeRuntimeRecord({
        ...payload,
        agentId: task.agentId,
        source: "agent",
        status: task.status,
        taskId: task.id,
        taskType: task.taskType,
      }),
      status: task.status === "failed" ? "failed" : "succeeded",
      trace: {
        requestId: context.requestId,
        resourceId: task.id,
        resourceType: "agent_task",
        source: "agent",
        traceId: context.traceId,
        userId: context.userId,
        workspaceId: task.workspaceId,
      },
    });
  }
}

export function createAgentRuntimeService() {
  return new AgentRuntimeService();
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assertRegisteredModel(model: string) {
  const normalized = model.trim();
  const known = NEXUS_MODEL_CATALOG.some((entry) => entry.id === normalized);

  if (!known) {
    throw new ApiError("VALIDATION_FAILED", "Model is not registered in NEXUS_MODEL_CATALOG.", 400, {
      issues: [
        {
          code: "invalid_model",
          message: "Model is not registered in NEXUS_MODEL_CATALOG.",
          path: ["model"],
        },
      ],
    });
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

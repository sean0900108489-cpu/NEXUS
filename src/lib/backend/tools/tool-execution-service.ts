import type {
  ToolRunCancelResponse,
  ToolRunConfirmResponse,
  ToolRunListResponse,
  ToolRunRecord,
  ToolRunRequest,
  ToolRunResponse,
} from "@/lib/nexus-types";

import { ApiError, sanitizeErrorMessage } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import {
  ExistingToolExecutorAdapter,
  createToolHash,
  normalizeExecutableInput,
  type ToolExecutorAdapter,
} from "./tool-executor-adapter";
import { ToolPermissionGate } from "./tool-permission-gate";
import {
  createToolRunRepository,
  type ToolRunRepository,
} from "./tool-run-repository";
import {
  ToolRegistryValidator,
  type ToolRegistryResolution,
} from "./tool-registry-validator";

export type ToolExecutionContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
  runtimeApiKey?: string;
};

export type ToolExecutionServiceDependencies = {
  repository?: ToolRunRepository;
  registryValidator?: ToolRegistryValidator;
  permissionGate?: ToolPermissionGate;
  executorAdapter?: ToolExecutorAdapter;
  secretBoundaryService?: SecretBoundaryService;
  confirmationTtlMs?: number;
};

const DEFAULT_CONFIRMATION_TTL_MS = 15 * 60 * 1000;
const TERMINAL_TOOL_RUN_STATUSES = new Set([
  "cancelled",
  "failed",
  "materialized",
  "succeeded",
]);

export class ToolExecutionService {
  private readonly repository: ToolRunRepository;
  private readonly registryValidator: ToolRegistryValidator;
  private readonly permissionGate: ToolPermissionGate;
  private readonly executorAdapter: ToolExecutorAdapter;
  private readonly secretBoundaryService: SecretBoundaryService;
  private readonly confirmationTtlMs: number;

  constructor(dependencies: ToolExecutionServiceDependencies = {}) {
    this.repository = dependencies.repository ?? createToolRunRepository();
    this.registryValidator =
      dependencies.registryValidator ?? new ToolRegistryValidator();
    this.permissionGate = dependencies.permissionGate ?? new ToolPermissionGate();
    this.executorAdapter =
      dependencies.executorAdapter ?? new ExistingToolExecutorAdapter();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
    this.confirmationTtlMs =
      dependencies.confirmationTtlMs ?? DEFAULT_CONFIRMATION_TTL_MS;
  }

  async runTool(
    toolId: string,
    input: ToolRunRequest,
    context: ToolExecutionContext = {},
  ): Promise<ToolRunResponse> {
    const userId = requireUserId(context.userId);
    const resolution = this.registryValidator.resolve(toolId);
    const scope = input.scope?.trim() || "execute";
    const prepared = await this.prepareInput(input.input);
    const gate = await this.permissionGate.check({
      requestId: context.requestId,
      riskLevel: resolution.riskLevel,
      scope,
      toolId: resolution.registryToolId,
      traceId: context.traceId,
      userId,
      workspaceId: input.workspaceId,
    });

    if (!gate.allowed) {
      await this.repository.create({
        agentId: input.agentId ?? null,
        createdBy: userId,
        errorCode: gate.reasonCode,
        errorMessage: "Tool execution is not allowed.",
        executableInput: prepared.executableInput,
        executorId: resolution.executorId,
        inputHash: prepared.inputHash,
        inputRedacted: prepared.inputRedacted,
        riskLevel: resolution.riskLevel,
        status: "blocked",
        taskId: input.taskId ?? null,
        toolId: resolution.registryToolId,
        workspaceId: input.workspaceId,
      });

      throw new ApiError(
        gate.reasonCode === "TOOL_PERMISSION_DISABLED"
          ? "TOOL_PERMISSION_DISABLED"
          : "TOOL_PERMISSION_DENIED",
        "Tool execution is not allowed.",
        403,
        {
          reasonCode: gate.reasonCode,
        },
      );
    }

    if (prepared.secretDetected) {
      await this.repository.create({
        agentId: input.agentId ?? null,
        createdBy: userId,
        errorCode: "TOOL_SECRET_DETECTED",
        errorMessage: "Tool input contains a secret and was rejected.",
        executableInput: prepared.executableInput,
        executorId: resolution.executorId,
        inputHash: prepared.inputHash,
        inputRedacted: prepared.inputRedacted,
        riskLevel: resolution.riskLevel,
        status: "blocked",
        taskId: input.taskId ?? null,
        toolId: resolution.registryToolId,
        workspaceId: input.workspaceId,
      });

      throw new ApiError(
        "TOOL_SECRET_DETECTED",
        "Tool input contains a secret and was rejected.",
        400,
        {
          matchCount: prepared.secretMatchCount,
          redactionStatus: "redacted",
        },
      );
    }

    if (gate.requiresConfirmation) {
      const toolRun = await this.repository.create({
        agentId: input.agentId ?? null,
        confirmationExpiresAt: new Date(Date.now() + this.confirmationTtlMs).toISOString(),
        createdBy: userId,
        executableInput: prepared.executableInput,
        executorId: resolution.executorId,
        inputHash: prepared.inputHash,
        inputRedacted: prepared.inputRedacted,
        riskLevel: resolution.riskLevel,
        status: "awaiting_confirmation",
        taskId: input.taskId ?? null,
        toolId: resolution.registryToolId,
        workspaceId: input.workspaceId,
      });

      await this.emitToolEvent("tool.run.awaiting_confirmation", toolRun, context);

      return {
        confirmationRequired: true,
        materializationStatus: "not_requested",
        toolRun,
      };
    }

    const toolRun = await this.repository.create({
      agentId: input.agentId ?? null,
      createdBy: userId,
      executableInput: prepared.executableInput,
      executorId: resolution.executorId,
      inputHash: prepared.inputHash,
      inputRedacted: prepared.inputRedacted,
      riskLevel: resolution.riskLevel,
      status: "created",
      taskId: input.taskId ?? null,
      toolId: resolution.registryToolId,
      workspaceId: input.workspaceId,
    });

    return this.executeToolRun(toolRun, resolution, context);
  }

  async confirmToolRun(
    toolRunId: string,
    input: { workspaceId: string },
    context: ToolExecutionContext = {},
  ): Promise<ToolRunConfirmResponse> {
    const userId = requireUserId(context.userId);
    const toolRun = await this.requireToolRun(toolRunId, input.workspaceId);
    const resolution = this.registryValidator.resolve(toolRun.toolId);
    const gate = await this.permissionGate.check({
      requestId: context.requestId,
      riskLevel: toolRun.riskLevel,
      scope: "execute",
      toolId: toolRun.toolId,
      traceId: context.traceId,
      userId,
      workspaceId: toolRun.workspaceId,
    });

    if (!gate.allowed) {
      throw new ApiError("TOOL_PERMISSION_DENIED", "Tool execution is not allowed.", 403, {
        reasonCode: gate.reasonCode,
      });
    }

    if (toolRun.status !== "awaiting_confirmation") {
      throw new ApiError(
        "TOOL_RUN_NOT_CONFIRMABLE",
        "Tool run cannot be confirmed.",
        409,
        {
          status: toolRun.status,
        },
      );
    }

    if (
      toolRun.confirmationExpiresAt &&
      new Date(toolRun.confirmationExpiresAt).getTime() <= Date.now()
    ) {
      await this.repository.patch(toolRun.id, {
        endedAt: new Date().toISOString(),
        errorCode: "TOOL_CONFIRMATION_EXPIRED",
        errorMessage: "Tool run confirmation has expired.",
        status: "failed",
      });

      throw new ApiError(
        "TOOL_CONFIRMATION_EXPIRED",
        "Tool run confirmation has expired.",
        409,
      );
    }

    const confirmed = await this.repository.patch(toolRun.id, {
      confirmedAt: new Date().toISOString(),
      confirmedBy: userId,
    });
    const executed = await this.executeToolRun(confirmed, resolution, context);

    return {
      ...executed,
      confirmed: true,
    };
  }

  async cancelToolRun(
    toolRunId: string,
    input: { workspaceId: string },
    context: ToolExecutionContext = {},
  ): Promise<ToolRunCancelResponse> {
    const userId = requireUserId(context.userId);
    const toolRun = await this.requireToolRun(toolRunId, input.workspaceId);

    if (TERMINAL_TOOL_RUN_STATUSES.has(toolRun.status)) {
      await this.permissionGate.assertRead({
        requestId: context.requestId,
        resourceId: toolRunId,
        traceId: context.traceId,
        userId,
        workspaceId: toolRun.workspaceId,
      });

      return {
        cancelled: false,
        toolRun,
      };
    }

    const gate = await this.permissionGate.check({
      requestId: context.requestId,
      riskLevel: toolRun.riskLevel,
      scope: "execute",
      toolId: toolRun.toolId,
      traceId: context.traceId,
      userId,
      workspaceId: toolRun.workspaceId,
    });

    if (!gate.allowed) {
      throw new ApiError("TOOL_PERMISSION_DENIED", "Tool execution is not allowed.", 403, {
        reasonCode: gate.reasonCode,
      });
    }

    const cancelled = await this.repository.patch(toolRun.id, {
      endedAt: new Date().toISOString(),
      status: "cancelled",
    });

    await this.emitToolEvent("tool.run.cancelled", cancelled, context);

    return {
      cancelled: true,
      toolRun: cancelled,
    };
  }

  async getToolRun(
    toolRunId: string,
    input: { workspaceId: string },
    context: ToolExecutionContext = {},
  ) {
    requireUserId(context.userId);
    const toolRun = await this.requireToolRun(toolRunId, input.workspaceId);

    await this.permissionGate.assertRead({
      requestId: context.requestId,
      resourceId: toolRunId,
      traceId: context.traceId,
      userId: context.userId ?? "",
      workspaceId: toolRun.workspaceId,
    });

    return { toolRun };
  }

  async listToolRuns(
    query: { workspaceId: string; agentId?: string | null; limit?: number | null },
    context: ToolExecutionContext = {},
  ): Promise<ToolRunListResponse> {
    requireUserId(context.userId);
    await this.permissionGate.assertRead({
      requestId: context.requestId,
      traceId: context.traceId,
      userId: context.userId ?? "",
      workspaceId: query.workspaceId,
    });
    const toolRuns = await this.repository.findByWorkspace({
      agentId: query.agentId,
      limit: clampLimit(query.limit),
      workspaceId: query.workspaceId,
    });

    return {
      toolRuns,
      workspaceId: query.workspaceId,
    };
  }

  private async executeToolRun(
    toolRun: ToolRunRecord,
    resolution: ToolRegistryResolution,
    context: ToolExecutionContext,
  ): Promise<ToolRunResponse> {
    const startedAt = Date.now();
    const running = await this.repository.patch(toolRun.id, {
      startedAt: new Date().toISOString(),
      status: "running",
    });

    try {
      const result = await this.executorAdapter.execute({
        agentId: running.agentId,
        executableInput: running.executableInput,
        resolution,
        runtimeApiKey: context.runtimeApiKey,
        workspaceId: running.workspaceId,
      });
      const completed = await this.repository.patch(running.id, {
        endedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: null,
        outputHash: result.outputHash,
        outputRedacted: result.outputRedacted,
        status: "succeeded",
      });

      await this.emitToolEvent("tool.run.succeeded", completed, context, {
        latencyMs: Date.now() - startedAt,
        materializationStatus: result.materializationStatus,
      });

      return {
        confirmationRequired: false,
        materializationStatus: result.materializationStatus,
        toolRun: completed,
      };
    } catch (error) {
      const normalized = normalizeToolExecutionError(error);
      const failed = await this.repository.patch(running.id, {
        endedAt: new Date().toISOString(),
        errorCode: normalized.code,
        errorMessage: normalized.message,
        status: "failed",
      });

      await this.emitToolEvent("tool.run.failed", failed, context, {
        errorCode: normalized.code,
        latencyMs: Date.now() - startedAt,
        retryable: normalized.retryable,
      });

      return {
        confirmationRequired: false,
        materializationStatus: "not_requested",
        toolRun: failed,
      };
    }
  }

  private async prepareInput(input: unknown) {
    const redacted = this.secretBoundaryService.redact(input ?? {});
    const inputRedacted = isRecord(redacted) ? redacted : {};
    const scan = this.secretBoundaryService.scanForSecrets(input ?? {});
    const executableInput = normalizeExecutableInput(input ?? {});

    this.secretBoundaryService.assertNoSecrets(inputRedacted);
    this.secretBoundaryService.assertNoSecrets(executableInput);

    return {
      executableInput,
      inputHash: await createToolHash(inputRedacted),
      inputRedacted,
      secretDetected: scan.hasSecrets,
      secretMatchCount: scan.matches.length,
    };
  }

  private async requireToolRun(toolRunId: string, workspaceId: string) {
    const toolRun = await this.repository.findById(toolRunId);

    if (!toolRun || toolRun.workspaceId !== workspaceId) {
      throw new ApiError("TOOL_RUN_NOT_FOUND", "Tool run was not found.", 404);
    }

    return toolRun;
  }

  private async emitToolEvent(
    name: string,
    toolRun: ToolRunRecord,
    context: ToolExecutionContext,
    payload: Record<string, unknown> = {},
  ) {
    try {
      const redacted = this.secretBoundaryService.redact({
        ...payload,
        riskLevel: toolRun.riskLevel,
        source: "tool",
        status: toolRun.status,
        toolId: toolRun.toolId,
        toolRunId: toolRun.id,
      });
      const safePayload = isRecord(redacted) ? redacted : {};

      this.secretBoundaryService.assertNoSecrets(safePayload);

      await emitBackendEvent({
        name,
        payload: safePayload,
        status: toolRun.status === "failed" ? "failed" : "succeeded",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceId: toolRun.id,
          resourceType: "tool_run",
          source: "tool",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId: toolRun.workspaceId,
        },
      });
    } catch {
      // V7 only emits through the V0 minimal hook. Event failure must not rerun tools.
    }
  }
}

export function createToolExecutionService(dependencies?: ToolExecutionServiceDependencies) {
  return new ToolExecutionService(dependencies);
}

function requireUserId(userId?: string) {
  const normalized = userId?.trim();

  if (!normalized) {
    throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  return normalized;
}

function normalizeToolExecutionError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const candidate = error as { code?: unknown; message?: unknown; retryable?: unknown };

    return {
      code: typeof candidate.code === "string" ? candidate.code : "TOOL_RUN_FAILED",
      message:
        typeof candidate.message === "string"
          ? sanitizeErrorMessage(candidate.message)
          : "Tool run failed.",
      retryable: candidate.retryable === true,
    };
  }

  return {
    code: "TOOL_RUN_FAILED",
    message: "Tool run failed.",
    retryable: true,
  };
}

function clampLimit(limit?: number | null) {
  if (!limit || !Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(100, Math.max(1, Math.floor(limit)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

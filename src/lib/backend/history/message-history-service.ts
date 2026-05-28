import type {
  AgentMemoryRecordType,
  AgentMemoryRecordsResponse,
  MessageArchiveRequest,
  MessageArchiveResponse,
  MessageHistoryPageResponse,
  MessageHistoryRecord,
} from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";
import type { PermissionService } from "../security/permission-service";
import { createWorkspaceStatePermissionService } from "../workspace/workspace-permission";

import {
  createAgentMemoryRecordRepository,
  type AgentMemoryRecordRepository,
} from "./agent-memory-record-repository";
import { isAgentMemoryRecordType } from "./history-constants";
import {
  createMessageContentHash,
  createMessageRepository,
  MessageUpsertConflictError,
  type MessageRepository,
  type UpsertMessageInput,
} from "./message-repository";
import { StoragePartitionService } from "./storage-partition-service";

export type HistoryServiceContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export type MessageHistoryServiceDependencies = {
  messages?: MessageRepository;
  memory?: AgentMemoryRecordRepository;
  partition?: StoragePartitionService;
  permissionService?: PermissionService;
};

export class MessageHistoryService {
  private readonly messages: MessageRepository;
  private readonly memory: AgentMemoryRecordRepository;
  private readonly partition: StoragePartitionService;
  private readonly permissionService: PermissionService;

  constructor(dependencies: MessageHistoryServiceDependencies = {}) {
    this.messages = dependencies.messages ?? createMessageRepository();
    this.memory = dependencies.memory ?? createAgentMemoryRecordRepository();
    this.partition = dependencies.partition ?? new StoragePartitionService();
    this.permissionService =
      dependencies.permissionService ?? createWorkspaceStatePermissionService();
  }

  async listMessages(
    input: {
      workspaceId: string;
      agentId: string;
      cursor?: string | null;
      limit?: number | null;
    },
    context: HistoryServiceContext = {},
  ): Promise<MessageHistoryPageResponse> {
    await this.assertPermission({
      action: "workspace.read",
      agentId: input.agentId,
      context,
      workspaceId: input.workspaceId,
    });
    const limit = this.partition.normalizeLimit(input.limit);
    const cursor = this.partition.parseCursor(input.cursor, {
      agentId: input.agentId,
      workspaceId: input.workspaceId,
    });
    const rows = await this.messages.listMessages({
      agentId: input.agentId,
      cursor,
      limit: limit + 1,
      workspaceId: input.workspaceId,
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);

    await this.emitHistoryEvent("history.messages.page", input, context, {
      count: page.length,
      hasCursor: Boolean(input.cursor),
      hasMore: rows.length > limit,
    });

    return {
      agentId: input.agentId,
      hasMore: rows.length > limit,
      messages: page,
      nextCursor:
        rows.length > limit && last
          ? this.partition.createCursor({
              agentId: input.agentId,
              createdAt: last.createdAt,
              id: last.id,
              workspaceId: input.workspaceId,
            })
          : null,
      workspaceId: input.workspaceId,
    };
  }

  async archiveMessages(
    agentId: string,
    input: MessageArchiveRequest,
    context: HistoryServiceContext = {},
  ): Promise<MessageArchiveResponse> {
    const policy = this.partition.normalizeActiveWindowPolicy(input);

    await this.assertPermission({
      action: "workspace.update",
      agentId,
      context,
      workspaceId: input.workspaceId,
    });

    const result = await this.messages.archiveOutsideActiveWindow({
      agentId,
      archivedAt: new Date().toISOString(),
      keepLatest: policy.keepLatest,
      workspaceId: input.workspaceId,
    });

    await this.emitHistoryEvent("history.messages.archived", {
      agentId,
      workspaceId: input.workspaceId,
    }, context, {
      archivedCount: result.archivedCount,
      keepLatest: policy.keepLatest,
    });

    return {
      activeWindowCount: result.activeWindowCount,
      agentId,
      archivedCount: result.archivedCount,
      policy,
      workspaceId: input.workspaceId,
    };
  }

  async upsertMessage(
    input: UpsertMessageInput,
    context: HistoryServiceContext = {},
  ): Promise<MessageHistoryRecord> {
    const normalized = this.validateMessage(input);
    const incomingContentHash = createMessageContentHash(normalized.content);
    const existing = await this.messages.findById(normalized.id);

    if (existing) {
      const conflict = getMessageUpsertConflict(
        existing,
        normalized,
        incomingContentHash,
      );

      if (conflict) {
        await this.emitHistoryEvent(
          "history.message.conflicted",
          {
            agentId: existing.agentId ?? normalized.agentId,
            workspaceId: existing.workspaceId,
          },
          context,
          {
            conflict,
            existingContentHash:
              existing.contentHash ?? createMessageContentHash(existing.content),
            incomingContentHash,
            messageId: existing.id,
          },
          "failed",
        );

        throw new ApiError(
          "SYNC_CONFLICT",
          "Message id already exists with different durable content or identity.",
          409,
          {
            conflict,
            messageId: normalized.id,
          },
        );
      }

      await this.emitHistoryEvent(
        "history.message.applied",
        {
          agentId: existing.agentId ?? normalized.agentId,
          workspaceId: existing.workspaceId,
        },
        context,
        {
          contentLength: existing.content.length,
          idempotent: true,
          messageId: existing.id,
          role: existing.role,
        },
      );

      return existing;
    }

    const saved = await this.messages
      .upsertMessage({
        ...normalized,
        createdBy: context.userId ?? null,
      })
      .catch((error) => {
        if (error instanceof MessageUpsertConflictError) {
          throw new ApiError(
            "SYNC_CONFLICT",
            "Message id already exists with different durable content or identity.",
            409,
            error.details,
          );
        }

        throw error;
      });

    await this.emitHistoryEvent("history.message.applied", {
      agentId: saved.agentId ?? normalized.agentId,
      workspaceId: saved.workspaceId,
    }, context, {
      contentLength: saved.content.length,
      messageId: saved.id,
      role: saved.role,
    });

    return saved;
  }

  async listMemoryRecords(
    input: {
      workspaceId: string;
      agentId: string;
      memoryType?: AgentMemoryRecordType | null;
    },
    context: HistoryServiceContext = {},
  ): Promise<AgentMemoryRecordsResponse> {
    await this.assertPermission({
      action: "workspace.read",
      agentId: input.agentId,
      context,
      workspaceId: input.workspaceId,
    });

    if (input.memoryType && !isAgentMemoryRecordType(input.memoryType)) {
      throw new ApiError("VALIDATION_FAILED", "Memory type is invalid.", 400);
    }

    const records = await this.memory.list({
      agentId: input.agentId,
      memoryType: input.memoryType,
      workspaceId: input.workspaceId,
    });

    await this.emitHistoryEvent("history.memory.page", input, context, {
      count: records.length,
      memoryType: input.memoryType,
    });

    return {
      agentId: input.agentId,
      records,
      workspaceId: input.workspaceId,
    };
  }

  private async assertPermission(input: {
    action: string;
    agentId: string;
    context: HistoryServiceContext;
    workspaceId: string;
  }) {
    const userId = input.context.userId?.trim();

    if (!userId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    const decision = await this.permissionService.check(
      {
        action: input.action,
        resourceId: input.agentId,
        resourceType: "workspace",
        userId,
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

  private validateMessage(input: UpsertMessageInput): UpsertMessageInput {
    const id = input.id.trim();
    const workspaceId = input.workspaceId.trim();
    const agentId = input.agentId.trim();
    const content = input.content;

    if (!id || !workspaceId || !agentId) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Message id, workspace id, and agent id are required.",
        400,
      );
    }

    if (!["system", "user", "assistant", "tool"].includes(input.role)) {
      throw new ApiError("VALIDATION_FAILED", "Message role is invalid.", 400);
    }

    return {
      ...input,
      agentId,
      content,
      id,
      workspaceId,
    };
  }

  private async emitHistoryEvent(
    name: string,
    input: { workspaceId: string; agentId: string },
    context: HistoryServiceContext,
    payload: Record<string, unknown>,
    status: "succeeded" | "failed" = "succeeded",
  ) {
    try {
      await emitBackendEvent({
        name,
        payload: {
          ...payload,
          agentId: input.agentId,
          source: "history",
        },
        status,
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceId: input.agentId,
          resourceType: "history",
          source: "history",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId: input.workspaceId,
        },
      });
    } catch {
      // V9 observability is non-critical for V10 history reads/writes.
    }
  }
}

export function createMessageHistoryService(dependencies?: MessageHistoryServiceDependencies) {
  return new MessageHistoryService(dependencies);
}

function getMessageUpsertConflict(
  existing: MessageHistoryRecord,
  input: UpsertMessageInput,
  incomingContentHash: string,
) {
  const existingContentHash =
    existing.contentHash ?? createMessageContentHash(existing.content);
  const conflict = {
    agent: existing.agentId !== input.agentId,
    contentHash: existingContentHash !== incomingContentHash,
    role: existing.role !== input.role,
    workspace: existing.workspaceId !== input.workspaceId,
  };

  return Object.values(conflict).some(Boolean) ? conflict : null;
}

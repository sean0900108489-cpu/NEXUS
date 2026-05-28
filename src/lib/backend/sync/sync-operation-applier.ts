import type { NotebookRecord, WorkspaceStatePutRequest } from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { createMessageHistoryService, type MessageHistoryService } from "../history/message-history-service";
import { createNotebookService, type NotebookService } from "../notebooks/notebook-service";
import type { RecordPromptRevisionInput } from "../prompts/prompt-repository";
import { createPromptService, type PromptService } from "../prompts/prompt-service";
import { createWorkspaceStateService, type WorkspaceStateService } from "../workspace/workspace-state-service";

import type { SyncOperationRecord } from "./sync-operation-repository";

export type SyncOperationApplyResult =
  | { status: "applied"; remoteVersion?: string | null }
  | { status: "queued" }
  | { status: "unsupported"; code: "SYNC_DOMAIN_NOT_SUPPORTED"; message: string };

export type SyncOperationApplierDependencies = {
  messageHistoryService?: MessageHistoryService;
  notebookService?: NotebookService;
  promptService?: PromptService;
  workspaceStateService?: WorkspaceStateService;
};

export class SyncOperationApplier {
  private readonly messageHistoryService: MessageHistoryService;
  private readonly notebookService: NotebookService;
  private readonly promptService: PromptService;
  private readonly workspaceStateService: WorkspaceStateService;

  constructor(dependencies: SyncOperationApplierDependencies = {}) {
    this.messageHistoryService =
      dependencies.messageHistoryService ?? createMessageHistoryService();
    this.notebookService = dependencies.notebookService ?? createNotebookService();
    this.promptService = dependencies.promptService ?? createPromptService();
    this.workspaceStateService =
      dependencies.workspaceStateService ?? createWorkspaceStateService();
  }

  async apply(operation: SyncOperationRecord): Promise<SyncOperationApplyResult> {
    if (operation.entityType === "workspace" && operation.operationType === "snapshot") {
      const payload = operation.payload;

      if (!isWorkspaceSnapshotSyncPayload(payload)) {
        throw new ApiError(
          "VALIDATION_FAILED",
          "Workspace snapshot sync payload is invalid.",
          400,
        );
      }

      const result = await this.workspaceStateService.saveState({
        baseChecksum: payload.baseChecksum,
        clientMutationId: payload.clientMutationId,
        schemaVersion: payload.schemaVersion,
        snapshot: payload.snapshot,
        snapshotType: payload.snapshotType,
        userId: operation.createdBy ?? "",
        workspaceId: operation.workspaceId,
      });

      return {
        remoteVersion: result.checksum,
        status: "applied",
      };
    }

    if (operation.entityType === "notebook") {
      if (["create", "update", "upsert"].includes(operation.operationType)) {
        const notebook = normalizeNotebookPayload(operation);
        const result = await this.notebookService.upsertNotebook(
          {
            content: notebook.content,
            createdAt: notebook.created_at ?? null,
            id: notebook.id,
            title: notebook.title,
            updatedAt: notebook.updated_at ?? null,
            workspaceId: notebook.workspace_id ?? operation.workspaceId,
          },
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          remoteVersion: result.updated_at ?? null,
          status: "applied",
        };
      }

      if (operation.operationType === "delete") {
        await this.notebookService.deleteNotebook(
          normalizeNotebookDeletePayload(operation),
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          status: "applied",
        };
      }

      throw new ApiError(
        "VALIDATION_FAILED",
        "Notebook sync operation type is invalid.",
        400,
      );
    }

    if (
      operation.entityType === "message"
    ) {
      if (["create", "update", "upsert"].includes(operation.operationType)) {
        const message = normalizeMessagePayload(operation);
        const result = await this.messageHistoryService.upsertMessage(
          {
            agentId: message.agentId,
            content: message.content,
            createdAt: message.createdAt,
            id: message.id,
            metadata: message.metadata,
            role: message.role,
            workspaceId: message.workspaceId,
          },
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          remoteVersion: result.updatedAt ?? result.createdAt,
          status: "applied",
        };
      }

      throw new ApiError(
        "VALIDATION_FAILED",
        "Message sync operation type is invalid.",
        400,
      );
    }

    if (operation.entityType === "prompt") {
      if (["create", "update", "upsert"].includes(operation.operationType)) {
        const prompt = normalizePromptPayload(operation);
        const result = await this.promptService.upsertPrompt(
          {
            content: prompt.content,
            createdAt: prompt.created_at ?? null,
            id: prompt.id,
            revisions: prompt.revisions,
            title: prompt.title,
            updatedAt: prompt.updated_at ?? null,
            workspaceId: prompt.workspace_id,
          },
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          remoteVersion: result.updated_at,
          status: "applied",
        };
      }

      if (operation.operationType === "delete") {
        const deleted = await this.promptService.deletePrompt(
          normalizePromptDeletePayload(operation),
          {
            userId: operation.createdBy ?? undefined,
          },
        );

        return {
          remoteVersion: deleted.deleted_at ?? deleted.updated_at,
          status: "applied",
        };
      }

      throw new ApiError(
        "VALIDATION_FAILED",
        "Prompt sync operation type is invalid.",
        400,
      );
    }

    if (operation.entityType === "agent") {
      return { status: "queued" };
    }

    return {
      code: "SYNC_DOMAIN_NOT_SUPPORTED",
      message: "Sync domain is not supported by the V4 operation applier.",
      status: "unsupported",
    };
  }
}

function isWorkspaceSnapshotSyncPayload(value: unknown): value is WorkspaceStatePutRequest {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as WorkspaceStatePutRequest).clientMutationId === "string" &&
    typeof (value as WorkspaceStatePutRequest).schemaVersion === "number" &&
    Boolean((value as WorkspaceStatePutRequest).snapshot) &&
    ((value as WorkspaceStatePutRequest).baseChecksum === null ||
      typeof (value as WorkspaceStatePutRequest).baseChecksum === "string")
  );
}

function normalizeNotebookPayload(operation: SyncOperationRecord): NotebookRecord {
  const payload = operation.payload;

  if (!isRecord(payload)) {
    throw new ApiError("VALIDATION_FAILED", "Notebook sync payload is invalid.", 400);
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  const workspaceId =
    typeof payload.workspace_id === "string"
      ? payload.workspace_id
      : typeof payload.workspaceId === "string"
        ? payload.workspaceId
        : operation.workspaceId;
  const title = typeof payload.title === "string" ? payload.title : "";
  const content = typeof payload.content === "string" ? payload.content : "";

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Notebook sync payload identity does not match the sync operation.",
      400,
    );
  }

  return {
    content,
    created_at: typeof payload.created_at === "string" ? payload.created_at : undefined,
    id,
    title,
    updated_at: typeof payload.updated_at === "string" ? payload.updated_at : undefined,
    workspace_id: workspaceId,
  };
}

function normalizeNotebookDeletePayload(operation: SyncOperationRecord) {
  const payload = operation.payload;
  const id = isRecord(payload) && typeof payload.id === "string"
    ? payload.id
    : operation.entityId;
  const workspaceId = isRecord(payload) && typeof payload.workspaceId === "string"
    ? payload.workspaceId
    : operation.workspaceId;

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Notebook delete payload identity does not match the sync operation.",
      400,
    );
  }

  return {
    createdAt: isRecord(payload) && typeof payload.created_at === "string"
      ? payload.created_at
      : null,
    deletedAt: isRecord(payload) && typeof payload.deleted_at === "string"
      ? payload.deleted_at
      : null,
    id,
    workspaceId,
  };
}

function normalizeMessagePayload(operation: SyncOperationRecord) {
  const payload = operation.payload;

  if (!isRecord(payload) || !isRecord(payload.message)) {
    throw new ApiError("VALIDATION_FAILED", "Message sync payload is invalid.", 400);
  }

  const message = payload.message;
  const id = typeof message.id === "string" ? message.id : "";
  const workspaceId =
    typeof payload.workspaceId === "string" ? payload.workspaceId : operation.workspaceId;
  const agentId = typeof payload.agentId === "string" ? payload.agentId : "";
  const role = typeof message.role === "string" ? message.role : "";
  const content = typeof message.content === "string" ? message.content : "";
  const createdAt =
    typeof message.createdAt === "string" ? message.createdAt : undefined;

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Message sync payload identity does not match the sync operation.",
      400,
    );
  }

  if (!["system", "user", "assistant", "tool"].includes(role)) {
    throw new ApiError("VALIDATION_FAILED", "Message sync role is invalid.", 400);
  }

  return {
    agentId,
    content,
    createdAt,
    id,
    metadata: {
      interrupted: typeof message.interrupted === "boolean" ? message.interrupted : undefined,
      media: isRecord(message.media) ? message.media : undefined,
      reasoningContent:
        typeof message.reasoningContent === "string"
          ? message.reasoningContent
          : undefined,
      streaming: typeof message.streaming === "boolean" ? message.streaming : undefined,
    },
    role: role as "system" | "user" | "assistant" | "tool",
    workspaceId,
  };
}

function normalizePromptPayload(operation: SyncOperationRecord) {
  const payload = operation.payload;

  if (!isRecord(payload)) {
    throw new ApiError("VALIDATION_FAILED", "Prompt sync payload is invalid.", 400);
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  const workspaceId =
    typeof payload.workspace_id === "string"
      ? payload.workspace_id
      : typeof payload.workspaceId === "string"
        ? payload.workspaceId
        : operation.workspaceId;

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Prompt sync payload identity does not match the sync operation.",
      400,
    );
  }

  return {
    content: typeof payload.content === "string" ? payload.content : "",
    created_at: typeof payload.created_at === "string" ? payload.created_at : undefined,
    id,
    revisions: normalizePromptRevisionPayload(payload.revisions, id),
    title: typeof payload.title === "string" ? payload.title : "",
    updated_at: typeof payload.updated_at === "string" ? payload.updated_at : undefined,
    workspace_id: workspaceId,
  };
}

function normalizePromptRevisionPayload(
  value: unknown,
  promptId: string,
): RecordPromptRevisionInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((revision) => {
      const id =
        typeof revision.revisionId === "string"
          ? revision.revisionId
          : typeof revision.id === "string"
            ? revision.id
            : "";
      const revisionPromptId =
        typeof revision.promptId === "string"
          ? revision.promptId
          : typeof revision.prompt_id === "string"
            ? revision.prompt_id
            : "";
      const previousContent =
        typeof revision.previousContent === "string"
          ? revision.previousContent
          : typeof revision.previous_content === "string"
            ? revision.previous_content
            : "";
      const newContent =
        typeof revision.newContent === "string"
          ? revision.newContent
          : typeof revision.new_content === "string"
            ? revision.new_content
            : "";
      const createdAt =
        typeof revision.updatedAt === "string"
          ? revision.updatedAt
          : typeof revision.created_at === "string"
            ? revision.created_at
            : null;

      return {
        createdAt,
        id,
        newContent,
        previousContent,
        promptId: revisionPromptId,
      };
    })
    .filter((revision) => revision.id && revision.promptId === promptId);
}

function normalizePromptDeletePayload(operation: SyncOperationRecord) {
  const payload = operation.payload;
  const id = isRecord(payload) && typeof payload.id === "string"
    ? payload.id
    : operation.entityId;
  const workspaceId =
    isRecord(payload) && typeof payload.workspaceId === "string"
      ? payload.workspaceId
      : operation.workspaceId;

  if (id !== operation.entityId || workspaceId !== operation.workspaceId) {
    throw new ApiError(
      "VALIDATION_FAILED",
      "Prompt delete payload identity does not match the sync operation.",
      400,
    );
  }

  return {
    deletedAt: isRecord(payload) && typeof payload.deleted_at === "string"
      ? payload.deleted_at
      : null,
    id,
    workspaceId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

import type { NotebookRecord } from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";
import { SecretBoundaryService } from "../security/secret-boundary-service";
import { SYNC_PAYLOAD_MAX_BYTES } from "../sync/sync-constants";

import {
  createNotebookRepository,
  type DeleteNotebookInput,
  type ListVisibleNotebooksInput,
  type NotebookRepository,
  type UpsertNotebookInput,
} from "./notebook-repository";

export const NOTEBOOK_TITLE_MAX_CHARS = 200;

export type NotebookServiceContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export type NotebookServiceDependencies = {
  repository?: NotebookRepository;
  secretBoundaryService?: SecretBoundaryService;
};

export class NotebookService {
  private readonly repository: NotebookRepository;
  private readonly secretBoundaryService: SecretBoundaryService;

  constructor(dependencies: NotebookServiceDependencies = {}) {
    this.repository = dependencies.repository ?? createNotebookRepository();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
  }

  async upsertNotebook(
    input: UpsertNotebookInput,
    context: NotebookServiceContext = {},
  ) {
    const notebook = this.validateNotebook(input);
    const existing = await this.repository.findById({
      id: notebook.id,
      workspaceId: notebook.workspaceId,
    });

    if (existing && isStaleNotebookUpdate(existing, notebook)) {
      await this.emitNotebookEvent("notebook.conflicted", existing, context, {
        attemptedUpdatedAt: notebook.updatedAt,
      });
      throw new ApiError(
        "SYNC_CONFLICT",
        "Notebook update is older than the durable notebook record.",
        409,
        {
          entityId: notebook.id,
          workspaceId: notebook.workspaceId,
        },
      );
    }

    const saved = await this.repository.upsert({
      ...notebook,
      createdBy: context.userId ?? null,
    });

    await this.emitNotebookEvent("notebook.applied", saved, context);

    return saved;
  }

  async deleteNotebook(
    input: DeleteNotebookInput,
    context: NotebookServiceContext = {},
  ) {
    const normalized = this.validateNotebookIdentity(input);
    const deletedAt = input.deletedAt ?? new Date().toISOString();
    const deleted = await this.repository.deleteById({
      ...normalized,
      createdAt: input.createdAt ?? null,
      deletedAt,
      deletedBy: context.userId ?? null,
    });

    await this.emitNotebookEvent("notebook.deleted", deleted.tombstone, context, {
      deleted: deleted.deleted,
      deletedAt: deleted.tombstone.deleted_at,
    });

    return deleted;
  }

  async listVisibleNotebooks(
    input: ListVisibleNotebooksInput,
    context: NotebookServiceContext = {},
  ) {
    const userId = input.userId.trim();
    const workspaceId = input.workspaceId?.trim() || null;

    if (!userId) {
      throw new ApiError(
        "AUTH_REQUIRED",
        "Notebook fetch requires an authenticated user.",
        401,
      );
    }

    const notebooks = await this.repository.listVisible({
      limit: input.limit,
      userId,
      workspaceId,
    });

    await this.emitNotebookFetchEvent(notebooks, context, workspaceId);

    return notebooks;
  }

  private validateNotebook(input: UpsertNotebookInput): Required<UpsertNotebookInput> {
    const identity = this.validateNotebookIdentity(input);
    const title = input.title.trim() || "Untitled Datapad";
    const contentSizeBytes = new TextEncoder().encode(input.content).byteLength;

    if (title.length > NOTEBOOK_TITLE_MAX_CHARS) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Notebook title exceeds the allowed length.",
        400,
      );
    }

    if (contentSizeBytes > SYNC_PAYLOAD_MAX_BYTES) {
      throw new ApiError(
        "SYNC_PAYLOAD_TOO_LARGE",
        "Notebook content exceeds the allowed sync payload size.",
        413,
        {
          contentSizeBytes,
          maxContentSizeBytes: SYNC_PAYLOAD_MAX_BYTES,
        },
      );
    }

    const scan = this.secretBoundaryService.scanForSecrets({
      content: input.content,
      title,
    });

    if (scan.hasSecrets) {
      throw new ApiError(
        "SYNC_SECRET_DETECTED",
        "Notebook payload contains a secret and was rejected.",
        400,
        {
          matchCount: scan.matches.length,
          redactionStatus: "redacted",
        },
      );
    }

    return {
      content: input.content,
      createdAt: input.createdAt ?? null,
      createdBy: input.createdBy ?? null,
      id: identity.id,
      title,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
      workspaceId: identity.workspaceId,
    };
  }

  private validateNotebookIdentity(
    input: Pick<DeleteNotebookInput, "id" | "workspaceId">,
  ): Pick<DeleteNotebookInput, "id" | "workspaceId"> {
    const id = input.id.trim();
    const workspaceId =
      input.workspaceId === null ? null : input.workspaceId.trim();

    if (!id || workspaceId === "") {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Notebook id and workspace id are required.",
        400,
      );
    }

    return { id, workspaceId };
  }

  private async emitNotebookEvent(
    name: string,
    notebook: NotebookRecord,
    context: NotebookServiceContext,
    extra: Record<string, unknown> = {},
  ) {
    try {
      await emitBackendEvent({
        name,
        payload: {
          ...extra,
          contentLength: notebook.content.length,
          notebookId: notebook.id,
          source: "sync",
          titleLength: notebook.title.length,
          workspaceId: notebook.workspace_id ?? undefined,
        },
        status: name === "notebook.conflicted" ? "failed" : "succeeded",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceId: notebook.id,
          resourceType: "notebook",
          source: "sync",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId: notebook.workspace_id ?? undefined,
        },
      });
    } catch {
      // Event failures must not make notebook sync run twice.
    }
  }

  private async emitNotebookFetchEvent(
    notebooks: NotebookRecord[],
    context: NotebookServiceContext,
    workspaceId: string | null,
  ) {
    try {
      await emitBackendEvent({
        name: "notebook.fetch.visible",
        payload: {
          notebookCount: notebooks.length,
          source: "api",
          workspaceId: workspaceId ?? undefined,
        },
        status: "succeeded",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceType: "notebook",
          source: "api",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId: workspaceId ?? undefined,
        },
      });
    } catch {
      // Fetch observability must not make notebook recovery look empty.
    }
  }
}

export function createNotebookService(dependencies?: NotebookServiceDependencies) {
  return new NotebookService(dependencies);
}

function isStaleNotebookUpdate(
  existing: NotebookRecord,
  next: Required<UpsertNotebookInput>,
) {
  if (!existing.updated_at || !next.updatedAt) {
    return false;
  }

  const existingUpdatedAt = new Date(existing.updated_at).getTime();
  const nextUpdatedAt = new Date(next.updatedAt).getTime();

  if (!Number.isFinite(existingUpdatedAt) || !Number.isFinite(nextUpdatedAt)) {
    return false;
  }

  return (
    existingUpdatedAt > nextUpdatedAt &&
    (existing.title !== next.title || existing.content !== next.content)
  );
}

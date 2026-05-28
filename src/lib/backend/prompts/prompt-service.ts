import { ApiError } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";

import {
  createPromptRepository,
  type DeletePromptInput,
  type ListVisiblePromptsInput,
  type PromptRepository,
  type RecordPromptRevisionInput,
  type UpsertPromptInput,
} from "./prompt-repository";

export type PromptServiceContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export type PromptServiceDependencies = {
  repository?: PromptRepository;
};

type NormalizedPromptInput = Omit<
  Required<UpsertPromptInput>,
  "revisions"
> & {
  revisions: RecordPromptRevisionInput[];
};

export class PromptService {
  private readonly repository: PromptRepository;

  constructor(dependencies: PromptServiceDependencies = {}) {
    this.repository = dependencies.repository ?? createPromptRepository();
  }

  async upsertPrompt(input: UpsertPromptInput, context: PromptServiceContext = {}) {
    const normalized = this.validatePrompt(input);
    const existing = await this.repository.findById({
      id: normalized.id,
      workspaceId: normalized.workspaceId,
    });

    if (existing && isStalePromptUpdate(existing, normalized)) {
      throw new ApiError(
        "SYNC_CONFLICT",
        "Prompt update is older than the durable prompt record.",
        409,
      );
    }

    const saved = await this.repository.upsert({
      ...normalized,
      createdBy: context.userId ?? null,
    });
    await this.repository.recordRevisions(normalized.revisions);

    await this.emitPromptEvent("prompt.applied", saved, context, {
      revisionCount: normalized.revisions.length,
    });

    return saved;
  }

  async deletePrompt(input: DeletePromptInput, context: PromptServiceContext = {}) {
    const identity = this.validatePromptIdentity(input);
    const deleted = await this.repository.deleteById({
      ...identity,
      deletedAt: input.deletedAt ?? new Date().toISOString(),
      deletedBy: context.userId ?? null,
    });

    await this.emitPromptEvent("prompt.deleted", deleted, context, {
      deletedAt: deleted.deleted_at,
    });

    return deleted;
  }

  async listVisiblePrompts(
    input: ListVisiblePromptsInput,
    context: PromptServiceContext = {},
  ) {
    const userId = input.userId.trim();
    const workspaceId = input.workspaceId.trim();

    if (!userId) {
      throw new ApiError(
        "AUTH_REQUIRED",
        "Prompt fetch requires an authenticated user.",
        401,
      );
    }

    if (!workspaceId) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Prompt fetch requires a workspace id.",
        400,
      );
    }

    const prompts = await this.repository.listVisible({
      limit: input.limit,
      userId,
      workspaceId,
    });

    await this.emitPromptFetchEvent(prompts, context, workspaceId);

    return prompts;
  }

  private validatePrompt(input: UpsertPromptInput): NormalizedPromptInput {
    const identity = this.validatePromptIdentity(input);
    const title = input.title.trim() || "Untitled Prompt";

    return {
      content: input.content,
      createdAt: input.createdAt ?? null,
      createdBy: input.createdBy ?? null,
      id: identity.id,
      revisions: normalizePromptRevisions(input.revisions, identity.id),
      title,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
      workspaceId: identity.workspaceId,
    };
  }

  private validatePromptIdentity(input: Pick<UpsertPromptInput, "id" | "workspaceId">) {
    const id = input.id.trim();
    const workspaceId = input.workspaceId.trim();

    if (!id || !workspaceId) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Prompt id and workspace id are required.",
        400,
      );
    }

    return { id, workspaceId };
  }

  private async emitPromptEvent(
    name: string,
    prompt: { id: string; workspace_id: string; title: string; content: string },
    context: PromptServiceContext,
    extra: Record<string, unknown> = {},
  ) {
    try {
      await emitBackendEvent({
        name,
        payload: {
          ...extra,
          contentLength: prompt.content.length,
          promptId: prompt.id,
          titleLength: prompt.title.length,
          workspaceId: prompt.workspace_id,
        },
        status: "succeeded",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceId: prompt.id,
          resourceType: "prompt",
          source: "sync",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId: prompt.workspace_id,
        },
      });
    } catch {
      // Prompt observability must not make sync retry safe work.
    }
  }

  private async emitPromptFetchEvent(
    prompts: Array<{ id: string }>,
    context: PromptServiceContext,
    workspaceId: string,
  ) {
    try {
      await emitBackendEvent({
        name: "prompt.fetch.visible",
        payload: {
          promptCount: prompts.length,
          source: "api",
          workspaceId,
        },
        status: "succeeded",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceType: "prompt",
          source: "api",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId,
        },
      });
    } catch {
      // Fetch observability must not make prompt recovery look empty.
    }
  }
}

export function createPromptService(dependencies?: PromptServiceDependencies) {
  return new PromptService(dependencies);
}

function isStalePromptUpdate(
  existing: { updated_at?: string | null; title: string; content: string },
  next: NormalizedPromptInput,
) {
  if (!existing.updated_at || !next.updatedAt) {
    return false;
  }

  return (
    new Date(existing.updated_at).getTime() > new Date(next.updatedAt).getTime() &&
    (existing.title !== next.title || existing.content !== next.content)
  );
}

function normalizePromptRevisions(
  revisions: RecordPromptRevisionInput[] | undefined,
  promptId: string,
) {
  return (revisions ?? [])
    .filter((revision) => revision.promptId === promptId)
    .filter((revision) => revision.id.trim())
    .map((revision) => ({
      createdAt: revision.createdAt ?? null,
      id: revision.id.trim(),
      newContent: revision.newContent,
      previousContent: revision.previousContent,
      promptId,
    }));
}

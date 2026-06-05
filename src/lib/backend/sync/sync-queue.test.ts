import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { POST as postSyncOperation } from "@/app/api/v1/sync/operations/route";
import { GET as getSyncStatus } from "@/app/api/v1/sync/status/route";
import { POST as cancelSyncOperation } from "@/app/api/v1/sync/operations/[operationId]/cancel/route";
import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";
import { ApiError } from "@/lib/backend/api/api-errors";
import { InMemoryMessageRepository } from "@/lib/backend/history/message-repository";
import { MessageHistoryService } from "@/lib/backend/history/message-history-service";
import { InMemoryNotebookRepository } from "@/lib/backend/notebooks/notebook-repository";
import { NotebookService } from "@/lib/backend/notebooks/notebook-service";
import { InMemoryPromptRepository } from "@/lib/backend/prompts/prompt-repository";
import { PromptService } from "@/lib/backend/prompts/prompt-service";

import { SyncOperationApplier } from "./sync-operation-applier";
import {
  SYNC_STANDARD_PAYLOAD_MAX_BYTES,
  SYNC_WORKSPACE_SNAPSHOT_PAYLOAD_MAX_BYTES,
} from "./sync-constants";
import { InMemorySyncOperationRepository } from "./sync-operation-repository";
import { SyncQueueService } from "./sync-queue-service";

function makeOperation(overrides: Partial<Parameters<SyncQueueService["createOperation"]>[0]> = {}) {
  const id = `mutation_${crypto.randomUUID()}`;

  return {
    clientMutationId: id,
    entityId: "message-1",
    entityType: "message",
    operationType: "create",
    payload: {
      agentId: "agent-sync-a",
      message: {
        content: "hello",
        createdAt: "2026-05-28T00:00:00.000Z",
        id: "message-1",
        role: "user",
      },
      workspaceId: "workspace-sync-a",
    },
    workspaceId: "workspace-sync-a",
    ...overrides,
  };
}

function makeJsonRequest(url: string, body: unknown, userId = "local-owner") {
  const clientMutationId =
    typeof body === "object" && body && "clientMutationId" in body
      ? String((body as { clientMutationId: string }).clientMutationId)
      : `mutation_${crypto.randomUUID()}`;

  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      ...authHeaders(userId),
      "Content-Type": "application/json",
      "X-Idempotency-Key": clientMutationId,
      "X-Request-Id": `req_${crypto.randomUUID()}`,
    },
    method: "POST",
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

afterEach(() => {
  resetMockApiAuthSessionVerifierForTests();
});

describe("SyncQueueService", () => {
  it("creates a sync operation and deduplicates matching clientMutationId payloads", async () => {
    const repository = new InMemorySyncOperationRepository();
    const service = new SyncQueueService({ inlineApply: false, repository });
    const input = makeOperation();
    const first = await service.createOperation(input, { userId: "user-owner" });
    const second = await service.createOperation(input, { userId: "user-owner" });

    expect(first.deduplicated).toBe(false);
    expect(first.operation.status).toBe("queued");
    expect(second.deduplicated).toBe(true);
    expect(second.operation.id).toBe(first.operation.id);
  });

  it("rejects duplicate operation ids with different payload hashes", async () => {
    const repository = new InMemorySyncOperationRepository();
    const service = new SyncQueueService({ inlineApply: false, repository });
    const input = makeOperation();

    await service.createOperation(input, { userId: "user-owner" });
    await expect(
      service.createOperation(
        {
          ...input,
          payload: { message: { content: "different", id: "message-1" } },
        },
        { userId: "user-owner" },
      ),
    ).rejects.toMatchObject({
      code: "SYNC_OPERATION_CONFLICT",
    });
  });

  it("rejects unsupported entity types, secrets, and oversized payloads", async () => {
    const service = new SyncQueueService({
      inlineApply: false,
      repository: new InMemorySyncOperationRepository(),
    });

    await expect(
      service.createOperation(makeOperation({ entityType: "tool_run" })),
    ).rejects.toMatchObject({ code: "SYNC_DOMAIN_NOT_SUPPORTED" });
    await expect(
      service.createOperation(makeOperation({ entityType: "artifact_reference" })),
    ).rejects.toMatchObject({
      code: "SYNC_DOMAIN_NOT_SUPPORTED",
      details: {
        canonicalRoute: "/api/v1/artifacts/[artifactId]/references",
      },
    });
    await expect(
      service.createOperation(
        makeOperation({ payload: { Authorization: "Bearer sk-secret-123456789" } }),
      ),
    ).rejects.toMatchObject({ code: "SYNC_SECRET_DETECTED" });
    await expect(
      service.createOperation(
        makeOperation({
          payload: { body: "x".repeat(SYNC_STANDARD_PAYLOAD_MAX_BYTES + 1) },
        }),
      ),
    ).rejects.toMatchObject({ code: "SYNC_PAYLOAD_TOO_LARGE" });
  });

  it("allows workspace snapshot sync envelopes above the standard operation cap", async () => {
    const service = new SyncQueueService({
      inlineApply: false,
      repository: new InMemorySyncOperationRepository(),
    });
    const input = makeOperation({
      entityId: "workspace-sync-a",
      entityType: "workspace",
      operationType: "snapshot",
      payload: {
        body: "x".repeat(SYNC_STANDARD_PAYLOAD_MAX_BYTES + 1),
      },
      workspaceId: "workspace-sync-a",
    });

    const result = await service.createOperation(input, { userId: "user-owner" });

    expect(result.operation.status).toBe("queued");
    expect(JSON.stringify(input.payload).length).toBeLessThan(
      SYNC_WORKSPACE_SNAPSHOT_PAYLOAD_MAX_BYTES,
    );
  });

  it("marks transient apply failures retrying and checksum conflicts conflicted", async () => {
    class RetryApplier extends SyncOperationApplier {
      override async apply(): Promise<never> {
        throw new ApiError("INTERNAL_ERROR", "temporary unavailable", 500);
      }
    }
    class ConflictApplier extends SyncOperationApplier {
      override async apply(): Promise<never> {
        throw new ApiError("WORKSPACE_STATE_CONFLICT", "remote changed", 409);
      }
    }
    const retryService = new SyncQueueService({
      applier: new RetryApplier(),
      repository: new InMemorySyncOperationRepository(),
    });
    const conflictService = new SyncQueueService({
      applier: new ConflictApplier(),
      repository: new InMemorySyncOperationRepository(),
    });
    const retry = await retryService.createOperation(makeOperation(), {
      userId: "user-owner",
    });
    const conflicted = await conflictService.createOperation(makeOperation(), {
      userId: "user-owner",
    });

    expect(retry.operation.status).toBe("retrying");
    expect(conflicted.operation.status).toBe("conflicted");
  });

  it("does not cancel synced operations", async () => {
    const repository = new InMemorySyncOperationRepository();
    const service = new SyncQueueService({ inlineApply: false, repository });
    const created = await service.createOperation(makeOperation(), {
      userId: "user-owner",
    });
    await repository.markSynced(created.operation.id);
    const cancelled = await service.cancelOperation(
      created.operation.id,
      { workspaceId: created.operation.workspaceId },
      { userId: "local-owner" },
    );

    expect(cancelled.status).toBe("synced");
  });

  it("applies notebook upserts to the durable notebook repository", async () => {
    const syncRepository = new InMemorySyncOperationRepository();
    const notebookRepository = new InMemoryNotebookRepository();
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        notebookService: new NotebookService({ repository: notebookRepository }),
      }),
      repository: syncRepository,
    });
    const input = makeOperation({
      entityId: "notebook-1",
      entityType: "notebook",
      operationType: "upsert",
      payload: {
        content: "durable datapad body",
        created_at: "2026-05-28T00:00:00.000Z",
        id: "notebook-1",
        title: "Durable Datapad",
        updated_at: "2026-05-28T00:01:00.000Z",
        workspace_id: "workspace-sync-a",
      },
    });

    const response = await service.createOperation(input, { userId: "user-owner" });
    const notebook = await notebookRepository.findById({
      id: "notebook-1",
      workspaceId: "workspace-sync-a",
    });

    expect(response.operation.status).toBe("synced");
    expect(notebook).toMatchObject({
      content: "durable datapad body",
      id: "notebook-1",
      title: "Durable Datapad",
      workspace_id: "workspace-sync-a",
    });
  });

  it("applies message creates to the durable message repository", async () => {
    const syncRepository = new InMemorySyncOperationRepository();
    const messageRepository = new InMemoryMessageRepository();
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        messageHistoryService: new MessageHistoryService({
          messages: messageRepository,
        }),
      }),
      repository: syncRepository,
    });
    const input = makeOperation({
      entityId: "message-durable",
      entityType: "message",
      operationType: "create",
      payload: {
        agentId: "agent-sync-a",
        message: {
          content: "durable message body",
          createdAt: "2026-05-28T00:03:00.000Z",
          id: "message-durable",
          role: "assistant",
        },
        workspaceId: "workspace-sync-a",
      },
    });

    const response = await service.createOperation(input, { userId: "user-owner" });
    const messages = await messageRepository.listMessages({
      agentId: "agent-sync-a",
      limit: 10,
      workspaceId: "workspace-sync-a",
    });

    expect(response.operation.status).toBe("synced");
    expect(messages).toEqual([
      expect.objectContaining({
        content: "durable message body",
        id: "message-durable",
        role: "assistant",
        workspaceId: "workspace-sync-a",
      }),
    ]);
  });

  it("keeps message create idempotent for the same id and content hash", async () => {
    const messageRepository = new InMemoryMessageRepository();
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        messageHistoryService: new MessageHistoryService({
          messages: messageRepository,
        }),
      }),
      repository: new InMemorySyncOperationRepository(),
    });
    const input = makeOperation({
      entityId: "message-idempotent",
      entityType: "message",
      operationType: "create",
      payload: {
        agentId: "agent-sync-a",
        message: {
          content: "idempotent message body",
          createdAt: "2026-05-28T00:04:00.000Z",
          id: "message-idempotent",
          role: "assistant",
        },
        workspaceId: "workspace-sync-a",
      },
    });
    const retry = {
      ...input,
      clientMutationId: `mutation_message_retry_${crypto.randomUUID()}`,
    };

    const first = await service.createOperation(input, { userId: "user-owner" });
    const second = await service.createOperation(retry, { userId: "user-owner" });
    const messages = await messageRepository.listMessages({
      agentId: "agent-sync-a",
      limit: 10,
      workspaceId: "workspace-sync-a",
    });

    expect(first.operation.status).toBe("synced");
    expect(second.operation.status).toBe("synced");
    expect(messages).toEqual([
      expect.objectContaining({
        content: "idempotent message body",
        id: "message-idempotent",
      }),
    ]);
  });

  it("conflicts same message id with different content or identity", async () => {
    const messageRepository = new InMemoryMessageRepository();
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        messageHistoryService: new MessageHistoryService({
          messages: messageRepository,
        }),
      }),
      repository: new InMemorySyncOperationRepository(),
    });
    const firstInput = makeOperation({
      entityId: "message-conflict",
      entityType: "message",
      operationType: "create",
      payload: {
        agentId: "agent-sync-a",
        message: {
          content: "original durable body",
          createdAt: "2026-05-28T00:05:00.000Z",
          id: "message-conflict",
          role: "assistant",
        },
        workspaceId: "workspace-sync-a",
      },
    });
    const contentConflict = makeOperation({
      clientMutationId: `mutation_message_content_conflict_${crypto.randomUUID()}`,
      entityId: "message-conflict",
      entityType: "message",
      operationType: "create",
      payload: {
        agentId: "agent-sync-a",
        message: {
          content: "different stale body",
          createdAt: "2026-05-28T00:06:00.000Z",
          id: "message-conflict",
          role: "assistant",
        },
        workspaceId: "workspace-sync-a",
      },
    });
    const identityConflict = makeOperation({
      clientMutationId: `mutation_message_identity_conflict_${crypto.randomUUID()}`,
      entityId: "message-conflict",
      entityType: "message",
      operationType: "create",
      payload: {
        agentId: "agent-sync-b",
        message: {
          content: "original durable body",
          createdAt: "2026-05-28T00:07:00.000Z",
          id: "message-conflict",
          role: "assistant",
        },
        workspaceId: "workspace-sync-a",
      },
    });

    const first = await service.createOperation(firstInput, { userId: "user-owner" });
    const conflictedContent = await service.createOperation(contentConflict, {
      userId: "user-owner",
    });
    const conflictedIdentity = await service.createOperation(identityConflict, {
      userId: "user-owner",
    });
    const messages = await messageRepository.listMessages({
      agentId: "agent-sync-a",
      limit: 10,
      workspaceId: "workspace-sync-a",
    });

    expect(first.operation.status).toBe("synced");
    expect(conflictedContent.operation.status).toBe("conflicted");
    expect(conflictedIdentity.operation.status).toBe("conflicted");
    expect(messages).toEqual([
      expect.objectContaining({
        content: "original durable body",
        id: "message-conflict",
      }),
    ]);
  });

  it("conflicts stale notebook upserts instead of overwriting newer durable data", async () => {
    const notebookRepository = new InMemoryNotebookRepository();
    await notebookRepository.upsert({
      content: "newer durable body",
      id: "notebook-stale",
      title: "Newer Datapad",
      updatedAt: "2026-05-28T00:05:00.000Z",
      workspaceId: "workspace-sync-a",
    });
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        notebookService: new NotebookService({ repository: notebookRepository }),
      }),
      repository: new InMemorySyncOperationRepository(),
    });
    const response = await service.createOperation(
      makeOperation({
        entityId: "notebook-stale",
        entityType: "notebook",
        operationType: "upsert",
        payload: {
          content: "older local body",
          id: "notebook-stale",
          title: "Older Datapad",
          updated_at: "2026-05-28T00:01:00.000Z",
          workspace_id: "workspace-sync-a",
        },
      }),
      { userId: "user-owner" },
    );
    const notebook = await notebookRepository.findById({
      id: "notebook-stale",
      workspaceId: "workspace-sync-a",
    });

    expect(response.operation.status).toBe("conflicted");
    expect(notebook?.content).toBe("newer durable body");
  });

  it("applies notebook deletes idempotently", async () => {
    const notebookRepository = new InMemoryNotebookRepository();
    await notebookRepository.upsert({
      content: "delete me",
      id: "notebook-delete",
      title: "Delete Datapad",
      updatedAt: "2026-05-28T00:01:00.000Z",
      workspaceId: "workspace-sync-a",
    });
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        notebookService: new NotebookService({ repository: notebookRepository }),
      }),
      repository: new InMemorySyncOperationRepository(),
    });
    const input = makeOperation({
      entityId: "notebook-delete",
      entityType: "notebook",
      operationType: "delete",
      payload: {
        deleted_at: "2026-05-28T00:02:00.000Z",
        id: "notebook-delete",
        workspaceId: "workspace-sync-a",
      },
    });

    const first = await service.createOperation(input, { userId: "user-owner" });
    const second = await service.createOperation({
      ...input,
      clientMutationId: `mutation_delete_again_${crypto.randomUUID()}`,
    }, { userId: "user-owner" });

    expect(first.operation.status).toBe("synced");
    expect(second.operation.status).toBe("synced");
    const tombstone = await notebookRepository.findById({
      id: "notebook-delete",
      workspaceId: "workspace-sync-a",
    });

    expect(tombstone).toMatchObject({
      content: "delete me",
      deleted_at: "2026-05-28T00:02:00.000Z",
      deleted_by: "user-owner",
      id: "notebook-delete",
      title: "Delete Datapad",
      workspace_id: "workspace-sync-a",
    });
  });

  it("applies prompt upserts and tombstone deletes durably", async () => {
    const promptRepository = new InMemoryPromptRepository();
    const service = new SyncQueueService({
      applier: new SyncOperationApplier({
        promptService: new PromptService({ repository: promptRepository }),
      }),
      repository: new InMemorySyncOperationRepository(),
    });
    const upsert = makeOperation({
      entityId: "prompt-durable",
      entityType: "prompt",
      operationType: "upsert",
      payload: {
        content: "durable prompt body",
        created_at: "2026-05-28T00:04:00.000Z",
        id: "prompt-durable",
        revisions: [
          {
            newContent: "durable prompt body",
            previousContent: "draft prompt body",
            promptId: "prompt-durable",
            revisionId: "prompt-revision-durable",
            updatedAt: "2026-05-28T00:05:00.000Z",
          },
        ],
        title: "Durable Prompt",
        updated_at: "2026-05-28T00:05:00.000Z",
        workspace_id: "workspace-sync-a",
      },
    });
    const created = await service.createOperation(upsert, { userId: "user-owner" });
    const deleted = await service.createOperation(
      makeOperation({
        clientMutationId: `mutation_prompt_delete_${crypto.randomUUID()}`,
        entityId: "prompt-durable",
        entityType: "prompt",
        operationType: "delete",
        payload: {
          deleted_at: "2026-05-28T00:06:00.000Z",
          id: "prompt-durable",
          workspaceId: "workspace-sync-a",
        },
      }),
      { userId: "user-owner" },
    );
    const prompt = await promptRepository.findById({
      id: "prompt-durable",
      workspaceId: "workspace-sync-a",
    });
    const revisions = await promptRepository.listRevisions("prompt-durable");

    expect(created.operation.status).toBe("synced");
    expect(deleted.operation.status).toBe("synced");
    expect(prompt).toMatchObject({
      content: "durable prompt body",
      deleted_at: "2026-05-28T00:06:00.000Z",
      deleted_by: "user-owner",
      id: "prompt-durable",
    });
    expect(revisions).toEqual([
      expect.objectContaining({
        id: "prompt-revision-durable",
        new_content: "durable prompt body",
        previous_content: "draft prompt body",
        prompt_id: "prompt-durable",
      }),
    ]);
  });
});

describe("durable prompt tombstone and revision migrations", () => {
  const promptMigration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20260527011000_prompt_durable_tombstones.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const revisionMigration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20260527013000_prompt_revision_history.sql",
      import.meta.url,
    ),
    "utf8",
  );

  it("keeps prompt deletes recoverable and workspace-scoped", () => {
    expect(promptMigration).toContain("CREATE TABLE IF NOT EXISTS public.prompts");
    expect(promptMigration).toContain("deleted_at timestamptz");
    expect(promptMigration).toContain("prompts_deleted_by_requires_tombstone");
    expect(promptMigration).toContain("idx_prompts_workspace_visible_updated");
    expect(promptMigration).toContain("ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY");
    expect(promptMigration).toContain("workspace_id IS NOT NULL");
    expect(promptMigration).not.toContain("workspace_id IS NULL OR");
    expect(promptMigration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(promptMigration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(promptMigration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  it("creates prompt revision history without a second prompt store", () => {
    expect(revisionMigration).toContain("CREATE TABLE IF NOT EXISTS public.prompt_revisions");
    expect(revisionMigration).toContain("prompt_revisions_prompt_id_fkey");
    expect(revisionMigration).toContain("idx_prompt_revisions_prompt_created");
    expect(revisionMigration).toContain("ALTER TABLE public.prompt_revisions ENABLE ROW LEVEL SECURITY");
    expect(revisionMigration).toContain("Current prompt content remains canonical in public.prompts");
    expect(revisionMigration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(revisionMigration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(revisionMigration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe("durable notebook tombstone migration", () => {
  const migration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20260527010000_notebook_durable_tombstones.sql",
      import.meta.url,
    ),
    "utf8",
  );

  it("creates public.notebooks with recoverable tombstone fields", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.notebooks");
    expect(migration).toContain("deleted_at timestamptz");
    expect(migration).toContain("deleted_by uuid");
    expect(migration).toContain("notebooks_deleted_by_requires_tombstone");
    expect(migration).toContain("notebooks_global_created_by_required");
    expect(migration).toContain("idx_notebooks_workspace_visible_updated");
    expect(migration).toContain("idx_notebooks_workspace_deleted");
    expect(migration).toContain("idx_notebooks_global_owner_visible_updated");
    expect(migration).toContain("ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY");
  });

  it("keeps notebook migration additive and non-destructive", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS deleted_at");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS deleted_by");
    expect(migration).toContain("remote empty results are not delete proof");
    expect(migration).toContain("workspace_id IS NULL AND created_by = auth.uid()");
    expect(migration).not.toContain("workspace_id IS NULL OR public.is_workspace_member(workspace_id)");
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe("durable message history base migration", () => {
  const migration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20260527012000_message_history_base_table.sql",
      import.meta.url,
    ),
    "utf8",
  );

  it("creates public.messages with idempotency and archive projection fields", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.messages");
    expect(migration).toContain("id text PRIMARY KEY");
    expect(migration).toContain("workspace_id text NOT NULL");
    expect(migration).toContain("content_hash text");
    expect(migration).toContain("archived_at timestamptz");
    expect(migration).toContain("messages_workspace_id_required");
    expect(migration).toContain("idx_messages_workspace_agent_created");
    expect(migration).toContain("ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY");
  });

  it("keeps message migration additive and workspace-scoped", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS content_hash");
    expect(migration).toContain("remote empty results are not delete proof");
    expect(migration).toContain("workspace_id IS NOT NULL");
    expect(migration).not.toContain("workspace_id IS NULL OR");
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe("sync API routes", () => {
  it("rejects sync operation creation when only X-User-Id is provided", async () => {
    const operation = makeOperation({
      clientMutationId: `mutation_no_auth_${crypto.randomUUID()}`,
      workspaceId: `workspace-no-auth-${crypto.randomUUID()}`,
    });
    const response = await postSyncOperation(
      new Request("http://localhost/api/v1/sync/operations", {
        body: JSON.stringify(operation),
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": operation.clientMutationId,
          "X-User-Id": "local-owner",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns V2 envelope for create and status routes", async () => {
    installMockApiAuthSessionVerifierForTests("local-owner");

    const operation = makeOperation({
      clientMutationId: `mutation_route_${crypto.randomUUID()}`,
      workspaceId: `workspace-route-${crypto.randomUUID()}`,
    });
    const create = await postSyncOperation(
      makeJsonRequest("http://localhost/api/v1/sync/operations", operation),
    );
    const createJson = await readJson(create);
    const status = await getSyncStatus(
      new Request(
        `http://localhost/api/v1/sync/status?workspaceId=${operation.workspaceId}`,
        {
          headers: {
            ...authHeaders("local-owner"),
            "X-Request-Id": "req-status",
          },
        },
      ),
    );
    const statusJson = await readJson(status);

    expect(create.status).toBe(200);
    expect(createJson).toMatchObject({
      data: {
        operation: {
          id: operation.clientMutationId,
        },
      },
      ok: true,
    });
    expect(status.status).toBe(200);
    expect(statusJson).toMatchObject({
      data: {
        workspaceId: operation.workspaceId,
      },
      ok: true,
    });
  });

  it("denies viewer mutation operations", async () => {
    installMockApiAuthSessionVerifierForTests("local-viewer");

    const response = await postSyncOperation(
      makeJsonRequest(
        "http://localhost/api/v1/sync/operations",
        makeOperation({ workspaceId: `workspace-viewer-${crypto.randomUUID()}` }),
        "local-viewer",
      ),
    );
    const json = await readJson(response);

    expect(response.status).toBe(403);
    expect(json).toMatchObject({
      error: {
        code: "PERMISSION_DENIED",
      },
      ok: false,
    });
  });

  it("cancels queued operations through the cancel endpoint", async () => {
    installMockApiAuthSessionVerifierForTests("local-owner");

    const operation = makeOperation({
      clientMutationId: `mutation_cancel_${crypto.randomUUID()}`,
      entityId: "agent-cancel",
      entityType: "agent",
      workspaceId: `workspace-cancel-${crypto.randomUUID()}`,
    });

    await postSyncOperation(
      makeJsonRequest("http://localhost/api/v1/sync/operations", operation),
    );
    const response = await cancelSyncOperation(
      makeJsonRequest(
        `http://localhost/api/v1/sync/operations/${operation.clientMutationId}/cancel`,
        { workspaceId: operation.workspaceId },
      ),
      { params: Promise.resolve({ operationId: operation.clientMutationId }) },
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        id: operation.clientMutationId,
        status: "cancelled",
      },
      ok: true,
    });
  });
});

describe("V4 sync migration", () => {
  const migration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20260527003000_durable_sync_queue.sql",
      import.meta.url,
    ),
    "utf8",
  );

  it("creates sync_operations with constraints, indexes, and RLS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.sync_operations");
    expect(migration).toContain("sync_operations_entity_type_check");
    expect(migration).toContain("sync_operations_operation_type_check");
    expect(migration).toContain("sync_operations_status_check");
    expect(migration).toContain("idx_sync_operations_workspace_status");
    expect(migration).toContain("idx_sync_operations_next_retry");
    expect(migration).toContain("idx_sync_operations_entity");
    expect(migration).toContain("idx_sync_operations_lease");
    expect(migration).toContain("ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("sync_operations_select_member");
    expect(migration).toContain("sync_operations_insert_editor");
  });

  it("does not introduce later-version tables", () => {
    expect(migration).not.toMatch(/\bagent_tasks\b/i);
    expect(migration).not.toMatch(/\btool_runs\b/i);
    expect(migration).not.toMatch(/\bartifact_versions\b/i);
    expect(migration).not.toMatch(/\bfeature_flags\b/i);
    expect(migration).not.toMatch(/\bdeployment_checks\b/i);
    expect(migration).not.toMatch(/\bsystem_events\b/i);
  });
});

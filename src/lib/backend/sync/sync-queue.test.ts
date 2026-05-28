import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { POST as postSyncOperation } from "@/app/api/v1/sync/operations/route";
import { GET as getSyncStatus } from "@/app/api/v1/sync/status/route";
import { POST as cancelSyncOperation } from "@/app/api/v1/sync/operations/[operationId]/cancel/route";
import { ApiError } from "@/lib/backend/api/api-errors";
import { InMemoryNotebookRepository } from "@/lib/backend/notebooks/notebook-repository";
import { NotebookService } from "@/lib/backend/notebooks/notebook-service";

import { SyncOperationApplier } from "./sync-operation-applier";
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
      message: {
        content: "hello",
        id: "message-1",
      },
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
      "Content-Type": "application/json",
      "X-Idempotency-Key": clientMutationId,
      "X-Request-Id": `req_${crypto.randomUUID()}`,
      "X-User-Id": userId,
    },
    method: "POST",
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

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
      service.createOperation(
        makeOperation({ payload: { Authorization: "Bearer sk-secret-123456789" } }),
      ),
    ).rejects.toMatchObject({ code: "SYNC_SECRET_DETECTED" });
    await expect(
      service.createOperation(
        makeOperation({ payload: { body: "x".repeat(128 * 1024 + 1) } }),
      ),
    ).rejects.toMatchObject({ code: "SYNC_PAYLOAD_TOO_LARGE" });
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
    await expect(
      notebookRepository.findById({
        id: "notebook-delete",
        workspaceId: "workspace-sync-a",
      }),
    ).resolves.toBeNull();
  });
});

describe("sync API routes", () => {
  it("returns V2 envelope for create and status routes", async () => {
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
            "X-Request-Id": "req-status",
            "X-User-Id": "local-owner",
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
    const operation = makeOperation({
      clientMutationId: `mutation_cancel_${crypto.randomUUID()}`,
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

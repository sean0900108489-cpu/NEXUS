import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeLocalPayloadHash,
  LocalSyncQueueAdapter,
  LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES,
  LOCAL_SYNC_QUEUE_WORKSPACE_SNAPSHOT_MAX_PAYLOAD_BYTES,
} from "./local-sync-queue-adapter";

function makeAdapter() {
  return new LocalSyncQueueAdapter({ flushDelayMs: 60_000 });
}

function makeOperation(index = 1) {
  return {
    entityId: "agent-1",
    entityType: "agent",
    operationType: "patch",
    payload: {
      layout: {
        x: index,
        y: index,
      },
    },
    workspaceId: "workspace-local-queue",
  } as const;
}

function makeWorkspaceSnapshotOperation(index = 1) {
  const clientMutationId = `snapshot-${index}`;

  return {
    compactKey: "workspace:workspace-local-queue:snapshot",
    entityId: "workspace-local-queue",
    entityType: "workspace",
    operationType: "snapshot",
    payload: {
      baseChecksum: null,
      clientMutationId,
      schemaVersion: 1,
      snapshot: {
        index,
        registryVersion: "nexus-registry-v1",
        schemaVersion: 1,
        workspace: {
          id: "workspace-local-queue",
          name: "Local Queue",
        },
      },
      snapshotType: "active",
    },
    workspaceId: "workspace-local-queue",
  } as const;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LocalSyncQueueAdapter", () => {
  it("keeps offline operations in the local queue", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    await adapter.enqueue(makeOperation());
    const operations = await adapter.getOperations();

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      status: "queued",
      workspaceId: "workspace-local-queue",
    });
  });

  it("persists pending operations across adapter instances", async () => {
    const first = makeAdapter();
    await first.clear();
    await first.enqueue(makeOperation(2));

    const second = makeAdapter();
    const operations = await second.getOperations();

    expect(
      operations.some(
        (operation) =>
          (operation.payload as { layout?: { x?: number } }).layout?.x === 2,
      ),
    ).toBe(true);
  });

  it("keeps backend queued operations pending with NexusApiClient and idempotency headers", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const operation = await adapter.enqueue(makeOperation(3));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 0,
            createdAt: "2026-05-27T00:00:00.000Z",
            entityId: operation.entityId,
            entityType: operation.entityType,
            id: operation.clientMutationId,
            maxAttempts: 5,
            operationType: operation.operationType,
            payloadHash: operation.payloadHash,
            status: "queued",
            updatedAt: "2026-05-27T00:00:00.000Z",
            workspaceId: operation.workspaceId,
          },
        },
        error: null,
        meta: {
          requestId: "req-local",
          traceId: "trace-local",
        },
        ok: true,
      }),
    );

    await adapter.flush();
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    const operations = await adapter.getOperations();

    expect(headers.get("X-Idempotency-Key")).toBe(operation.clientMutationId);
    expect(operations[0]?.status).toBe("queued");
    expect(await adapter.getStatus()).toMatchObject({
      pending: 1,
    });
  });

  it("marks operations synced only when the backend reports synced", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const operation = await adapter.enqueue(makeOperation(33));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 1,
            createdAt: "2026-05-27T00:00:00.000Z",
            entityId: operation.entityId,
            entityType: operation.entityType,
            id: operation.clientMutationId,
            maxAttempts: 5,
            operationType: operation.operationType,
            payloadHash: operation.payloadHash,
            status: "synced",
            updatedAt: "2026-05-27T00:00:00.000Z",
            workspaceId: operation.workspaceId,
          },
        },
        error: null,
        meta: {
          requestId: "req-local",
          traceId: "trace-local",
        },
        ok: true,
      }),
    );

    await adapter.flush();
    const operations = await adapter.getOperations();

    expect(operations[0]?.status).toBe("synced");
    expect((await adapter.getStatus()).lastSyncedAt).toBeDefined();
  });

  it("scopes queue status to the active workspace when requested", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const staleOperation = await adapter.enqueue({
      ...makeOperation(61),
      workspaceId: "workspace-stale",
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("permission denied"));
    await adapter.flush();

    const activeOperation = await adapter.enqueue({
      ...makeOperation(62),
      workspaceId: "workspace-active",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 1,
            createdAt: "2026-05-27T00:00:00.000Z",
            entityId: activeOperation.entityId,
            entityType: activeOperation.entityType,
            id: activeOperation.clientMutationId,
            maxAttempts: 5,
            operationType: activeOperation.operationType,
            payloadHash: activeOperation.payloadHash,
            status: "synced",
            updatedAt: "2026-05-27T00:00:00.000Z",
            workspaceId: activeOperation.workspaceId,
          },
        },
        error: null,
        meta: {
          requestId: "req-local",
          traceId: "trace-local",
        },
        ok: true,
      }),
    );

    await adapter.flush();

    expect(await adapter.getStatus()).toMatchObject({
      failed: 1,
    });
    expect(await adapter.getStatus({ workspaceId: "workspace-active" })).toMatchObject({
      failed: 0,
      lastSyncedAt: expect.any(String),
    });
    expect(await adapter.getStatus({ workspaceId: staleOperation.workspaceId })).toMatchObject({
      failed: 1,
    });
  });

  it("compacts rapid layout operations to the final state", async () => {
    const adapter = makeAdapter();
    await adapter.clear();

    for (let index = 0; index < 50; index += 1) {
      await adapter.enqueue({
        ...makeOperation(index),
        compactKey: "agent-layout:workspace-local-queue:agent-1",
      });
    }

    const operations = await adapter.getOperations();
    const active = operations.filter((operation) => operation.status !== "compacted");

    expect(active).toHaveLength(1);
    expect(active[0]?.payload).toMatchObject({
      layout: {
        x: 49,
        y: 49,
      },
    });
  });

  it("compacts superseded conflicted workspace snapshots", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const operation = await adapter.enqueue(makeWorkspaceSnapshotOperation(1));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 1,
            createdAt: "2026-05-27T00:00:00.000Z",
            entityId: operation.entityId,
            entityType: operation.entityType,
            id: operation.clientMutationId,
            maxAttempts: 5,
            operationType: operation.operationType,
            payloadHash: operation.payloadHash,
            status: "conflicted",
            updatedAt: "2026-05-27T00:00:00.000Z",
            workspaceId: operation.workspaceId,
          },
        },
        error: null,
        meta: {
          requestId: "req-local",
          traceId: "trace-local",
        },
        ok: true,
      }),
    );

    await adapter.flush();
    await adapter.enqueue(makeWorkspaceSnapshotOperation(2));
    const operations = await adapter.getOperations();

    expect(
      operations.find(
        (candidate) => candidate.clientMutationId === operation.clientMutationId,
      )?.status,
    ).toBe("compacted");
    expect((await adapter.getStatus()).conflicted).toBe(0);
  });

  it("marks failed operations and supports manual retry", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const operation = await adapter.enqueue(makeOperation(4));
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));

    await adapter.flush();
    let status = await adapter.getStatus();

    expect(status.failed).toBe(1);
    await adapter.retry(operation.clientMutationId);
    status = await adapter.getStatus();
    expect(status.pending).toBe(1);
  });

  it("compacts read-only workspace operations before they reach the backend", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    await adapter.setWorkspaceReadOnly("workspace-local-queue", true);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const operation = await adapter.enqueue(makeWorkspaceSnapshotOperation(43));

    await adapter.flush();
    const operations = await adapter.getOperations();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(operation.status).toBe("compacted");
    expect(
      operations.find(
        (candidate) => candidate.clientMutationId === operation.clientMutationId,
      ),
    ).toMatchObject({
      lastErrorCode: "WORKSPACE_READ_ONLY",
      status: "compacted",
    });
    expect(await adapter.getStatus({ workspaceId: "workspace-local-queue" })).toMatchObject({
      failed: 0,
      pending: 0,
      syncing: 0,
    });
  });

  it("compacts queued read-only workspace operations when role knowledge arrives late", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const operation = await adapter.enqueue(makeWorkspaceSnapshotOperation(44));

    await adapter.setWorkspaceReadOnly("workspace-local-queue", true);
    await adapter.flush();
    const operations = await adapter.getOperations();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      operations.find(
        (candidate) => candidate.clientMutationId === operation.clientMutationId,
      ),
    ).toMatchObject({
      lastErrorCode: "WORKSPACE_READ_ONLY",
      status: "compacted",
    });
    expect(await adapter.getStatus({ workspaceId: "workspace-local-queue" })).toMatchObject({
      failed: 0,
      pending: 0,
      syncing: 0,
    });
  });

  it("compacts non-retryable workspace snapshot schema issues during manual recovery", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const operation = await adapter.enqueue(makeWorkspaceSnapshotOperation(41));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 1,
            createdAt: "2026-05-27T00:00:00.000Z",
            entityId: operation.entityId,
            entityType: operation.entityType,
            id: operation.clientMutationId,
            lastErrorCode: "WORKSPACE_STATE_SCHEMA_MISMATCH",
            lastErrorMessage:
              "Workspace snapshot contains disallowed unbounded or binary payload.",
            maxAttempts: 5,
            operationType: operation.operationType,
            payloadHash: operation.payloadHash,
            status: "failed",
            updatedAt: "2026-05-27T00:00:00.000Z",
            workspaceId: operation.workspaceId,
          },
        },
        error: null,
        meta: {
          requestId: "req-local",
          traceId: "trace-local",
        },
        ok: true,
      }),
    );

    await adapter.flush();
    const recoveryResult = await adapter.recoverIssue(operation.clientMutationId);
    const operations = await adapter.getOperations();

    expect(recoveryResult).toBe("compacted");
    expect(
      operations.find(
        (candidate) => candidate.clientMutationId === operation.clientMutationId,
      )?.status,
    ).toBe("compacted");
    expect(await adapter.getStatus()).toMatchObject({
      conflicted: 0,
      failed: 0,
    });
  });

  it("keeps permission issues retryable so auth failures are not silently hidden", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const operation = await adapter.enqueue(makeWorkspaceSnapshotOperation(42));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          deduplicated: false,
          operation: {
            attemptCount: 1,
            createdAt: "2026-05-27T00:00:00.000Z",
            entityId: operation.entityId,
            entityType: operation.entityType,
            id: operation.clientMutationId,
            lastErrorCode: "PERMISSION_DENIED",
            lastErrorMessage: "Permission denied.",
            maxAttempts: 5,
            operationType: operation.operationType,
            payloadHash: operation.payloadHash,
            status: "failed",
            updatedAt: "2026-05-27T00:00:00.000Z",
            workspaceId: operation.workspaceId,
          },
        },
        error: null,
        meta: {
          requestId: "req-local",
          traceId: "trace-local",
        },
        ok: true,
      }),
    );

    await adapter.flush();
    const recoveryResult = await adapter.recoverIssue(operation.clientMutationId);
    const operations = await adapter.getOperations();

    expect(recoveryResult).toBe("queued");
    expect(
      operations.find(
        (candidate) => candidate.clientMutationId === operation.clientMutationId,
      )?.status,
    ).toBe("queued");
    expect(await adapter.getStatus()).toMatchObject({
      pending: 1,
    });
  });

  it("rejects secret-bearing local queue payloads", async () => {
    const adapter = makeAdapter();
    await adapter.clear();

    await expect(
      adapter.enqueue({
        ...makeOperation(5),
        payload: {
          Authorization: "Bearer sk-secret-123456789",
        },
      }),
    ).rejects.toThrow("SYNC_SECRET_DETECTED");
  });

  it("allows workspace snapshot payloads above the standard local queue cap", async () => {
    const adapter = makeAdapter();
    await adapter.clear();
    const payload = {
      ...makeWorkspaceSnapshotOperation(51).payload,
      snapshot: {
        body: "x".repeat(LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES + 1),
      },
    };

    const operation = await adapter.enqueue({
      ...makeWorkspaceSnapshotOperation(51),
      payload,
    });

    expect(operation.status).toBe("queued");
    expect(JSON.stringify(payload).length).toBeLessThan(
      LOCAL_SYNC_QUEUE_WORKSPACE_SNAPSHOT_MAX_PAYLOAD_BYTES,
    );
  });

  it("computes stable local payload hashes", async () => {
    const first = await computeLocalPayloadHash({ b: 2, a: 1 });
    const second = await computeLocalPayloadHash({ a: 1, b: 2 });

    expect(first).toBe(second);
  });
});

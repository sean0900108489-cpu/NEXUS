import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeLocalPayloadHash,
  LocalSyncQueueAdapter,
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

  it("computes stable local payload hashes", async () => {
    const first = await computeLocalPayloadHash({ b: 2, a: 1 });
    const second = await computeLocalPayloadHash({ a: 1, b: 2 });

    expect(first).toBe(second);
  });
});

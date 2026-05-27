import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it } from "vitest";

import { GET as getMessages } from "@/app/api/v1/agents/[agentId]/messages/route";
import type { PermissionDecision } from "@/lib/backend/contracts/permission";
import type { PermissionService } from "@/lib/backend/security/permission-service";
import { supabaseStateSyncManager } from "@/lib/state-sync";
import { localSyncQueueAdapter } from "@/lib/sync/local-sync-queue-adapter";

import { ApiError } from "../api/api-errors";

import {
  AGENT_MEMORY_CONTENT_MAX_BYTES,
  MESSAGE_HISTORY_MAX_LIMIT,
} from "./history-constants";
import {
  prepareMemoryRecord,
} from "./agent-memory-record-repository";
import {
  InMemoryMessageRepository,
  getInMemoryMessageRepository,
} from "./message-repository";
import { MessageHistoryService } from "./message-history-service";
import { StoragePartitionService } from "./storage-partition-service";

const WORKSPACE_ID = "workspace-history";
const AGENT_ID = "agent-history";

const allowPermission = {
  check: async (): Promise<PermissionDecision> => ({
    decision: "allow",
    reasonCode: "PERMISSION_ALLOWED",
    requiredScopes: [],
    riskLevel: "low",
  }),
} as unknown as PermissionService;

function makeMessage(index: number) {
  const createdAt = new Date(Date.UTC(2026, 4, 27, 0, index)).toISOString();
  const id = `message-${String(index).padStart(3, "0")}`;

  return {
    agentId: AGENT_ID,
    archivedAt: null,
    content: `message ${index}`,
    contentHash: `sha256:${index}`,
    createdAt,
    id,
    isActiveWindow: true,
    metadata: {},
    role: "user" as const,
    sourceToolRunId: null,
    taskId: null,
    tokenCount: 2,
    updatedAt: null,
    workspaceId: WORKSPACE_ID,
  };
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<{ data: T; error?: { code: string }; ok: boolean }>;
}

describe("V10 StoragePartitionService", () => {
  it("creates opaque signed cursors and rejects tampered or expired tokens", () => {
    const service = new StoragePartitionService("history-secret", () => 1000);
    const cursor = service.createCursor({
      agentId: AGENT_ID,
      createdAt: "2026-05-27T00:00:00.000Z",
      id: "message-1",
      workspaceId: WORKSPACE_ID,
    });

    expect(cursor).not.toContain("2026-05-27");
    expect(cursor).not.toContain("message-1");
    expect(service.parseCursor(cursor, { agentId: AGENT_ID, workspaceId: WORKSPACE_ID }))
      .toMatchObject({
        agentId: AGENT_ID,
        id: "message-1",
        workspaceId: WORKSPACE_ID,
      });
    expect(() =>
      service.parseCursor(`${cursor}x`, {
        agentId: AGENT_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).toThrow(/cursor/i);

    const expired = new StoragePartitionService(
      "history-secret",
      () => 1000 + 25 * 60 * 60 * 1000,
    );

    expect(() =>
      expired.parseCursor(cursor, {
        agentId: AGENT_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).toThrow(/cursor/i);
  });
});

describe("V10 MessageHistoryService", () => {
  beforeEach(async () => {
    getInMemoryMessageRepository().clear();
    await localSyncQueueAdapter.clear();
  });

  it("caps message page size and returns signed next cursors", async () => {
    const messages = new InMemoryMessageRepository();
    messages.seed(Array.from({ length: 150 }, (_value, index) => makeMessage(index)));
    const service = new MessageHistoryService({
      messages,
      permissionService: allowPermission,
    });

    const page = await service.listMessages(
      {
        agentId: AGENT_ID,
        limit: 500,
        workspaceId: WORKSPACE_ID,
      },
      {
        requestId: "req-history",
        traceId: "trace-history",
        userId: "local-owner",
      },
    );

    expect(page.messages).toHaveLength(MESSAGE_HISTORY_MAX_LIMIT);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(page.nextCursor).not.toContain(page.messages.at(-1)?.id ?? "");
  });

  it("archives outside the backend-controlled active window without deleting content", async () => {
    const messages = new InMemoryMessageRepository();
    messages.seed(Array.from({ length: 8 }, (_value, index) => makeMessage(index)));
    const service = new MessageHistoryService({
      messages,
      permissionService: allowPermission,
    });

    const result = await service.archiveMessages(
      AGENT_ID,
      {
        keepLatest: 3,
        workspaceId: WORKSPACE_ID,
      },
      {
        requestId: "req-archive",
        traceId: "trace-archive",
        userId: "local-editor",
      },
    );
    const allMessages = await messages.listMessages({
      agentId: AGENT_ID,
      limit: 20,
      workspaceId: WORKSPACE_ID,
    });

    expect(result).toMatchObject({
      activeWindowCount: 3,
      archivedCount: 5,
    });
    expect(allMessages).toHaveLength(8);
    expect(allMessages.filter((message) => message.isActiveWindow)).toHaveLength(3);
    expect(allMessages.find((message) => !message.isActiveWindow)?.content).toContain(
      "message",
    );
  });

  it("enforces memory record size caps and secret boundaries", () => {
    expect(() =>
      prepareMemoryRecord({
        agentId: AGENT_ID,
        content: "x".repeat(AGENT_MEMORY_CONTENT_MAX_BYTES + 1),
        id: "memory-large",
        memoryType: "compressed",
        workspaceId: WORKSPACE_ID,
      }),
    ).toThrow(ApiError);

    expect(() =>
      prepareMemoryRecord({
        agentId: AGENT_ID,
        content: "Authorization: Bearer sk-secret-history-123456789",
        id: "memory-secret",
        memoryType: "compressed",
        workspaceId: WORKSPACE_ID,
      }),
    ).toThrow(/secret/i);
  });

  it("returns V2 envelope responses from the paged messages route", async () => {
    getInMemoryMessageRepository().seed(
      Array.from({ length: 3 }, (_value, index) => makeMessage(index)),
    );

    const response = await getMessages(
      new Request(
        `http://localhost/api/v1/agents/${AGENT_ID}/messages?workspaceId=${WORKSPACE_ID}&limit=2`,
        {
          headers: {
            "X-User-Id": "local-owner",
          },
        },
      ),
      {
        params: Promise.resolve({ agentId: AGENT_ID }),
      },
    );
    const envelope = await readJson<{ messages: unknown[]; nextCursor?: string | null }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(envelope.ok).toBe(true);
    expect(envelope.data.messages).toHaveLength(2);
    expect(envelope.data.nextCursor).toBeTruthy();
  });

  it("queues syncHistoricalMessage through the existing V4 local sync queue", async () => {
    const result = await supabaseStateSyncManager.syncHistoricalMessage({
      agentId: AGENT_ID,
      message: {
        content: "Durable history handoff",
        createdAt: "2026-05-27T00:00:00.000Z",
        id: "message-history-sync",
        role: "assistant",
      },
      workspaceId: WORKSPACE_ID,
    });
    const operations = await localSyncQueueAdapter.getOperations();

    expect(result.ok).toBe(true);
    expect(operations).toEqual([
      expect.objectContaining({
        entityId: "message-history-sync",
        entityType: "message",
        operationType: "upsert",
        workspaceId: WORKSPACE_ID,
      }),
    ]);
  });
});

describe("V10 historical data migration", () => {
  it("is additive, indexed, backfill-safe, and does not introduce vector storage", () => {
    const sql = readFileSync(
      "supabase/migrations/20260527009000_historical_data_paging.sql",
      "utf8",
    );
    const normalized = sql.toLowerCase();

    expect(normalized).toContain("alter table public.messages");
    expect(normalized).toContain("create table if not exists public.agent_memory_records");
    expect(sql).toContain("idx_messages_workspace_agent_created");
    expect(sql).toContain("idx_memory_workspace_agent_type");
    expect(sql).toContain("backfill_message_history_fields");
    expect(normalized).not.toContain("drop table");
    expect(normalized).not.toContain("create table public.vector");
    expect(normalized).not.toContain("semantic_search");
  });
});

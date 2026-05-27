import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AgentMessageRole,
  MessageHistoryRecord,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type { Database, Messages } from "@/lib/supabase/database.types";

import type { HistoryCursorPayload } from "./storage-partition-service";

export type MessageHistoryQuery = {
  workspaceId: string;
  agentId: string;
  cursor?: HistoryCursorPayload | null;
  limit: number;
  activeOnly?: boolean;
};

export type ArchiveMessagesInput = {
  workspaceId: string;
  agentId: string;
  keepLatest: number;
  archivedAt?: string;
};

export interface MessageRepository {
  listMessages(query: MessageHistoryQuery): Promise<MessageHistoryRecord[]>;
  archiveOutsideActiveWindow(input: ArchiveMessagesInput): Promise<{
    archivedCount: number;
    activeWindowCount: number;
  }>;
}

export class InMemoryMessageRepository implements MessageRepository {
  private readonly messages = new Map<string, MessageHistoryRecord>();

  seed(messages: MessageHistoryRecord[]) {
    for (const message of messages) {
      this.messages.set(message.id, message);
    }
  }

  clear() {
    this.messages.clear();
  }

  async listMessages(query: MessageHistoryQuery) {
    return this.sortedMessages()
      .filter((message) => message.workspaceId === query.workspaceId)
      .filter((message) => message.agentId === query.agentId)
      .filter((message) => !query.activeOnly || message.isActiveWindow)
      .filter((message) => !query.cursor || isOlderThanCursor(message, query.cursor))
      .slice(0, query.limit);
  }

  async archiveOutsideActiveWindow(input: ArchiveMessagesInput) {
    const active = this.sortedMessages()
      .filter((message) => message.workspaceId === input.workspaceId)
      .filter((message) => message.agentId === input.agentId)
      .filter((message) => message.isActiveWindow);
    const archiveIds = new Set(active.slice(input.keepLatest).map((message) => message.id));
    const archivedAt = input.archivedAt ?? new Date().toISOString();

    for (const id of archiveIds) {
      const message = this.messages.get(id);

      if (message) {
        this.messages.set(id, {
          ...message,
          archivedAt,
          isActiveWindow: false,
          updatedAt: archivedAt,
        });
      }
    }

    return {
      activeWindowCount: Math.min(active.length, input.keepLatest),
      archivedCount: archiveIds.size,
    };
  }

  private sortedMessages() {
    return [...this.messages.values()].sort((left, right) => {
      const createdCompare = right.createdAt.localeCompare(left.createdAt);

      return createdCompare === 0 ? right.id.localeCompare(left.id) : createdCompare;
    });
  }
}

export class SupabaseMessageRepository implements MessageRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listMessages(query: MessageHistoryQuery) {
    let request = this.client
      .from("messages")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .eq("agent_id", query.agentId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(query.limit);

    if (query.activeOnly) {
      request = request.eq("is_active_window", true);
    }

    if (query.cursor) {
      request = request.lt("created_at", query.cursor.createdAt);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapMessage);
  }

  async archiveOutsideActiveWindow(input: ArchiveMessagesInput) {
    const { data, error } = await this.client
      .from("messages")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("agent_id", input.agentId)
      .eq("is_active_window", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const ids = (data ?? []).slice(input.keepLatest).map((row) => row.id);
    const archivedAt = input.archivedAt ?? new Date().toISOString();

    if (ids.length) {
      const { error: updateError } = await this.client
        .from("messages")
        .update({
          archived_at: archivedAt,
          is_active_window: false,
          updated_at: archivedAt,
        })
        .in("id", ids);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return {
      activeWindowCount: Math.max(0, (data ?? []).length - ids.length),
      archivedCount: ids.length,
    };
  }
}

const inMemoryMessageRepository = new InMemoryMessageRepository();

export function createMessageRepository(): MessageRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseMessageRepository(getNexusSupabaseAdminClient())
    : inMemoryMessageRepository;
}

export function getInMemoryMessageRepository() {
  return inMemoryMessageRepository;
}

export function mapMessage(row: Messages): MessageHistoryRecord {
  const role = normalizeMessageRole(row.role ?? row.type);

  return {
    agentId: row.agent_id,
    archivedAt: row.archived_at,
    content: row.content,
    contentHash: row.content_hash ?? createContentHash(row.content),
    createdAt: row.created_at,
    id: row.id,
    isActiveWindow: row.is_active_window ?? true,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    role,
    sourceToolRunId: row.source_tool_run_id,
    taskId: row.task_id,
    tokenCount: row.token_count ?? estimateTokenCount(row.content),
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

function isOlderThanCursor(
  message: MessageHistoryRecord,
  cursor: HistoryCursorPayload,
) {
  if (message.createdAt < cursor.createdAt) {
    return true;
  }

  return message.createdAt === cursor.createdAt && message.id < cursor.id;
}

function normalizeMessageRole(value: string): AgentMessageRole {
  return ["system", "user", "assistant", "tool"].includes(value)
    ? (value as AgentMessageRole)
    : "assistant";
}

function createContentHash(content: string) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export function estimateTokenCount(content: string) {
  return Math.max(1, Math.ceil(content.length / 4));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

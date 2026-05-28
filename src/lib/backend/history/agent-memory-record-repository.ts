import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AgentMemoryRecord,
  AgentMemoryRecordType,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  AgentMemoryRecordInsert,
  Agent_Memory_Records,
  Database,
} from "@/lib/supabase/database.types";

import { ApiError } from "../api/api-errors";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import {
  AGENT_MEMORY_CONTENT_MAX_BYTES,
  isAgentMemoryRecordType,
} from "./history-constants";

export type AgentMemoryRecordQuery = {
  workspaceId: string;
  agentId: string;
  memoryType?: AgentMemoryRecordType | null;
  limit?: number;
};

export type InsertAgentMemoryRecordInput = {
  id: string;
  workspaceId: string;
  agentId: string;
  memoryType: AgentMemoryRecordType;
  content: string;
  intensity?: number | null;
  sourceTaskId?: string | null;
};

export interface AgentMemoryRecordRepository {
  insert(input: InsertAgentMemoryRecordInput): Promise<AgentMemoryRecord>;
  list(query: AgentMemoryRecordQuery): Promise<AgentMemoryRecord[]>;
}

export class InMemoryAgentMemoryRecordRepository implements AgentMemoryRecordRepository {
  private readonly records = new Map<string, AgentMemoryRecord>();

  async insert(input: InsertAgentMemoryRecordInput) {
    const record = prepareMemoryRecord(input);

    this.records.set(record.id, record);

    return record;
  }

  async list(query: AgentMemoryRecordQuery) {
    return [...this.records.values()]
      .filter((record) => record.workspaceId === query.workspaceId)
      .filter((record) => record.agentId === query.agentId)
      .filter((record) => !query.memoryType || record.memoryType === query.memoryType)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, query.limit ?? 50);
  }

  clear() {
    this.records.clear();
  }
}

export class SupabaseAgentMemoryRecordRepository implements AgentMemoryRecordRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insert(input: InsertAgentMemoryRecordInput) {
    const record = prepareMemoryRecord(input);
    const row: AgentMemoryRecordInsert = {
      agent_id: record.agentId,
      content: record.content,
      content_hash: record.contentHash,
      created_at: record.createdAt,
      id: record.id,
      intensity: record.intensity ?? null,
      memory_type: record.memoryType,
      source_task_id: record.sourceTaskId ?? null,
      updated_at: record.updatedAt,
      workspace_id: record.workspaceId,
    };
    const { data, error } = await this.client
      .from("agent_memory_records")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapMemoryRecord(data);
  }

  async list(query: AgentMemoryRecordQuery) {
    let request = this.client
      .from("agent_memory_records")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .eq("agent_id", query.agentId)
      .order("updated_at", { ascending: false })
      .limit(query.limit ?? 50);

    if (query.memoryType) {
      request = request.eq("memory_type", query.memoryType);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapMemoryRecord);
  }
}

const inMemoryAgentMemoryRecordRepository = new InMemoryAgentMemoryRecordRepository();

export function createAgentMemoryRecordRepository(): AgentMemoryRecordRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseAgentMemoryRecordRepository(getNexusSupabaseAdminClient())
    : inMemoryAgentMemoryRecordRepository;
}

export function getInMemoryAgentMemoryRecordRepository() {
  return inMemoryAgentMemoryRecordRepository;
}

export function prepareMemoryRecord(
  input: InsertAgentMemoryRecordInput,
): AgentMemoryRecord {
  if (!isAgentMemoryRecordType(input.memoryType)) {
    throw new ApiError("VALIDATION_FAILED", "Memory type is invalid.", 400);
  }

  const content = input.content.trim();
  const contentSizeBytes = new TextEncoder().encode(content).byteLength;

  if (contentSizeBytes > AGENT_MEMORY_CONTENT_MAX_BYTES) {
    throw new ApiError(
      "HISTORY_MEMORY_TOO_LARGE",
      "Agent memory record exceeds the allowed content size.",
      413,
      {
        contentSizeBytes,
        maxContentSizeBytes: AGENT_MEMORY_CONTENT_MAX_BYTES,
      },
    );
  }

  new SecretBoundaryService().assertNoSecrets(content);

  const now = new Date().toISOString();

  return {
    agentId: input.agentId,
    content,
    contentHash: createContentHash(content),
    createdAt: now,
    id: input.id,
    intensity: input.intensity ?? null,
    memoryType: input.memoryType,
    sourceTaskId: input.sourceTaskId ?? null,
    updatedAt: now,
    workspaceId: input.workspaceId,
  };
}

function mapMemoryRecord(row: Agent_Memory_Records): AgentMemoryRecord {
  return {
    agentId: row.agent_id,
    content: row.content,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    id: row.id,
    intensity: row.intensity,
    memoryType: row.memory_type,
    sourceTaskId: row.source_task_id,
    updatedAt: row.updated_at,
    workspaceId: row.workspace_id,
  };
}

function createContentHash(content: string) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

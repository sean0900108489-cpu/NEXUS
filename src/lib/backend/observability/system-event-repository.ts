import type { SupabaseClient } from "@supabase/supabase-js";

import type { SystemEventRecord } from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  SystemEventInsert,
  System_Events,
} from "@/lib/supabase/database.types";

import {
  OBSERVABILITY_DEFAULT_LIMIT,
  OBSERVABILITY_MAX_LIMIT,
  type InsertSystemEventInput,
  type SystemEventListQuery,
} from "./observability-types";

export interface SystemEventRepository {
  insert(input: InsertSystemEventInput): Promise<SystemEventRecord>;
  list(query: SystemEventListQuery): Promise<SystemEventRecord[]>;
  listByTrace(input: {
    traceId: string;
    workspaceId: string;
    cursor?: string | null;
    limit?: number | null;
  }): Promise<SystemEventRecord[]>;
  cleanupExpired(before: Date): Promise<number>;
}

export class InMemorySystemEventRepository implements SystemEventRepository {
  private readonly events = new Map<string, SystemEventRecord>();

  async insert(input: InsertSystemEventInput) {
    const event: SystemEventRecord = {
      createdAt: input.createdAt ?? new Date().toISOString(),
      eventType: input.eventType,
      id: input.id ?? makeUuid(),
      message: input.message ?? null,
      metadata: input.metadata,
      requestId: input.requestId ?? null,
      resourceId: input.resourceId ?? null,
      resourceType: input.resourceType ?? null,
      severity: input.severity,
      source: input.source,
      traceId: input.traceId,
      userId: input.userId ?? null,
      workspaceId: input.workspaceId ?? null,
    };

    this.events.set(event.id, event);

    return event;
  }

  async list(query: SystemEventListQuery) {
    return this.sortedEvents()
      .filter((event) => event.workspaceId === query.workspaceId)
      .filter((event) => !query.traceId || event.traceId === query.traceId)
      .filter((event) => !query.severity || event.severity === query.severity)
      .filter((event) => !query.source || event.source === query.source)
      .filter((event) => !query.cursor || event.createdAt < query.cursor)
      .slice(0, clampRepositoryLimit(query.limit));
  }

  async listByTrace(input: {
    traceId: string;
    workspaceId: string;
    cursor?: string | null;
    limit?: number | null;
  }) {
    return this.sortedEvents()
      .filter((event) => event.workspaceId === input.workspaceId)
      .filter((event) => event.traceId === input.traceId)
      .filter((event) => !input.cursor || event.createdAt < input.cursor)
      .slice(0, clampRepositoryLimit(input.limit));
  }

  async cleanupExpired(before: Date) {
    let removed = 0;

    for (const [id, event] of this.events) {
      if (new Date(event.createdAt).getTime() < before.getTime()) {
        this.events.delete(id);
        removed += 1;
      }
    }

    return removed;
  }

  clear() {
    this.events.clear();
  }

  private sortedEvents() {
    return [...this.events.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }
}

export class SupabaseSystemEventRepository implements SystemEventRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insert(input: InsertSystemEventInput) {
    const row: SystemEventInsert = {
      created_at: input.createdAt,
      event_type: input.eventType,
      id: input.id,
      message: input.message ?? null,
      metadata: input.metadata,
      request_id: input.requestId ?? null,
      resource_id: input.resourceId ?? null,
      resource_type: input.resourceType ?? null,
      severity: input.severity,
      source: input.source,
      trace_id: input.traceId,
      user_id: normalizeUuid(input.userId),
      workspace_id: input.workspaceId ?? null,
    };
    const { data, error } = await this.client
      .from("system_events")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapSystemEvent(data);
  }

  async list(query: SystemEventListQuery) {
    let request = this.client
      .from("system_events")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .order("created_at", { ascending: false })
      .limit(clampRepositoryLimit(query.limit));

    if (query.traceId) {
      request = request.eq("trace_id", query.traceId);
    }

    if (query.severity) {
      request = request.eq("severity", query.severity);
    }

    if (query.source) {
      request = request.eq("source", query.source);
    }

    if (query.cursor) {
      request = request.lt("created_at", query.cursor);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapSystemEvent);
  }

  async listByTrace(input: {
    traceId: string;
    workspaceId: string;
    cursor?: string | null;
    limit?: number | null;
  }) {
    let request = this.client
      .from("system_events")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("trace_id", input.traceId)
      .order("created_at", { ascending: false })
      .limit(clampRepositoryLimit(input.limit));

    if (input.cursor) {
      request = request.lt("created_at", input.cursor);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapSystemEvent);
  }

  async cleanupExpired(before: Date) {
    const { data, error } = await this.client
      .from("system_events")
      .delete()
      .lt("created_at", before.toISOString())
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return data?.length ?? 0;
  }
}

const inMemorySystemEventRepository = new InMemorySystemEventRepository();

export function createSystemEventRepository(): SystemEventRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseSystemEventRepository(getNexusSupabaseAdminClient())
    : inMemorySystemEventRepository;
}

export function getInMemorySystemEventRepository() {
  return inMemorySystemEventRepository;
}

function mapSystemEvent(row: System_Events): SystemEventRecord {
  return {
    createdAt: row.created_at,
    eventType: row.event_type,
    id: row.id,
    message: row.message,
    metadata: row.metadata,
    requestId: row.request_id,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    severity: row.severity,
    source: row.source,
    traceId: row.trace_id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  };
}

function normalizeUuid(value?: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function clampRepositoryLimit(limit: unknown) {
  const numeric = typeof limit === "number" ? limit : Number(limit);

  if (!Number.isFinite(numeric)) {
    return OBSERVABILITY_DEFAULT_LIMIT;
  }

  return Math.min(
    OBSERVABILITY_MAX_LIMIT + 1,
    Math.max(1, Math.floor(numeric)),
  );
}

function makeUuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

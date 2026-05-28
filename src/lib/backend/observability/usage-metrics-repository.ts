import type { SupabaseClient } from "@supabase/supabase-js";

import type { UsageMetricRecord } from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  UsageMetricInsert,
  Usage_Metrics,
} from "@/lib/supabase/database.types";

import {
  clampObservabilityLimit,
  type InsertUsageMetricInput,
  type UsageMetricsAggregateResult,
  type UsageMetricsQuery,
} from "./observability-types";

export interface UsageMetricsRepository {
  insert(input: InsertUsageMetricInput): Promise<UsageMetricRecord>;
  aggregateDaily(query: UsageMetricsQuery): Promise<UsageMetricsAggregateResult>;
  cleanupExpired(before: Date): Promise<number>;
}

export class InMemoryUsageMetricsRepository implements UsageMetricsRepository {
  private readonly metrics = new Map<string, UsageMetricRecord>();

  async insert(input: InsertUsageMetricInput) {
    const metric: UsageMetricRecord = {
      agentId: input.agentId ?? null,
      costEstimate: input.costEstimate ?? null,
      createdAt: input.createdAt ?? new Date().toISOString(),
      id: input.id ?? makeUuid(),
      inputTokens: input.inputTokens ?? null,
      latencyMs: input.latencyMs ?? null,
      model: input.model ?? null,
      outputTokens: input.outputTokens ?? null,
      provider: input.provider ?? null,
      taskId: input.taskId ?? null,
      toolRunId: input.toolRunId ?? null,
      workspaceId: input.workspaceId ?? null,
    };

    this.metrics.set(metric.id, metric);

    return metric;
  }

  async aggregateDaily(query: UsageMetricsQuery) {
    const limit = clampObservabilityLimit(query.limit);
    const grouped = new Map<string, UsageMetricsAggregateResult["metrics"][number]>();
    const rows = [...this.metrics.values()]
      .filter((metric) => metric.workspaceId === query.workspaceId)
      .filter((metric) => !query.provider || metric.provider === query.provider)
      .filter((metric) => !query.model || metric.model === query.model)
      .filter((metric) => !query.cursor || metric.createdAt < query.cursor)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    for (const metric of rows) {
      const date = metric.createdAt.slice(0, 10);
      const key = [date, metric.workspaceId, metric.provider, metric.model].join("\u0000");
      const current =
        grouped.get(key) ??
        {
          costEstimate: 0,
          count: 0,
          date,
          inputTokens: 0,
          latencyMs: 0,
          model: metric.model,
          outputTokens: 0,
          provider: metric.provider,
          workspaceId: metric.workspaceId,
        };

      current.costEstimate += metric.costEstimate ?? 0;
      current.count += 1;
      current.inputTokens += metric.inputTokens ?? 0;
      current.latencyMs += metric.latencyMs ?? 0;
      current.outputTokens += metric.outputTokens ?? 0;
      grouped.set(key, current);
    }

    const metrics = [...grouped.values()]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, limit + 1);
    const page = metrics.slice(0, limit);

    return {
      hasMore: metrics.length > limit,
      metrics: page,
      nextCursor: metrics.length > limit ? rows[limit]?.createdAt ?? null : null,
    };
  }

  async cleanupExpired(before: Date) {
    let removed = 0;

    for (const [id, metric] of this.metrics) {
      if (new Date(metric.createdAt).getTime() < before.getTime()) {
        this.metrics.delete(id);
        removed += 1;
      }
    }

    return removed;
  }

  clear() {
    this.metrics.clear();
  }
}

export class SupabaseUsageMetricsRepository implements UsageMetricsRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insert(input: InsertUsageMetricInput) {
    const row: UsageMetricInsert = {
      agent_id: input.agentId ?? null,
      cost_estimate: input.costEstimate ?? null,
      created_at: input.createdAt,
      id: input.id,
      input_tokens: input.inputTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      model: input.model ?? null,
      output_tokens: input.outputTokens ?? null,
      provider: input.provider ?? null,
      task_id: normalizeUuid(input.taskId),
      tool_run_id: normalizeUuid(input.toolRunId),
      workspace_id: input.workspaceId ?? null,
    };
    const { data, error } = await this.client
      .from("usage_metrics")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapUsageMetric(data);
  }

  async aggregateDaily(query: UsageMetricsQuery) {
    const limit = clampObservabilityLimit(query.limit);
    let request = this.client
      .from("usage_metrics")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (query.provider) {
      request = request.eq("provider", query.provider);
    }

    if (query.model) {
      request = request.eq("model", query.model);
    }

    if (query.cursor) {
      request = request.lt("created_at", query.cursor);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    const memory = new InMemoryUsageMetricsRepository();

    for (const row of data ?? []) {
      await memory.insert(mapUsageMetric(row));
    }

    return memory.aggregateDaily({
      ...query,
      limit,
    });
  }

  async cleanupExpired(before: Date) {
    const { data, error } = await this.client
      .from("usage_metrics")
      .delete()
      .lt("created_at", before.toISOString())
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return data?.length ?? 0;
  }
}

const inMemoryUsageMetricsRepository = new InMemoryUsageMetricsRepository();

export function createUsageMetricsRepository(): UsageMetricsRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseUsageMetricsRepository(getNexusSupabaseAdminClient())
    : inMemoryUsageMetricsRepository;
}

export function getInMemoryUsageMetricsRepository() {
  return inMemoryUsageMetricsRepository;
}

function mapUsageMetric(row: Usage_Metrics): UsageMetricRecord {
  return {
    agentId: row.agent_id,
    costEstimate: row.cost_estimate,
    createdAt: row.created_at,
    id: row.id,
    inputTokens: row.input_tokens,
    latencyMs: row.latency_ms,
    model: row.model,
    outputTokens: row.output_tokens,
    provider: row.provider,
    taskId: row.task_id,
    toolRunId: row.tool_run_id,
    workspaceId: row.workspace_id,
  };
}

function normalizeUuid(value?: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function makeUuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

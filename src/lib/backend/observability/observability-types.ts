import type {
  ObservabilityEventSeverity,
  ObservabilityEventSource,
  SystemEventRecord,
  UsageMetricDailyAggregate,
  UsageMetricRecord,
} from "@/lib/nexus-types";

export const OBSERVABILITY_EVENT_SEVERITIES = [
  "debug",
  "info",
  "warn",
  "error",
  "critical",
] as const satisfies readonly ObservabilityEventSeverity[];

export const OBSERVABILITY_EVENT_SOURCES = [
  "api",
  "sync",
  "agent",
  "tool",
  "artifact",
  "database",
  "provider",
  "security",
  "deployment",
  "history",
] as const satisfies readonly ObservabilityEventSource[];

export const OBSERVABILITY_DEFAULT_LIMIT = 50;
export const OBSERVABILITY_MAX_LIMIT = 100;

export type InsertSystemEventInput = Omit<SystemEventRecord, "createdAt" | "id"> & {
  createdAt?: string;
  id?: string;
};

export type SystemEventListQuery = {
  workspaceId: string;
  traceId?: string | null;
  severity?: ObservabilityEventSeverity | null;
  source?: ObservabilityEventSource | null;
  cursor?: string | null;
  limit?: number | null;
};

export type InsertUsageMetricInput = Omit<UsageMetricRecord, "createdAt" | "id"> & {
  createdAt?: string;
  id?: string;
};

export type UsageMetricsQuery = {
  workspaceId: string;
  cursor?: string | null;
  limit?: number | null;
  provider?: string | null;
  model?: string | null;
};

export type UsageMetricsAggregateResult = {
  metrics: UsageMetricDailyAggregate[];
  hasMore: boolean;
  nextCursor?: string | null;
};

export function isObservabilityEventSeverity(
  value: unknown,
): value is ObservabilityEventSeverity {
  return (
    typeof value === "string" &&
    OBSERVABILITY_EVENT_SEVERITIES.includes(value as ObservabilityEventSeverity)
  );
}

export function isObservabilityEventSource(
  value: unknown,
): value is ObservabilityEventSource {
  return (
    typeof value === "string" &&
    OBSERVABILITY_EVENT_SOURCES.includes(value as ObservabilityEventSource)
  );
}

export function clampObservabilityLimit(limit: unknown) {
  const numeric = typeof limit === "number" ? limit : Number(limit);

  if (!Number.isFinite(numeric)) {
    return OBSERVABILITY_DEFAULT_LIMIT;
  }

  return Math.min(
    OBSERVABILITY_MAX_LIMIT,
    Math.max(1, Math.floor(numeric)),
  );
}

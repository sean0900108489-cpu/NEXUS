import type { BackendEvent } from "./events";
import {
  clampObservabilityLimit,
  isObservabilityEventSeverity,
  isObservabilityEventSource,
  type InsertUsageMetricInput,
  type SystemEventListQuery,
  type UsageMetricsQuery,
} from "./observability-types";
import { RedactionPipeline } from "./redaction-pipeline";
import {
  createSystemEventRepository,
  type SystemEventRepository,
} from "./system-event-repository";
import {
  createUsageMetricsRepository,
  type UsageMetricsRepository,
} from "./usage-metrics-repository";

export type ObservabilityServiceDependencies = {
  eventRepository?: SystemEventRepository;
  metricsRepository?: UsageMetricsRepository;
  redactionPipeline?: RedactionPipeline;
  sampleRates?: Partial<Record<"debug" | "info" | "warn" | "error" | "critical", number>>;
  warn?: (message: string, error?: unknown) => void;
};

export class ObservabilityService {
  private readonly eventRepository: SystemEventRepository;
  private readonly metricsRepository: UsageMetricsRepository;
  private readonly redactionPipeline: RedactionPipeline;
  private readonly sampleRates: Record<"debug" | "info" | "warn" | "error" | "critical", number>;
  private readonly warn: (message: string, error?: unknown) => void;

  constructor(dependencies: ObservabilityServiceDependencies = {}) {
    this.eventRepository = dependencies.eventRepository ?? createSystemEventRepository();
    this.metricsRepository =
      dependencies.metricsRepository ?? createUsageMetricsRepository();
    this.redactionPipeline =
      dependencies.redactionPipeline ?? new RedactionPipeline();
    this.sampleRates = {
      critical: 1,
      debug: readSampleRate("OBSERVABILITY_DEBUG_SAMPLE_RATE", 0.1),
      error: 1,
      info: readSampleRate("OBSERVABILITY_INFO_SAMPLE_RATE", 1),
      warn: 1,
      ...dependencies.sampleRates,
    };
    this.warn =
      dependencies.warn ??
      ((message, error) => {
        console.warn(message, error);
      });
  }

  emit(event: BackendEvent): void {
    const severity = severityForEvent(event);

    if (!this.shouldSample(event, severity)) {
      return;
    }

    void this.recordSystemEvent(event, severity).catch((error) => {
      // Never re-emit observability failures. Drop and optionally warn.
      this.warn("[observability] event dropped", error);
    });
  }

  async recordSystemEvent(event: BackendEvent, severity = severityForEvent(event)) {
    const payload = {
      ...(event.payload ?? {}),
      occurredAt: event.occurredAt,
      status: event.status,
    };
    const sanitized = this.redactionPipeline.sanitizeMetadata(payload);
    const message = this.redactionPipeline.sanitizeMessage(event.payload?.message);
    const source = isObservabilityEventSource(event.trace.source)
      ? event.trace.source
      : "api";

    return this.eventRepository.insert({
      createdAt: event.occurredAt,
      eventType: event.name,
      message,
      metadata: {
        ...sanitized.metadata,
        observability: {
          originalSizeBytes: sanitized.originalSizeBytes,
          redacted: sanitized.redacted,
          truncated: sanitized.truncated,
        },
      },
      requestId: event.trace.requestId,
      resourceId: event.trace.resourceId,
      resourceType: event.trace.resourceType,
      severity,
      source,
      traceId: event.trace.traceId,
      userId: event.trace.userId,
      workspaceId: event.trace.workspaceId,
    });
  }

  recordUsageMetric(input: InsertUsageMetricInput): void {
    void this.metricsRepository.insert(input).catch((error) => {
      this.warn("[observability] usage metric dropped", error);
    });
  }

  async insertUsageMetric(input: InsertUsageMetricInput) {
    return this.metricsRepository.insert(input);
  }

  async listEvents(query: SystemEventListQuery) {
    const limit = clampObservabilityLimit(query.limit);
    const events = await this.eventRepository.list({
      ...query,
      limit: limit + 1,
    });
    const page = events.slice(0, limit);

    return {
      events: page,
      hasMore: events.length > limit,
      nextCursor: events.length > limit ? page.at(-1)?.createdAt ?? null : null,
    };
  }

  async getTrace(input: {
    traceId: string;
    workspaceId: string;
    cursor?: string | null;
    limit?: number | null;
  }) {
    const limit = clampObservabilityLimit(input.limit);
    const events = await this.eventRepository.listByTrace({
      ...input,
      limit: limit + 1,
    });
    const page = events.slice(0, limit);

    return {
      events: page,
      hasMore: events.length > limit,
      nextCursor: events.length > limit ? page.at(-1)?.createdAt ?? null : null,
      summary: {
        eventCount: page.length,
        severities: [...new Set(page.map((event) => event.severity))],
        sources: [...new Set(page.map((event) => event.source))],
      },
      traceId: input.traceId,
    };
  }

  aggregateMetrics(query: UsageMetricsQuery) {
    return this.metricsRepository.aggregateDaily({
      ...query,
      limit: clampObservabilityLimit(query.limit),
    });
  }

  cleanupSystemEvents(before: Date) {
    return this.eventRepository.cleanupExpired(before);
  }

  cleanupUsageMetrics(before: Date) {
    return this.metricsRepository.cleanupExpired(before);
  }

  private shouldSample(event: BackendEvent, severity: keyof ObservabilityService["sampleRates"]) {
    const rate = this.sampleRates[severity];

    if (rate >= 1) {
      return true;
    }

    if (rate <= 0) {
      return false;
    }

    return stableSample(`${event.trace.traceId}:${event.name}`) < rate;
  }
}

let defaultObservabilityService: ObservabilityService | undefined;

export function getDefaultObservabilityService() {
  defaultObservabilityService ??= new ObservabilityService();

  return defaultObservabilityService;
}

export function createObservabilityService(
  dependencies?: ObservabilityServiceDependencies,
) {
  return new ObservabilityService(dependencies);
}

export function resetDefaultObservabilityServiceForTests() {
  defaultObservabilityService = undefined;
}

function severityForEvent(event: BackendEvent) {
  const explicit = event.payload?.severity;

  if (isObservabilityEventSeverity(explicit)) {
    return explicit;
  }

  if (event.status === "failed" || event.name.includes("failed")) {
    return "error";
  }

  if (
    event.status === "cancelled" ||
    event.status === "expired" ||
    event.name.includes("conflict")
  ) {
    return "warn";
  }

  return event.name.includes("debug") ? "debug" : "info";
}

function readSampleRate(envKey: string, fallback: number) {
  const value = Number(process.env[envKey]);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

function stableSample(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash / 0xffffffff;
}

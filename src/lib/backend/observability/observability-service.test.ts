import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as eventsGet } from "@/app/api/v1/observability/events/route";
import { GET as metricsGet } from "@/app/api/v1/observability/metrics/route";
import { GET as traceGet } from "@/app/api/v1/observability/traces/[traceId]/route";
import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";
import type {
  SystemEventListResponse,
  TraceEventsResponse,
  UsageMetricsResponse,
} from "@/lib/nexus-types";

import type { BackendEvent } from "./events";
import { emitBackendEvent } from "./events";
import {
  createObservabilityService,
  getDefaultObservabilityService,
  resetDefaultObservabilityServiceForTests,
} from "./observability-service";
import { RedactionPipeline } from "./redaction-pipeline";
import {
  InMemorySystemEventRepository,
  getInMemorySystemEventRepository,
  type SystemEventRepository,
} from "./system-event-repository";
import { getInMemoryUsageMetricsRepository } from "./usage-metrics-repository";

const WORKSPACE_ID = "workspace-observability";

function makeEvent(index: number): BackendEvent {
  return {
    name: "api.v1.request",
    payload: {
      latencyMs: index,
      route: "/api/v1/test",
      statusCode: 200,
    },
    status: "succeeded",
    trace: {
      requestId: `req_${index}`,
      resourceId: `resource-${index}`,
      resourceType: "api_route",
      source: "api",
      traceId: `trace_${Math.floor(index / 5)}`,
      userId: "local-editor",
      workspaceId: WORKSPACE_ID,
    },
  };
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<{ data: T; ok: boolean }>;
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("V9 ObservabilityService", () => {
  beforeEach(() => {
    getInMemorySystemEventRepository().clear();
    getInMemoryUsageMetricsRepository().clear();
    resetDefaultObservabilityServiceForTests();
    installMockApiAuthSessionVerifierForTests("local-editor");
  });

  afterEach(() => {
    resetMockApiAuthSessionVerifierForTests();
  });

  it("records backend events through the V0 emitter without blocking callers", async () => {
    emitBackendEvent(makeEvent(1));
    await flushMicrotasks();

    const events = await getInMemorySystemEventRepository().list({
      limit: 10,
      workspaceId: WORKSPACE_ID,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: "api.v1.request",
      severity: "info",
      source: "api",
      traceId: "trace_0",
    });
  });

  it("drops write failures without recursive logging", async () => {
    class FailingRepository
      extends InMemorySystemEventRepository
      implements SystemEventRepository
    {
      override async insert(
        _input: Parameters<InMemorySystemEventRepository["insert"]>[0],
      ): Promise<never> {
        void _input;
        throw new Error("insert failed");
      }
    }

    const warn = vi.fn();
    const service = createObservabilityService({
      eventRepository: new FailingRepository(),
      warn,
    });

    expect(() => service.emit(makeEvent(1))).not.toThrow();
    await flushMicrotasks();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("redacts prompts, token deltas, raw errors, and secrets from metadata", () => {
    const result = new RedactionPipeline().sanitizeMetadata({
      Authorization: "Bearer sk-secret-observability-123456789",
      delta: "token-level streaming data",
      prompt: "raw user prompt",
      rawError: new Error("provider stack sk-secret-observability-123456789"),
      route: "/api/v1/agents/a/stream",
    });
    const serialized = JSON.stringify(result.metadata);

    expect(result.redacted).toBe(true);
    expect(serialized).not.toContain("sk-secret-observability");
    expect(serialized).not.toContain("raw user prompt");
    expect(serialized).not.toContain("token-level streaming data");
    expect(serialized).not.toContain("provider stack");
    expect(serialized).toContain("route");
  });

  it("applies hard limit caps to event query APIs", async () => {
    const service = getDefaultObservabilityService();

    for (let index = 0; index < 120; index += 1) {
      await service.recordSystemEvent(makeEvent(index));
    }

    const response = await eventsGet(
      new Request(
        `http://localhost/api/v1/observability/events?workspaceId=${WORKSPACE_ID}&limit=500`,
        {
          headers: {
            ...authHeaders("local-editor"),
          },
        },
      ),
    );
    const json = await readJson<SystemEventListResponse>(response);

    expect(response.status).toBe(200);
    expect(json.data.events).toHaveLength(100);
    expect(json.data.hasMore).toBe(true);
    expect(json.data.nextCursor).toEqual(expect.any(String));
  });

  it("rejects observability event queries when only X-User-Id is provided", async () => {
    const response = await eventsGet(
      new Request(
        `http://localhost/api/v1/observability/events?workspaceId=${WORKSPACE_ID}`,
        {
          headers: {
            "X-User-Id": "local-editor",
          },
        },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("returns trace-scoped lifecycle projection with source and severity summary", async () => {
    const service = getDefaultObservabilityService();

    await service.recordSystemEvent({
      ...makeEvent(1),
      name: "agent.task.completed",
      trace: {
        ...makeEvent(1).trace,
        resourceType: "agent_task",
        source: "agent",
        traceId: "trace-linked",
      },
    });
    await service.recordSystemEvent({
      ...makeEvent(2),
      name: "tool.run.succeeded",
      trace: {
        ...makeEvent(2).trace,
        resourceType: "tool_run",
        source: "tool",
        traceId: "trace-linked",
      },
    });

    const response = await traceGet(
      new Request(
        `http://localhost/api/v1/observability/traces/trace-linked?workspaceId=${WORKSPACE_ID}`,
        {
          headers: {
            ...authHeaders("local-editor"),
          },
        },
      ),
      {
        params: Promise.resolve({ traceId: "trace-linked" }),
      },
    );
    const json = await readJson<TraceEventsResponse>(response);

    expect(response.status).toBe(200);
    expect(json.data.events).toHaveLength(2);
    expect(json.data.summary.sources).toEqual(expect.arrayContaining(["agent", "tool"]));
    expect(json.data.summary.severities).toContain("info");
  });

  it("records and aggregates provider usage metrics by day", async () => {
    const service = getDefaultObservabilityService();

    await service.insertUsageMetric({
      agentId: "agent-ops",
      costEstimate: 0.04,
      createdAt: "2026-05-27T01:00:00.000Z",
      inputTokens: 100,
      latencyMs: 1200,
      model: "gpt-4o-mini",
      outputTokens: 50,
      provider: "openai-compatible",
      taskId: crypto.randomUUID(),
      workspaceId: WORKSPACE_ID,
    });
    await service.insertUsageMetric({
      agentId: "agent-ops",
      costEstimate: 0.06,
      createdAt: "2026-05-27T02:00:00.000Z",
      inputTokens: 200,
      latencyMs: 1800,
      model: "gpt-4o-mini",
      outputTokens: 100,
      provider: "openai-compatible",
      taskId: crypto.randomUUID(),
      workspaceId: WORKSPACE_ID,
    });

    const response = await metricsGet(
      new Request(
        `http://localhost/api/v1/observability/metrics?workspaceId=${WORKSPACE_ID}`,
        {
          headers: {
            ...authHeaders("local-editor"),
          },
        },
      ),
    );
    const json = await readJson<UsageMetricsResponse>(response);

    expect(response.status).toBe(200);
    expect(json.data.metrics[0]).toMatchObject({
      costEstimate: 0.1,
      count: 2,
      date: "2026-05-27",
      inputTokens: 300,
      outputTokens: 150,
    });
  });

  it("creates V9 tables with indexes, RLS, and no historical paging changes", () => {
    const migration = readFileSync(
      new URL("../../../../supabase/migrations/20260527008000_observability_event_spine.sql", import.meta.url),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.system_events");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.usage_metrics");
    expect(migration).toContain("system_events_severity_check");
    expect(migration).toContain("system_events_source_check");
    expect(migration).toContain("idx_system_events_trace");
    expect(migration).toContain("idx_system_events_workspace_created");
    expect(migration).toContain("idx_system_events_source_severity");
    expect(migration).toContain("idx_system_events_resource");
    expect(migration).toContain("idx_usage_metrics_workspace_created");
    expect(migration).toContain("idx_usage_metrics_task");
    expect(migration).toContain("idx_usage_metrics_provider_model");
    expect(migration).toMatch(/system_events ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/usage_metrics ENABLE ROW LEVEL SECURITY/i);
    expect(migration).not.toMatch(/\bhistorical_message_pages\b/i);
    expect(migration).not.toMatch(/\bagent_memory_records\b/i);
    expect(migration).not.toMatch(/\bALTER TABLE public.messages\b/i);
  });
});

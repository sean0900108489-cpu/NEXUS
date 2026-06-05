import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";
import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";
import {
  getDefaultObservabilityService,
  resetDefaultObservabilityServiceForTests,
} from "@/lib/backend/observability";
import { getInMemorySystemEventRepository } from "@/lib/backend/observability/system-event-repository";
import type {
  SystemEventListResponse,
  WorkflowRuntimeTraceWriteRequest,
  WorkflowRuntimeTraceWriteResponse,
} from "@/lib/nexus-types";

const WORKSPACE_ID = "workspace-runtime-trace";

function makeRequestBody(): WorkflowRuntimeTraceWriteRequest {
  return {
    occurredAt: "2026-06-04T06:30:00.000Z",
    run: {
      completedAt: "2026-06-04T06:30:04.000Z",
      group: {
        id: "wf_group_trace",
        label: "Trace Proof Group",
        source: "brain",
      },
      nodeExecutions: [
        {
          artifactId: "artifact-image-a",
          artifactVaultRecordId: "vault-image-a",
          completedAt: "2026-06-04T06:30:04.000Z",
          latencyMs: 4000,
          nodeId: "image-node-a",
          startedAt: "2026-06-04T06:30:00.000Z",
          status: "success",
        },
      ],
      runId: "run-trace-a",
      startedAt: "2026-06-04T06:30:00.000Z",
      status: "success",
      workflowId: "workflow-trace-a",
    },
    traceId: "trace-runtime-write-a",
    workspaceId: WORKSPACE_ID,
  };
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<{ data: T; ok: boolean }>;
}

async function postRuntimeTrace(
  body: unknown,
  userId = "local-editor",
) {
  return POST(
    new Request("http://localhost/api/v1/workflows/runtime-trace", {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(userId),
      },
      method: "POST",
    }),
  );
}

describe("workflow runtime trace write route", () => {
  beforeEach(() => {
    getInMemorySystemEventRepository().clear();
    resetDefaultObservabilityServiceForTests();
    installMockApiAuthSessionVerifierForTests("local-editor");
  });

  afterEach(() => {
    resetMockApiAuthSessionVerifierForTests();
  });

  it("writes sanitized workflow runtime trace events for editors", async () => {
    const response = await postRuntimeTrace(makeRequestBody());
    const json = await readJson<WorkflowRuntimeTraceWriteResponse>(response);

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      eventType: "workflow.runtime_lite.run.succeeded",
      schema: "nexus.workflowRuntime.traceEvent.v1",
      traceId: "trace-runtime-write-a",
      workflowGroupId: "wf_group_trace",
      workflowRunId: "run-trace-a",
      workspaceId: WORKSPACE_ID,
    });

    const events = await getDefaultObservabilityService().listEvents({
      limit: 10,
      traceId: "trace-runtime-write-a",
      workspaceId: WORKSPACE_ID,
    }) satisfies SystemEventListResponse;

    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      eventType: "workflow.runtime_lite.run.succeeded",
      resourceId: "run-trace-a",
      resourceType: "workflow.run",
      source: "agent",
      traceId: "trace-runtime-write-a",
    });
    expect(JSON.stringify(events.events[0].metadata)).not.toContain("rawText");
    expect(JSON.stringify(events.events[0].metadata)).not.toContain("prompt");
    expect(events.events[0].metadata).toMatchObject({
      artifactCount: 2,
      workflowGroupId: "wf_group_trace",
      workflowRunId: "run-trace-a",
    });
  });

  it("denies viewer workflow runtime trace writes", async () => {
    const response = await postRuntimeTrace(makeRequestBody(), "local-viewer");

    expect(response.status).toBe(403);

    const events = await getDefaultObservabilityService().listEvents({
      limit: 10,
      workspaceId: WORKSPACE_ID,
    });

    expect(
      events.events.filter((event) =>
        event.eventType.startsWith("workflow.runtime_lite"),
      ),
    ).toHaveLength(0);
    expect(events.events.some((event) => event.source === "security")).toBe(true);
  });

  it("rejects raw context snapshots and prompt-bearing payloads", async () => {
    const unsafeBody = {
      ...makeRequestBody(),
      run: {
        ...makeRequestBody().run,
        nodeExecutions: [
          {
            ...makeRequestBody().run.nodeExecutions[0],
            outputSnapshot: {
              rawText: "do not persist this raw model output",
            },
            prompt: "do not persist this prompt",
          },
        ],
      },
    };

    const response = await postRuntimeTrace(unsafeBody);

    expect(response.status).toBe(400);

    const events = await getDefaultObservabilityService().listEvents({
      limit: 10,
      workspaceId: WORKSPACE_ID,
    });

    expect(events.events).toHaveLength(0);
  });
});

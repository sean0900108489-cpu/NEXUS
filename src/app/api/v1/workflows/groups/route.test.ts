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
  WorkflowGroupRecordWriteRequest,
  WorkflowGroupRecordWriteResponse,
} from "@/lib/nexus-types";

const WORKSPACE_ID = "workspace-workflow-groups";

function makeRequestBody(): WorkflowGroupRecordWriteRequest {
  return {
    capabilityGaps: ["compiler.audio.transcribe"],
    compilerManifestSchema: "nexus.attachmentCompilerManifest.v1",
    contract: {
      name: "Audio Prompt Fanout",
      schema: "nexus.workflow.v1",
      version: "1",
    },
    edges: [
      {
        id: "edge-input-file",
        source: "input",
        target: "file",
      },
      {
        id: "edge-file-llm",
        source: "file",
        target: "llm",
      },
    ],
    group: {
      id: "wf_group_audio",
      label: "Audio Prompt Fanout",
      source: "brain",
    },
    nodes: [
      {
        id: "input",
        label: "Input",
        status: "idle",
        type: "input.text",
      },
      {
        id: "file",
        label: "File",
        status: "idle",
        type: "node.file",
      },
      {
        id: "llm",
        label: "LLM",
        status: "idle",
        type: "model.llm",
      },
    ],
    traceId: "trace-group-route-a",
    workflowId: "workflow-audio-fanout",
    workspaceId: WORKSPACE_ID,
  };
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<{ data: T; ok: boolean }>;
}

async function postWorkflowGroup(
  body: unknown,
  userId = "local-editor",
) {
  return POST(
    new Request("http://localhost/api/v1/workflows/groups", {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(userId),
      },
      method: "POST",
    }),
  );
}

describe("workflow group record route", () => {
  beforeEach(() => {
    getInMemorySystemEventRepository().clear();
    resetDefaultObservabilityServiceForTests();
    installMockApiAuthSessionVerifierForTests("local-editor");
  });

  afterEach(() => {
    resetMockApiAuthSessionVerifierForTests();
  });

  it("stores sanitized workflow group records for editors", async () => {
    const response = await postWorkflowGroup(makeRequestBody());
    const json = await readJson<WorkflowGroupRecordWriteResponse>(response);

    expect(response.status).toBe(200);
    expect(json.data).toMatchObject({
      edgeCount: 2,
      eventType: "workflow.group_record.upserted",
      nodeCount: 3,
      schema: "nexus.workflowPro.groupRecord.v1",
      traceId: "trace-group-route-a",
      workflowGroupId: "wf_group_audio",
      workflowId: "workflow-audio-fanout",
      workspaceId: WORKSPACE_ID,
    });

    const events = await getDefaultObservabilityService().listEvents({
      limit: 10,
      traceId: "trace-group-route-a",
      workspaceId: WORKSPACE_ID,
    }) satisfies SystemEventListResponse;

    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      eventType: "workflow.group_record.upserted",
      resourceId: "wf_group_audio",
      resourceType: "workflow.group",
      source: "agent",
    });
    expect(events.events[0].metadata).toMatchObject({
      compilerManifestSchema: "nexus.attachmentCompilerManifest.v1",
      contractSchema: "nexus.workflow.v1",
      workflowGroupId: "wf_group_audio",
    });
    expect(JSON.stringify(events.events[0].metadata)).not.toContain("prompt");
  });

  it("denies viewer workflow group record writes", async () => {
    const response = await postWorkflowGroup(makeRequestBody(), "local-viewer");

    expect(response.status).toBe(403);

    const events = await getDefaultObservabilityService().listEvents({
      limit: 10,
      workspaceId: WORKSPACE_ID,
    });

    expect(
      events.events.filter((event) => event.eventType === "workflow.group_record.upserted"),
    ).toHaveLength(0);
    expect(events.events.some((event) => event.source === "security")).toBe(true);
  });

  it("rejects raw prompt and snapshot payloads", async () => {
    const unsafeBody = {
      ...makeRequestBody(),
      nodes: [
        {
          ...makeRequestBody().nodes[0],
          data: {
            prompt: "do not store this",
          },
          outputSnapshot: {
            rawText: "do not store this",
          },
        },
      ],
    };

    const response = await postWorkflowGroup(unsafeBody);

    expect(response.status).toBe(400);

    const events = await getDefaultObservabilityService().listEvents({
      limit: 10,
      workspaceId: WORKSPACE_ID,
    });

    expect(
      events.events.filter((event) => event.eventType === "workflow.group_record.upserted"),
    ).toHaveLength(0);
  });
});

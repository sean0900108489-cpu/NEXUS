import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createTaskPost } from "@/app/api/v1/agents/[agentId]/tasks/route";
import { GET as getTask } from "@/app/api/v1/agents/[agentId]/tasks/[taskId]/route";
import { POST as cancelTaskPost } from "@/app/api/v1/agents/[agentId]/tasks/[taskId]/cancel/route";
import { POST as streamPost } from "@/app/api/v1/agents/[agentId]/stream/route";
import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import {
  resetAgentStreamMessageHistoryServiceFactoryForTests,
  setAgentStreamMessageHistoryServiceFactoryForTests,
} from "@/lib/backend/api/agent-stream-service";
import { EnvironmentValidator } from "@/lib/backend/deployment/environment-validator";
import {
  FeatureFlagService,
  InMemoryFeatureFlagRepository,
} from "@/lib/backend/deployment/feature-flag-service";
import {
  createMessageHistoryService,
  type MessageHistoryService,
} from "@/lib/backend/history/message-history-service";
import { getInMemoryMessageRepository } from "@/lib/backend/history/message-repository";

import { AgentRuntimeService } from "./agent-runtime-service";
import {
  createAgentRuntimeRepository,
  InMemoryAgentRuntimeRepository,
} from "./agent-runtime-repository";
import { OpenAICompatibleAdapter } from "./provider-adapter";

function makeTaskRequest(body: unknown, userId = "local-owner") {
  const id = crypto.randomUUID();

  return new Request("http://localhost/api/v1/agents/agent-a/tasks", {
    body: JSON.stringify(body),
    headers: {
      Authorization: "Bearer runtime-session",
      "Content-Type": "application/json",
      "X-Idempotency-Key": `mutation_${id}`,
      "X-Request-Id": `req_${id}`,
      "X-User-Id": userId,
      "X-Workspace-Id": "workspace-runtime",
    },
    method: "POST",
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

async function readSseEvents(response: Response) {
  const text = await response.text();

  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

beforeEach(() => {
  getInMemoryMessageRepository().clear();
  setApiAuthSessionVerifierForTests({
    verifyRequest: vi.fn(async (request) => ({
      email: null,
      id: request.headers.get("X-User-Id")?.trim() || "local-owner",
    })),
  });
  setAgentStreamMessageHistoryServiceFactoryForTests(() =>
    createMessageHistoryService({
      messages: getInMemoryMessageRepository(),
    }),
  );
});

afterEach(() => {
  resetApiAuthSessionVerifierForTests();
  resetAgentStreamMessageHistoryServiceFactoryForTests();
  getInMemoryMessageRepository().clear();
});

describe("AgentRuntimeService", () => {
  it("creates a task for every send while reusing the active runtime session", async () => {
    const repository = new InMemoryAgentRuntimeRepository();
    const service = new AgentRuntimeService({ repository });
    const first = await service.createTask(
      "agent-a",
      {
        model: "gpt-4o-mini",
        provider: "openai-compatible",
        taskType: "chat",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-owner",
      },
    );
    const second = await service.createTask(
      "agent-a",
      {
        model: "gpt-4o-mini",
        provider: "openai-compatible",
        taskType: "chat",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-owner",
      },
    );

    expect(first.task.id).not.toBe(second.task.id);
    expect(first.session.id).toBe(second.session.id);
    expect(second.sessionReused).toBe(true);
  });

  it("cancel is idempotent and does not overwrite completed or failed tasks", async () => {
    const repository = new InMemoryAgentRuntimeRepository();
    const service = new AgentRuntimeService({ repository });
    const { task } = await service.createTask(
      "agent-a",
      {
        taskType: "chat",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-owner",
      },
    );

    await repository.patchTask(task.id, { status: "completed" });

    const result = await service.cancelTask({
      agentId: "agent-a",
      taskId: task.id,
      workspaceId: "workspace-runtime",
    });

    expect(result.cancelled).toBe(false);
    expect(result.task.status).toBe("completed");

    await repository.patchTask(task.id, { status: "failed" });

    const failedResult = await service.cancelTask({
      agentId: "agent-a",
      taskId: task.id,
      workspaceId: "workspace-runtime",
    });

    expect(failedResult.cancelled).toBe(false);
    expect(failedResult.task.status).toBe("failed");
  });

  it("revalidates task and session scope before streaming", async () => {
    const repository = new InMemoryAgentRuntimeRepository();
    const service = new AgentRuntimeService({ repository });
    const { task, session } = await service.createTask(
      "agent-a",
      {
        model: "gpt-4o-mini",
        provider: "openai-compatible",
        taskType: "chat",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-owner",
      },
    );

    await expect(
      service.prepareStreamTask(
        {
          agentId: "agent-a",
          model: "gpt-4o-mini",
          provider: "openai-compatible",
          sessionId: "wrong-session",
          taskId: task.id,
          workspaceId: "workspace-runtime",
        },
        {
          userId: "local-owner",
        },
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });

    await expect(
      service.prepareStreamTask(
        {
          agentId: "agent-a",
          model: "gpt-4o-mini",
          provider: "openai-compatible",
          sessionId: session.id,
          taskId: task.id,
          workspaceId: "workspace-runtime",
        },
        {
          userId: "local-viewer",
        },
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("can skip workspace permission checks for internal workflow streams", async () => {
    const repository = new InMemoryAgentRuntimeRepository();
    const service = new AgentRuntimeService({ repository });

    await expect(
      service.prepareStreamTask(
        {
          agentId: "agent-a",
          model: "gpt-4o-mini",
          provider: "openai-compatible",
          workspaceId: "workspace-runtime",
        },
        {
          userId: "local-viewer",
        },
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });

    const result = await service.prepareStreamTask(
      {
        agentId: "agent-a",
        model: "gpt-4o-mini",
        provider: "openai-compatible",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-viewer",
      },
      {
        skipPermissionCheck: true,
      },
    );

    expect(result.task.status).toBe("streaming");
  });

  it("replaces missing precreated tasks when streaming from an ephemeral runtime store", async () => {
    const repository = new InMemoryAgentRuntimeRepository();
    const service = new AgentRuntimeService({ repository });

    const result = await service.prepareStreamTask(
      {
        agentId: "agent-a",
        model: "gpt-4o-mini",
        outputMessageId: "message-output",
        provider: "openai-compatible",
        sessionId: "session-missing",
        taskId: "00000000-0000-4000-8000-000000000404",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-owner",
      },
    );

    expect(result.task.id).not.toBe("00000000-0000-4000-8000-000000000404");
    expect(result.task.outputMessageId).toBe("message-output");
    expect(result.task.status).toBe("streaming");
  });

  it("records only milestone events and sanitizes event payload secrets", async () => {
    const repository = new InMemoryAgentRuntimeRepository();
    const service = new AgentRuntimeService({ repository });
    const { task } = await service.createTask(
      "agent-a",
      {
        taskType: "chat",
        workspaceId: "workspace-runtime",
      },
      {
        userId: "local-owner",
      },
    );

    await service.markFirstToken(task.id, {
      tokenLength: 4,
    });
    await service.markFallbackUsed(task.id, {
      Authorization: "Bearer sk-secret-123456789",
      reasonCode: "PROVIDER_NOT_CONFIGURED",
    });
    await service.completeTask(task.id);

    expect(repository.events.map((event) => event.eventType)).toEqual([
      "first_token",
      "fallback_used",
      "stream_completed",
    ]);
    expect(JSON.stringify(repository.events)).not.toContain("sk-secret");
    expect(JSON.stringify(repository.events)).not.toContain("Bearer sk-secret");
  });
});

describe("ProviderAdapter fallback boundary", () => {
  it("does not silently fall back to mock in production live mode without the V5 flag", async () => {
    const adapter = new OpenAICompatibleAdapter({
      environmentValidator: new EnvironmentValidator({
        env: {
          DEPLOYMENT_ENV: "production",
          NEXUS_RUNTIME_MODE: "live",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        },
      }),
      featureFlagService: new FeatureFlagService({
        repository: new InMemoryFeatureFlagRepository(),
      }),
    });

    await expect(
      adapter.createChatStream({
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        payload: {
          agent: {
            callsign: "TEST",
            contextNotes: [],
            identity: "test",
            memory: [],
            mission: "test",
            executionPrompt: "",
            model: "gpt-4o-mini",
            provider: "openai-compatible",
            title: "Test",
          },
          messages: [{ content: "hello", role: "user" }],
        },
        signal: new AbortController().signal,
        workspaceId: "workspace-runtime",
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
  });
});

describe("agent task API and migration contract", () => {
  it("persists workflow-style output ids before completing a streamed task", async () => {
    const outputMessageId = `workflow_run:${crypto.randomUUID()}:llm-node:output`;
    const createResponse = await createTaskPost(
      makeTaskRequest({
        model: "gpt-4o-mini",
        outputMessageId,
        provider: "openai-compatible",
        taskType: "chat",
        workspaceId: "workspace-runtime",
      }),
      {
        params: Promise.resolve({ agentId: "agent-stream-life" }),
      },
    );
    const createJson = await readJson(createResponse);
    const createData = createJson.data as {
      task: { id: string; outputMessageId?: string | null };
      session: { id: string };
    };

    expect(createData.task.outputMessageId).toBe(outputMessageId);
    const streamResponse = await streamPost(
      new Request("http://localhost/api/v1/agents/agent-stream-life/stream", {
        body: JSON.stringify({
          agent: {
            callsign: "LIFE",
            contextNotes: [],
            identity: "test runtime agent",
            memory: [],
            mission: "test stream lifecycle",
            model: "gpt-4o-mini",
            provider: "openai-compatible",
            title: "Lifecycle Agent",
          },
          messages: [{ content: "hello", role: "user" }],
          model: "gpt-4o-mini",
          outputMessageId,
          sessionId: createData.session.id,
          taskId: createData.task.id,
          workspaceId: "workspace-runtime",
        }),
        headers: {
          Authorization: "Bearer runtime-session",
          "Content-Type": "application/json",
          "X-Request-Id": `req_${crypto.randomUUID()}`,
          "X-Trace-Id": `trace_${crypto.randomUUID()}`,
          "X-User-Id": "local-owner",
          "X-Workspace-Id": "workspace-runtime",
        },
        method: "POST",
      }),
      {
        params: Promise.resolve({ agentId: "agent-stream-life" }),
      },
    );
    const events = await readSseEvents(streamResponse);

    expect(events[0]).toMatchObject({
      sessionId: createData.session.id,
      taskId: createData.task.id,
      type: "meta",
    });
    expect(events.some((event) => event.type === "token")).toBe(true);

    const taskResponse = await getTask(
      new Request(
        "http://localhost/api/v1/agents/agent-stream-life/tasks/" +
          createData.task.id +
          "?workspaceId=workspace-runtime",
        {
          headers: {
            Authorization: "Bearer runtime-session",
            "X-User-Id": "local-owner",
          },
        },
      ),
      {
        params: Promise.resolve({
          agentId: "agent-stream-life",
          taskId: createData.task.id,
        }),
      },
    );
    const taskJson = await readJson(taskResponse);

    expect(taskJson).toMatchObject({
      data: {
        task: {
          id: createData.task.id,
          status: "completed",
        },
      },
      ok: true,
    });

    const output = await getInMemoryMessageRepository().findById(outputMessageId);

    expect(output).toMatchObject({
      agentId: "agent-stream-life",
      id: outputMessageId,
      role: "assistant",
      taskId: createData.task.id,
      workspaceId: "workspace-runtime",
    });
    expect(output?.content.trim()).not.toBe("");

    const repository = createAgentRuntimeRepository();

    expect(repository).toBeInstanceOf(InMemoryAgentRuntimeRepository);

    const milestoneTypes = (repository as InMemoryAgentRuntimeRepository).events
      .filter((event) => event.taskId === createData.task.id)
      .map((event) => event.eventType);

    expect(milestoneTypes).toEqual(
      expect.arrayContaining(["stream_started", "first_token", "stream_completed"]),
    );
    expect(milestoneTypes).not.toContain("token");
  });

  it("does not complete an output-producing task when durable output persistence fails", async () => {
    setAgentStreamMessageHistoryServiceFactoryForTests(() =>
      ({
        upsertMessage: vi.fn(async () => {
          throw new Error("durable output write failed");
        }),
      }) as unknown as MessageHistoryService,
    );

    const outputMessageId = `message_${crypto.randomUUID()}`;
    const createResponse = await createTaskPost(
      makeTaskRequest({
        model: "gpt-4o-mini",
        outputMessageId,
        provider: "openai-compatible",
        taskType: "chat",
        workspaceId: "workspace-runtime",
      }),
      {
        params: Promise.resolve({ agentId: "agent-stream-persist-fail" }),
      },
    );
    const createJson = await readJson(createResponse);
    const createData = createJson.data as {
      task: { id: string };
      session: { id: string };
    };
    const streamResponse = await streamPost(
      new Request("http://localhost/api/v1/agents/agent-stream-persist-fail/stream", {
        body: JSON.stringify({
          agent: {
            callsign: "FAIL",
            contextNotes: [],
            identity: "test runtime agent",
            memory: [],
            mission: "test failed output persistence",
            model: "gpt-4o-mini",
            provider: "openai-compatible",
            title: "Persistence Failure Agent",
          },
          messages: [{ content: "hello", role: "user" }],
          model: "gpt-4o-mini",
          outputMessageId,
          sessionId: createData.session.id,
          taskId: createData.task.id,
          workspaceId: "workspace-runtime",
        }),
        headers: {
          Authorization: "Bearer runtime-session",
          "Content-Type": "application/json",
          "X-Request-Id": `req_${crypto.randomUUID()}`,
          "X-Trace-Id": `trace_${crypto.randomUUID()}`,
          "X-User-Id": "local-owner",
          "X-Workspace-Id": "workspace-runtime",
        },
        method: "POST",
      }),
      {
        params: Promise.resolve({ agentId: "agent-stream-persist-fail" }),
      },
    );
    const events = await readSseEvents(streamResponse);

    expect(events.some((event) => event.type === "error")).toBe(true);
    expect(await getInMemoryMessageRepository().findById(outputMessageId)).toBeNull();

    const taskResponse = await getTask(
      new Request(
        "http://localhost/api/v1/agents/agent-stream-persist-fail/tasks/" +
          createData.task.id +
          "?workspaceId=workspace-runtime",
        {
          headers: {
            Authorization: "Bearer runtime-session",
            "X-User-Id": "local-owner",
          },
        },
      ),
      {
        params: Promise.resolve({
          agentId: "agent-stream-persist-fail",
          taskId: createData.task.id,
        }),
      },
    );
    const taskJson = await readJson(taskResponse);

    expect(taskJson).toMatchObject({
      data: {
        task: {
          id: createData.task.id,
          status: "failed",
        },
      },
      ok: true,
    });
  });

  it("cancels a created task through the API without requiring a worker", async () => {
    const createResponse = await createTaskPost(
      makeTaskRequest({
        taskType: "chat",
        workspaceId: "workspace-runtime",
      }),
      {
        params: Promise.resolve({ agentId: "agent-cancel-life" }),
      },
    );
    const createJson = await readJson(createResponse);
    const taskId = (createJson.data as { task: { id: string } }).task.id;
    const cancelResponse = await cancelTaskPost(
      makeTaskRequest(
        {
          workspaceId: "workspace-runtime",
        },
        "local-owner",
      ),
      {
        params: Promise.resolve({
          agentId: "agent-cancel-life",
          taskId,
        }),
      },
    );
    const cancelJson = await readJson(cancelResponse);

    expect(cancelResponse.status).toBe(200);
    expect(cancelJson).toMatchObject({
      data: {
        cancelled: true,
        task: {
          id: taskId,
          status: "cancelled",
        },
      },
      ok: true,
    });
  });

  it("denies viewer task creation through PermissionService", async () => {
    const response = await createTaskPost(
      makeTaskRequest(
        {
          taskType: "chat",
          workspaceId: "workspace-runtime",
        },
        "local-viewer",
      ),
      {
        params: Promise.resolve({ agentId: "agent-a" }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("creates V6 runtime tables without V7/V8/V9 tables", () => {
    const migration = readFileSync(
      new URL("../../../../supabase/migrations/20260527005000_agent_runtime_sessions.sql", import.meta.url),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.agent_runtime_sessions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.agent_tasks");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.agent_runtime_events");
    expect(migration).toContain("session_id uuid REFERENCES public.agent_runtime_sessions(id)");
    expect(migration).toContain("task_id uuid NOT NULL REFERENCES public.agent_tasks(id)");
    expect(migration).toContain("agent_tasks_status_check");
    expect(migration).toContain("agent_runtime_events_type_check");
    expect(migration).toContain("idx_sessions_workspace_agent");
    expect(migration).toContain("idx_sessions_status");
    expect(migration).toContain("idx_sessions_active_reuse");
    expect(migration).toContain("idx_agent_tasks_workspace_agent_status");
    expect(migration).toContain("idx_agent_tasks_session");
    expect(migration).toContain("idx_agent_tasks_parent");
    expect(migration).toContain("idx_runtime_events_task_created");
    expect(migration).toMatch(/agent_runtime_sessions ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/agent_tasks ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/agent_runtime_events ENABLE ROW LEVEL SECURITY/i);
    expect(migration).not.toMatch(/\btool_runs\b|\btool_permissions\b|\bsystem_events\b|\busage_metrics\b|\bartifact_versions\b/i);
  });
});

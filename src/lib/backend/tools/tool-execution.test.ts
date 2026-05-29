import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { POST as runToolPost } from "@/app/api/v1/tools/[toolId]/run/route";
import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";

import { ToolExecutionService } from "./tool-execution-service";
import { InMemoryToolRunRepository } from "./tool-run-repository";
import { ToolRegistryValidator } from "./tool-registry-validator";

function makeToolRunRequest(
  toolId: string,
  body: unknown,
  userId = "local-admin",
) {
  const id = crypto.randomUUID();

  return {
    context: {
      params: Promise.resolve({ toolId }),
    },
    request: new Request(`http://localhost/api/v1/tools/${toolId}/run`, {
      body: JSON.stringify(body),
      headers: {
        ...authHeaders(userId),
        "Content-Type": "application/json",
        "X-Idempotency-Key": `tool_mutation_${id}`,
        "X-Request-Id": `req_${id}`,
        "X-Workspace-Id": "workspace-tools",
      },
      method: "POST",
    }),
  };
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

afterEach(() => {
  resetMockApiAuthSessionVerifierForTests();
});

describe("ToolRegistryValidator", () => {
  it("resolves declared aliases and fallbacks without creating a parallel registry", () => {
    const validator = new ToolRegistryValidator();

    expect(validator.resolve("mock-review-mesh")).toMatchObject({
      executorId: "mock.review-mesh",
      registryToolId: "mock-review-mesh",
    });
    expect(validator.resolve("real-video-gen")).toMatchObject({
      executorId: "mock-video-gen",
      registryToolId: "real-video-gen",
    });
  });
});

describe("ToolExecutionService", () => {
  it("stores high-risk local-fs runs as awaiting_confirmation before execution", async () => {
    const repository = new InMemoryToolRunRepository();
    const service = new ToolExecutionService({ repository });
    const result = await service.runTool(
      "real-file-scanner",
      {
        agentId: "agent-a",
        input: {
          path: "./src",
        },
        workspaceId: "workspace-tools",
      },
      {
        userId: "local-admin",
      },
    );

    expect(result.confirmationRequired).toBe(true);
    expect(result.toolRun.status).toBe("awaiting_confirmation");
    expect(result.toolRun.riskLevel).toBe("high");
    expect(result.toolRun.outputRedacted).toBeNull();
  });

  it("rejects expired confirmation and never re-executes terminal runs", async () => {
    const repository = new InMemoryToolRunRepository();
    const service = new ToolExecutionService({
      confirmationTtlMs: -1,
      repository,
    });
    const result = await service.runTool(
      "real-file-scanner",
      {
        input: {
          path: "./src",
        },
        workspaceId: "workspace-tools",
      },
      {
        userId: "local-admin",
      },
    );

    await expect(
      service.confirmToolRun(
        result.toolRun.id,
        {
          workspaceId: "workspace-tools",
        },
        {
          userId: "local-admin",
        },
      ),
    ).rejects.toMatchObject({ code: "TOOL_CONFIRMATION_EXPIRED" });

    const failed = await repository.findById(result.toolRun.id);

    expect(failed?.status).toBe("failed");

    await expect(
      service.confirmToolRun(
        result.toolRun.id,
        {
          workspaceId: "workspace-tools",
        },
        {
          userId: "local-admin",
        },
      ),
    ).rejects.toMatchObject({ code: "TOOL_RUN_NOT_CONFIRMABLE" });
  });

  it("redacts secret-bearing input and rejects it before execution", async () => {
    const repository = new InMemoryToolRunRepository();
    const service = new ToolExecutionService({ repository });

    await expect(
      service.runTool(
        "web-surfer",
        {
          input: {
            apiKey: "sk-secret-tool-1234567890",
            url: "https://example.com",
          },
          workspaceId: "workspace-tools",
        },
        {
          userId: "local-admin",
        },
      ),
    ).rejects.toMatchObject({ code: "TOOL_SECRET_DETECTED" });

    const [blocked] = await repository.findByWorkspace({
      workspaceId: "workspace-tools",
    });
    const serialized = JSON.stringify(blocked);

    expect(blocked.status).toBe("blocked");
    expect(serialized).not.toContain("sk-secret-tool");
    expect(serialized).not.toContain("1234567890");
    expect(blocked.executableInput).toEqual({
      url: "https://example.com",
    });
  });

  it("returns materialization-unavailable instead of creating artifact lifecycle state", async () => {
    const service = new ToolExecutionService({
      repository: new InMemoryToolRunRepository(),
    });
    const result = await service.runTool(
      "mock-image-gen",
      {
        agentId: "agent-image",
        input: {
          prompt: "A compact NEXUS command surface.",
        },
        workspaceId: "workspace-tools",
      },
      {
        userId: "local-admin",
      },
    );

    expect(result.toolRun.status).toBe("succeeded");
    expect(result.toolRun.artifactId).toBeNull();
    expect(result.materializationStatus).toBe("TOOL_MATERIALIZATION_NOT_AVAILABLE");
  });

  it("denies viewers through the V1 permission service", async () => {
    const service = new ToolExecutionService({
      repository: new InMemoryToolRunRepository(),
    });

    await expect(
      service.runTool(
        "mock-image-gen",
        {
          workspaceId: "workspace-tools",
        },
        {
          userId: "local-viewer",
        },
      ),
    ).rejects.toMatchObject({ code: "TOOL_PERMISSION_DENIED" });
  });

  it("denies viewer cancellation of a non-terminal tool run", async () => {
    const repository = new InMemoryToolRunRepository();
    const service = new ToolExecutionService({ repository });
    const result = await service.runTool(
      "real-file-scanner",
      {
        input: {
          path: "./src",
        },
        workspaceId: "workspace-tools",
      },
      {
        userId: "local-admin",
      },
    );

    await expect(
      service.cancelToolRun(
        result.toolRun.id,
        {
          workspaceId: "workspace-tools",
        },
        {
          userId: "local-viewer",
        },
      ),
    ).rejects.toMatchObject({ code: "TOOL_PERMISSION_DENIED" });
  });
});

describe("V7 tool API and migration contract", () => {
  it("rejects tool execution when only X-User-Id is provided", async () => {
    const response = await runToolPost(
      new Request("http://localhost/api/v1/tools/mock-image-gen/run", {
        body: JSON.stringify({
          workspaceId: "workspace-tools",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `tool_mutation_${crypto.randomUUID()}`,
          "X-User-Id": "local-admin",
          "X-Workspace-Id": "workspace-tools",
        },
        method: "POST",
      }),
      {
        params: Promise.resolve({ toolId: "mock-image-gen" }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("exposes V2 envelope responses for high-risk tool runs", async () => {
    installMockApiAuthSessionVerifierForTests("local-admin");

    const { context, request } = makeToolRunRequest("real-file-scanner", {
      input: {
        path: "./src",
      },
      workspaceId: "workspace-tools",
    });
    const response = await runToolPost(request, context);
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        confirmationRequired: true,
        toolRun: {
          riskLevel: "high",
          status: "awaiting_confirmation",
        },
      },
      ok: true,
    });
  });

  it("denies viewer tool execution through the route", async () => {
    installMockApiAuthSessionVerifierForTests("local-viewer");

    const { context, request } = makeToolRunRequest(
      "mock-image-gen",
      {
        workspaceId: "workspace-tools",
      },
      "local-viewer",
    );
    const response = await runToolPost(request, context);
    const json = await readJson(response);

    expect(response.status).toBe(403);
    expect(json).toMatchObject({
      error: {
        code: "TOOL_PERMISSION_DENIED",
      },
      ok: false,
    });
  });

  it("creates tool_runs and tool_permissions with constraints, indexes, FK, and RLS", () => {
    const migration = readFileSync(
      new URL("../../../../supabase/migrations/20260527006000_tool_execution_control_plane.sql", import.meta.url),
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.tool_runs");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.tool_permissions");
    expect(migration).toContain("task_id uuid REFERENCES public.agent_tasks(id)");
    expect(migration).toContain("tool_runs_status_check");
    expect(migration).toContain("tool_runs_risk_level_check");
    expect(migration).toContain("tool_permissions_workspace_tool_scope_unique");
    expect(migration).toContain("idx_tool_runs_workspace_agent");
    expect(migration).toContain("idx_tool_runs_task");
    expect(migration).toContain("idx_tool_runs_status");
    expect(migration).toContain("idx_tool_runs_tool");
    expect(migration).toContain("idx_tool_permissions_workspace_tool");
    expect(migration).toMatch(/tool_runs ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/tool_permissions ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toContain("tool_runs_select_member");
    expect(migration).toContain("tool_runs_insert_operator");
    expect(migration).toContain("tool_permissions_insert_admin");
    expect(migration).not.toMatch(/\bartifact_versions\b|\bsystem_events\b|\busage_metrics\b/i);
  });
});

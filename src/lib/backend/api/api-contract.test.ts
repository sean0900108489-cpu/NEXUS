import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as memoryCompressPost } from "@/app/api/v1/agents/memory-compress/route";
import { POST as legacyMemoryCompressPost } from "@/app/api/memory-compress/route";
import { POST as streamPost } from "@/app/api/v1/agents/[agentId]/stream/route";
import { POST as legacyStreamPost } from "@/app/api/agent-stream/route";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { nexusApiClient, NexusApiError } from "@/lib/api/nexus-api-client";
import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import {
  resetAgentStreamMessageHistoryServiceFactoryForTests,
  setAgentStreamMessageHistoryServiceFactoryForTests,
} from "@/lib/backend/api/agent-stream-service";
import { createRequestValidator, validationIssue } from "@/lib/backend/api/api-request-validator";
import { InMemoryIdempotencyRepository } from "@/lib/backend/api/idempotency-repository";
import { createRequestHash } from "@/lib/backend/api/request-hash";
import { createMessageHistoryService } from "@/lib/backend/history/message-history-service";
import { getInMemoryMessageRepository } from "@/lib/backend/history/message-repository";
import type { PermissionService } from "@/lib/backend/security/permission-service";
import type { AgentStreamRequest } from "@/lib/nexus-types";

function makeJsonRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": `mutation_${crypto.randomUUID()}`,
      "X-Request-Id": `req_${crypto.randomUUID()}`,
      ...headers,
    },
    method: "POST",
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function useTestAuthSession(userId = "local-owner") {
  setApiAuthSessionVerifierForTests({
    verifyRequest: vi.fn(async () => ({
      email: `${userId}@example.test`,
      id: userId,
    })),
  });
}

beforeEach(() => {
  getInMemoryMessageRepository().clear();
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

describe("apiHandler envelope and validation", () => {
  it("returns ApiSuccess with requestId and traceId", async () => {
    useTestAuthSession();

    const response = await memoryCompressPost(
      makeJsonRequest("http://localhost/api/v1/agents/memory-compress", {
        config: {},
        payload: { message: "compress" },
        workspaceId: "workspace-a",
      }, {
        Authorization: "Bearer memory-session",
        "X-User-Id": "local-owner",
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: { mockFallback: true },
      error: null,
      ok: true,
    });
    expect(json.meta).toMatchObject({
      requestId: expect.any(String),
      traceId: expect.any(String),
    });
  });

  it("returns ApiFailure for invalid JSON", async () => {
    const response = await memoryCompressPost(
      new Request("http://localhost/api/v1/agents/memory-compress", {
        body: "{",
        headers: {
          "X-Idempotency-Key": "mutation_invalid_json",
          "X-Request-Id": "req_invalid_json",
        },
        method: "POST",
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(400);
    expect(json).toMatchObject({
      data: null,
      error: {
        code: "VALIDATION_FAILED",
        retryable: false,
      },
      ok: false,
    });
    expect(JSON.stringify(json)).not.toContain("SyntaxError");
  });

  it("returns sanitized validation issues and does not enter service layer", async () => {
    let called = 0;
    const handler = apiHandler({
      handler: () => {
        called += 1;
        return { ok: true };
      },
      methods: ["POST"],
      route: "/api/v1/test-validation",
      validator: createRequestValidator((value) =>
        value && typeof value === "object"
          ? { data: value, ok: true }
          : {
              issues: [
                validationIssue(["payload"], "invalid_type", "payload is required"),
              ],
              ok: false,
            },
      ),
    });

    const response = await handler(
      new Request("http://localhost/api/v1/test-validation", {
        body: "null",
        headers: {
          "X-Idempotency-Key": "mutation_validation",
          "X-Request-Id": "req_validation",
        },
        method: "POST",
      }),
    );
    const json = await readJson(response);

    expect(called).toBe(0);
    expect(response.status).toBe(400);
    expect(json).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          issues: [
            {
              path: ["payload"],
            },
          ],
        },
      },
    });
  });

  it("maps unknown exceptions to INTERNAL_ERROR without stack traces", async () => {
    const handler = apiHandler({
      handler: () => {
        throw new Error("boom secret stack");
      },
      methods: ["GET"],
      route: "/api/v1/test-throw",
    });
    const response = await handler(new Request("http://localhost/api/v1/test-throw"));
    const json = await readJson(response);

    expect(response.status).toBe(500);
    expect(json).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error.",
      },
      ok: false,
    });
    expect(JSON.stringify(json)).not.toContain("stack");
    expect(JSON.stringify(json)).not.toContain("boom secret stack");
  });

  it("rejects protected routes when only X-User-Id is provided", async () => {
    const permissionService = {
      check: vi.fn(),
    } as unknown as PermissionService;
    let called = 0;
    const handler = apiHandler({
      handler: () => {
        called += 1;
        return { ok: true };
      },
      methods: ["GET"],
      permission: {
        action: "workspace:read",
        permissionService,
        resourceType: "workspace",
      },
      route: "/api/v1/test-protected",
    });

    const response = await handler(
      new Request("http://localhost/api/v1/test-protected", {
        headers: {
          "X-User-Id": "spoofed-owner",
          "X-Workspace-Id": "workspace-a",
        },
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
      },
      ok: false,
    });
    expect(called).toBe(0);
    expect(permissionService.check).not.toHaveBeenCalled();
  });

  it("rejects spoofed X-User-Id that differs from the authenticated session", async () => {
    useTestAuthSession("verified-owner");

    const permissionService = {
      check: vi.fn(),
    } as unknown as PermissionService;
    const handler = apiHandler({
      handler: () => ({ ok: true }),
      methods: ["GET"],
      permission: {
        action: "workspace:read",
        permissionService,
        resourceType: "workspace",
      },
      route: "/api/v1/test-spoofed",
    });

    const response = await handler(
      new Request("http://localhost/api/v1/test-spoofed", {
        headers: {
          Authorization: "Bearer verified-session",
          "X-User-Id": "spoofed-owner",
          "X-Workspace-Id": "workspace-a",
        },
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({
      error: {
        code: "AUTH_INVALID_CREDENTIAL",
      },
      ok: false,
    });
    expect(permissionService.check).not.toHaveBeenCalled();
  });

  it("uses the verified session actor for permission checks and trace context", async () => {
    useTestAuthSession("verified-owner");

    const permissionService = {
      check: vi.fn(async () => ({
        decision: "allow",
        reasonCode: "ALLOW",
        requiredScopes: [],
        riskLevel: "low",
      })),
    } as unknown as PermissionService;
    const handler = apiHandler({
      handler: ({ sessionUser, trace }) => ({
        sessionUserId: sessionUser?.id,
        traceUserId: trace.userId,
      }),
      methods: ["GET"],
      permission: {
        action: "workspace:read",
        permissionService,
        resourceType: "workspace",
      },
      route: "/api/v1/test-verified-actor",
    });

    const response = await handler(
      new Request("http://localhost/api/v1/test-verified-actor", {
        headers: {
          Authorization: "Bearer verified-session",
          "X-Workspace-Id": "workspace-a",
        },
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        sessionUserId: "verified-owner",
        traceUserId: "verified-owner",
      },
      ok: true,
    });
    expect(permissionService.check).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "verified-owner",
      }),
      expect.any(Object),
    );
  });
});

describe("idempotency contract", () => {
  it("replays the same response for matching idempotent payloads", async () => {
    const repository = new InMemoryIdempotencyRepository();
    let calls = 0;
    const handler = apiHandler({
      handler: () => {
        calls += 1;
        return { calls };
      },
      idempotency: {
        repository,
      },
      methods: ["POST"],
      route: "/api/v1/test-idempotency",
    });
    const headers = {
      "X-Idempotency-Key": "same-key",
      "X-Request-Id": "req-same",
    };

    const first = await handler(makeJsonRequest("http://localhost/api/v1/test-idempotency", { value: 1 }, headers));
    const second = await handler(makeJsonRequest("http://localhost/api/v1/test-idempotency", { value: 1 }, headers));

    expect(calls).toBe(1);
    expect(await first.json()).toMatchObject({ data: { calls: 1 }, ok: true });
    expect(await second.json()).toMatchObject({ data: { calls: 1 }, ok: true });
    expect(second.headers.get("X-Idempotency-Hit")).toBe("true");
  });

  it("returns 409 for same key with different payload", async () => {
    const repository = new InMemoryIdempotencyRepository();
    let calls = 0;
    const handler = apiHandler({
      handler: () => {
        calls += 1;
        return { calls };
      },
      idempotency: {
        repository,
      },
      methods: ["POST"],
      route: "/api/v1/test-idempotency-conflict",
    });
    const headers = {
      "X-Idempotency-Key": "conflict-key",
      "X-Request-Id": "req-conflict",
    };

    await handler(makeJsonRequest("http://localhost/api/v1/test-idempotency-conflict", { value: 1 }, headers));
    const conflict = await handler(makeJsonRequest("http://localhost/api/v1/test-idempotency-conflict", { value: 2 }, headers));
    const json = await readJson(conflict);

    expect(calls).toBe(1);
    expect(conflict.status).toBe(409);
    expect(json).toMatchObject({
      error: {
        code: "IDEMPOTENCY_CONFLICT",
      },
      ok: false,
    });
  });

  it("hashes canonical redacted requests without raw secrets", async () => {
    const hash = await createRequestHash({
      Authorization: "Bearer sk-secret-123456789",
      payload: { a: 1 },
      requestId: "volatile",
    });

    expect(hash).toMatch(/^sha256:/);
    expect(hash).not.toContain("sk-secret");
  });
});

describe("routing compatibility and health", () => {
  it("keeps v1 and legacy memory-compress routes available", async () => {
    useTestAuthSession();

    const body = { config: {}, payload: { message: "compress" } };
    const v1 = await memoryCompressPost(
      makeJsonRequest("http://localhost/api/v1/agents/memory-compress", body, {
        Authorization: "Bearer memory-session",
        "X-User-Id": "local-owner",
      }),
    );
    const legacy = await legacyMemoryCompressPost(
      new Request("http://localhost/api/memory-compress", {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(v1.status).toBe(200);
    expect(await legacy.json()).toMatchObject({ mockFallback: true });
  });

  it("health route returns light V5 health booleans", async () => {
    const response = await healthGet(new Request("http://localhost/api/v1/health"));
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        database: expect.any(Boolean),
        deployment: expect.any(Boolean),
        env: expect.any(Boolean),
        mode: expect.stringMatching(/^(local|staging|production)$/),
        registry: expect.any(Boolean),
        status: expect.stringMatching(/^(ok|warning|degraded)$/),
      },
      ok: true,
    });
    expect(JSON.stringify(json)).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "never-match");
    expect(JSON.stringify(json)).not.toContain(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "never-match");
  });
});

describe("streaming contract", () => {
  const streamPayload: AgentStreamRequest = {
    agent: {
      callsign: "TEST",
      contextNotes: [],
      identity: "test agent",
      memory: [],
      mission: "test stream",
      executionPrompt: "",
      model: "gpt-4o-mini",
      provider: "mock",
      title: "Test Agent",
    },
    messages: [{ content: "hello", role: "user" }],
  };

  it("emits standard v1 meta, token, and done events", async () => {
    useTestAuthSession();

    const response = await streamPost(
      new Request("http://localhost/api/v1/agents/agent-a/stream", {
        body: JSON.stringify(streamPayload),
        headers: {
          Authorization: "Bearer stream-session",
          "Content-Type": "application/json",
          "X-Request-Id": "req-stream",
          "X-Trace-Id": "trace-stream",
          "X-User-Id": "local-owner",
          "X-Workspace-Id": "workspace-a",
        },
        method: "POST",
      }),
      { params: Promise.resolve({ agentId: "agent-a" }) },
    );
    const events = await readSseEvents(response);

    expect(events[0]).toMatchObject({
      agentId: "agent-a",
      requestId: "req-stream",
      traceId: "trace-stream",
      type: "meta",
      taskId: expect.any(String),
      workspaceId: "workspace-a",
    });
    expect(events.some((event) => event.type === "token")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("returns typed stream preparation errors instead of a generic 400", async () => {
    const response = await streamPost(
      new Request("http://localhost/api/v1/agents/agent-a/stream", {
        body: JSON.stringify({
          ...streamPayload,
          workspaceId: "workspace-a",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "req-stream-auth",
          "X-Trace-Id": "trace-stream-auth",
          "X-Workspace-Id": "workspace-a",
        },
        method: "POST",
      }),
      { params: Promise.resolve({ agentId: "agent-a" }) },
    );
    const json = await readJson(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({
      error: {
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
        retryable: false,
      },
      type: "error",
    });
  });

  it("keeps legacy stream route available through a shared wrapper", async () => {
    const response = await legacyStreamPost(
      new Request("http://localhost/api/agent-stream", {
        body: JSON.stringify(streamPayload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    const events = await readSseEvents(response);

    expect(events[0]).toMatchObject({
      mode: "mock",
      type: "meta",
    });
  });
});

describe("NexusApiClient", () => {
  it("adds mutation idempotency headers and unwraps success envelopes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: { saved: true },
        error: null,
        meta: {
          requestId: "req-client",
          traceId: "trace-client",
        },
        ok: true,
      }),
    );

    const result = await nexusApiClient.post<{ saved: boolean }, { value: number }>(
      "/api/v1/test-client",
      { value: 1 },
      { workspaceId: "workspace-a" },
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(requestInit.headers);

    expect(result).toEqual({ saved: true });
    expect(headers.get("X-Request-Id")).toMatch(/^req_/);
    expect(headers.get("X-Idempotency-Key")).toMatch(/^mutation_/);
    expect(headers.get("X-Workspace-Id")).toBe("workspace-a");

    fetchMock.mockRestore();
  });

  it("throws sanitized NexusApiError for ApiFailure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json(
        {
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid",
            retryable: false,
          },
          meta: {
            requestId: "req-client",
            traceId: "trace-client",
          },
          ok: false,
        },
        { status: 400 },
      ),
    );

    await expect(
      nexusApiClient.post("/api/v1/test-client", { value: 1 }),
    ).rejects.toBeInstanceOf(NexusApiError);

    fetchMock.mockRestore();
  });
});

describe("V2 idempotency migration safety", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260527001000_api_idempotency_keys.sql", import.meta.url),
    "utf8",
  );

  it("creates api_idempotency_keys with constraints, indexes, and RLS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.api_idempotency_keys");
    expect(migration).toContain("api_idempotency_status_check");
    expect(migration).toContain("api_idempotency_method_check");
    expect(migration).toContain("api_idempotency_workspace_key_unique");
    expect(migration).toContain("idx_api_idempotency_workspace_key");
    expect(migration).toContain("idx_api_idempotency_expires");
    expect(migration).toContain("idx_api_idempotency_actor_created");
    expect(migration).toContain("idx_api_idempotency_status_locked");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).not.toContain("CREATE POLICY");
  });

  it("does not introduce later-version lifecycle tables", () => {
    const allMigrations = readFileSync(
      new URL("../../../../supabase/migrations/20260527001000_api_idempotency_keys.sql", import.meta.url),
      "utf8",
    );

    expect(allMigrations).not.toMatch(/workspace_snapshots|sync_operations|agent_tasks|tool_runs|feature_flags|system_events/i);
  });
});

async function readSseEvents(response: Response) {
  const text = await response.text();

  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}

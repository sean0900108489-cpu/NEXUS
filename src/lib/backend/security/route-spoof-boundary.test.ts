import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as artifactsGet, POST as artifactsPost } from "@/app/api/v1/artifacts/route";
import { GET as featureFlagsGet } from "@/app/api/v1/feature-flags/route";
import {
  GET as notebooksGet,
  resetNotebookRouteDependenciesForTests,
  setNotebookRouteDependenciesForTests,
} from "@/app/api/v1/notebooks/route";
import { GET as observabilityEventsGet } from "@/app/api/v1/observability/events/route";
import {
  GET as promptsGet,
  resetPromptRouteDependenciesForTests,
  setPromptRouteDependenciesForTests,
} from "@/app/api/v1/prompts/route";
import { POST as syncOperationsPost } from "@/app/api/v1/sync/operations/route";
import { GET as toolRunsGet } from "@/app/api/v1/tool-runs/route";
import { ApiError } from "@/lib/backend/api/api-errors";
import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import type { AuthSessionVerifier } from "@/lib/backend/security/auth-session";

type Probe = {
  name: string;
  request: (headers: Record<string, string>) => Request;
  invoke: (request: Request) => Promise<Response>;
};

const SPOOFED_WORKSPACE_ID = "workspace-spoof-probe-deny";
const VERIFIED_USER_ID = "00000000-0000-4000-8000-000000000001";

const probes: Probe[] = [
  {
    name: "artifacts GET query workspace",
    request: (headers) =>
      new Request(
        `http://localhost/api/v1/artifacts?workspaceId=${SPOOFED_WORKSPACE_ID}`,
        { headers },
      ),
    invoke: artifactsGet,
  },
  {
    name: "artifacts POST body workspace",
    request: (headers) =>
      jsonRequest(
        "http://localhost/api/v1/artifacts",
        {
          contentText: "route spoof probe",
          mimeType: "text/plain",
          title: "Route spoof probe",
          type: "text",
          workspaceId: SPOOFED_WORKSPACE_ID,
        },
        headers,
      ),
    invoke: artifactsPost,
  },
  {
    name: "feature flags GET query workspace",
    request: (headers) =>
      new Request(
        `http://localhost/api/v1/feature-flags?workspaceId=${SPOOFED_WORKSPACE_ID}`,
        { headers },
      ),
    invoke: featureFlagsGet,
  },
  {
    name: "notebooks GET query workspace",
    request: (headers) =>
      new Request(
        `http://localhost/api/v1/notebooks?workspaceId=${SPOOFED_WORKSPACE_ID}`,
        { headers },
      ),
    invoke: notebooksGet,
  },
  {
    name: "observability events GET header workspace",
    request: (headers) =>
      new Request("http://localhost/api/v1/observability/events", {
        headers: {
          "X-Workspace-Id": SPOOFED_WORKSPACE_ID,
          ...headers,
        },
      }),
    invoke: observabilityEventsGet,
  },
  {
    name: "prompts GET query workspace",
    request: (headers) =>
      new Request(
        `http://localhost/api/v1/prompts?workspaceId=${SPOOFED_WORKSPACE_ID}`,
        { headers },
      ),
    invoke: promptsGet,
  },
  {
    name: "sync operations POST body workspace",
    request: (headers) =>
      jsonRequest(
        "http://localhost/api/v1/sync/operations",
        {
          clientMutationId: "route-spoof-probe",
          entityId: "entity-spoof-probe",
          entityType: "prompt",
          operationType: "upsert",
          payload: {},
          workspaceId: SPOOFED_WORKSPACE_ID,
        },
        headers,
      ),
    invoke: syncOperationsPost,
  },
  {
    name: "tool runs GET header workspace",
    request: (headers) =>
      new Request("http://localhost/api/v1/tool-runs", {
        headers: {
          "X-Workspace-Id": SPOOFED_WORKSPACE_ID,
          ...headers,
        },
      }),
    invoke: toolRunsGet,
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
  resetApiAuthSessionVerifierForTests();
  resetNotebookRouteDependenciesForTests();
  resetPromptRouteDependenciesForTests();
});

describe("route spoof boundary probes", () => {
  it.each(probes)("rejects caller-controlled identity without auth: $name", async (probe) => {
    useMissingAuthVerifier();

    const response = await probe.invoke(
      probe.request({
        "X-User-Id": "spoofed-owner",
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
  });

  it.each(probes)("rejects X-User-Id that differs from verified session: $name", async (probe) => {
    useVerifiedAuthSession();

    const response = await probe.invoke(
      probe.request({
        Authorization: "Bearer verified-session",
        "X-User-Id": "spoofed-owner",
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
  });

  it.each([
    probes[0],
    probes[2],
    probes[4],
    probes[6],
    probes[7],
  ])("rejects spoofed workspace with verified session: $name", async (probe) => {
    vi.stubEnv("NODE_ENV", "production");
    useVerifiedAuthSession();

    const response = await probe.invoke(
      probe.request({
        Authorization: "Bearer verified-session",
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(403);
    expect(json).toMatchObject({
      error: {
        code: expect.stringMatching(/PERMISSION|WORKSPACE/),
      },
      ok: false,
    });
  });
});

function useMissingAuthVerifier() {
  const verifier: AuthSessionVerifier = {
    verifyRequest: vi.fn(async () => {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }),
  };

  setApiAuthSessionVerifierForTests(verifier);
  setNotebookRouteDependenciesForTests({ authVerifier: verifier });
  setPromptRouteDependenciesForTests({ authVerifier: verifier });
}

function useVerifiedAuthSession() {
  const verifier: AuthSessionVerifier = {
    verifyRequest: vi.fn(async () => ({
      email: "verified-owner@example.test",
      id: VERIFIED_USER_ID,
    })),
  };

  setApiAuthSessionVerifierForTests(verifier);
  setNotebookRouteDependenciesForTests({ authVerifier: verifier });
  setPromptRouteDependenciesForTests({ authVerifier: verifier });
}

function jsonRequest(
  url: string,
  body: unknown,
  headers: Record<string, string>,
) {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": `route-spoof-${crypto.randomUUID()}`,
      ...headers,
    },
    method: "POST",
  });
}

function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

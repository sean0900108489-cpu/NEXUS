import { afterEach, describe, expect, it, vi } from "vitest";

import type { IAuthVault } from "@/lib/nexus-types";

import { resolveWorkflowRuntimeImageCredential } from "./image-client";
import { createWorkflowRuntimeImageCall } from "./image-client";

function createAuthVault(
  input: Partial<IAuthVault> = {},
): IAuthVault {
  return {
    globalApiKey: null,
    globalBaseUrl: null,
    isLocked: false,
    providerCredentials: {},
    user: null,
    ...input,
  };
}

describe("workflow runtime image credentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignores frontend provider credentials and uses the server-managed image gateway", () => {
    const credential = resolveWorkflowRuntimeImageCredential({
      authVault: createAuthVault({
        globalApiKey: "sk-global",
        providerCredentials: {
          "openai-compatible": {
            apiKey: "sk-image-provider",
            baseUrl: "https://image.example/v1",
            isLocked: true,
          },
        },
      }),
      modelId: "img2",
    });

    expect(credential).toMatchObject({
      apiKey: "",
      baseUrl: undefined,
      providerId: "server-new-api",
    });
  });

  it("keeps the generated image when artifact persistence is denied", async () => {
    const fetchCalls: Array<{
      body?: unknown;
      path: string;
    }> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        fetchCalls.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          path,
        });

        if (path === "/api/image-gen") {
          return Response.json({
            content: "image generated",
            generatedAsset: {
              assetId: "img_runtime",
              durable: false,
              mimeType: "image/png",
              provider: "memory",
              sizeBytes: 12,
              url: "/api/image-gen/assets/img_runtime",
            },
            media: {
              createdAt: "2026-06-04T00:00:00.000Z",
              prompt: "runtime image prompt",
              type: "image",
              url: "/api/image-gen/assets/img_runtime",
            },
            mode: "dall-e",
            revisedPrompt: "revised runtime prompt",
          });
        }

        if (path === "/api/v1/artifacts") {
          return Response.json({ error: "Permission denied." }, { status: 403 });
        }

        return Response.json({ error: "Unexpected request." }, { status: 500 });
      }),
    );

    const callImage = createWorkflowRuntimeImageCall({
      authVault: createAuthVault({
        globalApiKey: "sk-runtime",
        user: {
          id: "user-runtime",
        } as IAuthVault["user"],
      }),
      executionAgent: {
        accent: "#a78bfa",
        callsign: "Nexus_1",
        id: "agent-runtime",
      } as never,
      workspace: {
        id: "workspace-runtime",
      } as never,
    });
    const result = await callImage({
      node: {
        data: {
          aspectRatio: "1:1",
          modelId: "img2",
          prompt: "Use upstream output.",
          quality: "standard",
        },
        id: "image-node",
        type: "model.image",
      } as never,
      prompt: "runtime image prompt",
      runId: "run-runtime",
      upstream: {} as never,
      workflowId: "workflow-runtime",
    });

    expect(fetchCalls.map((call) => call.path)).toEqual([
      "/api/image-gen",
      "/api/v1/artifacts",
    ]);
    expect(fetchCalls[0]?.body).toMatchObject({
      conversationId: "run-runtime",
      operatorId: "agent-runtime",
      workspaceId: "workspace-runtime",
    });
    expect(result.media).toMatchObject({
      type: "image",
      url: "/api/image-gen/assets/img_runtime",
    });
    expect(result.media.artifactId).toBeUndefined();
    expect(result.metadata).toMatchObject({
      artifactId: null,
      artifactPersistence: {
        status: "failed",
      },
      generatedAsset: {
        assetId: "img_runtime",
        durable: false,
      },
    });
    expect(result.text).toContain("Artifact persistence: failed");
    expect(result.text).toContain("Image URL: /api/image-gen/assets/img_runtime");
  });
});

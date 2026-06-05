import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

import {
  clearGeneratedImageAssetCacheForTests,
  getGeneratedImageAsset,
} from "@/lib/backend/image-generation/generated-image-asset-cache";
import { setGeneratedImageStorageGatewayForTests } from "@/lib/backend/image-generation/generated-image-asset-storage";
import type { PermissionDecision } from "@/lib/backend/contracts/permission";

import { GET as GET_GENERATED_IMAGE_ASSET } from "./assets/[assetId]/route";
import {
  POST,
  resetImageGenerationRouteDependenciesForTests,
  setImageGenerationRouteDependenciesForTests,
} from "./route";

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL;

describe("/api/image-gen", () => {
  afterEach(() => {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
    process.env.OPENAI_IMAGE_MODEL = ORIGINAL_OPENAI_IMAGE_MODEL;
    clearGeneratedImageAssetCacheForTests();
    setGeneratedImageStorageGatewayForTests(null);
    resetImageGenerationRouteDependenciesForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the server OpenAI API key and maps img2 into the provider model", async () => {
    process.env.OPENAI_API_KEY = "sk-env-test";
    process.env.OPENAI_IMAGE_MODEL = "img2";

    const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([input, init]);

      return Response.json({
        data: [
          {
            b64_json: "aW1hZ2U=",
            revised_prompt: "Y2K wide-leg pants",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          agent: {
            accent: "#d4d4d4",
            callsign: "ARCHITECT",
          },
          imageSettings: {
            aspectRatio: "1:1",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "Y2K trendy wide-leg pants",
          toolName: "Composer Image Mode",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      media: {
        prompt: "Y2K trendy wide-leg pants",
        type: "image",
      },
      mode: "dall-e",
      revisedPrompt: "Y2K wide-leg pants",
    });
    expect(payload.media.url).toMatch(/^\/api\/image-gen\/assets\/img_/u);
    expect(payload.content).not.toContain("data:image/png;base64");
    const assetId = String(payload.media.url).split("/").at(-1) ?? "";
    const asset = getGeneratedImageAsset(assetId);

    expect(asset?.mimeType).toBe("image/png");
    expect(new TextDecoder().decode(asset?.bytes)).toBe("image");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchCalls[0] ?? [];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-env-test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-image-2",
      prompt: "Y2K trendy wide-leg pants",
      quality: "low",
      size: "1024x1024",
    });
  });

  it("requires authenticated writable workspace access in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";

    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: "cHJvZHVjdGlvbi1pbWFnZQ==",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "production image route smoke",
          workspaceId: "workspace-image",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": "workspace-image",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication is required.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses runtime provider authorization after production workspace access passes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";
    setImageGenerationRouteDependenciesForTests({
      authVerifier: {
        verifyRequest: async () => ({
          id: "user-owner",
        }),
      },
      permission: {
        check: async (): Promise<PermissionDecision> => ({
          decision: "allow",
          reasonCode: "PERMISSION_ALLOWED",
          requiredScopes: ["workspace:update"],
          riskLevel: "high",
        }),
      },
    });

    const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([input, init]);

      return Response.json({
        data: [
          {
            b64_json: "cHJvZHVjdGlvbi1pbWFnZQ==",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "production image route smoke",
          workspaceId: "workspace-image",
        }),
        headers: {
          Authorization: "Bearer supabase-session",
          "Content-Type": "application/json",
          "X-Nexus-Runtime-Authorization": "Bearer sk-browser-test",
          "X-User-Id": "user-owner",
          "X-Workspace-Id": "workspace-image",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchCalls[0] ?? [];

    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-browser-test",
      "Content-Type": "application/json",
    });
  });

  it("extracts runtime image keys from JSON-shaped provider settings before calling OpenAI", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";
    setImageGenerationRouteDependenciesForTests({
      authVerifier: {
        verifyRequest: async () => ({
          id: "user-owner",
        }),
      },
      permission: {
        check: async (): Promise<PermissionDecision> => ({
          decision: "allow",
          reasonCode: "PERMISSION_ALLOWED",
          requiredScopes: ["workspace:update"],
          riskLevel: "high",
        }),
      },
    });

    const fetchCalls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push([input, init]);

      return Response.json({
        data: [
          {
            b64_json: "anNvbi1pbWFnZQ==",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "json-shaped provider key smoke",
          workspaceId: "workspace-image",
        }),
        headers: {
          Authorization: "Bearer supabase-session",
          "Content-Type": "application/json",
          "X-Nexus-Runtime-Authorization":
            'Bearer { "openai": { "apiKey": "sk-json-runtime-test" } }',
          "X-User-Id": "user-owner",
          "X-Workspace-Id": "workspace-image",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchCalls[0] ?? [];

    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-json-runtime-test",
      "Content-Type": "application/json",
    });
  });

  it("uses request-scoped workspace permission for production image generation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";
    const permissionChecks: Array<{
      accessToken: string | null;
      authorization: string | null;
    }> = [];
    setImageGenerationRouteDependenciesForTests({
      authVerifier: {
        verifyRequest: async () => ({
          id: "user-owner",
        }),
      },
      permissionFactory: ({ accessToken, request }) => {
        permissionChecks.push({
          accessToken,
          authorization: request.headers.get("authorization"),
        });

        return {
          check: async (): Promise<PermissionDecision> => ({
            decision: "allow",
            reasonCode: "PERMISSION_ALLOWED",
            requiredScopes: ["workspace:update"],
            riskLevel: "high",
          }),
        };
      },
    });

    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: "cHJvZHVjdGlvbi1pbWFnZQ==",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "request-scoped image permission smoke",
          workspaceId: "workspace-image",
        }),
        headers: {
          Authorization: "Bearer supabase-session",
          "Content-Type": "application/json",
          "X-User-Id": "user-owner",
          "X-Workspace-Id": "workspace-image",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(permissionChecks).toEqual([
      {
        accessToken: "supabase-session",
        authorization: "Bearer supabase-session",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("persists generated image bytes to durable storage when workspace session credentials are present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";
    setImageGenerationRouteDependenciesForTests({
      authVerifier: {
        verifyRequest: async () => ({
          id: "user-owner",
        }),
      },
      permission: {
        check: async (): Promise<PermissionDecision> => ({
          decision: "allow",
          reasonCode: "PERMISSION_ALLOWED",
          requiredScopes: ["workspace:update"],
          riskLevel: "high",
        }),
      },
    });
    const storageUploads: Array<{
      accessToken?: string | null;
      assetId: string;
      mimeType: string;
      size: number;
      workspaceId?: string | null;
    }> = [];
    setGeneratedImageStorageGatewayForTests({
      download: async () => null,
      upload: async (input) => {
        storageUploads.push({
          accessToken: input.accessToken,
          assetId: input.assetId,
          mimeType: input.mimeType,
          size: input.bytes.byteLength,
          workspaceId: input.workspaceId,
        });

        return {
          assetId: input.assetId,
          bucket: "nexus-generated-assets",
          mimeType: input.mimeType,
          path: `${input.workspaceId}/image-gen/${input.assetId}`,
          provider: "supabase-storage",
          sizeBytes: input.bytes.byteLength,
        };
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: "ZHVyYWJsZS1pbWFnZQ==",
          },
        ],
      }),
    ));

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "durable generated asset",
          workspaceId: "workspace-image",
        }),
        headers: {
          Authorization: "Bearer supabase-session",
          "Content-Type": "application/json",
          "X-User-Id": "user-owner",
          "X-Workspace-Id": "workspace-image",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.generatedAsset).toMatchObject({
      bucket: "nexus-generated-assets",
      durable: true,
      mimeType: "image/png",
      path: expect.stringMatching(/^workspace-image\/image-gen\/img_/u),
      provider: "supabase-storage",
      sizeBytes: "durable-image".length,
    });
    expect(payload.media.url).toContain("workspaceId=workspace-image");
    expect(storageUploads).toEqual([
      {
        accessToken: "supabase-session",
        assetId: expect.stringMatching(/^img_/u),
        mimeType: "image/png",
        size: "durable-image".length,
        workspaceId: "workspace-image",
      },
    ]);
  });

  it("denies production image generation when the workspace role cannot write", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OPENAI_API_KEY = "sk-env-test";
    setImageGenerationRouteDependenciesForTests({
      authVerifier: {
        verifyRequest: async () => ({
          id: "user-viewer",
        }),
      },
      permission: {
        check: async (): Promise<PermissionDecision> => ({
          decision: "deny",
          reasonCode: "PERMISSION_DENIED",
          requiredScopes: ["workspace:update"],
          riskLevel: "high",
        }),
      },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          model: "img2",
          prompt: "viewer blocked image",
          workspaceId: "workspace-image",
        }),
        headers: {
          Authorization: "Bearer supabase-session",
          "Content-Type": "application/json",
          "X-User-Id": "user-viewer",
          "X-Workspace-Id": "workspace-image",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Permission denied.",
      reasonCode: "PERMISSION_DENIED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves generated b64 images through the transient asset route", async () => {
    process.env.OPENAI_API_KEY = "sk-env-test";
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: "aW1hZ2U=",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          model: "img2",
          prompt: "asset route image",
        }),
        method: "POST",
      }),
    );
    const payload = await response.json();
    const assetId = String(payload.media.url).split("/").at(-1) ?? "";
    const assetResponse = await GET_GENERATED_IMAGE_ASSET(
      new Request(`http://localhost/api/image-gen/assets/${assetId}`),
      { params: Promise.resolve({ assetId }) },
    );

    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("Content-Type")).toBe("image/png");
    expect(assetResponse.headers.get("Content-Disposition")).toMatch(
      /^inline; filename="img_.+\.png"$/u,
    );
    expect(assetResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(assetResponse.headers.get("X-Nexus-Generated-Asset-Byte-Length")).toBe(
      "5",
    );
    expect(assetResponse.headers.get("X-Nexus-Generated-Asset-Id")).toBe(assetId);
    await expect(assetResponse.text()).resolves.toBe("image");
  });

  it("normalizes generated PNG assets to the requested product aspect ratio", async () => {
    process.env.OPENAI_API_KEY = "sk-env-test";
    const sourcePng = await sharp({
      create: {
        background: "#171717",
        channels: 3,
        height: 102,
        width: 153,
      },
    })
      .png()
      .toBuffer();
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [
          {
            b64_json: sourcePng.toString("base64"),
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/image-gen", {
        body: JSON.stringify({
          imageSettings: {
            aspectRatio: "16:9",
            modelId: "img2",
            quality: "standard",
          },
          model: "img2",
          prompt: "16:9 output ratio guard",
        }),
        method: "POST",
      }),
    );
    const payload = await response.json();
    const assetId = String(payload.media.url).split("/").at(-1) ?? "";
    const asset = getGeneratedImageAsset(assetId);
    const metadata = await sharp(Buffer.from(asset?.bytes ?? [])).metadata();

    expect(asset?.mimeType).toBe("image/png");
    expect(metadata.width).toBe(153);
    expect(metadata.height).toBe(86);
  });
});

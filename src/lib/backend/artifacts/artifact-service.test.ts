import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GET as listArtifactsGet,
  POST as createArtifactPost,
} from "@/app/api/v1/artifacts/route";
import { GET as getArtifactAssetGet } from "@/app/api/v1/artifacts/[artifactId]/asset/route";
import { GET as getArtifactGet } from "@/app/api/v1/artifacts/[artifactId]/route";
import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";
import type { ApiEnvelope } from "@/lib/backend/contracts/api-envelope";
import { setGeneratedImageStorageGatewayForTests } from "@/lib/backend/image-generation/generated-image-asset-storage";

import { ARTIFACT_CONTENT_TEXT_MAX_BYTES } from "./artifact-constants";
import {
  createArtifactRepository,
  InMemoryArtifactRepository,
  SupabaseArtifactRepository,
  toVaultRecord,
} from "./artifact-repository";
import { ArtifactService } from "./artifact-service";

function makeArtifactRequest(
  body: unknown,
  userId = "local-editor",
  workspaceId = "workspace-artifacts",
) {
  const id = crypto.randomUUID();

  return new Request("http://localhost/api/v1/artifacts", {
    body: JSON.stringify(body),
    headers: {
      ...authHeaders(userId),
      "Content-Type": "application/json",
      "X-Idempotency-Key": `artifact_mutation_${id}`,
      "X-Request-Id": `req_${id}`,
      "X-Workspace-Id": workspaceId,
    },
    method: "POST",
  });
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>;
}

afterEach(() => {
  setGeneratedImageStorageGatewayForTests(null);
  vi.unstubAllEnvs();
  resetMockApiAuthSessionVerifierForTests();
});

describe("ArtifactService", () => {
  it("uses a request-scoped Supabase repository when only user session credentials are available", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const repository = createArtifactRepository({
      accessToken: "user-session-token",
    });

    expect(repository).toBeInstanceOf(SupabaseArtifactRepository);
  });

  it("keeps in-memory persistence only as the no-credential fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(createArtifactRepository()).toBeInstanceOf(InMemoryArtifactRepository);
  });

  it("keeps artifact identity separate from content dedupe provenance", async () => {
    const service = new ArtifactService({
      repository: new InMemoryArtifactRepository(),
    });
    const first = await service.createArtifact({
      contentText: "same bounded artifact content",
      sourceTaskId: crypto.randomUUID(),
      type: "note",
      workspaceId: "workspace-artifacts",
    });
    const second = await service.createArtifact({
      contentText: "same bounded artifact content",
      sourceTaskId: crypto.randomUUID(),
      type: "note",
      workspaceId: "workspace-artifacts",
    });

    expect(first.artifact.id).not.toBe(second.artifact.id);
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.artifact.sourceTaskId).not.toBe(second.artifact.sourceTaskId);
  });

  it("stores only preview and storage reference for oversized text content", async () => {
    const service = new ArtifactService({
      repository: new InMemoryArtifactRepository(),
    });
    const largeContent = "x".repeat(ARTIFACT_CONTENT_TEXT_MAX_BYTES + 1024);
    const result = await service.createArtifact({
      contentText: largeContent,
      type: "sandbox",
      workspaceId: "workspace-artifacts",
    });

    expect(result.artifact.contentText).toBeNull();
    expect(result.artifact.contentUrl).toMatch(/^external:\/\/artifact-content\//);
    expect(result.artifact.contentSizeBytes).toBeGreaterThan(
      ARTIFACT_CONTENT_TEXT_MAX_BYTES,
    );
    expect(result.artifact.previewText?.length).toBeLessThan(largeContent.length);
  });

  it("rejects secret-bearing artifact content before persistence", async () => {
    const service = new ArtifactService({
      repository: new InMemoryArtifactRepository(),
    });

    await expect(
      service.createArtifact({
        contentText: "Authorization: Bearer sk-secret-artifact-123456789",
        type: "note",
        workspaceId: "workspace-artifacts",
      }),
    ).rejects.toMatchObject({ code: "ARTIFACT_SECRET_DETECTED" });
  });

  it("deduplicates identical references without deleting the artifact", async () => {
    const service = new ArtifactService({
      repository: new InMemoryArtifactRepository(),
    });
    const created = await service.createArtifact({
      contentText: "reference target",
      type: "note",
      workspaceId: "workspace-artifacts",
    });
    const first = await service.createReference(created.artifact.id, {
      referencedById: "message-1",
      referencedByType: "message",
      workspaceId: "workspace-artifacts",
    });
    const second = await service.createReference(created.artifact.id, {
      referencedById: "message-1",
      referencedByType: "message",
      workspaceId: "workspace-artifacts",
    });

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.reference.id).toBe(first.reference.id);
  });

  it("creates version-chain rows with stable root and parent pointers", async () => {
    const service = new ArtifactService({
      repository: new InMemoryArtifactRepository(),
    });
    const created = await service.createArtifact({
      contentText: "version one",
      type: "code",
      workspaceId: "workspace-artifacts",
    });
    const next = await service.createVersion(created.artifact.id, {
      contentText: "version two",
      type: "code",
      workspaceId: "workspace-artifacts",
    });

    expect(next.artifact.id).not.toBe(created.artifact.id);
    expect(next.artifact.version).toBe(2);
    expect(next.parentArtifactId).toBe(created.artifact.id);
    expect(next.rootArtifactId).toBe(created.artifact.id);
    expect(next.artifact.rootArtifactId).toBe(created.artifact.id);
  });

  it("returns projection records without full inline content", async () => {
    const service = new ArtifactService({
      repository: new InMemoryArtifactRepository(),
    });
    const created = await service.createArtifact({
      contentText: "full content should not be in vault projection",
      type: "note",
      workspaceId: "workspace-artifacts",
    });
    const projection = toVaultRecord(created.artifact);

    expect("contentText" in projection).toBe(false);
    expect(projection.previewText).toContain("full content");
  });
});

describe("V8 artifact API and migration contract", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260527007000_artifact_asset_layer.sql", import.meta.url),
    "utf8",
  );

  it("rejects artifact creation when only X-User-Id is provided", async () => {
    const response = await createArtifactPost(
      new Request("http://localhost/api/v1/artifacts", {
        body: JSON.stringify({
          contentText: "route artifact content",
          type: "note",
          workspaceId: "workspace-artifacts",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `artifact_mutation_${crypto.randomUUID()}`,
          "X-User-Id": "local-editor",
          "X-Workspace-Id": "workspace-artifacts",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("creates V2 envelope responses for create and by-id fetch", async () => {
    installMockApiAuthSessionVerifierForTests("local-editor");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const createResponse = await createArtifactPost(
      makeArtifactRequest({
        contentText: "route artifact content",
        sourceTaskId: crypto.randomUUID(),
        type: "note",
        workspaceId: "workspace-artifacts",
      }),
    );
    const createJson = await readJson<
      ApiEnvelope<{ artifact: { contentSizeBytes: number; id: string } }>
    >(createResponse);

    expect(createResponse.status).toBe(200);
    expect(createJson.data?.artifact.contentSizeBytes).toBe(
      "durable artifact bytes".length,
    );
    expect(createJson).toMatchObject({
      data: {
        artifact: {
          id: expect.any(String),
        },
      },
      ok: true,
    });

    const getResponse = await getArtifactGet(
      new Request(
        `http://localhost/api/v1/artifacts/${createJson.data?.artifact.id}?workspaceId=workspace-artifacts`,
        {
          headers: {
            ...authHeaders("local-viewer"),
          },
        },
      ),
      {
        params: Promise.resolve({ artifactId: createJson.data!.artifact.id }),
      },
    );
    const getJson = await readJson<ApiEnvelope<{ artifact: { contentText: string } }>>(
      getResponse,
    );

    expect(getResponse.status).toBe(200);
    expect(getJson).toMatchObject({
      data: {
        artifact: {
          contentText: "route artifact content",
        },
      },
      ok: true,
    });
  });

  it("rejects invalid artifact provenance ids at the route boundary", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await createArtifactPost(
      makeArtifactRequest({
        contentText: "route artifact content",
        sourceTaskId: "task-local-not-a-uuid",
        sourceToolRunId: "tool-run-not-a-uuid",
        type: "note",
        workspaceId: "workspace-artifacts",
      }),
    );
    const json = await readJson<ApiEnvelope<unknown>>(response);

    expect(response.status).toBe(400);
    expect(json).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: {
          issues: [
            {
              code: "invalid_uuid",
              path: ["sourceTaskId"],
            },
            {
              code: "invalid_uuid",
              path: ["sourceToolRunId"],
            },
          ],
        },
      },
      ok: false,
    });
  });

  it("normalizes optional artifact provenance ids before persistence", async () => {
    installMockApiAuthSessionVerifierForTests("local-editor");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const sourceTaskId = crypto.randomUUID();

    const response = await createArtifactPost(
      makeArtifactRequest({
        contentText: "route artifact content",
        sourceTaskId: ` ${sourceTaskId} `,
        sourceToolRunId: "   ",
        type: "note",
        workspaceId: "workspace-artifacts",
      }),
    );
    const json = await readJson<
      ApiEnvelope<{ artifact: { sourceTaskId: string; sourceToolRunId: string | null } }>
    >(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        artifact: {
          sourceTaskId,
          sourceToolRunId: null,
        },
      },
      ok: true,
    });
  });

  it("lets viewers inspect generated history but blocks generated artifact creation", async () => {
    installMockApiAuthSessionVerifierForTests("local-editor");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const workspaceId = `workspace-artifact-matrix-${crypto.randomUUID()}`;

    const createResponse = await createArtifactPost(
      makeArtifactRequest(
        {
          contentUrl: "/api/image-gen/assets/img_route_matrix",
          metadata: {
            aspectRatio: "16:9",
            modelId: "img2",
            nodeId: "bench-b-image",
            quality: "standard",
            source: "workflow-runtime-lite",
          },
          mimeType: "image/png",
          previewText: "route matrix generated image",
          title: "Route matrix image",
          type: "generated-image",
          workspaceId,
        },
        "local-editor",
        workspaceId,
      ),
    );

    expect(createResponse.status).toBe(200);

    const viewerListResponse = await listArtifactsGet(
      new Request(
        `http://localhost/api/v1/artifacts?workspaceId=${workspaceId}&type=generated-image`,
        {
          headers: {
            ...authHeaders("local-viewer"),
          },
        },
      ),
    );
    const viewerListJson = await readJson<
      ApiEnvelope<{ artifacts: Array<{ title: string; type: string }> }>
    >(viewerListResponse);

    expect(viewerListResponse.status).toBe(200);
    expect(viewerListJson).toMatchObject({
      data: {
        artifacts: [
          expect.objectContaining({
            title: "Route matrix image",
            type: "generated-image",
          }),
        ],
      },
      ok: true,
    });

    const viewerCreateResponse = await createArtifactPost(
      makeArtifactRequest(
        {
          contentUrl: "/api/image-gen/assets/img_viewer_denied",
          type: "generated-image",
          workspaceId,
        },
        "local-viewer",
        workspaceId,
      ),
    );
    const viewerCreateJson = await readJson<ApiEnvelope<unknown>>(
      viewerCreateResponse,
    );

    expect(viewerCreateResponse.status).toBe(403);
    expect(viewerCreateJson).toMatchObject({
      error: {
        code: "PERMISSION_DENIED",
        message: "Permission denied.",
      },
      ok: false,
    });
  });

  it("lets viewers download durable generated artifact assets through the artifact route", async () => {
    installMockApiAuthSessionVerifierForTests("local-editor");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const workspaceId = `workspace-artifact-asset-${crypto.randomUUID()}`;
    const storagePath = `${workspaceId}/image-gen/img_route_asset`;

    setGeneratedImageStorageGatewayForTests({
      download: async (input) => {
        expect(input).toMatchObject({
          assetId: "img_route_asset",
          path: storagePath,
          workspaceId,
        });

        return {
          bytes: new TextEncoder().encode("durable artifact bytes"),
          mimeType: "image/png",
          path: storagePath,
          sizeBytes: "durable artifact bytes".length,
        };
      },
      upload: async () => null,
    });

    const createResponse = await createArtifactPost(
      makeArtifactRequest(
        {
          contentUrl: `/api/image-gen/assets/img_route_asset?workspaceId=${encodeURIComponent(workspaceId)}`,
          metadata: {
            generatedAsset: {
              assetId: "img_route_asset",
              bucket: "nexus-generated-assets",
              durable: true,
              mimeType: "image/png",
              path: storagePath,
              provider: "supabase-storage",
              sizeBytes: "durable artifact bytes".length,
            },
            source: "workflow-runtime-lite",
          },
          mimeType: "image/png",
          previewText: "route matrix generated image",
          title: "Route matrix durable image",
          type: "generated-image",
          workspaceId,
        },
        "local-editor",
        workspaceId,
      ),
    );
    const createJson = await readJson<ApiEnvelope<{ artifact: { id: string } }>>(
      createResponse,
    );

    expect(createResponse.status).toBe(200);

    installMockApiAuthSessionVerifierForTests("local-viewer");
    const assetResponse = await getArtifactAssetGet(
      new Request(
        `http://localhost/api/v1/artifacts/${createJson.data?.artifact.id}/asset?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          headers: {
            ...authHeaders("local-viewer"),
            "X-Workspace-Id": workspaceId,
          },
        },
      ),
      {
        params: Promise.resolve({ artifactId: createJson.data!.artifact.id }),
      },
    );

    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("Content-Type")).toBe("image/png");
    expect(assetResponse.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="Route-matrix-durable-image\.png"$/u,
    );
    expect(assetResponse.headers.get("X-Nexus-Artifact-Asset-Byte-Length")).toBe(
      String("durable artifact bytes".length),
    );
    await expect(assetResponse.text()).resolves.toBe("durable artifact bytes");
  });

  it("adds artifact provenance columns, reference uniqueness, indexes, and RLS only", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS title text");
    expect(migration).toContain("content_size_bytes");
    expect(migration).toContain("preview_text");
    expect(migration).toContain("source_task_id");
    expect(migration).toContain("source_tool_run_id");
    expect(migration).toContain("root_artifact_id");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.artifact_references");
    expect(migration).toContain("artifact_references_unique_referrer");
    expect(migration).toContain("idx_artifacts_workspace_type_created");
    expect(migration).toContain("idx_artifacts_source_task");
    expect(migration).toContain("idx_artifact_references_referrer");
    expect(migration).toContain("ALTER TABLE public.artifact_references ENABLE ROW LEVEL SECURITY");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS public.system_events");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS public.usage_metrics");
    expect(migration).not.toContain("historical_message_pages");
  });
});

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { POST as createArtifactPost } from "@/app/api/v1/artifacts/route";
import { GET as getArtifactGet } from "@/app/api/v1/artifacts/[artifactId]/route";
import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";
import type { ApiEnvelope } from "@/lib/backend/contracts/api-envelope";

import { ARTIFACT_CONTENT_TEXT_MAX_BYTES } from "./artifact-constants";
import { InMemoryArtifactRepository, toVaultRecord } from "./artifact-repository";
import { ArtifactService } from "./artifact-service";

function makeArtifactRequest(body: unknown, userId = "local-editor") {
  const id = crypto.randomUUID();

  return new Request("http://localhost/api/v1/artifacts", {
    body: JSON.stringify(body),
    headers: {
      ...authHeaders(userId),
      "Content-Type": "application/json",
      "X-Idempotency-Key": `artifact_mutation_${id}`,
      "X-Request-Id": `req_${id}`,
      "X-Workspace-Id": "workspace-artifacts",
    },
    method: "POST",
  });
}

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>;
}

afterEach(() => {
  resetMockApiAuthSessionVerifierForTests();
});

describe("ArtifactService", () => {
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

    const createResponse = await createArtifactPost(
      makeArtifactRequest({
        contentText: "route artifact content",
        sourceTaskId: crypto.randomUUID(),
        type: "note",
        workspaceId: "workspace-artifacts",
      }),
    );
    const createJson = await readJson<ApiEnvelope<{ artifact: { id: string } }>>(
      createResponse,
    );

    expect(createResponse.status).toBe(200);
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

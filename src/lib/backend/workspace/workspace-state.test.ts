import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUT as putWorkspaceState, GET as getWorkspaceState } from "@/app/api/v1/workspaces/[workspaceId]/state/route";
import {
  GET as getLatestWorkspaceRecoveryState,
  resetWorkspaceRecoveryAuthVerifierForTests,
  setWorkspaceRecoveryAuthVerifierForTests,
} from "@/app/api/v1/workspaces/recovery/latest/route";
import {
  GET as getWorkspaceRecoveryList,
  resetWorkspaceRecoveryListRouteDependenciesForTests,
  setWorkspaceRecoveryListRouteDependenciesForTests,
} from "@/app/api/v1/workspaces/recovery/route";
import {
  GET as getSelectedWorkspaceRecovery,
  resetWorkspaceRecoverySelectionRouteDependenciesForTests,
  setWorkspaceRecoverySelectionRouteDependenciesForTests,
} from "@/app/api/v1/workspaces/recovery/[workspaceId]/route";
import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import type { WorkspaceCloudSnapshotPayload } from "@/lib/nexus-types";
import { WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS } from "@/lib/workflow-runtime-lite/constants";
import {
  createContextPacket,
  createWorkflowRuntimeNode,
} from "@/lib/workflow-runtime-lite/state";

import {
  computeWorkspaceSnapshotChecksum,
  MAX_WORKSPACE_SNAPSHOT_BYTES,
  serializeActiveUiStateSnapshot,
} from "./workspace-snapshot-serializer";
import { InMemoryWorkspaceSnapshotRepository } from "./workspace-snapshot-repository";
import { InMemoryWorkspaceStateEntityRepository } from "./workspace-state-entity-repository";
import { WorkspaceStateService } from "./workspace-state-service";
import { WorkspaceSnapshotValidator } from "./workspace-snapshot-validator";
import { WorkspaceHydrationService } from "./workspace-hydration-service";

function makeWorkspace(id = `workspace-test-${crypto.randomUUID()}`) {
  const workspace = createDefaultWorkspace({
    id,
    name: "Test Workspace",
    timestamp: "2026-05-27T00:00:00.000Z",
  });

  workspace.agents[0]?.messages.push({
    content: "A bounded local transcript message that must not enter V3 snapshots.",
    createdAt: "2026-05-27T00:01:00.000Z",
    id: "message-1",
    role: "user",
  });

  return workspace;
}

function makePayload(workspaceId = `workspace-test-${crypto.randomUUID()}`) {
  return serializeActiveUiStateSnapshot(makeWorkspace(workspaceId));
}

function makePutRequest(
  workspaceId: string,
  payload: WorkspaceCloudSnapshotPayload,
  headers: Record<string, string> = {},
  baseChecksum: string | null = null,
) {
  const clientMutationId = `mutation_${crypto.randomUUID()}`;

  return new Request(`http://localhost/api/v1/workspaces/${workspaceId}/state`, {
    body: JSON.stringify({
      baseChecksum,
      clientMutationId,
      schemaVersion: 1,
      snapshot: payload,
      snapshotType: "active",
    }),
    headers: {
      Authorization: "Bearer workspace-session",
      "Content-Type": "application/json",
      "X-Idempotency-Key": clientMutationId,
      "X-Request-Id": `req_${crypto.randomUUID()}`,
      "X-User-Id": "local-owner",
      ...headers,
    },
    method: "PUT",
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  setApiAuthSessionVerifierForTests({
    verifyRequest: vi.fn(async (request) => ({
      email: null,
      id: request.headers.get("X-User-Id")?.trim() || "local-owner",
    })),
  });
});

afterEach(() => {
  resetApiAuthSessionVerifierForTests();
  resetWorkspaceRecoveryAuthVerifierForTests();
  resetWorkspaceRecoveryListRouteDependenciesForTests();
  resetWorkspaceRecoverySelectionRouteDependenciesForTests();
});

describe("WorkspaceSnapshotSerializer", () => {
  it("creates bounded snapshots without full message content or tool output", async () => {
    const workspace = makeWorkspace();
    workspace.agents[0]?.tools.push({
      error: "raw tool error must not persist",
      id: "tool-with-output",
      name: "Tool",
      result: "raw tool output must not persist",
      scope: "test",
      status: "done",
    });
    const payload = serializeActiveUiStateSnapshot(workspace);
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain("bounded local transcript message");
    expect(serialized).not.toContain("raw tool output");
    expect(payload.workspace.agents[0]?.messageWindow.messageRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentLength: expect.any(Number),
          id: "message-1",
        }),
      ]),
    );
    await expect(computeWorkspaceSnapshotChecksum(payload)).resolves.toMatch(/^sha256:/);
  });

  it("keeps cloud snapshots bounded while local workflow output stays complete", () => {
    const workspace = makeWorkspace();
    const longText = "z".repeat(WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS + 900);
    const packet = createContextPacket({
      rawText: longText,
      runId: "run-long",
      sourceNodeId: "llm-long",
    });
    const llmNode = {
      ...createWorkflowRuntimeNode({
        id: "llm-long",
        position: { x: 120, y: 120 },
        type: "model.llm",
      }),
      outputSnapshot: packet,
      status: "success" as const,
    };

    workspace.graph.runtimeLite = {
      edges: [],
      lastError: null,
      lastRunId: "run-long",
      nodes: [llmNode],
      runs: [
        {
          completedAt: "2026-05-27T00:02:00.000Z",
          error: null,
          nodeExecutions: [
            {
              completedAt: "2026-05-27T00:02:00.000Z",
              nodeId: "llm-long",
              outputSnapshot: packet,
              runId: "run-long",
              startedAt: "2026-05-27T00:01:00.000Z",
              status: "success",
            },
          ],
          runId: "run-long",
          startedAt: "2026-05-27T00:01:00.000Z",
          status: "success",
          workflowId: workspace.id,
        },
      ],
      version: 1,
    };

    const payload = serializeActiveUiStateSnapshot(workspace);
    const cloudPacket =
      payload.workspace.graph.runtimeLite?.nodes[0]?.outputSnapshot;

    expect(packet.rawText).toBe(longText);
    expect(cloudPacket?.rawText).toHaveLength(
      WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS,
    );
    expect(cloudPacket?.truncated).toBe(true);
  });

  it("omits binary data URLs from cloud workflow runtime snapshots", () => {
    const workspace = makeWorkspace("workspace-cloud-data-url-sanitize");
    const dataUrl = `data:image/png;base64,${"aW1hZ2U=".repeat(1024)}`;
    const packet = createContextPacket({
      displayText: dataUrl,
      metadata: {
        artifactVaultRecord: {
          contentUrl: dataUrl,
          id: "artifact-data-url",
          type: "generated-image",
          workspaceId: workspace.id,
        },
        imageUrl: dataUrl,
      },
      rawText: dataUrl,
      runId: "run-data-url",
      sourceNodeId: "image-node",
    });

    workspace.graph.runtimeLite = {
      edges: [],
      lastError: null,
      lastRunId: "run-data-url",
      nodes: [
        {
          ...createWorkflowRuntimeNode({
            id: "image-node",
            position: { x: 120, y: 120 },
            type: "model.image",
          }),
          outputSnapshot: packet,
          status: "success",
        },
      ],
      runs: [
        {
          completedAt: "2026-06-03T00:02:00.000Z",
          error: null,
          nodeExecutions: [
            {
              completedAt: "2026-06-03T00:02:00.000Z",
              nodeId: "image-node",
              outputSnapshot: packet,
              runId: "run-data-url",
              startedAt: "2026-06-03T00:01:00.000Z",
              status: "success",
            },
          ],
          runId: "run-data-url",
          startedAt: "2026-06-03T00:01:00.000Z",
          status: "success",
          workflowId: workspace.id,
        },
      ],
      version: 1,
    };

    const payload = serializeActiveUiStateSnapshot(workspace);
    const serialized = JSON.stringify(payload.workspace.graph.runtimeLite);

    expect(serialized).not.toContain("data:image/png");
    expect(serialized).toContain(
      "[binary data URL omitted from cloud workspace snapshot]",
    );
    expect(() =>
      new WorkspaceSnapshotValidator().validate({
        payload,
        schemaVersion: 1,
        snapshotType: "active",
        workspaceId: workspace.id,
      }),
    ).not.toThrow();
  });

  it("computes deterministic checksums and detects unchanged payloads", async () => {
    const payload = makePayload();
    const first = await computeWorkspaceSnapshotChecksum(payload);
    const second = await computeWorkspaceSnapshotChecksum({
      ...payload,
      workspace: { ...payload.workspace },
    });

    expect(first).toBe(second);
  });

  it("keeps sync metadata out of workspace content checksums", async () => {
    const workspace = makeWorkspace();
    const payload = serializeActiveUiStateSnapshot(workspace, null);
    const checksum = await computeWorkspaceSnapshotChecksum(payload);
    const metadataOnlyChange = serializeActiveUiStateSnapshot(workspace, checksum);

    await expect(computeWorkspaceSnapshotChecksum(metadataOnlyChange)).resolves.toBe(
      checksum,
    );
  });
});

describe("WorkspaceSnapshotValidator", () => {
  it("rejects secrets before snapshot persistence", () => {
    const payload = makePayload();
    payload.workspace.settings = {
      ...payload.workspace.settings,
      provider: "Bearer sk-secret-123456789",
    };

    expect(() =>
      new WorkspaceSnapshotValidator().validate({
        payload,
        schemaVersion: 1,
        snapshotType: "active",
        workspaceId: payload.workspace.id,
      }),
    ).toThrow(/secret/i);
  });

  it("rejects oversized snapshots", () => {
    const payload = makePayload();
    payload.workspace.agents[0]?.memory.push({
      content: "x".repeat(MAX_WORKSPACE_SNAPSHOT_BYTES + 1),
      id: "memory-large",
      intensity: 1,
      label: "Large",
      updatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(() =>
      new WorkspaceSnapshotValidator().validate({
        payload,
        schemaVersion: 1,
        snapshotType: "active",
        workspaceId: payload.workspace.id,
      }),
    ).toThrow(/allowed payload size/i);
  });

  it("rejects invalid imported registry references", () => {
    const payload = makePayload();
    payload.workspace.agents[0] = {
      ...payload.workspace.agents[0]!,
      model: "unknown-model",
    };

    expect(() =>
      new WorkspaceSnapshotValidator().validate({
        payload,
        schemaVersion: 1,
        snapshotType: "imported",
        workspaceId: payload.workspace.id,
      }),
    ).toThrow(/registry/i);
  });
});

describe("WorkspaceStateService", () => {
  it("saves snapshots, skips unchanged checksums, and rejects stale base checksums", async () => {
    const snapshots = new InMemoryWorkspaceSnapshotRepository();
    const entities = new InMemoryWorkspaceStateEntityRepository();
    const service = new WorkspaceStateService({ entities, snapshots });
    const payload = makePayload();

    const saved = await service.saveState({
      baseChecksum: null,
      clientMutationId: "mutation-1",
      schemaVersion: 1,
      snapshot: payload,
      userId: "user-owner",
      workspaceId: payload.workspace.id,
    });
    const unchanged = await service.saveState({
      baseChecksum: saved.checksum,
      clientMutationId: "mutation-2",
      schemaVersion: 1,
      snapshot: payload,
      userId: "user-owner",
      workspaceId: payload.workspace.id,
    });

    expect(saved.snapshotStatus).toBe("saved");
    expect(unchanged.snapshotStatus).toBe("unchanged");
    await expect(
      service.saveState({
        baseChecksum: null,
        clientMutationId: "mutation-2b",
        schemaVersion: 1,
        snapshot: payload,
        userId: "user-owner",
        workspaceId: payload.workspace.id,
      }),
    ).resolves.toMatchObject({
      snapshotStatus: "unchanged",
    });
    await expect(
      service.saveState({
        baseChecksum: "sha256:stale",
        clientMutationId: "mutation-3",
        schemaVersion: 1,
        snapshot: {
          ...payload,
          workspace: {
            ...payload.workspace,
            name: "Remote Conflict",
          },
        },
        userId: "user-owner",
        workspaceId: payload.workspace.id,
      }),
    ).rejects.toMatchObject({
      code: "WORKSPACE_STATE_CONFLICT",
      statusCode: 409,
    });
  });

  it("does not hydrate over newer local state", () => {
    const hydration = new WorkspaceHydrationService();

    expect(() =>
      hydration.assertCanHydrate({
        cloudChecksum: "sha256:cloud",
        cloudUpdatedAt: "2026-05-27T00:00:00.000Z",
        localChecksum: "sha256:local",
        localStatePresent: true,
        localUpdatedAt: "2026-05-27T00:01:00.000Z",
        reason: "workspace_switch",
        workspaceId: "workspace-a",
      }),
    ).toThrow(/overwrite newer local state/i);
  });
});

describe("workspace state API route", () => {
  it("saves and reads workspace state through the v1 envelope", async () => {
    const workspaceId = `workspace-route-${crypto.randomUUID()}`;
    const payload = makePayload(workspaceId);
    const context = { params: Promise.resolve({ workspaceId }) };
    const put = await putWorkspaceState(makePutRequest(workspaceId, payload), context);
    const putJson = await readJson(put);
    const get = await getWorkspaceState(
      new Request(`http://localhost/api/v1/workspaces/${workspaceId}/state`, {
        headers: {
          Authorization: "Bearer workspace-session",
          "X-Request-Id": "req-get",
          "X-User-Id": "local-owner",
        },
      }),
      context,
    );
    const getJson = await readJson(get);

    expect(put.status).toBe(200);
    expect(putJson).toMatchObject({
      data: {
        snapshotStatus: "saved",
        workspaceId,
      },
      ok: true,
    });
    expect(get.status).toBe(200);
    expect(getJson).toMatchObject({
      data: {
        checksum: (putJson.data as { checksum: string }).checksum,
        workspaceId,
      },
      ok: true,
    });
  });

  it("denies viewer writes through PermissionService", async () => {
    const workspaceId = `workspace-viewer-${crypto.randomUUID()}`;
    const payload = makePayload(workspaceId);
    const response = await putWorkspaceState(
      makePutRequest(
        workspaceId,
        payload,
        {
          "X-User-Id": "local-viewer",
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );
    const json = await readJson(response);

    expect(response.status).toBe(403);
    expect(json).toMatchObject({
      error: {
        code: "PERMISSION_DENIED",
      },
      ok: false,
    });
  });

  it("rejects latest account recovery when only X-User-Id is provided", async () => {
    const response = await getLatestWorkspaceRecoveryState(
      new Request("http://localhost/api/v1/workspaces/recovery/latest", {
        headers: {
          "X-Request-Id": "req-recovery-no-auth",
          "X-User-Id": "spoofed-owner",
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
  });

  it("returns latest account recovery state for the verified session user", async () => {
    const workspaceId = `workspace-recover-${crypto.randomUUID()}`;
    const payload = makePayload(workspaceId);
    const context = { params: Promise.resolve({ workspaceId }) };
    const put = await putWorkspaceState(
      makePutRequest(
        workspaceId,
        payload,
        {
          "X-User-Id": "recover-owner",
        },
      ),
      context,
    );
    const putJson = await readJson(put);

    setWorkspaceRecoveryAuthVerifierForTests({
      async verifyRequest(request) {
        expect(request.headers.get("authorization")).toBe("Bearer recover-token");

        return {
          email: "recover@example.test",
          id: "recover-owner",
        };
      },
    });

    const response = await getLatestWorkspaceRecoveryState(
      new Request(
        `http://localhost/api/v1/workspaces/recovery/latest?localWorkspaceId=${workspaceId}&localUpdatedAt=2099-01-01T00:00:00.000Z`,
        {
          headers: {
            Authorization: "Bearer recover-token",
            "X-Request-Id": "req-recovery",
            "X-User-Id": "recover-owner",
          },
        },
      ),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        latest: {
          checksum: (putJson.data as { checksum: string }).checksum,
          workspaceId,
        },
        plan: {
          action: "conflict",
          reason: "local_newer",
          workspaceId,
        },
        userId: "recover-owner",
      },
      ok: true,
    });
  });

  it("lists workspace recovery candidates for the verified session user", async () => {
    const firstWorkspaceId = `workspace-list-a-${crypto.randomUUID()}`;
    const secondWorkspaceId = `workspace-list-b-${crypto.randomUUID()}`;
    const firstPayload = makePayload(firstWorkspaceId);
    const secondPayload = makePayload(secondWorkspaceId);
    const firstPut = await putWorkspaceState(
      makePutRequest(
        firstWorkspaceId,
        firstPayload,
        {
          "X-User-Id": "list-owner",
        },
      ),
      { params: Promise.resolve({ workspaceId: firstWorkspaceId }) },
    );
    const secondPut = await putWorkspaceState(
      makePutRequest(
        secondWorkspaceId,
        secondPayload,
        {
          "X-User-Id": "list-owner",
        },
      ),
      { params: Promise.resolve({ workspaceId: secondWorkspaceId }) },
    );
    const firstJson = await readJson(firstPut);
    await readJson(secondPut);
    const firstChecksum = (firstJson.data as { checksum: string }).checksum;

    setWorkspaceRecoveryListRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest(request) {
          expect(request.headers.get("authorization")).toBe("Bearer list-token");

          return {
            email: "list@example.test",
            id: "list-owner",
          };
        },
      },
    });

    const response = await getWorkspaceRecoveryList(
      new Request(
        `http://localhost/api/v1/workspaces/recovery?localChecksum=${encodeURIComponent(firstChecksum)}`,
        {
          headers: {
            Authorization: "Bearer list-token",
            "X-User-Id": "list-owner",
          },
        },
      ),
    );
    const json = await readJson(response);
    const items = (json.data as {
      items: Array<{ isLocalChecksumMatch: boolean; workspaceId: string }>;
    }).items;

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        localChecksum: firstChecksum,
        userId: "list-owner",
      },
      ok: true,
    });
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isLocalChecksumMatch: true,
          workspaceId: firstWorkspaceId,
        }),
        expect.objectContaining({
          isLocalChecksumMatch: false,
          workspaceId: secondWorkspaceId,
        }),
      ]),
    );
  });

  it("rejects workspace recovery list when only X-User-Id is provided", async () => {
    const response = await getWorkspaceRecoveryList(
      new Request("http://localhost/api/v1/workspaces/recovery", {
        headers: {
          "X-User-Id": "spoofed-owner",
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
  });

  it("returns a selected workspace recovery state for the verified user", async () => {
    const workspaceId = `workspace-selected-${crypto.randomUUID()}`;
    const payload = makePayload(workspaceId);
    const put = await putWorkspaceState(
      makePutRequest(
        workspaceId,
        payload,
        {
          "X-User-Id": "selected-owner",
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );
    const putJson = await readJson(put);
    const checksum = (putJson.data as { checksum: string }).checksum;

    setWorkspaceRecoverySelectionRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest(request) {
          expect(request.headers.get("authorization")).toBe("Bearer selected-token");

          return {
            email: "selected@example.test",
            id: "selected-owner",
          };
        },
      },
    });

    const response = await getSelectedWorkspaceRecovery(
      new Request(
        `http://localhost/api/v1/workspaces/recovery/${workspaceId}?localChecksum=${encodeURIComponent(checksum)}&localWorkspaceId=${encodeURIComponent(workspaceId)}`,
        {
          headers: {
            Authorization: "Bearer selected-token",
            "X-User-Id": "selected-owner",
          },
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        latest: {
          checksum,
          workspaceId,
        },
        plan: {
          action: "skip",
          reason: "checksum_match",
          workspaceId,
        },
        userId: "selected-owner",
      },
      ok: true,
    });
  });

  it("ignores selected recovery local context when it belongs to a different workspace", async () => {
    const workspaceId = `workspace-selected-${crypto.randomUUID()}`;
    const payload = makePayload(workspaceId);
    await putWorkspaceState(
      makePutRequest(
        workspaceId,
        payload,
        {
          "X-User-Id": "selected-owner",
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );

    setWorkspaceRecoverySelectionRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest() {
          return {
            email: "selected@example.test",
            id: "selected-owner",
          };
        },
      },
    });

    const response = await getSelectedWorkspaceRecovery(
      new Request(
        `http://localhost/api/v1/workspaces/recovery/${workspaceId}?localChecksum=${encodeURIComponent("sha256:other-local")}&localUpdatedAt=${encodeURIComponent("2026-05-29T00:00:00.000Z")}&localWorkspaceId=${encodeURIComponent("workspace-other-local")}`,
        {
          headers: {
            Authorization: "Bearer selected-token",
          },
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        plan: {
          action: "hydrate",
          reason: "local_missing",
          workspaceId,
        },
      },
      ok: true,
    });
  });

  it("keeps selected recovery newer-local conflict for the same workspace id", async () => {
    const workspaceId = `workspace-selected-${crypto.randomUUID()}`;
    const payload = makePayload(workspaceId);
    await putWorkspaceState(
      makePutRequest(
        workspaceId,
        payload,
        {
          "X-User-Id": "selected-owner",
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );

    setWorkspaceRecoverySelectionRouteDependenciesForTests({
      authVerifier: {
        async verifyRequest() {
          return {
            email: "selected@example.test",
            id: "selected-owner",
          };
        },
      },
    });

    const response = await getSelectedWorkspaceRecovery(
      new Request(
        `http://localhost/api/v1/workspaces/recovery/${workspaceId}?localChecksum=${encodeURIComponent("sha256:newer-local")}&localUpdatedAt=${encodeURIComponent("2099-01-01T00:00:00.000Z")}&localWorkspaceId=${encodeURIComponent(workspaceId)}`,
        {
          headers: {
            Authorization: "Bearer selected-token",
          },
        },
      ),
      { params: Promise.resolve({ workspaceId }) },
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        plan: {
          action: "conflict",
          reason: "local_newer",
          workspaceId,
        },
      },
      ok: true,
    });
  });
});

describe("V3 workspace state migration", () => {
  const migration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20260527002000_workspace_cloud_state.sql",
      import.meta.url,
    ),
    "utf8",
  );

  it("creates canonical snapshots and rebuildable projection tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.workspace_snapshots");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.workspace_state_entities");
    expect(migration).toContain("workspace_snapshots_type_check");
    expect(migration).toContain("workspace_state_entities_unique");
    expect(migration).toContain("idx_workspace_snapshots_workspace_updated");
    expect(migration).toContain("idx_workspace_state_entities_workspace_type");
    expect(migration).toContain("workspace_state_entities is rebuildable projection cache only");
  });

  it("enables workspace-scoped RLS without introducing later-version tables", () => {
    expect(migration).toContain("ALTER TABLE public.workspace_snapshots ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("workspace_snapshots_select_member");
    expect(migration).toContain("workspace_state_entities_select_member");
    expect(migration).toContain("public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])");
    expect(migration).not.toMatch(/\bsync_operations\b/i);
    expect(migration).not.toMatch(/\bagent_tasks\b/i);
    expect(migration).not.toMatch(/\btool_runs\b/i);
    expect(migration).not.toMatch(/\bsystem_events\b/i);
    expect(migration).not.toMatch(/\bfeature_flags\b/i);
  });
});

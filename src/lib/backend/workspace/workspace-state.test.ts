import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PUT as putWorkspaceState, GET as getWorkspaceState } from "@/app/api/v1/workspaces/[workspaceId]/state/route";
import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import type { WorkspaceCloudSnapshotPayload } from "@/lib/nexus-types";

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

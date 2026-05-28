import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  WorkspaceStateEntityUpsert,
} from "@/lib/supabase/database.types";
import type {
  WorkspaceCloudSnapshotPayload,
  WorkspaceStateEntityType,
} from "@/lib/nexus-types";

import { computeWorkspaceSnapshotChecksum } from "./workspace-snapshot-serializer";

export type WorkspaceStateEntityRecord = {
  id: string;
  workspaceId: string;
  entityType: WorkspaceStateEntityType;
  entityId: string;
  schemaVersion: number;
  payload: unknown;
  checksum: string | null;
  updatedAt: string;
};

export type WorkspaceStateProjectionInput = {
  workspaceId: string;
  snapshot: WorkspaceCloudSnapshotPayload;
  snapshotChecksum: string;
};

export interface WorkspaceStateEntityRepository {
  rebuildProjectionFromSnapshot(input: WorkspaceStateProjectionInput): Promise<number>;
}

export class InMemoryWorkspaceStateEntityRepository
  implements WorkspaceStateEntityRepository
{
  private readonly entities = new Map<string, WorkspaceStateEntityRecord>();

  async rebuildProjectionFromSnapshot(input: WorkspaceStateProjectionInput) {
    for (const key of this.entities.keys()) {
      if (key.startsWith(`${input.workspaceId}:`)) {
        this.entities.delete(key);
      }
    }

    const rows = await buildProjectionRows(input);
    const now = new Date().toISOString();

    for (const row of rows) {
      this.entities.set(entityKey(row), {
        checksum: row.checksum ?? null,
        entityId: row.entity_id,
        entityType: row.entity_type,
        id: row.id ?? makeId(),
        payload: row.payload,
        schemaVersion: row.schema_version,
        updatedAt: now,
        workspaceId: row.workspace_id,
      });
    }

    return rows.length;
  }
}

export class SupabaseWorkspaceStateEntityRepository
  implements WorkspaceStateEntityRepository
{
  constructor(private readonly client: SupabaseClient<Database>) {}

  async rebuildProjectionFromSnapshot(input: WorkspaceStateProjectionInput) {
    const rows = await buildProjectionRows(input);
    const { error: deleteError } = await this.client
      .from("workspace_state_entities")
      .delete()
      .eq("workspace_id", input.workspaceId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (rows.length === 0) {
      return 0;
    }

    const { error } = await this.client
      .from("workspace_state_entities")
      .upsert(rows, {
        onConflict: "workspace_id,entity_type,entity_id",
      });

    if (error) {
      throw new Error(error.message);
    }

    return rows.length;
  }
}

const inMemoryWorkspaceStateEntityRepository =
  new InMemoryWorkspaceStateEntityRepository();

export function createWorkspaceStateEntityRepository(): WorkspaceStateEntityRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseWorkspaceStateEntityRepository(getNexusSupabaseAdminClient())
    : inMemoryWorkspaceStateEntityRepository;
}

async function buildProjectionRows({
  snapshot,
  snapshotChecksum,
  workspaceId,
}: WorkspaceStateProjectionInput): Promise<WorkspaceStateEntityUpsert[]> {
  const rows: WorkspaceStateEntityUpsert[] = [];
  const schemaVersion = snapshot.schemaVersion;

  rows.push(
    await makeProjectionRow(workspaceId, "graph", "graph", schemaVersion, {
      checksum: snapshotChecksum,
      graph: snapshot.workspace.graph,
    }),
  );
  rows.push(
    await makeProjectionRow(workspaceId, "settings", "settings", schemaVersion, {
      settings: snapshot.workspace.settings,
    }),
  );

  if (snapshot.workspace.themeConfig) {
    rows.push(
      await makeProjectionRow(workspaceId, "theme", "theme", schemaVersion, {
        themeConfig: snapshot.workspace.themeConfig,
      }),
    );
  }

  for (const agent of snapshot.workspace.agents) {
    rows.push(
      await makeProjectionRow(workspaceId, "agent", agent.id, schemaVersion, agent),
    );
    rows.push(
      await makeProjectionRow(workspaceId, "memory", agent.id, schemaVersion, {
        agentId: agent.id,
        contextNotes: agent.contextNotes,
        memory: agent.memory,
      }),
    );
    rows.push(
      await makeProjectionRow(workspaceId, "tool_state", agent.id, schemaVersion, {
        agentId: agent.id,
        tools: agent.tools,
      }),
    );

    if (agent.branchMetadata) {
      rows.push(
        await makeProjectionRow(workspaceId, "branch", agent.id, schemaVersion, {
          agentId: agent.id,
          branchMetadata: agent.branchMetadata,
        }),
      );
    }
  }

  return rows;
}

async function makeProjectionRow(
  workspaceId: string,
  entityType: WorkspaceStateEntityType,
  entityId: string,
  schemaVersion: number,
  payload: unknown,
): Promise<WorkspaceStateEntityUpsert> {
  return {
    checksum: await computeWorkspaceSnapshotChecksum(payload as Record<string, unknown>),
    entity_id: entityId,
    entity_type: entityType,
    payload,
    schema_version: schemaVersion,
    workspace_id: workspaceId,
  };
}

function entityKey(row: WorkspaceStateEntityUpsert) {
  return `${row.workspace_id}:${row.entity_type}:${row.entity_id}`;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `entity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

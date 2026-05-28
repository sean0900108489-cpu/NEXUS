import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  WorkspaceSnapshotInsert,
  Workspace_Snapshots,
} from "@/lib/supabase/database.types";
import type {
  WorkspaceCloudSnapshotPayload,
  WorkspaceCloudSnapshotType,
} from "@/lib/nexus-types";

export type WorkspaceSnapshotRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  schemaVersion: number;
  snapshotType: WorkspaceCloudSnapshotType;
  payload: WorkspaceCloudSnapshotPayload;
  checksum: string;
  payloadSizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export type InsertWorkspaceSnapshotInput = {
  workspaceId: string;
  userId: string;
  schemaVersion: number;
  snapshotType: WorkspaceCloudSnapshotType;
  payload: WorkspaceCloudSnapshotPayload;
  checksum: string;
  payloadSizeBytes: number;
};

export interface WorkspaceSnapshotRepository {
  insertSnapshot(input: InsertWorkspaceSnapshotInput): Promise<WorkspaceSnapshotRecord>;
  getLatestSnapshot(workspaceId: string): Promise<WorkspaceSnapshotRecord | null>;
  getLatestSnapshotForUser(userId: string): Promise<WorkspaceSnapshotRecord | null>;
  getLatestSnapshotForUserWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceSnapshotRecord | null>;
  listLatestSnapshotsForUser(userId: string, limit?: number): Promise<WorkspaceSnapshotRecord[]>;
  getLatestChecksum(workspaceId: string): Promise<string | null>;
  pruneActiveSnapshots(workspaceId: string, keep: number): Promise<number>;
}

export class InMemoryWorkspaceSnapshotRepository implements WorkspaceSnapshotRepository {
  private readonly snapshots: WorkspaceSnapshotRecord[] = [];

  async insertSnapshot(input: InsertWorkspaceSnapshotInput) {
    const now = new Date().toISOString();
    const record: WorkspaceSnapshotRecord = {
      checksum: input.checksum,
      createdAt: now,
      id: makeId(),
      payload: input.payload,
      payloadSizeBytes: input.payloadSizeBytes,
      schemaVersion: input.schemaVersion,
      snapshotType: input.snapshotType,
      updatedAt: now,
      userId: input.userId,
      workspaceId: input.workspaceId,
    };

    this.snapshots.push(record);

    return record;
  }

  async getLatestSnapshot(workspaceId: string) {
    return (
      this.snapshots
        .filter(
          (snapshot) =>
            snapshot.workspaceId === workspaceId &&
            ["active", "checkpoint"].includes(snapshot.snapshotType),
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
      null
    );
  }

  async getLatestSnapshotForUser(userId: string) {
    return (
      this.snapshots
        .filter(
          (snapshot) =>
            snapshot.userId === userId &&
            ["active", "checkpoint"].includes(snapshot.snapshotType),
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
      null
    );
  }

  async getLatestSnapshotForUserWorkspace(userId: string, workspaceId: string) {
    return (
      this.snapshots
        .filter(
          (snapshot) =>
            snapshot.userId === userId &&
            snapshot.workspaceId === workspaceId &&
            ["active", "checkpoint"].includes(snapshot.snapshotType),
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
      null
    );
  }

  async listLatestSnapshotsForUser(userId: string, limit = 25) {
    const latestByWorkspace = new Map<string, WorkspaceSnapshotRecord>();

    this.snapshots
      .filter(
        (snapshot) =>
          snapshot.userId === userId &&
          ["active", "checkpoint"].includes(snapshot.snapshotType),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .forEach((snapshot) => {
        if (!latestByWorkspace.has(snapshot.workspaceId)) {
          latestByWorkspace.set(snapshot.workspaceId, snapshot);
        }
      });

    return [...latestByWorkspace.values()].slice(0, Math.max(1, limit));
  }

  async getLatestChecksum(workspaceId: string) {
    return (await this.getLatestSnapshot(workspaceId))?.checksum ?? null;
  }

  async pruneActiveSnapshots(workspaceId: string, keep: number) {
    const active = this.snapshots
      .filter(
        (snapshot) =>
          snapshot.workspaceId === workspaceId && snapshot.snapshotType === "active",
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const pruneIds = new Set(active.slice(Math.max(0, keep)).map((snapshot) => snapshot.id));
    const before = this.snapshots.length;

    for (let index = this.snapshots.length - 1; index >= 0; index -= 1) {
      if (pruneIds.has(this.snapshots[index]?.id ?? "")) {
        this.snapshots.splice(index, 1);
      }
    }

    return before - this.snapshots.length;
  }
}

export class SupabaseWorkspaceSnapshotRepository implements WorkspaceSnapshotRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insertSnapshot(input: InsertWorkspaceSnapshotInput) {
    const row: WorkspaceSnapshotInsert = {
      checksum: input.checksum,
      payload: input.payload,
      payload_size_bytes: input.payloadSizeBytes,
      schema_version: input.schemaVersion,
      snapshot_type: input.snapshotType,
      user_id: input.userId,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapSnapshot(data);
  }

  async getLatestSnapshot(workspaceId: string) {
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("snapshot_type", ["active", "checkpoint"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSnapshot(data) : null;
  }

  async getLatestSnapshotForUser(userId: string) {
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .select("*")
      .eq("user_id", userId)
      .in("snapshot_type", ["active", "checkpoint"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSnapshot(data) : null;
  }

  async getLatestSnapshotForUserWorkspace(userId: string, workspaceId: string) {
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .in("snapshot_type", ["active", "checkpoint"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSnapshot(data) : null;
  }

  async listLatestSnapshotsForUser(userId: string, limit = 25) {
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .select("*")
      .eq("user_id", userId)
      .in("snapshot_type", ["active", "checkpoint"])
      .order("updated_at", { ascending: false })
      .limit(Math.max(1, limit) * 5);

    if (error) {
      throw new Error(error.message);
    }

    const latestByWorkspace = new Map<string, WorkspaceSnapshotRecord>();

    (data ?? []).map(mapSnapshot).forEach((snapshot) => {
      if (!latestByWorkspace.has(snapshot.workspaceId)) {
        latestByWorkspace.set(snapshot.workspaceId, snapshot);
      }
    });

    return [...latestByWorkspace.values()].slice(0, Math.max(1, limit));
  }

  async getLatestChecksum(workspaceId: string) {
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .select("checksum")
      .eq("workspace_id", workspaceId)
      .in("snapshot_type", ["active", "checkpoint"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data?.checksum ?? null;
  }

  async pruneActiveSnapshots(workspaceId: string, keep: number) {
    const { data, error } = await this.client
      .from("workspace_snapshots")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("snapshot_type", "active")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const idsToDelete = (data ?? []).slice(Math.max(0, keep)).map((row) => row.id);

    if (idsToDelete.length === 0) {
      return 0;
    }

    const { data: deleted, error: deleteError } = await this.client
      .from("workspace_snapshots")
      .delete()
      .in("id", idsToDelete)
      .select("id");

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return deleted?.length ?? 0;
  }
}

const inMemoryWorkspaceSnapshotRepository = new InMemoryWorkspaceSnapshotRepository();

export function createWorkspaceSnapshotRepository(): WorkspaceSnapshotRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseWorkspaceSnapshotRepository(getNexusSupabaseAdminClient())
    : inMemoryWorkspaceSnapshotRepository;
}

function mapSnapshot(row: Workspace_Snapshots): WorkspaceSnapshotRecord {
  return {
    checksum: row.checksum,
    createdAt: row.created_at,
    id: row.id,
    payload: row.payload,
    payloadSizeBytes: row.payload_size_bytes,
    schemaVersion: row.schema_version,
    snapshotType: row.snapshot_type,
    updatedAt: row.updated_at,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  };
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

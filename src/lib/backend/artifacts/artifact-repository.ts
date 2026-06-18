import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ArtifactRecord,
  ArtifactReferenceRecord,
  ArtifactStatus,
  ArtifactVaultRecord,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import { createNexusSupabaseRequestClient } from "@/lib/supabase/request";
import type {
  ArtifactInsert,
  ArtifactReferenceInsert,
  Artifact_References,
  Artifacts,
  Database,
} from "@/lib/supabase/database.types";

export type InsertArtifactInput = {
  id: string;
  workspaceId: string;
  title?: string | null;
  type: string;
  contentText?: string | null;
  contentUrl: string;
  contentHash: string;
  contentSizeBytes: number;
  mimeType: string;
  previewText: string;
  sourceMessageId?: string | null;
  sourceAgentId?: string | null;
  sourceTaskId?: string | null;
  sourceToolRunId?: string | null;
  metadata?: Record<string, unknown>;
  version: number;
  rootArtifactId?: string | null;
  parentArtifactId?: string | null;
  status?: ArtifactStatus;
  createdBy?: string | null;
};

export type ArtifactListQuery = {
  workspaceId: string;
  type?: string | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
};

export type InsertArtifactReferenceInput = {
  id: string;
  workspaceId: string;
  artifactId: string;
  referencedByType: ArtifactReferenceRecord["referencedByType"];
  referencedById: string;
};

export interface ArtifactRepository {
  insertArtifact(input: InsertArtifactInput): Promise<ArtifactRecord>;
  findArtifactById(id: string): Promise<ArtifactRecord | null>;
  listArtifacts(query: ArtifactListQuery): Promise<ArtifactVaultRecord[]>;
  archiveArtifact(id: string): Promise<ArtifactRecord>;
  insertReference(input: InsertArtifactReferenceInput): Promise<{
    deduplicated: boolean;
    reference: ArtifactReferenceRecord;
  }>;
  listReferencesForArtifact(artifactId: string): Promise<ArtifactReferenceRecord[]>;
}

export class InMemoryArtifactRepository implements ArtifactRepository {
  private readonly artifacts = new Map<string, ArtifactRecord>();
  private readonly references = new Map<string, ArtifactReferenceRecord>();

  async insertArtifact(input: InsertArtifactInput) {
    const now = new Date().toISOString();
    const artifact: ArtifactRecord = {
      contentHash: input.contentHash,
      contentSizeBytes: input.contentSizeBytes,
      contentText: input.contentText ?? null,
      contentUrl: input.contentUrl,
      createdAt: now,
      id: input.id,
      metadata: input.metadata ?? {},
      mimeType: input.mimeType,
      parentArtifactId: input.parentArtifactId ?? null,
      previewText: input.previewText,
      rootArtifactId: input.rootArtifactId ?? input.id,
      sourceAgentId: input.sourceAgentId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      sourceTaskId: input.sourceTaskId ?? null,
      sourceToolRunId: input.sourceToolRunId ?? null,
      status: input.status ?? "saved",
      title: input.title ?? null,
      type: input.type,
      updatedAt: now,
      version: input.version,
      workspaceId: input.workspaceId,
    };

    this.artifacts.set(artifact.id, artifact);

    return artifact;
  }

  async findArtifactById(id: string) {
    return this.artifacts.get(id) ?? null;
  }

  async listArtifacts(query: ArtifactListQuery) {
    const q = query.q?.toLowerCase().trim();

    return [...this.artifacts.values()]
      .filter((artifact) => artifact.workspaceId === query.workspaceId)
      .filter((artifact) => !query.type || artifact.type === query.type)
      .filter((artifact) => artifact.status !== "deleted")
      .filter((artifact) => !query.cursor || artifact.createdAt < query.cursor)
      .filter((artifact) => {
        if (!q) {
          return true;
        }

        return [
          artifact.title,
          artifact.previewText,
          artifact.type,
          artifact.mimeType,
        ].some((value) => value?.toLowerCase().includes(q));
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, query.limit ?? 50)
      .map(toVaultRecord);
  }

  async archiveArtifact(id: string) {
    const current = this.artifacts.get(id);

    if (!current) {
      throw new Error("artifact not found");
    }

    const next: ArtifactRecord = {
      ...current,
      status: "archived",
      updatedAt: new Date().toISOString(),
    };

    this.artifacts.set(id, next);

    return next;
  }

  async insertReference(input: InsertArtifactReferenceInput) {
    const key = referenceKey(input);
    const existing = this.references.get(key);

    if (existing) {
      return {
        deduplicated: true,
        reference: existing,
      };
    }

    const reference: ArtifactReferenceRecord = {
      artifactId: input.artifactId,
      createdAt: new Date().toISOString(),
      id: input.id,
      referencedById: input.referencedById,
      referencedByType: input.referencedByType,
      workspaceId: input.workspaceId,
    };

    this.references.set(key, reference);

    return {
      deduplicated: false,
      reference,
    };
  }

  async listReferencesForArtifact(artifactId: string) {
    return [...this.references.values()].filter(
      (reference) => reference.artifactId === artifactId,
    );
  }
}

export class SupabaseArtifactRepository implements ArtifactRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insertArtifact(input: InsertArtifactInput) {
    const row: ArtifactInsert = {
      content_hash: input.contentHash,
      content_size_bytes: input.contentSizeBytes,
      content_text: input.contentText ?? null,
      content_url: input.contentUrl,
      created_by: input.createdBy ?? null,
      id: input.id,
      metadata: input.metadata ?? {},
      mime_type: input.mimeType,
      parent_artifact_id: input.parentArtifactId ?? null,
      preview_text: input.previewText,
      root_artifact_id: input.rootArtifactId ?? input.id,
      source_agent_id: input.sourceAgentId ?? null,
      source_message_id: input.sourceMessageId ?? null,
      source_task_id: input.sourceTaskId ?? null,
      source_tool_run_id: input.sourceToolRunId ?? null,
      status: input.status ?? "saved",
      title: input.title ?? null,
      type: input.type,
      version: input.version,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("artifacts")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapArtifact(data);
  }

  async findArtifactById(id: string) {
    const { data, error } = await this.client
      .from("artifacts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapArtifact(data) : null;
  }

  async listArtifacts(query: ArtifactListQuery) {
    let request = this.client
      .from("artifacts")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(query.limit ?? 50);

    if (query.type) {
      request = request.eq("type", query.type);
    }

    if (query.cursor) {
      request = request.lt("created_at", query.cursor);
    }

    if (query.q?.trim()) {
      const term = escapeIlike(query.q.trim());
      request = request.or(`title.ilike.%${term}%,preview_text.ilike.%${term}%,type.ilike.%${term}%`);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => toVaultRecord(mapArtifact(row)));
  }

  async archiveArtifact(id: string) {
    const { data, error } = await this.client
      .from("artifacts")
      .update({
        status: "archived",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapArtifact(data);
  }

  async insertReference(input: InsertArtifactReferenceInput) {
    const existing = await this.findReference(input);

    if (existing) {
      return {
        deduplicated: true,
        reference: existing,
      };
    }

    const row: ArtifactReferenceInsert = {
      artifact_id: input.artifactId,
      id: input.id,
      referenced_by_id: input.referencedById,
      referenced_by_type: input.referencedByType,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("artifact_references")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      deduplicated: false,
      reference: mapReference(data),
    };
  }

  async listReferencesForArtifact(artifactId: string) {
    const { data, error } = await this.client
      .from("artifact_references")
      .select("*")
      .eq("artifact_id", artifactId);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapReference);
  }

  private async findReference(input: InsertArtifactReferenceInput) {
    const { data, error } = await this.client
      .from("artifact_references")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("artifact_id", input.artifactId)
      .eq("referenced_by_type", input.referencedByType)
      .eq("referenced_by_id", input.referencedById)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapReference(data) : null;
  }
}

const inMemoryArtifactRepository = new InMemoryArtifactRepository();

export type CreateArtifactRepositoryOptions = {
  accessToken?: string | null;
};

export function createArtifactRepository(
  options: CreateArtifactRepositoryOptions = {},
): ArtifactRepository {
  if (hasSupabaseServiceRoleConfig()) {
    return new SupabaseArtifactRepository(getNexusSupabaseAdminClient());
  }

  const requestClient = createNexusSupabaseRequestClient(options.accessToken);

  if (requestClient) {
    return new SupabaseArtifactRepository(requestClient);
  }

  return inMemoryArtifactRepository;
}

export function toVaultRecord(artifact: ArtifactRecord): ArtifactVaultRecord {
  // P0-3: Never return base64 data URLs in list responses.
  const contentUrl =
    artifact.contentUrl && artifact.contentUrl.startsWith("data:")
      ? null
      : artifact.contentUrl;

  return {
    contentHash: artifact.contentHash,
    contentSizeBytes: artifact.contentSizeBytes,
    contentUrl,
    createdAt: artifact.createdAt,
    id: artifact.id,
    mimeType: artifact.mimeType,
    parentArtifactId: artifact.parentArtifactId,
    previewText: artifact.previewText,
    rootArtifactId: artifact.rootArtifactId,
    sourceAgentId: artifact.sourceAgentId,
    sourceMessageId: artifact.sourceMessageId,
    sourceTaskId: artifact.sourceTaskId,
    sourceToolRunId: artifact.sourceToolRunId,
    status: artifact.status,
    title: artifact.title,
    type: artifact.type,
    updatedAt: artifact.updatedAt,
    version: artifact.version,
    workspaceId: artifact.workspaceId,
  };
}

function mapArtifact(row: Artifacts): ArtifactRecord {
  return {
    contentHash: row.content_hash,
    contentSizeBytes: row.content_size_bytes,
    contentText: row.content_text,
    contentUrl: row.content_url,
    createdAt: row.created_at,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    mimeType: row.mime_type,
    parentArtifactId: row.parent_artifact_id,
    previewText: row.preview_text,
    rootArtifactId: row.root_artifact_id,
    sourceAgentId: row.source_agent_id,
    sourceMessageId: row.source_message_id,
    sourceTaskId: row.source_task_id,
    sourceToolRunId: row.source_tool_run_id,
    status: row.status ?? "saved",
    title: row.title,
    type: row.type,
    updatedAt: row.updated_at,
    version: row.version ?? 1,
    workspaceId: row.workspace_id,
  };
}

function mapReference(row: Artifact_References): ArtifactReferenceRecord {
  return {
    artifactId: row.artifact_id,
    createdAt: row.created_at,
    id: row.id,
    referencedById: row.referenced_by_id,
    referencedByType: row.referenced_by_type,
    workspaceId: row.workspace_id,
  };
}

function referenceKey(input: InsertArtifactReferenceInput) {
  return [
    input.workspaceId,
    input.artifactId,
    input.referencedByType,
    input.referencedById,
  ].join("\u0000");
}

function escapeIlike(value: string) {
  return value.replace(/[%_,]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

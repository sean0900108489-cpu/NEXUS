import type {
  ArtifactArchiveResponse,
  ArtifactCreateResponse,
  ArtifactGetResponse,
  ArtifactListResponse,
  ArtifactReferenceCreateRequest,
  ArtifactReferenceCreateResponse,
  ArtifactVersionCreateRequest,
  ArtifactVersionCreateResponse,
  CreateArtifactRequest,
} from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { emitBackendEvent } from "../observability/events";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import { ArtifactMaterializer } from "./artifact-materializer";
import {
  createArtifactRepository,
  toVaultRecord,
  type ArtifactListQuery,
  type ArtifactRepository,
} from "./artifact-repository";
import { ArtifactReferenceResolver } from "./artifact-reference-resolver";

export type ArtifactServiceContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export type ArtifactServiceDependencies = {
  repository?: ArtifactRepository;
  materializer?: ArtifactMaterializer;
  secretBoundaryService?: SecretBoundaryService;
};

export class ArtifactService {
  private readonly repository: ArtifactRepository;
  private readonly materializer: ArtifactMaterializer;
  private readonly referenceResolver: ArtifactReferenceResolver;
  private readonly secretBoundaryService: SecretBoundaryService;

  constructor(dependencies: ArtifactServiceDependencies = {}) {
    this.repository = dependencies.repository ?? createArtifactRepository();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
    this.materializer =
      dependencies.materializer ?? new ArtifactMaterializer(this.secretBoundaryService);
    this.referenceResolver = new ArtifactReferenceResolver(this.repository);
  }

  async createArtifact(
    input: CreateArtifactRequest,
    context: ArtifactServiceContext = {},
  ): Promise<ArtifactCreateResponse> {
    const id = makeUuid();
    const materialized = await this.materializer.materialize(input);
    const artifact = await this.repository.insertArtifact({
      contentHash: materialized.contentHash,
      contentSizeBytes: materialized.contentSizeBytes,
      contentText: materialized.contentText,
      contentUrl: materialized.contentUrl,
      createdBy: context.userId ?? null,
      id,
      metadata: materialized.metadata,
      mimeType: materialized.mimeType,
      previewText: materialized.previewText,
      rootArtifactId: id,
      sourceAgentId: input.sourceAgentId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      sourceTaskId: input.sourceTaskId ?? null,
      sourceToolRunId: input.sourceToolRunId ?? null,
      status: "saved",
      title: input.title?.trim() || defaultTitle(input.type),
      type: input.type,
      version: 1,
      workspaceId: input.workspaceId,
    });

    await this.emitArtifactEvent("artifact.created", artifact, context);

    return { artifact };
  }

  async listArtifacts(query: ArtifactListQuery): Promise<ArtifactListResponse> {
    const limit = clampLimit(query.limit);
    const artifacts = await this.repository.listArtifacts({
      ...query,
      limit: limit + 1,
    });
    const page = artifacts.slice(0, limit);
    const last = page[page.length - 1];

    return {
      artifacts: page,
      hasMore: artifacts.length > limit,
      nextCursor: artifacts.length > limit ? last?.createdAt ?? null : null,
      workspaceId: query.workspaceId,
    };
  }

  async getArtifact(
    artifactId: string,
    input: { workspaceId: string },
  ): Promise<ArtifactGetResponse> {
    const artifact = await this.requireArtifact(artifactId, input.workspaceId);

    return { artifact };
  }

  async createReference(
    artifactId: string,
    input: ArtifactReferenceCreateRequest,
    context: ArtifactServiceContext = {},
  ): Promise<ArtifactReferenceCreateResponse> {
    await this.requireArtifact(artifactId, input.workspaceId);
    const response = await this.referenceResolver.createReference(artifactId, input);

    await this.emitReferenceEvent("artifact.reference.created", response.reference, context);

    return response;
  }

  async createVersion(
    artifactId: string,
    input: ArtifactVersionCreateRequest,
    context: ArtifactServiceContext = {},
  ): Promise<ArtifactVersionCreateResponse> {
    const parent = await this.requireArtifact(artifactId, input.workspaceId);
    const materialized = await this.materializer.materialize(input);
    const rootArtifactId = parent.rootArtifactId ?? parent.id;
    const artifact = await this.repository.insertArtifact({
      contentHash: materialized.contentHash,
      contentSizeBytes: materialized.contentSizeBytes,
      contentText: materialized.contentText,
      contentUrl: materialized.contentUrl,
      createdBy: context.userId ?? null,
      id: makeUuid(),
      metadata: materialized.metadata,
      mimeType: materialized.mimeType,
      parentArtifactId: parent.id,
      previewText: materialized.previewText,
      rootArtifactId,
      sourceAgentId: input.sourceAgentId ?? parent.sourceAgentId,
      sourceMessageId: input.sourceMessageId ?? parent.sourceMessageId,
      sourceTaskId: input.sourceTaskId ?? parent.sourceTaskId,
      sourceToolRunId: input.sourceToolRunId ?? parent.sourceToolRunId,
      status: "saved",
      title: input.title?.trim() || parent.title || defaultTitle(input.type),
      type: input.type || parent.type,
      version: parent.version + 1,
      workspaceId: input.workspaceId,
    });

    await this.emitArtifactEvent("artifact.version.created", artifact, context, {
      parentArtifactId: parent.id,
      rootArtifactId,
    });

    return {
      artifact,
      parentArtifactId: parent.id,
      rootArtifactId,
    };
  }

  async archiveArtifact(
    artifactId: string,
    input: { workspaceId: string },
    context: ArtifactServiceContext = {},
  ): Promise<ArtifactArchiveResponse> {
    await this.requireArtifact(artifactId, input.workspaceId);
    const artifact = await this.repository.archiveArtifact(artifactId);

    await this.emitArtifactEvent("artifact.archived", artifact, context);

    return { artifact };
  }

  async materializeToolRunOutput(
    input: CreateArtifactRequest & { sourceToolRunId: string },
    context: ArtifactServiceContext = {},
  ) {
    return this.createArtifact(
      {
        ...input,
        sourceToolRunId: input.sourceToolRunId,
      },
      context,
    );
  }

  private async requireArtifact(artifactId: string, workspaceId: string) {
    const artifact = await this.repository.findArtifactById(artifactId);

    if (!artifact || artifact.workspaceId !== workspaceId) {
      throw new ApiError("ARTIFACT_NOT_FOUND", "Artifact was not found.", 404);
    }

    return artifact;
  }

  private async emitArtifactEvent(
    name: string,
    artifact: Awaited<ReturnType<ArtifactRepository["findArtifactById"]>> & {},
    context: ArtifactServiceContext,
    extra: Record<string, unknown> = {},
  ) {
    if (!artifact) {
      return;
    }

    await this.emitSafeEvent(name, {
      ...extra,
      artifactId: artifact.id,
      artifactType: artifact.type,
      contentHash: artifact.contentHash,
      contentSizeBytes: artifact.contentSizeBytes,
      source: "artifact",
      sourceTaskId: artifact.sourceTaskId,
      sourceToolRunId: artifact.sourceToolRunId,
      status: artifact.status,
      workspaceId: artifact.workspaceId,
    }, context, artifact.workspaceId, artifact.id);
  }

  private async emitReferenceEvent(
    name: string,
    reference: Awaited<ReturnType<ArtifactReferenceResolver["createReference"]>>["reference"],
    context: ArtifactServiceContext,
  ) {
    await this.emitSafeEvent(name, {
      artifactId: reference.artifactId,
      referencedById: reference.referencedById,
      referencedByType: reference.referencedByType,
      source: "artifact",
      workspaceId: reference.workspaceId,
    }, context, reference.workspaceId, reference.artifactId);
  }

  private async emitSafeEvent(
    name: string,
    payload: Record<string, unknown>,
    context: ArtifactServiceContext,
    workspaceId: string,
    resourceId: string,
  ) {
    try {
      const redacted = this.secretBoundaryService.redact(payload);
      const safePayload = isRecord(redacted) ? redacted : {};

      this.secretBoundaryService.assertNoSecrets(safePayload);

      await emitBackendEvent({
        name,
        payload: safePayload,
        status: "succeeded",
        trace: {
          requestId: context.requestId ?? "request-unknown",
          resourceId,
          resourceType: "artifact",
          source: "artifact",
          traceId: context.traceId ?? "trace-unknown",
          userId: context.userId,
          workspaceId,
        },
      });
    } catch {
      // V8 uses only V0 minimal events; event failures must not affect writes.
    }
  }
}

export function createArtifactService(dependencies?: ArtifactServiceDependencies) {
  return new ArtifactService(dependencies);
}

export { toVaultRecord };

function defaultTitle(type: string) {
  return `${type || "artifact"} artifact`;
}

function clampLimit(limit?: number | null) {
  if (!limit || !Number.isFinite(limit)) {
    return 30;
  }

  return Math.min(100, Math.max(1, Math.floor(limit)));
}

function makeUuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

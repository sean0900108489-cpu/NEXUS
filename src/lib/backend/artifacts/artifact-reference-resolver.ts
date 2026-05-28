import type {
  ArtifactReferenceCreateRequest,
  ArtifactReferenceCreateResponse,
} from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";

import { isArtifactReferencedByType } from "./artifact-constants";
import type { ArtifactRepository } from "./artifact-repository";

export class ArtifactReferenceResolver {
  constructor(private readonly repository: ArtifactRepository) {}

  async createReference(
    artifactId: string,
    input: ArtifactReferenceCreateRequest,
  ): Promise<ArtifactReferenceCreateResponse> {
    if (!isArtifactReferencedByType(input.referencedByType)) {
      throw new ApiError(
        "ARTIFACT_REFERENCE_INVALID",
        "Artifact reference type is invalid.",
        400,
        {
          referencedByType: input.referencedByType,
        },
      );
    }

    if (!input.referencedById.trim()) {
      throw new ApiError(
        "ARTIFACT_REFERENCE_INVALID",
        "Artifact reference id is required.",
        400,
      );
    }

    const result = await this.repository.insertReference({
      artifactId,
      id: makeUuid(),
      referencedById: input.referencedById.trim(),
      referencedByType: input.referencedByType,
      workspaceId: input.workspaceId,
    });

    return result;
  }

  async resolveForArtifact(artifactId: string) {
    return this.repository.listReferencesForArtifact(artifactId);
  }

  getCascadePolicy() {
    return {
      deleteArtifactWhenSourceDeleted: false,
      deleteReferenceWhenSourceDeleted: true,
      policy: "retain_artifact_delete_reference_only",
    };
  }
}

function makeUuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

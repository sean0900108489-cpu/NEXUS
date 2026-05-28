import type { ArtifactReferencedByType, ArtifactStatus } from "@/lib/nexus-types";

export const ARTIFACT_CONTENT_TEXT_MAX_BYTES = 64 * 1024;
export const ARTIFACT_PREVIEW_TEXT_MAX_CHARS = 2_000;

export const ARTIFACT_STATUSES = [
  "draft",
  "saving",
  "saved",
  "indexed",
  "failed",
  "archived",
  "deleted",
] as const satisfies readonly ArtifactStatus[];

export const ARTIFACT_REFERENCED_BY_TYPES = [
  "message",
  "notebook",
  "prompt",
  "macro",
  "agent_memory",
  "tool_run",
] as const satisfies readonly ArtifactReferencedByType[];

export function isArtifactReferencedByType(
  value: string,
): value is ArtifactReferencedByType {
  return (ARTIFACT_REFERENCED_BY_TYPES as readonly string[]).includes(value);
}

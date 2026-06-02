import type { AgentCapabilityType, CreateArtifactRequest } from "@/lib/nexus-types";
import type { WorkspaceComposerAttachmentContentKind } from "./attachment-types";

export const NEXUS_ATTACHMENT_NOOP_COMPILER = {
  id: "nexus-attachment-noop-compiler-v1",
  version: "v1",
} as const;

export const NEXUS_ATTACHMENT_NOOP_TARGETS = [
  "chat",
  "image",
  "video",
] as const satisfies readonly AgentCapabilityType[];

export function createNoopAttachmentCompilerMetadata(input: {
  contentKind: WorkspaceComposerAttachmentContentKind;
  fileName: string;
  lastModified: number;
  sizeBytes: number;
  source: "workspace-composer";
}): NonNullable<CreateArtifactRequest["metadata"]> {
  return {
    attachmentCompiler: {
      compilerId: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      compilerVersion: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
      mode: "noop",
      output: input.contentKind === "text" ? "passthrough" : "passthrough-reference",
    },
    attachmentInput: {
      contentKind: input.contentKind,
      fileName: input.fileName,
      lastModified: input.lastModified,
      sizeBytes: input.sizeBytes,
      source: input.source,
    },
    targetCapabilities: [...NEXUS_ATTACHMENT_NOOP_TARGETS],
  };
}

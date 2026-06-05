import type { AgentCapabilityType, CreateArtifactRequest } from "@/lib/nexus-types";
import type { WorkspaceComposerAttachmentContentKind } from "./attachment-types";

export type NexusAttachmentCompilerLaneId =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "document"
  | "binary-reference";

export type NexusAttachmentCompilerMode =
  | "noop"
  | "extract-text"
  | "transcribe-audio"
  | "transcode-media"
  | "archive-expand";

export type NexusAttachmentCompilerOutput =
  | "passthrough"
  | "passthrough-reference"
  | "text"
  | "artifact-reference"
  | "asset-bundle";

export type NexusAttachmentCompilerLane = {
  acceptedMimeTypes: string[];
  defaultCompiler: {
    id: string;
    mode: NexusAttachmentCompilerMode;
    output: NexusAttachmentCompilerOutput;
    version: string;
  };
  futureAdapters: string[];
  id: NexusAttachmentCompilerLaneId;
  label: string;
  packetPolicy: {
    packageAs: "text" | "artifact-reference" | "asset-bundle";
    rawTextBehavior: "passthrough" | "reference-only";
  };
  status: "implemented" | "reserved";
  targetCapabilities: AgentCapabilityType[];
};

export type NexusAttachmentCompilerManifest = {
  lanes: Array<
    Pick<
      NexusAttachmentCompilerLane,
      | "acceptedMimeTypes"
      | "defaultCompiler"
      | "futureAdapters"
      | "id"
      | "label"
      | "packetPolicy"
      | "status"
      | "targetCapabilities"
    >
  >;
  schema: typeof NEXUS_ATTACHMENT_COMPILER_MANIFEST_SCHEMA;
};

export const NEXUS_ATTACHMENT_NOOP_COMPILER = {
  id: "nexus-attachment-noop-compiler-v1",
  version: "v1",
} as const;

export const NEXUS_ATTACHMENT_NOOP_TARGETS = [
  "chat",
  "image",
  "video",
] as const satisfies readonly AgentCapabilityType[];

export const NEXUS_ATTACHMENT_COMPILER_MANIFEST_SCHEMA =
  "nexus.attachmentCompilerManifest.v1";

export const NEXUS_ATTACHMENT_COMPILER_LANES = [
  {
    acceptedMimeTypes: ["text/*", "application/json", "application/xml"],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["markdown-normalizer", "csv-table-reader", "json-schema-extractor"],
    id: "text",
    label: "Text passthrough lane",
    packetPolicy: {
      packageAs: "text",
      rawTextBehavior: "passthrough",
    },
    status: "implemented",
    targetCapabilities: ["chat", "image", "video"],
  },
  {
    acceptedMimeTypes: ["image/*"],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough-reference",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["vision-caption", "image-to-prompt", "image-resize"],
    id: "image",
    label: "Image reference lane",
    packetPolicy: {
      packageAs: "artifact-reference",
      rawTextBehavior: "reference-only",
    },
    status: "implemented",
    targetCapabilities: ["chat", "image", "video"],
  },
  {
    acceptedMimeTypes: ["audio/*"],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough-reference",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["speech-to-text", "speaker-notes-extractor"],
    id: "audio",
    label: "Audio reference lane",
    packetPolicy: {
      packageAs: "artifact-reference",
      rawTextBehavior: "reference-only",
    },
    status: "reserved",
    targetCapabilities: ["chat", "image", "video", "audio"],
  },
  {
    acceptedMimeTypes: ["video/*"],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough-reference",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["video-transcode", "shot-list-extractor", "keyframe-extractor"],
    id: "video",
    label: "Video reference lane",
    packetPolicy: {
      packageAs: "asset-bundle",
      rawTextBehavior: "reference-only",
    },
    status: "reserved",
    targetCapabilities: ["chat", "image", "video"],
  },
  {
    acceptedMimeTypes: ["application/zip", "application/x-zip-compressed"],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough-reference",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["zip-expand", "package-indexer", "archive-security-scan"],
    id: "archive",
    label: "Archive reference lane",
    packetPolicy: {
      packageAs: "asset-bundle",
      rawTextBehavior: "reference-only",
    },
    status: "reserved",
    targetCapabilities: ["chat", "image", "video"],
  },
  {
    acceptedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough-reference",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["pdf-text-extractor", "docx-outline-extractor"],
    id: "document",
    label: "Document reference lane",
    packetPolicy: {
      packageAs: "artifact-reference",
      rawTextBehavior: "reference-only",
    },
    status: "reserved",
    targetCapabilities: ["chat", "image", "video"],
  },
  {
    acceptedMimeTypes: ["application/octet-stream", "*/*"],
    defaultCompiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      output: "passthrough-reference",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    futureAdapters: ["binary-classifier", "safe-preview-extractor"],
    id: "binary-reference",
    label: "Binary reference lane",
    packetPolicy: {
      packageAs: "artifact-reference",
      rawTextBehavior: "reference-only",
    },
    status: "reserved",
    targetCapabilities: ["chat", "image", "video"],
  },
] as const satisfies readonly NexusAttachmentCompilerLane[];

export function createAttachmentCompilerManifest(): NexusAttachmentCompilerManifest {
  return {
    lanes: NEXUS_ATTACHMENT_COMPILER_LANES.map((lane) => ({
      acceptedMimeTypes: [...lane.acceptedMimeTypes],
      defaultCompiler: { ...lane.defaultCompiler },
      futureAdapters: [...lane.futureAdapters],
      id: lane.id,
      label: lane.label,
      packetPolicy: { ...lane.packetPolicy },
      status: lane.status,
      targetCapabilities: [...lane.targetCapabilities],
    })),
    schema: NEXUS_ATTACHMENT_COMPILER_MANIFEST_SCHEMA,
  };
}

export function resolveAttachmentCompilerLane(input: {
  contentKind?: WorkspaceComposerAttachmentContentKind;
  mimeType?: string;
}) {
  const mimeType = input.mimeType?.trim().toLowerCase() || "";

  if (input.contentKind === "text") {
    return NEXUS_ATTACHMENT_COMPILER_LANES[0];
  }

  const exact = NEXUS_ATTACHMENT_COMPILER_LANES.find((lane) =>
    lane.acceptedMimeTypes.some((accepted) => accepted === mimeType),
  );

  if (exact) {
    return exact;
  }

  const wildcard = NEXUS_ATTACHMENT_COMPILER_LANES.find((lane) =>
    lane.acceptedMimeTypes.some(
      (accepted) => accepted.endsWith("/*") && mimeType.startsWith(accepted.slice(0, -1)),
    ),
  );

  return wildcard ?? NEXUS_ATTACHMENT_COMPILER_LANES.at(-1)!;
}

export function createAttachmentCompilerLaneSummary(
  attachments: Array<{
    contentKind?: WorkspaceComposerAttachmentContentKind;
    mimeType?: string;
  }>,
) {
  const lanes = new Map<NexusAttachmentCompilerLaneId, NexusAttachmentCompilerLane>();

  for (const attachment of attachments) {
    const lane = resolveAttachmentCompilerLane(attachment);
    lanes.set(lane.id, lane);
  }

  return [...lanes.values()].map((lane) => ({
    defaultCompiler: { ...lane.defaultCompiler },
    id: lane.id,
    label: lane.label,
    packetPolicy: { ...lane.packetPolicy },
    status: lane.status,
  }));
}

export function createNoopAttachmentCompilerMetadata(input: {
  contentKind: WorkspaceComposerAttachmentContentKind;
  fileName: string;
  lastModified: number;
  mimeType?: string;
  sizeBytes: number;
  source: "workspace-composer";
}): NonNullable<CreateArtifactRequest["metadata"]> {
  const lane = resolveAttachmentCompilerLane({
    contentKind: input.contentKind,
    mimeType: input.mimeType,
  });

  return {
    attachmentCompiler: {
      compilerId: lane.defaultCompiler.id,
      compilerVersion: lane.defaultCompiler.version,
      laneId: lane.id,
      mode: "noop",
      output: lane.defaultCompiler.output,
    },
    attachmentCompilerLane: {
      futureAdapters: [...lane.futureAdapters],
      id: lane.id,
      label: lane.label,
      packetPolicy: { ...lane.packetPolicy },
      status: lane.status,
    },
    attachmentInput: {
      contentKind: input.contentKind,
      fileName: input.fileName,
      lastModified: input.lastModified,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      source: input.source,
    },
    targetCapabilities: [...lane.targetCapabilities],
  };
}

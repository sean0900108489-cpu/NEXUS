import type { FileNodeAttachmentReference } from "@/lib/nexus-types";

import {
  createAttachmentCompilerLaneSummary,
  resolveAttachmentCompilerLane,
  type NexusAttachmentCompilerLaneId,
} from "./attachment-compiler-registry";

export const NEXUS_ATTACHMENT_COMPILER_EXECUTION_SCHEMA =
  "nexus.attachmentCompilerExecution.v1";

export type AttachmentCompilerExecutionResultStatus =
  | "passthrough"
  | "reference-only"
  | "skipped";

export type AttachmentCompilerExecutionResult = {
  artifactId?: string;
  compiledArtifactId?: string;
  compilerId: string;
  compilerVersion: string;
  contentKind: FileNodeAttachmentReference["contentKind"];
  futureAdapters: string[];
  laneId: NexusAttachmentCompilerLaneId;
  message: string;
  mimeType: string;
  name: string;
  packetPolicy: {
    packageAs: "text" | "artifact-reference" | "asset-bundle";
    rawTextBehavior: "passthrough" | "reference-only";
  };
  rawArtifactId?: string;
  sizeBytes: number;
  status: AttachmentCompilerExecutionResultStatus;
};

export type AttachmentCompilerExecutionReport = {
  attachmentCount: number;
  displayText: string;
  lanes: ReturnType<typeof createAttachmentCompilerLaneSummary>;
  rawText: string;
  results: AttachmentCompilerExecutionResult[];
  schema: typeof NEXUS_ATTACHMENT_COMPILER_EXECUTION_SCHEMA;
  status: "empty" | "processed";
};

export async function runAttachmentCompilerPipeline(input: {
  attachments: FileNodeAttachmentReference[];
  upstreamRawText: string;
}): Promise<AttachmentCompilerExecutionReport> {
  const lanes = createAttachmentCompilerLaneSummary(input.attachments);

  if (!input.attachments.length) {
    return {
      attachmentCount: 0,
      displayText: "Attachment compiler pipeline skipped: no attachment references.",
      lanes,
      rawText: input.upstreamRawText,
      results: [],
      schema: NEXUS_ATTACHMENT_COMPILER_EXECUTION_SCHEMA,
      status: "empty",
    };
  }

  const results = input.attachments.map(createAttachmentCompilerResult);
  const summary = summarizeCompilerResults(results);

  return {
    attachmentCount: input.attachments.length,
    displayText: `Attachment compiler pipeline processed ${input.attachments.length} reference${input.attachments.length === 1 ? "" : "s"}: ${summary}.`,
    lanes,
    rawText: input.upstreamRawText,
    results,
    schema: NEXUS_ATTACHMENT_COMPILER_EXECUTION_SCHEMA,
    status: "processed",
  };
}

function createAttachmentCompilerResult(
  attachment: FileNodeAttachmentReference,
): AttachmentCompilerExecutionResult {
  const lane = resolveAttachmentCompilerLane({
    contentKind: attachment.contentKind === "text" ? "text" : attachment.contentKind,
    mimeType: attachment.mimeType,
  });
  const status =
    lane.packetPolicy.rawTextBehavior === "passthrough" ? "passthrough" : "reference-only";
  const futureAdapters = [...lane.futureAdapters];

  return {
    ...(attachment.artifactId ? { artifactId: attachment.artifactId } : {}),
    ...(attachment.compiledArtifactId
      ? { compiledArtifactId: attachment.compiledArtifactId }
      : {}),
    compilerId: attachment.compilerId || lane.defaultCompiler.id,
    compilerVersion: attachment.compilerVersion || lane.defaultCompiler.version,
    contentKind: attachment.contentKind,
    futureAdapters,
    laneId: lane.id,
    message: createCompilerResultMessage({
      futureAdapters,
      laneId: lane.id,
      status,
    }),
    mimeType: attachment.mimeType,
    name: attachment.name,
    packetPolicy: { ...lane.packetPolicy },
    ...(attachment.rawArtifactId ? { rawArtifactId: attachment.rawArtifactId } : {}),
    sizeBytes: attachment.sizeBytes,
    status,
  };
}

function createCompilerResultMessage(input: {
  futureAdapters: string[];
  laneId: NexusAttachmentCompilerLaneId;
  status: AttachmentCompilerExecutionResultStatus;
}) {
  if (input.status === "passthrough") {
    return "Text-safe attachment reference passed through the compiler boundary.";
  }

  const adapters = input.futureAdapters.length
    ? ` Future adapters: ${input.futureAdapters.join(", ")}.`
    : "";

  return `${input.laneId} attachment carried as a reference-only compiler result.${adapters}`;
}

function summarizeCompilerResults(results: AttachmentCompilerExecutionResult[]) {
  const counts = new Map<string, number>();

  for (const result of results) {
    const key = `${result.laneId}/${result.status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => `${key} x${count}`)
    .join(", ");
}

import type { AgentCapabilityType } from "@/lib/nexus-types";

export type WorkspaceAttachmentInputActionId =
  | "upload-image"
  | "upload-file"
  | "artifact-vault-reference"
  | "notebook-context"
  | "sandbox-output";

export type WorkspaceAttachmentInputActionStatus = "implemented" | "placeholder";

export type WorkspaceAttachmentInputAction = {
  detail: string;
  id: WorkspaceAttachmentInputActionId;
  label: string;
  status: WorkspaceAttachmentInputActionStatus;
};

export type WorkspaceComposerAttachmentStatus = "ready" | "uploading" | "error";
export type WorkspaceComposerAttachmentContentKind = "text" | "binary" | "reference";

export type WorkspaceComposerAttachment = {
  artifactId?: string;
  compilerId: string;
  compilerVersion: string;
  compiledArtifactId?: string;
  contentKind: WorkspaceComposerAttachmentContentKind;
  contentUrl?: string;
  error?: string;
  id: string;
  mimeType: string;
  name: string;
  previewText: string;
  rawArtifactId?: string;
  sizeBytes: number;
  status: WorkspaceComposerAttachmentStatus;
  targetCapabilities: AgentCapabilityType[];
  textContent?: string;
};

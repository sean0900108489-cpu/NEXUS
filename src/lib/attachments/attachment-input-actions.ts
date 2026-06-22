import type { WorkspaceAttachmentInputAction } from "./attachment-types";

/** Workspace composer attachment input actions.
 *  Only "implemented" actions are shown; "placeholder" actions are hidden
 *  until their backend integration is complete (S11 spec: §9). */
export const WORKSPACE_ATTACHMENT_INPUT_ACTIONS = [
  {
    detail: "Upload an image (PNG, JPEG, WebP) as a composer attachment.",
    id: "upload-image",
    label: "Upload image",
    status: "implemented",
  },
  {
    detail: "Upload a file (PDF, TXT, MD, CSV) as a composer attachment.",
    id: "upload-file",
    label: "Upload file",
    status: "implemented",
  },
  {
    detail: "Reserved for attaching an existing Artifact Vault record.",
    id: "artifact-vault-reference",
    label: "Vault Reference",
    status: "placeholder",
  },
  {
    detail: "Reserved for attaching notebook context.",
    id: "notebook-context",
    label: "Notebook Context",
    status: "placeholder",
  },
  {
    detail: "Reserved for attaching the latest sandbox output.",
    id: "sandbox-output",
    label: "Sandbox Output",
    status: "placeholder",
  },
] as const satisfies readonly WorkspaceAttachmentInputAction[];

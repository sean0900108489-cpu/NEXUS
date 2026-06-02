import type { WorkspaceAttachmentInputAction } from "./attachment-types";

export const WORKSPACE_ATTACHMENT_INPUT_ACTIONS = [
  {
    detail: "Create a backend artifact with a no-op compiler reference.",
    id: "local-file-upload",
    label: "Attach file",
    status: "implemented",
  },
  {
    detail: "Reserved for attaching an existing Artifact Vault record.",
    id: "artifact-vault-reference",
    label: "Vault reference",
    status: "placeholder",
  },
  {
    detail: "Reserved for attaching notebook context.",
    id: "notebook-context",
    label: "Notebook context",
    status: "placeholder",
  },
  {
    detail: "Reserved for attaching the latest sandbox output.",
    id: "sandbox-output",
    label: "Sandbox output",
    status: "placeholder",
  },
] as const satisfies readonly WorkspaceAttachmentInputAction[];

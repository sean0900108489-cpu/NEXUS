import {
  NEXUS_ATTACHMENT_NOOP_COMPILER,
  NEXUS_ATTACHMENT_NOOP_TARGETS,
} from "@/lib/attachments/attachment-compiler-registry";
import { WORKSPACE_ATTACHMENT_INPUT_ACTIONS } from "@/lib/attachments/attachment-input-actions";
import type { AgentCapabilityType } from "@/lib/nexus-types";

export type WorkflowProFileNodeContract = {
  acceptedMimeTypes: string[];
  compiler: {
    id: string;
    mode: "noop";
    version: string;
  };
  inputActions: Array<{
    id: string;
    label: string;
    status: "implemented" | "placeholder";
  }>;
  packetAttachmentPolicy: {
    output: "ContextPacket attachment reference";
    rawTextBehavior: "text passthrough when safe, artifact reference otherwise";
  };
  rationale: string;
  targetCapabilities: AgentCapabilityType[];
  type: "node.file";
};

export function createWorkflowProFileNodeContract(): WorkflowProFileNodeContract {
  return {
    acceptedMimeTypes: [
      "text/*",
      "application/json",
      "application/xml",
      "image/*",
      "video/*",
      "audio/*",
      "application/zip",
      "application/pdf",
      "application/octet-stream",
    ],
    compiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    inputActions: WORKSPACE_ATTACHMENT_INPUT_ACTIONS.map((action) => ({
      id: action.id,
      label: action.label,
      status: action.status,
    })),
    packetAttachmentPolicy: {
      output: "ContextPacket attachment reference",
      rawTextBehavior: "text passthrough when safe, artifact reference otherwise",
    },
    rationale:
      "Workflow Pro file nodes should carry raw artifacts through a compiler boundary before packaging attachment references into downstream ContextPackets.",
    targetCapabilities: [...NEXUS_ATTACHMENT_NOOP_TARGETS],
    type: "node.file",
  };
}

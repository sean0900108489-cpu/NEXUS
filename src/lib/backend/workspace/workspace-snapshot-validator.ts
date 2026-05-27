import {
  CAPABILITY_REGISTRY,
  GRAPH_NODE_REGISTRY,
  NEXUS_MODEL_CATALOG,
  TOOL_SLOT_REGISTRY,
} from "@/lib/nexus-registry";
import type {
  WorkspaceCloudSnapshotPayload,
  WorkspaceCloudSnapshotType,
} from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import {
  calculateWorkspaceSnapshotPayloadSizeBytes,
  MAX_WORKSPACE_SNAPSHOT_BYTES,
  WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION,
} from "./workspace-snapshot-serializer";

export type WorkspaceSnapshotValidationInput = {
  payload: WorkspaceCloudSnapshotPayload;
  snapshotType: WorkspaceCloudSnapshotType;
  workspaceId: string;
  schemaVersion: number;
};

const validModelIds = new Set(NEXUS_MODEL_CATALOG.map((model) => model.id));
const validGraphNodeTypes = new Set(Object.keys(GRAPH_NODE_REGISTRY));
const validToolSlotIds = new Set([
  ...Object.keys(TOOL_SLOT_REGISTRY),
  ...Object.values(CAPABILITY_REGISTRY).flatMap((entry) => entry.toolSlots),
]);

export class WorkspaceSnapshotValidator {
  constructor(private readonly secretBoundaryService = new SecretBoundaryService()) {}

  validate(input: WorkspaceSnapshotValidationInput) {
    const { payload, schemaVersion, snapshotType, workspaceId } = input;

    if (
      schemaVersion !== WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION ||
      payload.schemaVersion !== WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION
    ) {
      throw new ApiError(
        "WORKSPACE_STATE_SCHEMA_MISMATCH",
        "Workspace state schema version is not supported.",
        400,
        {
          schemaVersion,
          supportedSchemaVersion: WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION,
        },
      );
    }

    if (payload.workspace.id !== workspaceId) {
      throw new ApiError(
        "WORKSPACE_STATE_SCHEMA_MISMATCH",
        "Workspace snapshot does not match the route workspace.",
        400,
        {
          payloadWorkspaceId: payload.workspace.id,
          routeWorkspaceId: workspaceId,
        },
      );
    }

    const payloadSizeBytes = calculateWorkspaceSnapshotPayloadSizeBytes(payload);

    if (payloadSizeBytes > MAX_WORKSPACE_SNAPSHOT_BYTES) {
      throw new ApiError(
        "WORKSPACE_SNAPSHOT_TOO_LARGE",
        "Workspace snapshot exceeds the allowed payload size.",
        413,
        {
          maxPayloadSizeBytes: MAX_WORKSPACE_SNAPSHOT_BYTES,
          payloadSizeBytes,
        },
      );
    }

    const secretScan = this.secretBoundaryService.scanForSecrets(payload);

    if (secretScan.hasSecrets) {
      throw new ApiError(
        "WORKSPACE_STATE_SECRET_DETECTED",
        "Workspace state contains a secret and was rejected.",
        400,
        {
          matchCount: secretScan.matches.length,
          redactionStatus: "redacted",
        },
      );
    }

    this.rejectUnboundedOrBinaryPayload(payload);

    if (snapshotType === "imported") {
      this.validateImportedRegistryReferences(payload);
    }

    return {
      payloadSizeBytes,
    };
  }

  private validateImportedRegistryReferences(payload: WorkspaceCloudSnapshotPayload) {
    for (const agent of payload.workspace.agents) {
      if (!validModelIds.has(agent.model)) {
        throw invalidRegistryReference(["workspace", "agents", agent.id, "model"], agent.model);
      }

      for (const modelId of agent.capabilities.supportedModels) {
        if (!validModelIds.has(modelId)) {
          throw invalidRegistryReference(
            ["workspace", "agents", agent.id, "capabilities", "supportedModels"],
            modelId,
          );
        }
      }

      for (const tool of agent.tools) {
        if (tool.executorId && !validToolSlotIds.has(tool.executorId)) {
          throw invalidRegistryReference(
            ["workspace", "agents", agent.id, "tools", tool.id, "executorId"],
            tool.executorId,
          );
        }
      }
    }

    for (const node of payload.workspace.graph.nodes) {
      const nodeType = node.nodeType ?? "agent-node";

      if (!validGraphNodeTypes.has(nodeType)) {
        throw invalidRegistryReference(["workspace", "graph", "nodes", node.agentId], nodeType);
      }
    }
  }

  private rejectUnboundedOrBinaryPayload(payload: WorkspaceCloudSnapshotPayload) {
    const violations: Array<{ path: string; reason: string }> = [];
    scanForDisallowedPayload(payload, "$", violations);

    if (violations.length > 0) {
      throw new ApiError(
        "WORKSPACE_STATE_SCHEMA_MISMATCH",
        "Workspace snapshot contains disallowed unbounded or binary payload.",
        400,
        {
          violations: violations.slice(0, 8),
        },
      );
    }
  }
}

function invalidRegistryReference(path: Array<string | number>, value: string) {
  return new ApiError(
    "WORKSPACE_STATE_INVALID_REGISTRY_REFERENCE",
    "Workspace state references an unknown registry id.",
    400,
    {
      path,
      value,
    },
  );
}

function scanForDisallowedPayload(
  value: unknown,
  path: string,
  violations: Array<{ path: string; reason: string }>,
) {
  if (typeof value === "string") {
    if (isBinaryLikeDataUrl(value)) {
      violations.push({ path, reason: "binary_or_data_url" });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanForDisallowedPayload(item, `${path}[${index}]`, violations);
    });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nextPath = `${path}.${key}`;

    if (
      Array.isArray(nextValue) &&
      (normalizedKey === "messages" || normalizedKey.includes("transcript")) &&
      nextValue.some((item) => isRecord(item) && typeof item.content === "string")
    ) {
      violations.push({ path: nextPath, reason: "unbounded_transcript" });
      continue;
    }

    if (
      normalizedKey.includes("artifact") &&
      typeof nextValue === "string" &&
      isBinaryLikeDataUrl(nextValue)
    ) {
      violations.push({ path: nextPath, reason: "artifact_binary" });
      continue;
    }

    scanForDisallowedPayload(nextValue, nextPath, violations);
  }
}

function isBinaryLikeDataUrl(value: string) {
  return /^data:(?:image|video|audio|application\/octet-stream|application\/pdf)/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

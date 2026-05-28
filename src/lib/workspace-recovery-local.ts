import type { NexusWorkspace } from "@/lib/nexus-types";
import {
  computeWorkspaceSnapshotChecksum,
  serializeActiveUiStateSnapshot,
} from "@/lib/backend/workspace/workspace-snapshot-serializer";

export type LocalWorkspaceRecoveryContext = {
  localChecksum: string | null;
  localUpdatedAt: string | null;
  localWorkspaceId: string | null;
};

export async function buildLocalWorkspaceRecoveryContext(
  workspace?: NexusWorkspace | null,
): Promise<LocalWorkspaceRecoveryContext> {
  if (!workspace) {
    return {
      localChecksum: null,
      localUpdatedAt: null,
      localWorkspaceId: null,
    };
  }

  return {
    localChecksum: await computeWorkspaceSnapshotChecksum(
      serializeActiveUiStateSnapshot(workspace),
    ),
    localUpdatedAt: workspace.updatedAt ?? null,
    localWorkspaceId: workspace.id,
  };
}

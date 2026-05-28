import { describe, expect, it } from "vitest";

import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import {
  computeWorkspaceSnapshotChecksum,
  serializeActiveUiStateSnapshot,
} from "@/lib/backend/workspace/workspace-snapshot-serializer";

import { buildLocalWorkspaceRecoveryContext } from "./workspace-recovery-local";

describe("buildLocalWorkspaceRecoveryContext", () => {
  it("builds local workspace id, updated time, and checksum for login recovery", async () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-local-checksum",
      name: "Local Checksum",
      timestamp: "2026-05-28T04:00:00.000Z",
    });
    const expectedChecksum = await computeWorkspaceSnapshotChecksum(
      serializeActiveUiStateSnapshot(workspace),
    );

    await expect(buildLocalWorkspaceRecoveryContext(workspace)).resolves.toEqual({
      localChecksum: expectedChecksum,
      localUpdatedAt: workspace.updatedAt,
      localWorkspaceId: workspace.id,
    });
  });

  it("returns an empty local context when no workspace is present", async () => {
    await expect(buildLocalWorkspaceRecoveryContext(null)).resolves.toEqual({
      localChecksum: null,
      localUpdatedAt: null,
      localWorkspaceId: null,
    });
  });
});

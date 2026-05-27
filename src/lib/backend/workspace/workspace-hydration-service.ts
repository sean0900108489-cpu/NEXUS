import type { WorkspaceCloudSnapshotPayload } from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";

export type WorkspaceHydrationReason =
  | "local_missing"
  | "workspace_switch"
  | "explicit_restore"
  | "recover"
  | "local_corrupt";

export type WorkspaceHydrationInput = {
  workspaceId: string;
  cloudChecksum: string;
  cloudUpdatedAt: string;
  localChecksum?: string | null;
  localUpdatedAt?: string | null;
  localStatePresent: boolean;
  reason: WorkspaceHydrationReason;
};

export type WorkspaceHydrationPlan =
  | {
      action: "hydrate";
      workspaceId: string;
      checksum: string;
      reason: WorkspaceHydrationReason;
    }
  | {
      action: "skip";
      workspaceId: string;
      checksum: string;
      reason: "checksum_match" | "local_state_present";
    }
  | {
      action: "conflict";
      workspaceId: string;
      checksum: string;
      reason: "local_newer";
    };

export class WorkspaceHydrationService {
  createHydrationPlan(input: WorkspaceHydrationInput): WorkspaceHydrationPlan {
    if (input.localChecksum && input.localChecksum === input.cloudChecksum) {
      return {
        action: "skip",
        checksum: input.cloudChecksum,
        reason: "checksum_match",
        workspaceId: input.workspaceId,
      };
    }

    if (isLocalNewer(input.localUpdatedAt, input.cloudUpdatedAt)) {
      return {
        action: "conflict",
        checksum: input.cloudChecksum,
        reason: "local_newer",
        workspaceId: input.workspaceId,
      };
    }

    if (
      input.reason === "local_missing" ||
      input.reason === "local_corrupt" ||
      input.reason === "explicit_restore" ||
      input.reason === "recover" ||
      input.reason === "workspace_switch"
    ) {
      return {
        action: "hydrate",
        checksum: input.cloudChecksum,
        reason: input.reason,
        workspaceId: input.workspaceId,
      };
    }

    return {
      action: "skip",
      checksum: input.cloudChecksum,
      reason: "local_state_present",
      workspaceId: input.workspaceId,
    };
  }

  assertCanHydrate(input: WorkspaceHydrationInput): WorkspaceHydrationPlan {
    const plan = this.createHydrationPlan(input);

    if (plan.action === "conflict") {
      throw new ApiError(
        "WORKSPACE_HYDRATION_CONFLICT",
        "Workspace hydration would overwrite newer local state.",
        409,
        {
          cloudChecksum: input.cloudChecksum,
          localChecksum: input.localChecksum ?? null,
        },
      );
    }

    return plan;
  }

  hydrate(snapshot: WorkspaceCloudSnapshotPayload, plan: WorkspaceHydrationPlan) {
    if (plan.action !== "hydrate") {
      return null;
    }

    return snapshot;
  }
}

function isLocalNewer(localUpdatedAt?: string | null, cloudUpdatedAt?: string | null) {
  if (!localUpdatedAt || !cloudUpdatedAt) {
    return false;
  }

  return new Date(localUpdatedAt).getTime() > new Date(cloudUpdatedAt).getTime();
}

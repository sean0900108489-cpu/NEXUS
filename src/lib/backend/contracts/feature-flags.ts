import type { UserId, WorkspaceId } from "../primitives/ids";

export type FeatureFlagContext = {
  workspaceId?: WorkspaceId;
  userId?: UserId;
};

export interface FeatureFlagProvider {
  isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean>;
}

export const disabledFeatureFlagProvider: FeatureFlagProvider = {
  async isEnabled() {
    return false;
  },
};

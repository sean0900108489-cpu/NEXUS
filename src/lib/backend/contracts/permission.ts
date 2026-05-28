import type { BackendErrorCode } from "../primitives/errors";
import type { ResourceId, UserId, WorkspaceId } from "../primitives/ids";

export type PermissionAction = string;
export type PermissionResourceType = string;
export type PermissionDecisionValue = "allow" | "deny" | "requires_confirmation";
export type PermissionRiskLevel = "low" | "medium" | "high" | "critical";

export type PermissionCheckInput = {
  workspaceId: WorkspaceId;
  userId: UserId;
  action: PermissionAction;
  resourceType: PermissionResourceType;
  resourceId?: ResourceId;
};

export type PermissionDecision = {
  decision: PermissionDecisionValue;
  reasonCode: BackendErrorCode | string;
  requiredScopes: string[];
  riskLevel: PermissionRiskLevel;
};

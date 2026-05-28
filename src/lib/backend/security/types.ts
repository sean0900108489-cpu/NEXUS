import type {
  BackendMetadata,
  BackendSource,
  JsonValue,
} from "../primitives/metadata";
import type {
  RequestId,
  ResourceId,
  TraceId,
  UserId,
  WorkspaceId,
} from "../primitives/ids";

export const WORKSPACE_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export type PermissionAuditDecision =
  | "allowed"
  | "denied"
  | "requires_confirmation";

export type WorkspaceMembership = {
  id?: string;
  workspaceId: WorkspaceId;
  userId: UserId;
  role: WorkspaceRole;
  createdAt?: string;
  updatedAt?: string;
};

export type SecurityAuditLogEntry = {
  workspaceId?: WorkspaceId | null;
  actorUserId?: UserId | null;
  action: string;
  resourceType: string;
  resourceId?: ResourceId | null;
  decision: PermissionAuditDecision;
  reasonCode?: string | null;
  metadata?: BackendMetadata | Record<string, unknown>;
};

export type SecurityAuditLogRow = SecurityAuditLogEntry & {
  id?: string;
  createdAt?: string;
};

export type PermissionCheckContext = {
  requestId?: RequestId;
  traceId?: TraceId;
  metadata?: Record<string, unknown>;
};

export type SecurityEventPayload = {
  source: Extract<BackendSource, "security">;
  workspaceId?: WorkspaceId;
  userId?: UserId;
  resourceType: string;
  resourceId?: ResourceId;
  action: string;
  decision: PermissionAuditDecision;
  reasonCode: string;
  requestId: RequestId;
  traceId: TraceId;
  [key: string]: JsonValue | undefined;
};

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(value);
}

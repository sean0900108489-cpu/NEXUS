import {
  BackendErrorCodes,
  type BackendErrorCode,
} from "../primitives/errors";
import type {
  PermissionCheckInput,
  PermissionDecision,
  PermissionRiskLevel,
} from "../contracts/permission";
import type { BackendEvent, EmitBackendEvent } from "../observability/events";
import { emitBackendEvent } from "../observability/events";

import { SecretBoundaryService } from "./secret-boundary-service";
import {
  WORKSPACE_ROLE_RANK,
  isWorkspaceRole,
  type PermissionAuditDecision,
  type PermissionCheckContext,
  type SecurityEventPayload,
  type WorkspaceRole,
} from "./types";
import {
  SecurityAuditRepository,
  WorkspaceMembershipRepository,
} from "./repositories";

type PermissionServiceDependencies = {
  memberships: WorkspaceMembershipRepository;
  audit: SecurityAuditRepository;
  secretBoundaryService?: SecretBoundaryService;
  emitEvent?: EmitBackendEvent;
};

type WorkspaceRoleRequirement = {
  workspaceId: string;
  userId: string;
  minRole: WorkspaceRole;
  action: string;
  resourceType: string;
  resourceId?: string;
};

type ActionKind =
  | "read"
  | "write"
  | "workspaceDelete"
  | "membershipManage"
  | "ownerTransfer"
  | "settingsManage"
  | "toolExecute"
  | "unknown";

type ResourceKind =
  | "workspace"
  | "membership"
  | "asset"
  | "tool"
  | "settings"
  | "unknown";

export class PermissionService {
  private readonly secretBoundaryService: SecretBoundaryService;
  private readonly emitEvent: EmitBackendEvent;

  constructor(private readonly dependencies: PermissionServiceDependencies) {
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
    this.emitEvent = dependencies.emitEvent ?? emitBackendEvent;
  }

  async check(
    input: PermissionCheckInput,
    context: PermissionCheckContext = {},
  ): Promise<PermissionDecision> {
    let decision: PermissionDecision;

    try {
      decision = await this.evaluate(input);
    } catch {
      decision = deny(
        BackendErrorCodes.INTERNAL_DEPENDENCY_FAILED,
        "critical",
        ["workspace:membership:read"],
      );
    }

    return this.recordAndEmit(input, decision, context);
  }

  async requireWorkspaceRole(
    input: WorkspaceRoleRequirement,
    context: PermissionCheckContext = {},
  ): Promise<PermissionDecision> {
    let decision: PermissionDecision;

    try {
      const membership =
        await this.dependencies.memberships.findByWorkspaceAndUser(
          input.workspaceId,
          input.userId,
        );

      if (!membership || !isWorkspaceRole(membership.role)) {
        decision = deny(
          BackendErrorCodes.PERMISSION_DENIED,
          "high",
          [`workspace:${input.minRole}`],
        );
      } else if (
        WORKSPACE_ROLE_RANK[membership.role] >= WORKSPACE_ROLE_RANK[input.minRole]
      ) {
        decision = allow("medium", [`workspace:${input.minRole}`]);
      } else {
        decision = deny(
          BackendErrorCodes.PERMISSION_SCOPE_MISSING,
          "medium",
          [`workspace:${input.minRole}`],
        );
      }
    } catch {
      decision = deny(
        BackendErrorCodes.INTERNAL_DEPENDENCY_FAILED,
        "critical",
        [`workspace:${input.minRole}`],
      );
    }

    return this.recordAndEmit(input, decision, context);
  }

  private async evaluate(input: PermissionCheckInput): Promise<PermissionDecision> {
    if (!input.workspaceId) {
      return deny(BackendErrorCodes.VALIDATION_FAILED, "high", ["workspace:read"]);
    }

    if (!input.userId) {
      return deny(BackendErrorCodes.AUTH_UNAUTHENTICATED, "high", ["auth:session"]);
    }

    const resourceKind = classifyResource(input.resourceType);

    if (resourceKind === "unknown") {
      return deny(BackendErrorCodes.VALIDATION_FAILED, "high", ["resource:known"]);
    }

    const actionKind = classifyAction(input.action, resourceKind);

    if (actionKind === "unknown") {
      return deny(BackendErrorCodes.VALIDATION_FAILED, "high", ["action:known"]);
    }

    const membership = await this.dependencies.memberships.findByWorkspaceAndUser(
      input.workspaceId,
      input.userId,
    );

    if (!membership) {
      return deny(BackendErrorCodes.PERMISSION_DENIED, "high", [
        "workspace:member",
      ]);
    }

    if (!isWorkspaceRole(membership.role)) {
      return deny(BackendErrorCodes.PERMISSION_DENIED, "critical", [
        "workspace:known-role",
      ]);
    }

    const requiredScopes = scopesFor(actionKind, resourceKind);
    const riskLevel = riskFor(actionKind);

    if (actionKind === "ownerTransfer" && membership.role === "owner") {
      return {
        decision: "requires_confirmation",
        reasonCode: "PERMISSION_REQUIRES_CONFIRMATION",
        requiredScopes,
        riskLevel: "critical",
      };
    }

    return isAllowed(membership.role, actionKind, resourceKind)
      ? allow(riskLevel, requiredScopes)
      : deny(BackendErrorCodes.PERMISSION_SCOPE_MISSING, riskLevel, requiredScopes);
  }

  private async recordAndEmit(
    input: Pick<
      PermissionCheckInput,
      "workspaceId" | "userId" | "action" | "resourceType" | "resourceId"
    >,
    decision: PermissionDecision,
    context: PermissionCheckContext,
  ): Promise<PermissionDecision> {
    const requestId = context.requestId ?? makeSecurityId("request");
    const traceId = context.traceId ?? makeSecurityId("trace");
    const auditDecision = toAuditDecision(decision.decision);
    const metadata = this.secretBoundaryService.sanitizeAuditMetadata({
      ...(context.metadata ?? {}),
      provenance: {
        requestId,
        traceId,
        source: "security",
      },
      reasonCode: decision.reasonCode,
      resourceSummary: {
        hasResourceId: Boolean(input.resourceId),
        resourceType: input.resourceType,
      },
      riskLevel: decision.riskLevel,
    });

    let auditFailed = false;

    try {
      await this.dependencies.audit.record({
        action: input.action,
        actorUserId: input.userId,
        decision: auditDecision,
        metadata,
        reasonCode: decision.reasonCode,
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        workspaceId: input.workspaceId,
      });
    } catch {
      auditFailed = true;
    }

    const finalDecision =
      auditFailed && decision.decision === "allow" && isHighRiskDecision(decision)
        ? deny(
            BackendErrorCodes.OBSERVABILITY_EXPORT_FAILED,
            "critical",
            decision.requiredScopes,
          )
        : decision;

    await this.emitSecurityEvent(input, finalDecision, requestId, traceId);

    return finalDecision;
  }

  private async emitSecurityEvent(
    input: Pick<
      PermissionCheckInput,
      "workspaceId" | "userId" | "action" | "resourceType" | "resourceId"
    >,
    decision: PermissionDecision,
    requestId: string,
    traceId: string,
  ) {
    const payload: SecurityEventPayload = {
      action: input.action,
      decision: toAuditDecision(decision.decision),
      reasonCode: decision.reasonCode,
      requestId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      source: "security",
      traceId,
      userId: input.userId,
      workspaceId: input.workspaceId,
    };

    const event: BackendEvent = {
      name: "security.permission.decision",
      occurredAt: new Date().toISOString(),
      payload,
      status: decision.decision === "allow" ? "succeeded" : "failed",
      trace: {
        requestId,
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        source: "security",
        traceId,
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    };

    try {
      await this.emitEvent(event);
    } catch {
      // Observability hooks must not leak or throw into permission decisions.
    }
  }
}

function allow(
  riskLevel: PermissionRiskLevel,
  requiredScopes: string[],
): PermissionDecision {
  return {
    decision: "allow",
    reasonCode: "PERMISSION_ALLOWED",
    requiredScopes,
    riskLevel,
  };
}

function deny(
  reasonCode: BackendErrorCode | string,
  riskLevel: PermissionRiskLevel,
  requiredScopes: string[],
): PermissionDecision {
  return {
    decision: "deny",
    reasonCode,
    requiredScopes,
    riskLevel,
  };
}

function classifyResource(resourceType: string): ResourceKind {
  const normalized = normalize(resourceType);

  if (normalized === "workspace") {
    return "workspace";
  }

  if (normalized === "membership" || normalized === "workspace_membership") {
    return "membership";
  }

  if (
    [
      "message",
      "artifact",
      "prompt",
      "notebook",
      "workflow_template",
      "workflowtemplate",
    ].includes(normalized)
  ) {
    return "asset";
  }

  if (normalized === "tool") {
    return "tool";
  }

  if (
    normalized === "provider_settings" ||
    normalized === "tool_settings" ||
    normalized === "settings"
  ) {
    return "settings";
  }

  return "unknown";
}

function classifyAction(action: string, resourceKind: ResourceKind): ActionKind {
  const normalized = normalize(action);

  if (normalized.includes("transfer_owner")) {
    return "ownerTransfer";
  }

  if (resourceKind === "workspace" && normalized.includes("delete")) {
    return "workspaceDelete";
  }

  if (resourceKind === "membership" || normalized.includes("membership")) {
    return "membershipManage";
  }

  if (
    resourceKind === "settings" ||
    normalized.includes("provider_settings") ||
    normalized.includes("tool_settings")
  ) {
    return "settingsManage";
  }

  if (
    resourceKind === "tool" &&
    (normalized.includes("execute") || normalized.includes("run"))
  ) {
    return "toolExecute";
  }

  if (
    ["read", "select", "view", "list"].some((verb) => normalized.includes(verb))
  ) {
    return "read";
  }

  if (
    ["create", "insert", "update", "upsert", "delete", "write", "save"].some(
      (verb) => normalized.includes(verb),
    )
  ) {
    return "write";
  }

  return "unknown";
}

function isAllowed(
  role: WorkspaceRole,
  actionKind: ActionKind,
  resourceKind: ResourceKind,
) {
  if (role === "owner") {
    return true;
  }

  if (role === "admin") {
    return !["ownerTransfer", "workspaceDelete"].includes(actionKind);
  }

  if (role === "editor") {
    return (
      (resourceKind === "asset" || resourceKind === "workspace") &&
      ["read", "write"].includes(actionKind)
    );
  }

  if (role === "viewer") {
    return actionKind === "read";
  }

  return false;
}

function scopesFor(actionKind: ActionKind, resourceKind: ResourceKind) {
  return [`workspace:${resourceKind}:${actionKind}`];
}

function riskFor(actionKind: ActionKind): PermissionRiskLevel {
  if (["workspaceDelete", "ownerTransfer"].includes(actionKind)) {
    return "critical";
  }

  if (["membershipManage", "settingsManage", "toolExecute"].includes(actionKind)) {
    return "high";
  }

  return actionKind === "write" ? "medium" : "low";
}

function isHighRiskDecision(decision: PermissionDecision) {
  return decision.riskLevel === "high" || decision.riskLevel === "critical";
}

function toAuditDecision(
  decision: PermissionDecision["decision"],
): PermissionAuditDecision {
  if (decision === "allow") {
    return "allowed";
  }

  if (decision === "requires_confirmation") {
    return "requires_confirmation";
  }

  return "denied";
}

function normalize(value: string) {
  return value.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function makeSecurityId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${random}`;
}

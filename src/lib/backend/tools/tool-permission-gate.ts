import type { ToolRiskLevel } from "@/lib/nexus-types";

import { ApiError } from "../api/api-errors";
import type { PermissionService } from "../security/permission-service";
import { createWorkspaceStatePermissionService } from "../workspace/workspace-permission";

import {
  createToolPermissionRepository,
  type ToolPermissionRepository,
} from "./tool-permission-repository";

export type ToolPermissionGateInput = {
  workspaceId: string;
  userId: string;
  toolId: string;
  scope: string;
  riskLevel: ToolRiskLevel;
  requestId?: string;
  traceId?: string;
};

export type ToolPermissionGateDecision = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reasonCode: string;
};

export class ToolPermissionGate {
  private readonly permissionService: PermissionService;
  private readonly repository: ToolPermissionRepository;

  constructor(dependencies: {
    permissionService?: PermissionService;
    repository?: ToolPermissionRepository;
  } = {}) {
    this.permissionService =
      dependencies.permissionService ?? createWorkspaceStatePermissionService();
    this.repository = dependencies.repository ?? createToolPermissionRepository();
  }

  async check(input: ToolPermissionGateInput): Promise<ToolPermissionGateDecision> {
    const permissionDecision = await this.permissionService.check(
      {
        action: "tool.execute",
        resourceId: input.toolId,
        resourceType: "tool",
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
      {
        requestId: input.requestId,
        traceId: input.traceId,
      },
    );

    if (permissionDecision.decision !== "allow") {
      return {
        allowed: false,
        reasonCode: permissionDecision.reasonCode,
        requiresConfirmation: false,
      };
    }

    const permission = await this.repository.find({
      scope: input.scope,
      toolId: input.toolId,
      workspaceId: input.workspaceId,
    });

    if (permission && !permission.enabled) {
      return {
        allowed: false,
        reasonCode: "TOOL_PERMISSION_DISABLED",
        requiresConfirmation: false,
      };
    }

    return {
      allowed: true,
      reasonCode: "TOOL_PERMISSION_ALLOWED",
      requiresConfirmation:
        permission?.requiresConfirmation ?? input.riskLevel === "high",
    };
  }

  async assertRead(input: {
    workspaceId: string;
    userId: string;
    resourceId?: string;
    requestId?: string;
    traceId?: string;
  }) {
    const decision = await this.permissionService.check(
      {
        action: "workspace.read",
        resourceId: input.resourceId,
        resourceType: "workspace",
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
      {
        requestId: input.requestId,
        traceId: input.traceId,
      },
    );

    if (decision.decision !== "allow") {
      throw new ApiError("PERMISSION_DENIED", "Permission denied.", 403, {
        reasonCode: decision.reasonCode,
      });
    }
  }
}

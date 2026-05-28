import type { UserId, WorkspaceId } from "../primitives/ids";

export const DEFAULT_LOCAL_WORKSPACE_ID = "workspace-nexus-ops";

export type WorkspaceIdentityConflict =
  | "none"
  | "owner_collision"
  | "unknown_owner";

export type WorkspaceRepairResourceType =
  | "workspaces"
  | "messages"
  | "artifacts"
  | "prompts"
  | "notebooks"
  | "workflow_templates";

export type WorkspaceRepairResourceImpact = {
  resourceType: WorkspaceRepairResourceType;
  count: number;
  safeToUpdate: boolean;
  reason?: string;
};

export type WorkspaceIdentityRepairInput = {
  userId: UserId;
  workspaceId?: WorkspaceId;
};

export type WorkspaceIdentityConflictReport = {
  workspaceId: WorkspaceId;
  userId: UserId;
  currentOwnerUserId: UserId | null;
  conflict: WorkspaceIdentityConflict;
};

export type WorkspaceIdentityRepairPlan = {
  planId: string;
  dryRun: boolean;
  action: "retain" | "rename_cloud_workspace" | "manual_repair";
  fromWorkspaceId: WorkspaceId;
  toWorkspaceId: WorkspaceId;
  userId: UserId;
  conflict: WorkspaceIdentityConflict;
  impacts: WorkspaceRepairResourceImpact[];
  requiresExplicitApply: boolean;
  requiresLocalAdapterApply: boolean;
  manualRepairRequired: boolean;
};

export type WorkspaceIdentityRepairApplyResult = {
  applied: boolean;
  planId: string;
  updatedResources: WorkspaceRepairResourceImpact[];
};

export interface WorkspaceIdentityRepairRepository {
  findWorkspaceOwner(workspaceId: WorkspaceId): Promise<UserId | null>;
  countRepairableResources(input: {
    workspaceId: WorkspaceId;
    userId: UserId;
  }): Promise<WorkspaceRepairResourceImpact[]>;
  applyWorkspaceIdRepair(plan: WorkspaceIdentityRepairPlan): Promise<
    WorkspaceRepairResourceImpact[]
  >;
}

export class WorkspaceIdentityRepairService {
  constructor(
    private readonly repository: WorkspaceIdentityRepairRepository,
    private readonly idFactory: () => WorkspaceId = defaultWorkspaceIdFactory,
  ) {}

  async dryRun(
    input: WorkspaceIdentityRepairInput,
  ): Promise<WorkspaceIdentityRepairPlan> {
    const report = await this.detectConflicts(input);

    return this.createRepairPlan(report, { dryRun: true });
  }

  async detectConflicts(
    input: WorkspaceIdentityRepairInput,
  ): Promise<WorkspaceIdentityConflictReport> {
    const workspaceId = input.workspaceId ?? DEFAULT_LOCAL_WORKSPACE_ID;
    const currentOwnerUserId = await this.repository.findWorkspaceOwner(workspaceId);

    if (!currentOwnerUserId) {
      return {
        conflict: "unknown_owner",
        currentOwnerUserId,
        userId: input.userId,
        workspaceId,
      };
    }

    return {
      conflict:
        currentOwnerUserId === input.userId ? "none" : "owner_collision",
      currentOwnerUserId,
      userId: input.userId,
      workspaceId,
    };
  }

  async createRepairPlan(
    report: WorkspaceIdentityConflictReport,
    options: { dryRun?: boolean } = {},
  ): Promise<WorkspaceIdentityRepairPlan> {
    if (report.conflict === "none") {
      return {
        action: "retain",
        conflict: "none",
        dryRun: options.dryRun ?? true,
        fromWorkspaceId: report.workspaceId,
        impacts: [],
        manualRepairRequired: false,
        planId: makeRepairPlanId(),
        requiresExplicitApply: false,
        requiresLocalAdapterApply: false,
        toWorkspaceId: report.workspaceId,
        userId: report.userId,
      };
    }

    if (report.conflict === "unknown_owner") {
      return {
        action: "manual_repair",
        conflict: "unknown_owner",
        dryRun: options.dryRun ?? true,
        fromWorkspaceId: report.workspaceId,
        impacts: [
          {
            count: 0,
            reason: "Workspace owner cannot be safely inferred.",
            resourceType: "workspaces",
            safeToUpdate: false,
          },
        ],
        manualRepairRequired: true,
        planId: makeRepairPlanId(),
        requiresExplicitApply: true,
        requiresLocalAdapterApply: false,
        toWorkspaceId: report.workspaceId,
        userId: report.userId,
      };
    }

    const impacts = await this.repository.countRepairableResources({
      userId: report.userId,
      workspaceId: report.workspaceId,
    });
    const manualRepairRequired = impacts.some((impact) => !impact.safeToUpdate);

    return {
      action: manualRepairRequired ? "manual_repair" : "rename_cloud_workspace",
      conflict: "owner_collision",
      dryRun: options.dryRun ?? true,
      fromWorkspaceId: report.workspaceId,
      impacts,
      manualRepairRequired,
      planId: makeRepairPlanId(),
      requiresExplicitApply: true,
      requiresLocalAdapterApply: true,
      toWorkspaceId: this.idFactory(),
      userId: report.userId,
    };
  }

  async applyRepairPlan(
    plan: WorkspaceIdentityRepairPlan,
    options: { explicitApply: boolean },
  ): Promise<WorkspaceIdentityRepairApplyResult> {
    if (!options.explicitApply) {
      throw new Error("Workspace repair requires an explicit apply step.");
    }

    if (plan.dryRun) {
      throw new Error("Dry-run repair plans cannot be applied directly.");
    }

    if (plan.manualRepairRequired || plan.action === "manual_repair") {
      throw new Error("Manual repair is required before this plan can be applied.");
    }

    if (plan.action === "retain") {
      return {
        applied: false,
        planId: plan.planId,
        updatedResources: [],
      };
    }

    const updatedResources = await this.repository.applyWorkspaceIdRepair(plan);

    return {
      applied: true,
      planId: plan.planId,
      updatedResources,
    };
  }
}

function defaultWorkspaceIdFactory(): WorkspaceId {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 16)
      : `${Date.now()}${Math.random().toString(16).slice(2, 10)}`;

  return `workspace_${random}`;
}

function makeRepairPlanId() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `repair_${random}`;
}

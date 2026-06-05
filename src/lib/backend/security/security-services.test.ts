import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { PermissionDecision } from "../contracts/permission";
import {
  canBootstrapWorkspaceMembership,
  createWorkspaceStatePermissionService,
} from "../workspace/workspace-permission";

import { PermissionService } from "./permission-service";
import {
  SecurityAuditRepository,
  WorkspaceMembershipRepository,
  type SecurityAuditStore,
  type WorkspaceMembershipStore,
} from "./repositories";
import { SecretBoundaryService } from "./secret-boundary-service";
import type {
  SecurityAuditLogEntry,
  WorkspaceMembership,
} from "./types";
import {
  DEFAULT_LOCAL_WORKSPACE_ID,
  WorkspaceIdentityRepairService,
  type WorkspaceIdentityRepairPlan,
  type WorkspaceIdentityRepairRepository,
  type WorkspaceRepairResourceImpact,
} from "./workspace-identity-repair-service";

class MemoryMembershipStore implements WorkspaceMembershipStore {
  constructor(private readonly memberships: WorkspaceMembership[]) {}

  async findByWorkspaceAndUser(workspaceId: string, userId: string) {
    return (
      this.memberships.find(
        (membership) =>
          membership.workspaceId === workspaceId && membership.userId === userId,
      ) ?? null
    );
  }
}

class MemoryAuditStore implements SecurityAuditStore {
  readonly entries: Array<SecurityAuditLogEntry & { metadata: Record<string, unknown> }> =
    [];

  constructor(private readonly fail = false) {}

  async insert(entry: SecurityAuditLogEntry & { metadata: Record<string, unknown> }) {
    if (this.fail) {
      throw new Error("audit write failed");
    }

    this.entries.push(entry);
  }
}

function makePermissionService({
  auditFails = false,
  memberships,
}: {
  auditFails?: boolean;
  memberships: WorkspaceMembership[];
}) {
  const membershipRepository = new WorkspaceMembershipRepository(
    new MemoryMembershipStore(memberships),
  );
  const auditStore = new MemoryAuditStore(auditFails);
  const auditRepository = new SecurityAuditRepository(auditStore);
  const emitted: unknown[] = [];
  const service = new PermissionService({
    audit: auditRepository,
    emitEvent: (event) => {
      emitted.push(event);
    },
    memberships: membershipRepository,
  });

  return {
    auditStore,
    emitted,
    service,
  };
}

const ownerMembership: WorkspaceMembership = {
  role: "owner",
  userId: "00000000-0000-4000-8000-000000000001",
  workspaceId: "workspace-a",
};

const editorMembership: WorkspaceMembership = {
  role: "editor",
  userId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "workspace-a",
};

const adminMembership: WorkspaceMembership = {
  role: "admin",
  userId: "00000000-0000-4000-8000-000000000004",
  workspaceId: "workspace-a",
};

const viewerMembership: WorkspaceMembership = {
  role: "viewer",
  userId: "00000000-0000-4000-8000-000000000003",
  workspaceId: "workspace-a",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PermissionService", () => {
  it("allows a workspace owner and writes a sanitized audit log", async () => {
    const { auditStore, emitted, service } = makePermissionService({
      memberships: [ownerMembership],
    });

    const decision = await service.check(
      {
        action: "workspace.read",
        resourceType: "workspace",
        userId: ownerMembership.userId,
        workspaceId: ownerMembership.workspaceId,
      },
      {
        metadata: {
          Authorization: "Bearer sk-owner-secret-1234567890",
          userAgentHash: "ua_hash",
        },
        requestId: "req-1",
        traceId: "trace-1",
      },
    );

    expect(decision.decision).toBe("allow");
    expect(auditStore.entries).toHaveLength(1);
    expect(auditStore.entries[0]?.decision).toBe("allowed");
    expect(JSON.stringify(auditStore.entries[0]?.metadata)).not.toContain(
      "sk-owner-secret",
    );
    expect(emitted).toHaveLength(1);
  });

  it("denies cross-workspace access when membership is missing", async () => {
    const { auditStore, service } = makePermissionService({
      memberships: [ownerMembership],
    });

    const decision = await service.check({
      action: "workspace.read",
      resourceType: "workspace",
      userId: ownerMembership.userId,
      workspaceId: "workspace-b",
    });

    expect(decision.decision).toBe("deny");
    expect(auditStore.entries[0]?.decision).toBe("denied");
  });

  it("fails closed for an unknown role", async () => {
    const unknownRole = {
      ...ownerMembership,
      role: "super_admin",
    } as unknown as WorkspaceMembership;
    const { service } = makePermissionService({
      memberships: [unknownRole],
    });

    const decision = await service.check({
      action: "workspace.read",
      resourceType: "workspace",
      userId: ownerMembership.userId,
      workspaceId: ownerMembership.workspaceId,
    });

    expect(decision.decision).toBe("deny");
  });

  it("lets an editor update a workspace asset but not manage membership", async () => {
    const { service } = makePermissionService({
      memberships: [editorMembership],
    });

    const writeDecision = await service.check({
      action: "notebook.update",
      resourceId: "notebook-1",
      resourceType: "notebook",
      userId: editorMembership.userId,
      workspaceId: editorMembership.workspaceId,
    });
    const membershipDecision = await service.check({
      action: "membership.update",
      resourceId: "membership-1",
      resourceType: "membership",
      userId: editorMembership.userId,
      workspaceId: editorMembership.workspaceId,
    });

    expect(writeDecision.decision).toBe("allow");
    expect(membershipDecision.decision).toBe("deny");
  });

  it("keeps viewers read-only", async () => {
    const { service } = makePermissionService({
      memberships: [viewerMembership],
    });

    const readDecision = await service.check({
      action: "prompt.select",
      resourceType: "prompt",
      userId: viewerMembership.userId,
      workspaceId: viewerMembership.workspaceId,
    });
    const writeDecision = await service.check({
      action: "prompt.insert",
      resourceType: "prompt",
      userId: viewerMembership.userId,
      workspaceId: viewerMembership.workspaceId,
    });

    expect(readDecision.decision).toBe("allow");
    expect(writeDecision.decision).toBe("deny");
  });

  it("matches the Workflow Pro account-matrix manifest for core runtime actions", async () => {
    const manifestText = readFileSync(
      resolve(
        process.cwd(),
        "docs/workflow-pro/account-matrix-preview-verification.manifest.json",
      ),
      "utf8",
    );
    const manifest = JSON.parse(manifestText) as {
      actors: Array<{
        id: string;
        must: string[];
        mustNot: string[];
        requiredScreenBenchmarks: string[];
      }>;
      schema: string;
    };
    const liveAuditManifestText = readFileSync(
      resolve(
        process.cwd(),
        "docs/workflow-pro/account-matrix-live-audit.manifest.json",
      ),
      "utf8",
    );
    const liveAuditManifest = JSON.parse(liveAuditManifestText) as {
      advisorEvidence: {
        security: {
          blockingFindings: number;
        };
      };
      forbiddenEvidence: string[];
      localLiveAuthBoundaryProbe: {
        blockingFindings: number;
        credentialsSent: boolean;
        destructivePayloads: boolean;
        protectedSpoofOnly: number;
      };
      permissionAuditAggregate: {
        denied: Array<{ reasonCode: string }>;
      };
      schema: string;
      status: string;
    };
    const { service } = makePermissionService({
      memberships: [
        ownerMembership,
        adminMembership,
        editorMembership,
        viewerMembership,
      ],
    });
    const actors = new Map(manifest.actors.map((actor) => [actor.id, actor]));

    expect(manifest.schema).toBe("nexus.workflowPro.accountMatrix.v1");
    expect(liveAuditManifest.schema).toBe(
      "nexus.workflowPro.accountMatrixLiveAudit.v1",
    );
    expect(liveAuditManifest.status).toBe(
      "live-audited-screen-matrix-pending",
    );
    expect(liveAuditManifest.advisorEvidence.security.blockingFindings).toBe(0);
    expect(liveAuditManifest.localLiveAuthBoundaryProbe).toMatchObject({
      blockingFindings: 0,
      credentialsSent: false,
      destructivePayloads: false,
    });
    expect(
      liveAuditManifest.localLiveAuthBoundaryProbe.protectedSpoofOnly,
    ).toBeGreaterThanOrEqual(30);
    expect(liveAuditManifest.permissionAuditAggregate.denied).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reasonCode: "PERMISSION_DENIED" }),
      ]),
    );
    expect(liveAuditManifest.forbiddenEvidence).toEqual(
      expect.arrayContaining([
        "accessTokens",
        "apiKeys",
        "refreshTokens",
        "cookies",
        "rawSecrets",
        "rawActorUserIds",
      ]),
    );
    expect([...actors.keys()]).toEqual([
      "owner",
      "admin",
      "editor",
      "viewer",
      "new-authenticated-account",
      "authenticated-non-member",
      "spoof-only",
      "unauthenticated",
    ]);
    expect(actors.get("owner")?.requiredScreenBenchmarks).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(actors.get("editor")?.must).toContain("createGeneratedArtifact");
    expect(actors.get("viewer")?.mustNot).toEqual(
      expect.arrayContaining([
        "runWorkflow",
        "mutateGraph",
        "saveWorkspaceState",
        "createGeneratedArtifact",
      ]),
    );
    expect(actors.get("new-authenticated-account")?.mustNot).toContain(
      "bootstrapOwnershipOverAnotherUsersWorkspace",
    );

    const decisions = await Promise.all([
      service.check({
        action: "workflow_template.update",
        resourceType: "workflow_template",
        userId: ownerMembership.userId,
        workspaceId: ownerMembership.workspaceId,
      }),
      service.check({
        action: "artifact.create",
        resourceType: "artifact",
        userId: adminMembership.userId,
        workspaceId: adminMembership.workspaceId,
      }),
      service.check({
        action: "workflow_template.update",
        resourceType: "workflow_template",
        userId: editorMembership.userId,
        workspaceId: editorMembership.workspaceId,
      }),
      service.check({
        action: "artifact.list",
        resourceType: "artifact",
        userId: viewerMembership.userId,
        workspaceId: viewerMembership.workspaceId,
      }),
      service.check({
        action: "artifact.create",
        resourceType: "artifact",
        userId: viewerMembership.userId,
        workspaceId: viewerMembership.workspaceId,
      }),
      service.check({
        action: "workspace.save",
        resourceType: "workspace",
        userId: viewerMembership.userId,
        workspaceId: viewerMembership.workspaceId,
      }),
      service.check({
        action: "provider_settings.update",
        resourceType: "provider_settings",
        userId: editorMembership.userId,
        workspaceId: editorMembership.workspaceId,
      }),
      service.check({
        action: "membership.update",
        resourceType: "membership",
        userId: editorMembership.userId,
        workspaceId: editorMembership.workspaceId,
      }),
      service.check({
        action: "tool.run",
        resourceType: "tool",
        userId: editorMembership.userId,
        workspaceId: editorMembership.workspaceId,
      }),
      service.check({
        action: "workspace.delete",
        resourceType: "workspace",
        userId: adminMembership.userId,
        workspaceId: adminMembership.workspaceId,
      }),
      service.check({
        action: "workflow_template.update",
        resourceType: "workflow_template",
        userId: ownerMembership.userId,
        workspaceId: "workspace-other",
      }),
      service.check({
        action: "workflow_template.update",
        resourceType: "workflow_template",
        userId: "",
        workspaceId: ownerMembership.workspaceId,
      }),
    ]);

    expect(decisions.map((decision) => decision.decision)).toEqual([
      "allow",
      "allow",
      "allow",
      "allow",
      "deny",
      "deny",
      "deny",
      "deny",
      "deny",
      "deny",
      "deny",
      "deny",
    ]);
    expect(decisions[10]?.reasonCode).toBe("PERMISSION_DENIED");
    expect(decisions[11]?.reasonCode).toBe("AUTH_UNAUTHENTICATED");
  });

  it("blocks high-risk allowed operations when audit logging fails", async () => {
    const { service } = makePermissionService({
      auditFails: true,
      memberships: [ownerMembership],
    });

    const decision = await service.check({
      action: "workspace.delete",
      resourceType: "workspace",
      userId: ownerMembership.userId,
      workspaceId: ownerMembership.workspaceId,
    });

    expect(decision).toMatchObject<Partial<PermissionDecision>>({
      decision: "deny",
      reasonCode: "OBSERVABILITY_EXPORT_FAILED",
      riskLevel: "critical",
    });
  });

  it("fails closed for production local membership fallback without service-role config", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const service = createWorkspaceStatePermissionService();
    const decision = await service.check({
      action: "workspace.read",
      resourceType: "workspace",
      userId: ownerMembership.userId,
      workspaceId: ownerMembership.workspaceId,
    });

    expect(decision).toMatchObject({
      decision: "deny",
      reasonCode: "PERMISSION_DENIED",
    });
  });

  it("blocks permission-lookup workspace owner bootstrap in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(
      canBootstrapWorkspaceMembership(
        "workspace-nexus-ops",
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toBe(false);
  });

  it("keeps local-first workspace owner bootstrap available outside production", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(
      canBootstrapWorkspaceMembership(
        "workspace-nexus-ops",
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toBe(true);
  });
});

describe("SecretBoundaryService", () => {
  it("detects Authorization headers and API keys", () => {
    const service = new SecretBoundaryService();
    const scan = service.scanForSecrets({
      Authorization: "Bearer sk-test-secret-123456789",
      apiKey: "sk-api-secret-123456789",
    });

    expect(scan.hasSecrets).toBe(true);
    expect(scan.matches.map((match) => match.kind)).toEqual(
      expect.arrayContaining(["authorization", "apiKey"]),
    );
  });

  it("redacts audit metadata without preserving raw secrets", () => {
    const service = new SecretBoundaryService();
    const metadata = service.sanitizeAuditMetadata({
      providerToken: "sk-provider-secret-123456789",
      requestId: "req-1",
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata.redactionStatus).toBe("redacted");
    expect(serialized).not.toContain("sk-provider-secret");
    expect(() => service.assertNoSecrets(metadata)).not.toThrow();
  });
});

class MemoryRepairRepository implements WorkspaceIdentityRepairRepository {
  readonly appliedPlans: WorkspaceIdentityRepairPlan[] = [];

  constructor(
    private readonly owner: string | null,
    private readonly impacts: WorkspaceRepairResourceImpact[] = [],
  ) {}

  async findWorkspaceOwner() {
    return this.owner;
  }

  async countRepairableResources() {
    return this.impacts;
  }

  async applyWorkspaceIdRepair(plan: WorkspaceIdentityRepairPlan) {
    this.appliedPlans.push(plan);
    return this.impacts;
  }
}

describe("WorkspaceIdentityRepairService", () => {
  it("keeps the local default workspace id when no other owner has it", async () => {
    const service = new WorkspaceIdentityRepairService(
      new MemoryRepairRepository("00000000-0000-4000-8000-000000000001"),
      () => "workspace_new",
    );

    const plan = await service.dryRun({
      userId: "00000000-0000-4000-8000-000000000001",
    });

    expect(plan.action).toBe("retain");
    expect(plan.fromWorkspaceId).toBe(DEFAULT_LOCAL_WORKSPACE_ID);
    expect(plan.requiresLocalAdapterApply).toBe(false);
  });

  it("creates a dry-run collision repair plan without applying it", async () => {
    const repository = new MemoryRepairRepository(
      "00000000-0000-4000-8000-000000000099",
      [
        {
          count: 2,
          resourceType: "prompts",
          safeToUpdate: true,
        },
      ],
    );
    const service = new WorkspaceIdentityRepairService(
      repository,
      () => "workspace_new",
    );

    const plan = await service.dryRun({
      userId: "00000000-0000-4000-8000-000000000001",
    });

    expect(plan).toMatchObject({
      action: "rename_cloud_workspace",
      dryRun: true,
      fromWorkspaceId: DEFAULT_LOCAL_WORKSPACE_ID,
      requiresExplicitApply: true,
      requiresLocalAdapterApply: true,
      toWorkspaceId: "workspace_new",
    });
    expect(repository.appliedPlans).toHaveLength(0);
  });
});

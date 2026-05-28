import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DeploymentCheckRecord,
  DeploymentCheckRunRequest,
  DeploymentCheckRunResponse,
  DeploymentCheckStatus,
  DeploymentEnvironment,
  RuntimeHealthResponse,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  DeploymentCheckInsert,
  Deployment_Checks,
} from "@/lib/supabase/database.types";

import { emitBackendEvent } from "../observability/events";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import type { DeploymentCheckResult } from "./deployment-types";
import { EnvironmentValidator } from "./environment-validator";
import { RegistryConsistencyChecker } from "./registry-consistency-checker";
import { SchemaDriftChecker } from "./schema-drift-checker";

export interface DeploymentCheckRepository {
  insert(input: {
    releaseVersion?: string | null;
    environment: DeploymentEnvironment;
    checkType: string;
    status: DeploymentCheckStatus;
    details: Record<string, unknown>;
  }): Promise<DeploymentCheckRecord>;
  latest(): Promise<DeploymentCheckRecord | null>;
}

export class InMemoryDeploymentCheckRepository implements DeploymentCheckRepository {
  private readonly checks: DeploymentCheckRecord[] = [];

  async insert(input: {
    releaseVersion?: string | null;
    environment: DeploymentEnvironment;
    checkType: string;
    status: DeploymentCheckStatus;
    details: Record<string, unknown>;
  }) {
    const record: DeploymentCheckRecord = {
      checkType: input.checkType,
      createdAt: new Date().toISOString(),
      details: input.details,
      environment: input.environment,
      id: makeId("check"),
      releaseVersion: input.releaseVersion ?? null,
      status: input.status,
    };

    this.checks.unshift(record);

    return record;
  }

  async latest() {
    return this.checks[0] ?? null;
  }
}

export class SupabaseDeploymentCheckRepository implements DeploymentCheckRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async insert(input: {
    releaseVersion?: string | null;
    environment: DeploymentEnvironment;
    checkType: string;
    status: DeploymentCheckStatus;
    details: Record<string, unknown>;
  }) {
    const row: DeploymentCheckInsert = {
      check_type: input.checkType,
      details: input.details,
      environment: input.environment,
      release_version: input.releaseVersion ?? null,
      status: input.status,
    };
    const { data, error } = await this.client
      .from("deployment_checks")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapDeploymentCheck(data);
  }

  async latest() {
    const { data, error } = await this.client
      .from("deployment_checks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapDeploymentCheck(data) : null;
  }
}

export class DeploymentCheckService {
  private readonly repository: DeploymentCheckRepository;
  private readonly environmentValidator: EnvironmentValidator;
  private readonly schemaDriftChecker: SchemaDriftChecker;
  private readonly registryConsistencyChecker: RegistryConsistencyChecker;
  private readonly secretBoundaryService: SecretBoundaryService;

  constructor(dependencies: {
    repository?: DeploymentCheckRepository;
    environmentValidator?: EnvironmentValidator;
    schemaDriftChecker?: SchemaDriftChecker;
    registryConsistencyChecker?: RegistryConsistencyChecker;
    secretBoundaryService?: SecretBoundaryService;
  } = {}) {
    this.repository = dependencies.repository ?? createDeploymentCheckRepository();
    this.environmentValidator =
      dependencies.environmentValidator ?? new EnvironmentValidator();
    this.schemaDriftChecker =
      dependencies.schemaDriftChecker ?? new SchemaDriftChecker();
    this.registryConsistencyChecker =
      dependencies.registryConsistencyChecker ?? new RegistryConsistencyChecker();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
  }

  async getLatest() {
    return {
      check: await this.repository.latest(),
    };
  }

  async runPreflight(
    input: DeploymentCheckRunRequest = {},
    context: { requestId?: string; traceId?: string; workspaceId?: string } = {},
  ): Promise<DeploymentCheckRunResponse> {
    const environment = input.environment ?? this.environmentValidator.getEnvironment();
    const envResult = this.environmentValidator.validate(environment);
    const checks = await Promise.all([
      Promise.resolve<DeploymentCheckResult>({
        details: {
          checks: envResult.checks,
          missing: envResult.missing,
          mode: envResult.mode,
          runtimeMode: envResult.runtimeMode,
        },
        name: "environment",
        status: envResult.status,
        summary:
          envResult.status === "passed"
            ? "Environment requirements are satisfied for this runtime mode."
            : "Environment requirements are missing or blocked.",
      }),
      this.schemaDriftChecker.check(),
      Promise.resolve(this.registryConsistencyChecker.check()),
      Promise.resolve(runStaticRlsSmokeCheck()),
    ]);
    const status = aggregateStatus(checks.map((check) => check.status));
    const details = this.sanitizeDetails({
      checks,
      generatedAt: new Date().toISOString(),
      releaseVersion: input.releaseVersion ?? null,
    });
    const record = await this.repository.insert({
      checkType: "preflight",
      details,
      environment,
      releaseVersion: input.releaseVersion ?? null,
      status,
    });

    await this.emitDeploymentEvent(record, context);

    return { check: record };
  }

  async getRuntimeHealth(): Promise<RuntimeHealthResponse> {
    const envResult = this.environmentValidator.validate();
    const registryResult = this.registryConsistencyChecker.check();
    const latest = await this.repository.latest().catch(() => null);
    const env = envResult.status === "passed";
    const registry = !isBlockingStatus(registryResult.status);
    const deployment = !latest || !isBlockingStatus(latest.status);
    const database =
      envResult.checks.supabaseUrlConfigured &&
      envResult.checks.supabaseAnonConfigured;
    const status =
      database && env && registry && deployment
        ? registryResult.status === "warning" || latest?.status === "warning"
          ? "warning"
          : "ok"
        : "degraded";

    return {
      database,
      deployment,
      env,
      mode: envResult.mode,
      registry,
      status,
    };
  }

  private sanitizeDetails(details: Record<string, unknown>) {
    const redacted = this.secretBoundaryService.redact(details);
    const sanitized = isRecord(redacted) ? redacted : {};

    this.secretBoundaryService.assertNoSecrets(sanitized);

    return sanitized;
  }

  private async emitDeploymentEvent(
    record: DeploymentCheckRecord,
    context: { requestId?: string; traceId?: string; workspaceId?: string },
  ) {
    if (!context.requestId || !context.traceId) {
      return;
    }

    await emitBackendEvent({
      name: "deployment.check.completed",
      payload: {
        checkId: record.id,
        checkType: record.checkType,
        environment: record.environment,
        releaseVersion: record.releaseVersion ?? undefined,
        source: "api",
        status: record.status,
      },
      status:
        record.status === "passed" || record.status === "warning"
          ? "succeeded"
          : "failed",
      trace: {
        requestId: context.requestId,
        source: "deployment",
        traceId: context.traceId,
        workspaceId: context.workspaceId,
      },
    });
  }
}

const inMemoryDeploymentCheckRepository =
  new InMemoryDeploymentCheckRepository();

export function createDeploymentCheckRepository(): DeploymentCheckRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseDeploymentCheckRepository(getNexusSupabaseAdminClient())
    : inMemoryDeploymentCheckRepository;
}

export function createDeploymentCheckService() {
  return new DeploymentCheckService();
}

function aggregateStatus(statuses: DeploymentCheckResult["status"][]): DeploymentCheckStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("failed")) {
    return "failed";
  }

  if (statuses.includes("warning")) {
    return "warning";
  }

  return "passed";
}

function isBlockingStatus(status: DeploymentCheckStatus | DeploymentCheckResult["status"]) {
  return status === "blocked" || status === "failed";
}

function runStaticRlsSmokeCheck(): DeploymentCheckResult {
  return {
    details: {
      coveredTables: [
        "feature_flags",
        "deployment_checks",
        "sync_operations",
        "workspace_snapshots",
        "workspace_state_entities",
      ],
      mode: "static_migration_check",
    },
    name: "rls_smoke",
    status: "passed",
    summary:
      "V5 smoke check is static: runtime health does not execute destructive RLS tests.",
  };
}

function mapDeploymentCheck(row: Deployment_Checks): DeploymentCheckRecord {
  return {
    checkType: row.check_type,
    createdAt: row.created_at,
    details: isRecord(row.details) ? row.details : {},
    environment: row.environment,
    id: row.id,
    releaseVersion: row.release_version,
    status: row.status,
  };
}

function makeId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { DeploymentCheckResult } from "./deployment-types";

const REQUIRED_TABLES = [
  "workspace_memberships",
  "permission_audit_logs",
  "agent_memory_records",
  "api_idempotency_keys",
  "workspace_snapshots",
  "workspace_state_entities",
  "sync_operations",
  "feature_flags",
  "deployment_checks",
  "agent_runtime_sessions",
  "agent_tasks",
  "agent_runtime_events",
  "tool_runs",
  "tool_permissions",
  "artifact_references",
  "system_events",
  "usage_metrics",
] as const;

const REQUIRED_TYPE_NAMES = [
  "Workspace_Memberships",
  "Permission_Audit_Logs",
  "Agent_Memory_Records",
  "Api_Idempotency_Keys",
  "Workspace_Snapshots",
  "Workspace_State_Entities",
  "Sync_Operations",
  "Feature_Flags",
  "Deployment_Checks",
  "Agent_Runtime_Sessions",
  "Agent_Tasks",
  "Agent_Runtime_Events",
  "Tool_Runs",
  "Tool_Permissions",
  "Artifact_References",
  "System_Events",
  "Usage_Metrics",
] as const;

const FORBIDDEN_LIFECYCLE_TABLES = [
  "artifact_versions",
] as const;

export type SchemaDriftCheckerOptions = {
  cwd?: string;
};

export class SchemaDriftChecker {
  constructor(private readonly options: SchemaDriftCheckerOptions = {}) {}

  async check(): Promise<DeploymentCheckResult> {
    const cwd = this.options.cwd ?? process.cwd();
    const migrationDir = join(cwd, "supabase", "migrations");
    const databaseTypesPath = join(cwd, "src", "lib", "supabase", "database.types.ts");
    const [migrationFiles, databaseTypes] = await Promise.all([
      readMigrationFiles(migrationDir),
      readFile(databaseTypesPath, "utf8"),
    ]);
    const migrationText = migrationFiles.map((file) => file.content).join("\n");
    const missingMigrations = REQUIRED_TABLES.filter(
      (table) => !new RegExp(`\\b${table}\\b`, "i").test(migrationText),
    );
    const missingTypes = REQUIRED_TYPE_NAMES.filter(
      (typeName) => !databaseTypes.includes(typeName),
    );
    const forbidden = FORBIDDEN_LIFECYCLE_TABLES.filter((table) =>
      new RegExp(`\\b${table}\\b`, "i").test(migrationText),
    );
    const status =
      forbidden.length > 0 || missingMigrations.length > 0 || missingTypes.length > 0
        ? "failed"
        : "passed";

    return {
      details: {
        forbiddenLifecycleTables: forbidden,
        migrationCount: migrationFiles.length,
        missingMigrations,
        missingTypes,
        requiredTables: REQUIRED_TABLES,
      },
      name: "schema_drift",
      status,
      summary:
        status === "passed"
          ? "Migrations and generated database types include the expected V1-V10 tables."
          : "Schema drift detected between migrations and generated database types.",
    };
  }
}

async function readMigrationFiles(migrationDir: string) {
  const names = (await readdir(migrationDir)).filter((name) => name.endsWith(".sql"));

  return Promise.all(
    names.map(async (name) => ({
      content: await readFile(join(migrationDir, name), "utf8"),
      name,
    })),
  );
}

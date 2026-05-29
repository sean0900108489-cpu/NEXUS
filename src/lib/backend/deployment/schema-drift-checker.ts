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

const REQUIRED_MIGRATION_REQUIREMENTS = [
  {
    name: "artifacts.content_text",
    pattern: /\bADD COLUMN IF NOT EXISTS content_text\b/i,
  },
  {
    name: "artifacts.content_hash",
    pattern: /\bADD COLUMN IF NOT EXISTS content_hash\b/i,
  },
  {
    name: "artifacts.content_size_bytes",
    pattern: /\bADD COLUMN IF NOT EXISTS content_size_bytes\b/i,
  },
  {
    name: "artifacts.source_tool_run_id",
    pattern: /\bADD COLUMN IF NOT EXISTS source_tool_run_id\b/i,
  },
  {
    name: "artifacts.status_check",
    pattern: /\bartifacts_status_check\b/i,
  },
  {
    name: "tool_runs.table",
    pattern: /\bCREATE TABLE IF NOT EXISTS public\.tool_runs\b/i,
  },
  {
    name: "tool_runs.executable_input",
    pattern: /\bexecutable_input jsonb NOT NULL DEFAULT '\{\}'::jsonb\b/i,
  },
  {
    name: "tool_runs.risk_level_check",
    pattern: /\btool_runs_risk_level_check\b/i,
  },
  {
    name: "tool_permissions.table",
    pattern: /\bCREATE TABLE IF NOT EXISTS public\.tool_permissions\b/i,
  },
  {
    name: "tool_permissions.unique_scope",
    pattern: /\btool_permissions_workspace_tool_scope_unique\b/i,
  },
] as const;

const REQUIRED_TYPE_MEMBER_SNIPPETS = [
  {
    name: "Artifacts.content_text",
    snippet: "content_text: string | null",
  },
  {
    name: "Artifacts.content_hash",
    snippet: "content_hash: string | null",
  },
  {
    name: "Artifacts.content_size_bytes",
    snippet: "content_size_bytes: number | null",
  },
  {
    name: "Artifacts.source_tool_run_id",
    snippet: "source_tool_run_id: string | null",
  },
  {
    name: "Tool_Runs.executable_input",
    snippet: "executable_input: Record<string, unknown>",
  },
  {
    name: "Tool_Runs.output_redacted",
    snippet: "output_redacted: Record<string, unknown> | null",
  },
  {
    name: "Tool_Permissions.requires_confirmation",
    snippet: "requires_confirmation: boolean",
  },
] as const;

const REQUIRED_REPAIR_MARKERS = [
  "R3 live schema parity repair: artifacts and tool_runs",
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
    const missingMigrationRequirements = REQUIRED_MIGRATION_REQUIREMENTS
      .filter((requirement) => !requirement.pattern.test(migrationText))
      .map((requirement) => requirement.name);
    const missingTypeMembers = REQUIRED_TYPE_MEMBER_SNIPPETS
      .filter((requirement) => !databaseTypes.includes(requirement.snippet))
      .map((requirement) => requirement.name);
    const missingRepairMarkers = REQUIRED_REPAIR_MARKERS.filter(
      (marker) => !migrationText.includes(marker),
    );
    const forbidden = FORBIDDEN_LIFECYCLE_TABLES.filter((table) =>
      new RegExp(`\\b${table}\\b`, "i").test(migrationText),
    );
    const status =
      forbidden.length > 0 ||
      missingMigrations.length > 0 ||
      missingTypes.length > 0 ||
      missingMigrationRequirements.length > 0 ||
      missingTypeMembers.length > 0 ||
      missingRepairMarkers.length > 0
        ? "failed"
        : "passed";

    return {
      details: {
        forbiddenLifecycleTables: forbidden,
        migrationCount: migrationFiles.length,
        missingMigrationRequirements,
        missingMigrations,
        missingRepairMarkers,
        missingTypeMembers,
        missingTypes,
        requiredTables: REQUIRED_TABLES,
      },
      name: "schema_drift",
      status,
      summary:
        status === "passed"
          ? "Migrations and generated database types include the expected V1-V10 tables, R3 repair marker, and artifact/tool column parity."
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

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const migrationsDir = join(cwd, "supabase", "migrations");
const databaseTypesPath = join(cwd, "src", "lib", "supabase", "database.types.ts");
const registryCheckerPath = join(
  cwd,
  "src",
  "lib",
  "backend",
  "deployment",
  "registry-consistency-checker.ts",
);

const requiredTables = [
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
];

const requiredTypeNames = [
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
];

const forbiddenLifecycleTables = [
  "artifact_versions",
];

const migrationText = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
  .join("\n");
const databaseTypes = readFileSync(databaseTypesPath, "utf8");
const registryChecker = readFileSync(registryCheckerPath, "utf8");

const failures = [];

for (const table of requiredTables) {
  if (!new RegExp(`\\b${table}\\b`, "i").test(migrationText)) {
    failures.push(`Missing migration coverage for ${table}`);
  }
}

for (const typeName of requiredTypeNames) {
  if (!databaseTypes.includes(typeName)) {
    failures.push(`Missing generated database type ${typeName}`);
  }
}

for (const table of forbiddenLifecycleTables) {
  if (new RegExp(`\\b${table}\\b`, "i").test(migrationText)) {
    failures.push(`Forbidden lifecycle table found in migrations: ${table}`);
  }
}

for (const expected of [
  "mock-review-mesh",
  "mock.review-mesh",
  "real-video-gen",
  "mock-video-gen",
]) {
  if (!registryChecker.includes(expected)) {
    failures.push(`Registry checker is missing declared alias/fallback ${expected}`);
  }
}

const result = {
  checkedAt: new Date().toISOString(),
  failures,
  ok: failures.length === 0,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

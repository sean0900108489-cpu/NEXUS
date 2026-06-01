import pg from "pg";

const { Client } = pg;

const requiredTables = [
  "workspaces",
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
  "artifacts",
  "messages",
  "system_events",
  "usage_metrics",
  "workflow_templates",
  "prompts",
  "prompt_revisions",
  "notebooks",
];

const requiredColumns = {
  agent_memory_records: [
    "id",
    "workspace_id",
    "agent_id",
    "memory_type",
    "content",
    "content_hash",
    "intensity",
    "source_task_id",
    "created_at",
    "updated_at",
  ],
  deployment_checks: [
    "id",
    "release_version",
    "environment",
    "check_type",
    "status",
    "details",
    "created_at",
  ],
  feature_flags: [
    "id",
    "flag_key",
    "scope_key",
    "enabled",
    "rollout_percentage",
    "metadata",
    "created_at",
    "updated_at",
  ],
  artifacts: [
    "content_text",
    "content_hash",
    "content_size_bytes",
    "preview_text",
    "source_task_id",
    "source_tool_run_id",
  ],
  tool_runs: [
    "input_redacted",
    "executable_input",
    "output_redacted",
    "output_hash",
    "artifact_id",
  ],
  workspace_state_entities: ["updated_at"],
};

const requiredPolicies = {
  agent_memory_records: [
    "agent_memory_records_select_member",
    "agent_memory_records_write_editor",
  ],
  feature_flags: [
    "feature_flags_insert_workspace_admin",
    "feature_flags_select_visible_scope",
    "feature_flags_update_workspace_admin",
  ],
};

const requiredTriggers = [
  ["agent_memory_records", "set_agent_memory_records_updated_at"],
  ["feature_flags", "set_feature_flags_updated_at"],
  ["workspace_state_entities", "set_workspace_state_entities_updated_at"],
];

const expectedAuthenticatedGrants = {
  agent_memory_records: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  deployment_checks: [],
  feature_flags: ["INSERT", "SELECT", "UPDATE"],
};

const requiredMigrationNames = [
  "v20_schema_live_parity_repair",
  "v20_schema_live_parity_grant_tightening",
];

const required = readBoolean(process.env.SCHEMA_LIVE_PARITY_REQUIRED);
const connectionString =
  process.env.SCHEMA_LIVE_PARITY_DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  const result = {
    checkedAt: new Date().toISOString(),
    failures: required
      ? [
          "Missing SCHEMA_LIVE_PARITY_DATABASE_URL, SUPABASE_DB_URL, or DATABASE_URL for required live schema parity scan.",
        ]
      : [],
    ok: !required,
    skipped: true,
    warnings: required
      ? []
      : [
          "Live schema parity scan skipped because no read-only database URL is configured.",
        ],
  };

  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
} else {
  const result = await runLiveScan(connectionString);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

async function runLiveScan(connectionString) {
  const failures = [];
  const warnings = [];
  const metadata = {
    expectedProjectRef: projectRefFromSupabaseUrl(
      process.env.SCHEMA_LIVE_PARITY_EXPECTED_REF ??
        process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    liveProjectRef: projectRefFromDatabaseUrl(connectionString),
  };

  if (
    metadata.expectedProjectRef &&
    metadata.liveProjectRef &&
    metadata.expectedProjectRef !== metadata.liveProjectRef
  ) {
    failures.push(
      `Database URL project ref does not match expected Supabase ref: ${metadata.liveProjectRef} != ${metadata.expectedProjectRef}`,
    );
  }

  const client = new Client({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  try {
    const tables = await querySet(
      client,
      "select table_name from information_schema.tables where table_schema = 'public'",
      "table_name",
    );

    for (const table of requiredTables) {
      if (!tables.has(table)) {
        failures.push(`Missing live table: public.${table}`);
      }
    }

    const columns = await queryRows(
      client,
      `select table_name, column_name
       from information_schema.columns
       where table_schema = 'public'
       order by table_name, ordinal_position`,
    );
    const columnsByTable = groupToSet(columns, "table_name", "column_name");

    for (const [table, expectedColumns] of Object.entries(requiredColumns)) {
      const liveColumns = columnsByTable.get(table) ?? new Set();
      for (const column of expectedColumns) {
        if (!liveColumns.has(column)) {
          failures.push(`Missing live column: public.${table}.${column}`);
        }
      }
    }

    const rlsRows = await queryRows(
      client,
      `select tablename, rowsecurity
       from pg_tables
       where schemaname = 'public'`,
    );
    const rlsByTable = new Map(rlsRows.map((row) => [row.tablename, row.rowsecurity]));

    for (const table of requiredTables) {
      if (tables.has(table) && rlsByTable.get(table) !== true) {
        failures.push(`RLS is not enabled on public.${table}`);
      }
    }

    const policyRows = await queryRows(
      client,
      `select tablename, policyname
       from pg_policies
       where schemaname = 'public'
       order by tablename, policyname`,
    );
    const policiesByTable = groupToSet(policyRows, "tablename", "policyname");

    for (const [table, expectedPolicies] of Object.entries(requiredPolicies)) {
      const livePolicies = policiesByTable.get(table) ?? new Set();
      for (const policy of expectedPolicies) {
        if (!livePolicies.has(policy)) {
          failures.push(`Missing live RLS policy: public.${table}.${policy}`);
        }
      }
    }

    const triggerRows = await queryRows(
      client,
      `select event_object_table as table_name, trigger_name
       from information_schema.triggers
       where trigger_schema = 'public'`,
    );
    const triggersByTable = groupToSet(triggerRows, "table_name", "trigger_name");

    for (const [table, trigger] of requiredTriggers) {
      if (!(triggersByTable.get(table) ?? new Set()).has(trigger)) {
        failures.push(`Missing live trigger: public.${table}.${trigger}`);
      }
    }

    const grantRows = await queryRows(
      client,
      `select table_name, grantee, privilege_type
       from information_schema.role_table_grants
       where table_schema = 'public'
         and table_name = any($1)
         and grantee in ('anon', 'authenticated')`,
      [Object.keys(expectedAuthenticatedGrants)],
    );
    const grants = new Map();

    for (const row of grantRows) {
      const key = `${row.table_name}:${row.grantee}`;
      const values = grants.get(key) ?? new Set();
      values.add(row.privilege_type);
      grants.set(key, values);
    }

    for (const [table, expected] of Object.entries(expectedAuthenticatedGrants)) {
      const anonGrants = grants.get(`${table}:anon`) ?? new Set();
      if (anonGrants.size > 0) {
        failures.push(`Anon has table grants on public.${table}`);
      }

      const authenticated = grants.get(`${table}:authenticated`) ?? new Set();
      const expectedSet = new Set(expected);
      const extra = [...authenticated].filter((grant) => !expectedSet.has(grant));
      const missing = [...expectedSet].filter((grant) => !authenticated.has(grant));

      if (extra.length > 0) {
        failures.push(
          `Authenticated has extra grants on public.${table}: ${extra.sort().join(",")}`,
        );
      }

      if (missing.length > 0) {
        failures.push(
          `Authenticated is missing grants on public.${table}: ${missing.sort().join(",")}`,
        );
      }
    }

    try {
      const migrations = await querySet(
        client,
        "select name from supabase_migrations.schema_migrations",
        "name",
      );

      for (const migration of requiredMigrationNames) {
        if (!migrations.has(migration)) {
          failures.push(`Missing live migration history entry: ${migration}`);
        }
      }
    } catch (error) {
      warnings.push(`Migration history check unavailable: ${safeErrorMessage(error)}`);
    }
  } finally {
    await client.end();
  }

  return {
    checkedAt: new Date().toISOString(),
    failures,
    metadata,
    ok: failures.length === 0,
    skipped: false,
    warnings,
  };
}

async function queryRows(client, sql, values = []) {
  const response = await client.query(sql, values);
  return response.rows;
}

async function querySet(client, sql, column) {
  return new Set((await queryRows(client, sql)).map((row) => row[column]));
}

function groupToSet(rows, keyName, valueName) {
  const groups = new Map();

  for (const row of rows) {
    const key = row[keyName];
    const value = row[valueName];
    const values = groups.get(key) ?? new Set();
    values.add(value);
    groups.set(key, values);
  }

  return groups;
}

function shouldUseSsl(connectionString) {
  const url = new URL(connectionString);

  if (url.searchParams.get("sslmode") === "disable") {
    return false;
  }

  return !["127.0.0.1", "localhost", "::1"].includes(url.hostname);
}

function projectRefFromDatabaseUrl(value) {
  try {
    const host = new URL(value).hostname;
    const match = host.match(/^db\\.([a-z0-9-]+)\\.supabase\\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function projectRefFromSupabaseUrl(value) {
  if (!value) {
    return null;
  }

  if (/^[a-z0-9-]+$/.test(value)) {
    return value;
  }

  try {
    const host = new URL(value).hostname;
    const match = host.match(/^([a-z0-9-]+)\\.supabase\\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function readBoolean(value) {
  return ["1", "true", "yes", "required"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

function safeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-db-url]");
  }

  return "unknown error";
}

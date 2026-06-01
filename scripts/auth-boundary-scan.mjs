#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const apiRoot = join(projectRoot, "src/app/api");
const blockingFindings = [];

const legacyProductionBlockedRoutes = [
  "src/app/api/agent-stream/route.ts",
  "src/app/api/image-gen/route.ts",
  "src/app/api/memory-compress/route.ts",
  "src/app/api/predictive-intel/route.ts",
  "src/app/api/tools/fs-scanner/route.ts",
  "src/app/api/tools/web-surfer/route.ts",
  "src/app/api/v1/providers/verify/route.ts",
];

const protectedClientTables = [
  "agent_runtime_events",
  "agent_runtime_sessions",
  "agent_tasks",
  "artifact_references",
  "artifacts",
  "messages",
  "notebooks",
  "prompt_revisions",
  "prompts",
  "sync_operations",
  "system_events",
  "tool_permissions",
  "tool_runs",
  "usage_metrics",
  "workflow_templates",
  "workspace_memberships",
  "workspace_snapshots",
  "workspace_state_entities",
  "workspaces",
];

const routeFiles = readFiles(apiRoot).filter((filePath) => filePath.endsWith(`${sep}route.ts`));
const routeInventory = routeFiles.map((filePath) => {
  const relativePath = toPosix(relative(projectRoot, filePath));
  const source = readFileSync(filePath, "utf8");

  return {
    apiPath: routePathFor(relativePath),
    file: relativePath,
    hasApiHandler: source.includes("apiHandler("),
    hasAuthRequired: /auth\s*:\s*\{[\s\S]*?required\s*:\s*true/.test(source),
    hasLegacyProductionBlock: source.includes("blockLegacyToolRouteInProduction"),
    hasPermission: /\bpermission\s*:/.test(source),
    hasStreamBoundary: source.includes("createAgentStreamResponse"),
    methods: exportedMethods(source),
    readsUserHeader: /headers\.get\(["']X-User-Id["']\)/i.test(source),
    readsWorkspaceHeader: /headers\.get\(["']X-Workspace-Id["']\)/i.test(source),
  };
});

for (const route of legacyProductionBlockedRoutes) {
  const source = readRequired(route);

  if (!source.includes("blockLegacyToolRouteInProduction")) {
    blockingFindings.push({
      code: "legacyRoute.productionBlockMissing",
      file: route,
      message: "Legacy/provider egress route is missing the production block helper.",
    });
  }
}

const runtimeAuthSource = readRequired("src/lib/backend/api/memory-compress-service.ts");
const runtimeAuthFunction = extractFunction(runtimeAuthSource, "getRuntimeBearerToken");

if (!runtimeAuthFunction.includes('headers.get("X-Nexus-Runtime-Authorization")')) {
  blockingFindings.push({
    code: "runtimeAuth.headerMissing",
    file: "src/lib/backend/api/memory-compress-service.ts",
    message: "Runtime provider auth must only use X-Nexus-Runtime-Authorization.",
  });
}

if (/headers\.get\(["']authorization["']\)/i.test(runtimeAuthFunction)) {
  blockingFindings.push({
    code: "runtimeAuth.supabaseAuthorizationFallback",
    file: "src/lib/backend/api/memory-compress-service.ts",
    message: "Runtime provider auth must not fall back to the Supabase Authorization header.",
  });
}

const storeSource = readRequired("src/store/nexus-store.ts");

if (!storeSource.includes("authVault: prepareAuthVaultForLocalPersistence(state.authVault)")) {
  blockingFindings.push({
    code: "browserStorage.authVaultScrubMissing",
    file: "src/store/nexus-store.ts",
    message: "Persisted authVault must pass through the local persistence scrubber.",
  });
}

if (storeSource.includes("authVault: state.authVault")) {
  blockingFindings.push({
    code: "browserStorage.rawAuthVaultPersisted",
    file: "src/store/nexus-store.ts",
    message: "Raw authVault must not be persisted to browser-readable storage.",
  });
}

if (!/version\s*:\s*15/.test(storeSource)) {
  blockingFindings.push({
    code: "browserStorage.persistenceVersionNotAdvanced",
    file: "src/store/nexus-store.ts",
    message: "Persistence version must migrate legacy browser-stored auth secrets.",
  });
}

if (!/globalApiKey\s*:\s*null/.test(storeSource) || !/apiKey\s*:\s*null/.test(storeSource)) {
  blockingFindings.push({
    code: "browserStorage.secretScrubShapeMissing",
    file: "src/store/nexus-store.ts",
    message: "Local auth persistence scrubber must null raw global and provider API keys.",
  });
}

const hardeningMigrationPath =
  "supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql";
const hardeningMigration = existsSync(join(projectRoot, hardeningMigrationPath))
  ? readRequired(hardeningMigrationPath)
  : "";
const clientGrantHardeningMigrationPath =
  "supabase/migrations/20260601002000_v20_client_grant_hardening.sql";
const clientGrantHardeningMigration = existsSync(
  join(projectRoot, clientGrantHardeningMigrationPath),
)
  ? readRequired(clientGrantHardeningMigrationPath)
  : "";

if (!hardeningMigration) {
  blockingFindings.push({
    code: "supabase.hardeningMigrationMissing",
    file: hardeningMigrationPath,
    message: "V20 RLS/grant hardening migration is missing.",
  });
} else {
  if (!hardeningMigration.includes("DROP POLICY IF EXISTS workspaces_insert_owner_or_legacy")) {
    blockingFindings.push({
      code: "supabase.ownerlessWorkspaceInsertPolicyNotDropped",
      file: hardeningMigrationPath,
      message: "Migration must drop the legacy ownerless workspace insert policy.",
    });
  }

  if (/owner_user_id\s+IS\s+NULL/i.test(hardeningMigration)) {
    blockingFindings.push({
      code: "supabase.ownerlessWorkspaceWriteBridgePresent",
      file: hardeningMigrationPath,
      message: "Migration must not preserve owner_user_id IS NULL workspace write bridges.",
    });
  }

  for (const table of ["api_idempotency_keys", "permission_audit_logs"]) {
    if (
      !hardeningMigration.includes(
        `REVOKE ALL PRIVILEGES ON TABLE public.${table} FROM anon, authenticated, PUBLIC`,
      )
    ) {
      blockingFindings.push({
        code: "supabase.serverOnlyClientGrantNotRevoked",
        file: hardeningMigrationPath,
        message: `Migration must revoke anon/authenticated grants on ${table}.`,
      });
    }
  }
}

if (!clientGrantHardeningMigration) {
  blockingFindings.push({
    code: "supabase.clientGrantHardeningMigrationMissing",
    file: clientGrantHardeningMigrationPath,
    message: "V20 client grant hardening migration is missing.",
  });
} else {
  if (
    !clientGrantHardeningMigration.includes(
      "'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, PUBLIC'",
    )
  ) {
    blockingFindings.push({
      code: "supabase.anonClientGrantRevokeMissing",
      file: clientGrantHardeningMigrationPath,
      message: "Migration must revoke anon grants from protected client tables.",
    });
  }

  if (
    !clientGrantHardeningMigration.includes(
      "'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated'",
    )
  ) {
    blockingFindings.push({
      code: "supabase.authenticatedGrantResetMissing",
      file: clientGrantHardeningMigrationPath,
      message: "Migration must reset authenticated grants before rebuilding DML allowlists.",
    });
  }

  for (const table of protectedClientTables) {
    if (!clientGrantHardeningMigration.includes(`('${table}',`)) {
      blockingFindings.push({
        code: "supabase.protectedClientTableGrantNotCovered",
        file: clientGrantHardeningMigrationPath,
        message: `Client grant hardening migration must cover ${table}.`,
      });
    }
  }
}

const report = {
  blockingFindings,
  browserStorageGate: {
    authVaultScrubbedBeforePersist: storeSource.includes(
      "authVault: prepareAuthVaultForLocalPersistence(state.authVault)",
    ),
    persistenceVersion: Number(/version\s*:\s*(\d+)/.exec(storeSource)?.[1] ?? 0),
  },
  legacyProductionGate: {
    requiredRoutes: legacyProductionBlockedRoutes.length,
    routesWithProductionBlock: legacyProductionBlockedRoutes.filter((route) =>
      readRequired(route).includes("blockLegacyToolRouteInProduction"),
    ).length,
  },
  routeInventory: {
    apiHandlerRoutes: routeInventory.filter((route) => route.hasApiHandler).length,
    authRequiredRoutes: routeInventory.filter((route) => route.hasAuthRequired).length,
    permissionRoutes: routeInventory.filter((route) => route.hasPermission).length,
    protectedRoutes: routeInventory.filter(
      (route) => route.hasAuthRequired || route.hasPermission || route.hasStreamBoundary,
    ).length,
    routes: routeInventory,
    total: routeInventory.length,
  },
  runtimeAuthGate: {
    usesRuntimeAuthorizationHeader: runtimeAuthFunction.includes(
      'headers.get("X-Nexus-Runtime-Authorization")',
    ),
    usesSupabaseAuthorizationFallback:
      /headers\.get\(["']authorization["']\)/i.test(runtimeAuthFunction),
  },
  supabaseGate: {
    clientGrantHardeningMigrationPresent: Boolean(clientGrantHardeningMigration),
    hardeningMigrationPresent: Boolean(hardeningMigration),
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (blockingFindings.length > 0) {
  process.exitCode = 1;
}

function readFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return readFiles(path);
    }

    return [path];
  });
}

function readRequired(relativePath) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function routePathFor(relativePath) {
  return relativePath
    .replace(/^src\/app/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\[([^\]]+)\]/g, ":$1");
}

function exportedMethods(source) {
  const methods = new Set();
  const methodPattern =
    /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  let match;

  while ((match = methodPattern.exec(source))) {
    methods.add(match[1]);
  }

  return Array.from(methods).sort();
}

function extractFunction(source, name) {
  const signatureIndex = source.indexOf(`function ${name}`);

  if (signatureIndex === -1) {
    return "";
  }

  const bodyStart = source.indexOf("{", signatureIndex);

  if (bodyStart === -1) {
    return source.slice(signatureIndex);
  }

  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    }

    if (depth === 0) {
      return source.slice(signatureIndex, index + 1);
    }
  }

  return source.slice(signatureIndex);
}

#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const apiRoot = join(projectRoot, "src/app/api");
const baseUrl = readBaseUrl();
const timeoutMs = Number(process.env.AUTH_BOUNDARY_LIVE_TIMEOUT_MS ?? 5000);
const publicGetRoutes = new Set([
  "GET /api/v1/health",
  "GET /api/v1/public-config",
]);

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
  };
});

const probes = routeInventory.flatMap((route) =>
  route.methods
    .filter((method) => method !== "HEAD" && method !== "OPTIONS")
    .map((method) => ({
      apiPath: route.apiPath,
      expectation: classifyExpectation(route, method),
      file: route.file,
      method,
      urlPath: probePathFor(route.apiPath),
    }))
    .filter((probe) => probe.expectation !== "skip"),
);

const results = [];
const blockingFindings = [];
const warnings = [];

for (const probe of probes) {
  const result = await runProbe(probe);

  results.push(result);

  if (result.expectation === "publicReachable") {
    if (result.status !== 200) {
      blockingFindings.push({
        apiPath: result.apiPath,
        code: "publicRoute.unexpectedStatus",
        expected: 200,
        file: result.file,
        method: result.method,
        status: result.status,
      });
    }
    continue;
  }

  if (result.expectation === "legacyProduction404") {
    if (result.status !== 404) {
      blockingFindings.push({
        apiPath: result.apiPath,
        code: "legacyRoute.productionBlockFailed",
        expected: 404,
        file: result.file,
        method: result.method,
        status: result.status,
      });
    }
    continue;
  }

  if (result.status >= 200 && result.status < 400) {
    blockingFindings.push({
      apiPath: result.apiPath,
      code: "protectedRoute.spoofOnlyAccepted",
      expected: "non-2xx/3xx",
      file: result.file,
      method: result.method,
      status: result.status,
    });
  } else if (result.status >= 500) {
    warnings.push({
      apiPath: result.apiPath,
      code: "protectedRoute.serverError",
      file: result.file,
      method: result.method,
      status: result.status,
    });
  }
}

const report = {
  baseUrl: redactBaseUrl(baseUrl),
  blockingFindings,
  counts: {
    blockingFindings: blockingFindings.length,
    legacyProduction404: results.filter((result) => result.expectation === "legacyProduction404").length,
    protectedSpoofOnly: results.filter((result) => result.expectation === "protectedRejectsSpoofOnly").length,
    publicReachable: results.filter((result) => result.expectation === "publicReachable").length,
    totalProbes: results.length,
    warnings: warnings.length,
  },
  probeMode: {
    bodyCaptured: false,
    credentialsSent: false,
    destructivePayloads: false,
    headers: [
      "X-User-Id",
      "X-Workspace-Id",
      "X-Request-Id",
      "X-Idempotency-Key",
    ],
  },
  results,
  routeInventory: {
    protectedRoutes: routeInventory.filter(
      (route) => route.hasAuthRequired || route.hasPermission || route.hasStreamBoundary,
    ).length,
    routes: routeInventory.length,
  },
  warnings,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (blockingFindings.length > 0) {
  process.exitCode = 1;
}

async function runProbe(probe) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(probe.urlPath, baseUrl), {
      body: isMutationMethod(probe.method) ? JSON.stringify(safeMutationBody(probe.apiPath)) : undefined,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Idempotency-Key": `live-boundary-${crypto.randomUUID()}`,
        "X-Request-Id": `live-boundary-${crypto.randomUUID()}`,
        "X-User-Id": "spoof-user-live-probe",
        "X-Workspace-Id": "workspace-spoof-live-probe",
      },
      method: probe.method,
      redirect: "manual",
      signal: controller.signal,
    });

    await response.arrayBuffer();

    return {
      apiPath: probe.apiPath,
      expectation: probe.expectation,
      file: probe.file,
      method: probe.method,
      status: response.status,
    };
  } catch (error) {
    return {
      apiPath: probe.apiPath,
      error: error instanceof Error ? error.name : "ProbeError",
      expectation: probe.expectation,
      file: probe.file,
      method: probe.method,
      status: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function classifyExpectation(route, method) {
  const key = `${method} ${route.apiPath}`;

  if (publicGetRoutes.has(key)) {
    return "publicReachable";
  }

  if (route.hasLegacyProductionBlock) {
    return "legacyProduction404";
  }

  if (route.hasAuthRequired || route.hasPermission || route.hasStreamBoundary) {
    return "protectedRejectsSpoofOnly";
  }

  return "skip";
}

function readBaseUrl() {
  const argIndex = process.argv.indexOf("--base-url");
  const raw =
    argIndex === -1
      ? process.env.AUTH_BOUNDARY_LIVE_BASE_URL
      : process.argv[argIndex + 1];

  if (!raw) {
    process.stderr.write(
      "Set AUTH_BOUNDARY_LIVE_BASE_URL or pass --base-url http://127.0.0.1:<port>.\n",
    );
    process.exit(2);
  }

  return new URL(raw);
}

function safeMutationBody(apiPath) {
  if (apiPath.includes("/agents/:agentId/stream") || apiPath === "/api/agent-stream") {
    return {
      agent: {
        callsign: "LIVE",
        contextNotes: [],
        identity: "live boundary probe",
        memory: [],
        mission: "Verify auth boundary without credentials.",
        model: "gpt-4o-mini",
        provider: "openai-compatible",
        title: "Live Boundary Probe",
      },
      messages: [{ content: "hello", role: "user" }],
      model: "gpt-4o-mini",
      workspaceId: "workspace-spoof-live-probe",
    };
  }

  return {
    clientMutationId: "live-boundary-probe",
    contentText: "live boundary probe",
    entityId: "live-boundary-entity",
    entityType: "prompt",
    operationType: "upsert",
    payload: {},
    title: "Live boundary probe",
    type: "text",
    workspaceId: "workspace-spoof-live-probe",
  };
}

function probePathFor(apiPath) {
  return apiPath
    .replaceAll(":agentId", "agent-live-probe")
    .replaceAll(":artifactId", "artifact-live-probe")
    .replaceAll(":flagKey", "flag-live-probe")
    .replaceAll(":operationId", "operation-live-probe")
    .replaceAll(":taskId", "task-live-probe")
    .replaceAll(":toolId", "tool-live-probe")
    .replaceAll(":toolRunId", "tool-run-live-probe")
    .replaceAll(":traceId", "trace-live-probe")
    .replaceAll(":workspaceId", "workspace-spoof-live-probe");
}

function redactBaseUrl(url) {
  return `${url.protocol}//${url.host}`;
}

function isMutationMethod(method) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
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

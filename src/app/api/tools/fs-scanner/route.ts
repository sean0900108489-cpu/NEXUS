import { readdir, realpath } from "node:fs/promises";
import path from "node:path";

import type { FileSystemScanResult, FileSystemTreeNode } from "@/lib/nexus-types";
import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";
import { LOCAL_FS_SCANNER_PERMISSIONS } from "@/lib/tools/fs-scanner-executor";

export const runtime = "nodejs";

const IGNORED_NAMES = new Set([".git", ".next", "node_modules"]);
const SENSITIVE_ENV_FILE_PATTERN = /^\.env(?:\.(?!example$).*)?$/;
const IGNORED_REPORT = [
  ...IGNORED_NAMES,
  ".env* except .env.example",
].sort();
const DEFAULT_MAX_DEPTH = 3;
const MAX_ALLOWED_DEPTH = 3;
const MAX_ENTRIES_PER_DIRECTORY = 160;

type ScannerPayload = {
  maxDepth?: unknown;
  path?: unknown;
};

class SecuritySandboxViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecuritySandboxViolation";
  }
}

function normalizeDepth(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAX_DEPTH;
  }

  return Math.max(0, Math.min(MAX_ALLOWED_DEPTH, Math.floor(value)));
}

function toProjectPath(rootDir: string, absolutePath: string) {
  const relative = path.relative(rootDir, absolutePath);

  return relative ? relative.split(path.sep).join("/") : ".";
}

function normalizeScanPath(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "./src";
  }

  return value.trim();
}

function shouldIgnore(name: string) {
  return IGNORED_NAMES.has(name) || SENSITIVE_ENV_FILE_PATTERN.test(name);
}

function isInsideAllowedPath(targetPath: string, allowedPath: string) {
  return targetPath === allowedPath || targetPath.startsWith(`${allowedPath}${path.sep}`);
}

async function resolveExistingPath(absolutePath: string) {
  return realpath(absolutePath).catch(() => absolutePath);
}

async function resolveSandboxedScanRoot({
  projectRoot,
  requestedPath,
}: {
  projectRoot: string;
  requestedPath: string;
}) {
  const normalizedRequest = requestedPath.replaceAll("\\", "/");

  if (path.isAbsolute(normalizedRequest)) {
    throw new SecuritySandboxViolation(
      "Security Sandbox Violation: absolute paths are not allowed.",
    );
  }

  const resolvedTarget = path.resolve(projectRoot, normalizedRequest);
  const targetPath = await resolveExistingPath(resolvedTarget);
  const allowedPaths = await Promise.all(
    (LOCAL_FS_SCANNER_PERMISSIONS.allowedPaths ?? []).map((allowedPath) =>
      resolveExistingPath(path.resolve(projectRoot, allowedPath)),
    ),
  );
  const allowed = allowedPaths.some((allowedPath) =>
    isInsideAllowedPath(targetPath, allowedPath),
  );

  if (!allowed) {
    throw new SecuritySandboxViolation(
      `Security Sandbox Violation: ${requestedPath} is outside allowed paths (${(LOCAL_FS_SCANNER_PERMISSIONS.allowedPaths ?? []).join(", ")}).`,
    );
  }

  return targetPath;
}

async function scanDirectory({
  absolutePath,
  depth,
  maxDepth,
  rootDir,
}: {
  absolutePath: string;
  depth: number;
  maxDepth: number;
  rootDir: string;
}): Promise<FileSystemTreeNode> {
  const name = path.basename(absolutePath) || path.basename(rootDir);
  const node: FileSystemTreeNode = {
    name,
    path: toProjectPath(rootDir, absolutePath),
    type: "directory",
  };

  if (depth >= maxDepth) {
    return node;
  }

  const entries = (await readdir(absolutePath, { withFileTypes: true }))
    .filter((entry) => !shouldIgnore(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_ENTRIES_PER_DIRECTORY);

  node.children = await Promise.all(
    entries.map(async (entry) => {
      const childPath = path.join(absolutePath, entry.name);

      if (entry.isDirectory()) {
        return scanDirectory({
          absolutePath: childPath,
          depth: depth + 1,
          maxDepth,
          rootDir,
        });
      }

      return {
        name: entry.name,
        path: toProjectPath(rootDir, childPath),
        type: "file" as const,
      };
    }),
  );

  return node;
}

async function scanProject(
  maxDepth: number,
  requestedPath = "./src",
): Promise<FileSystemScanResult> {
  const rootDir = await realpath(process.cwd());
  const scanRoot = await resolveSandboxedScanRoot({
    projectRoot: rootDir,
    requestedPath,
  });
  const tree = await scanDirectory({
    absolutePath: scanRoot,
    depth: 0,
    maxDepth,
    rootDir,
  });

  return {
    ignored: IGNORED_REPORT,
    maxDepth,
    root: toProjectPath(rootDir, scanRoot),
    scannedAt: new Date().toISOString(),
    tree,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "File scanner failed.";
  const status = error instanceof SecuritySandboxViolation ? 403 : 500;

  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  try {
    const url = new URL(request.url);
    const maxDepthParam = url.searchParams.get("maxDepth");

    return Response.json(
      await scanProject(
        maxDepthParam === null ? DEFAULT_MAX_DEPTH : normalizeDepth(Number(maxDepthParam)),
        normalizeScanPath(url.searchParams.get("path")),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  let payload: ScannerPayload = {};

  try {
    payload = (await request.json()) as ScannerPayload;
  } catch {
    payload = {};
  }

  try {
    return Response.json(
      await scanProject(
        normalizeDepth(payload.maxDepth),
        normalizeScanPath(payload.path),
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

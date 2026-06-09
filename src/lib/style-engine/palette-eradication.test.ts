import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");
const skippedDirectories = new Set([
  ".git",
  ".codex",
  ".next",
  "X",
  "coverage",
  "dist",
  "node_modules",
  "reports",
]);
const skippedRelativePathPrefixes = [
  "docs/agent-runs/",
  "nblm_imports/",
];

const retiredHexes = [
  ["67e8", "f9"],
  ["22d3", "ee"],
  ["020", "617"],
  ["030", "712"],
  ["0811", "1a"],
  ["f0ab", "fc"],
  ["6ee7", "b7"],
  ["fcd3", "4d"],
  ["fda4", "af"],
  ["00ff", "cc"],
  ["e821", "27"],
  ["f4c2", "7a"],
  ["f59e", "0b"],
  ["f7db", "c0"],
  ["bae6", "fd"],
  ["10b9", "81"],
  ["d1fa", "e5"],
  ["fb71", "85"],
  ["ffe4", "e6"],
  ["c4b5", "fd"],
  ["8b5c", "f6"],
  ["ede9", "fe"],
  ["0f17", "2a"],
  ["6474", "8b"],
  ["38bd", "f8"],
  ["0ea5", "e9"],
  ["facc", "15"],
  ["007", "aff"],
  ["0057", "d8"],
  ["34c7", "59"],
  ["ff9f", "0a"],
  ["ff3b", "30"],
  ["ff38", "3f"],
  ["000", "807"],
  ["0011", "0f"],
  ["000", "302"],
  ["e6ff", "f9"],
  ["9fff", "ea"],
  ["4fa8", "98"],
  ["5cff", "df"],
  ["7dd3", "fc"],
  ["86ef", "ac"],
  ["fde6", "8a"],
].map((parts) => `#${parts.join("")}`);

const retiredRgbTriples = [
  [34, 211, 238],
  [244, 114, 182],
  [103, 232, 249],
  [110, 231, 183],
  [253, 164, 175],
  [196, 181, 253],
  [244, 194, 122],
  [56, 189, 248],
  [14, 165, 233],
  [15, 23, 42],
  [2, 6, 23],
  [8, 16, 22],
  [20, 184, 166],
  [245, 158, 11],
  [0, 122, 255],
  [232, 33, 39],
  [0, 255, 204],
  [125, 211, 252],
].map((parts) => parts.join(" "));

const retiredTerms = [
  ["c", "yan"],
  ["emer", "ald"],
  ["am", "ber"],
  ["ro", "se"],
  ["vio", "let"],
  ["fuch", "sia"],
  ["sl", "ate"],
  ["cy", "ber", "punk"],
  ["cy", "ber"],
].map((parts) => parts.join(""));

const retiredPhrases = [
  ["warm", "glass"].join("-"),
  ["warm", "glass"].join("_"),
  ["warm", "glass"].join(" "),
  ["warm", "glass"].join(""),
  ["neutral", "shell"].join("-"),
  ["neutral", "shell"].join(" "),
  ["legacy", "neutral", "shell"].join(" "),
];

function listFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (skippedDirectories.has(entry)) {
      continue;
    }

    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listFiles(path));
      continue;
    }

    if (stats.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function readTextFile(path: string) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function termPattern(term: string) {
  return new RegExp(`(^|[^a-z])${escapeRegExp(term)}([^a-z]|$)`, "i");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("retired palette guard", () => {
  it("keeps retired palette tokens out of the current file tree", () => {
    const files = listFiles(repoRoot);
    const failures: string[] = [];

    for (const file of files) {
      const relativePath = relative(repoRoot, file);
      const normalizedRelativePath = relativePath.replace(/\\/g, "/");

      if (shouldSkipRelativePath(normalizedRelativePath)) {
        continue;
      }

      const pathForScan = normalizedRelativePath.toLowerCase();
      const content = readTextFile(file);
      const contentForScan = content.toLowerCase();

      for (const value of retiredHexes) {
        if (contentForScan.includes(value)) {
          failures.push(`${relativePath}: retired hex ${value}`);
        }
      }

      for (const value of retiredRgbTriples) {
        if (contentForScan.includes(value)) {
          failures.push(`${relativePath}: retired rgb ${value}`);
        }
      }

      for (const value of retiredPhrases) {
        if (pathForScan.includes(value) || contentForScan.includes(value)) {
          failures.push(`${relativePath}: retired phrase ${value}`);
        }
      }

      for (const value of retiredTerms) {
        if (termPattern(value).test(pathForScan) || termPattern(value).test(contentForScan)) {
          failures.push(`${relativePath}: retired term ${value}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

function shouldSkipRelativePath(relativePath: string) {
  return skippedRelativePathPrefixes.some((prefix) =>
    relativePath.startsWith(prefix),
  );
}

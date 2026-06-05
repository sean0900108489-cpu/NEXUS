#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const args = parseArgs(process.argv.slice(2));
const manifestPath =
  args.manifest ?? "docs/workflow-pro/account-matrix-preview-verification.manifest.json";
const sourceManifest = readJson(manifestPath);
const previewUrl = args.previewUrl ?? sourceManifest.previewUrl;
const command = args.evidence ? "validate" : "init";

if (!previewUrl) {
  fail("Set --preview-url or fill previewUrl in the account matrix manifest.");
}

if (command === "validate") {
  const evidence = readJson(args.evidence);
  const summary = summarizeEvidence(evidence);
  const report = {
    schema: "nexus.workflowPro.accountMatrixScreenRun.summary.v1",
    evidencePath: args.evidence,
    generatedAt: new Date().toISOString(),
    previewUrl: evidence.previewUrl ?? previewUrl,
    ...summary,
  };

  printOrWrite(report, args.out);

  if (args.strict && report.score.total < report.score.max) {
    process.exitCode = 1;
  }
} else {
  const run = buildPendingRun(sourceManifest, previewUrl);
  printOrWrite(run, args.out);
}

function buildPendingRun(manifest, previewUrl) {
  const requiredActors = ["owner", "editor", "viewer", "new-authenticated-account"];
  const actors = manifest.actors
    .filter((actor) => requiredActors.includes(actor.id))
    .map((actor) => ({
      id: actor.id,
      role: actor.role,
      status: "pending-screen-operation",
      workspaceId: "",
      evidence: {
        manualNote: "",
        requestIdOrTraceId: "",
        screenshotPath: "",
      },
      tasks: tasksForActor(actor.id),
    }));

  return {
    schema: "nexus.workflowPro.accountMatrixScreenRun.v1",
    generatedAt: new Date().toISOString(),
    previewUrl,
    sourceManifest: manifestPath,
    scoring: {
      max: 100,
      passingRequires: [
        "owner can complete A/B/C, generated history, and asset download",
        "editor can complete A/B/C, generated history, and asset download",
        "viewer can inspect but cannot mutate or create artifacts",
        "new authenticated account resolves a writable workspace and completes benchmark A",
      ],
    },
    actors,
    forbiddenEvidence: [
      "accessTokens",
      "apiKeys",
      "refreshTokens",
      "cookies",
      "rawSecrets",
      "privateEmails",
    ],
    operatorRunbook: [
      "Open the preview URL through the browser profile used for the actor.",
      "Use Workflow Pro Evidence bay as the current status dashboard.",
      "Execute only the tasks listed for the current actor.",
      "Record pass/fail, route status on failure, screenshot path or manual note, generated asset count, and download result.",
      "Do not paste tokens, cookies, API keys, raw emails, or provider credentials into this file.",
      "Run this script with --evidence <file> --strict after filling evidence to compute the score.",
    ],
    score: summarizeEvidence({ actors }).score,
  };
}

function tasksForActor(actorId) {
  const commonWritable = [
    task("session-resolve", 4, "Workspace session resolves without permission loop."),
    task("benchmark-a", 5, "Load/import/apply/run benchmark A from the screen and confirm success."),
    task("benchmark-b", 5, "Load/import/apply/run benchmark B from the screen and confirm generated image output."),
    task("benchmark-c", 6, "Load/import/apply/run benchmark C from the screen and wait for all 13 nodes without hidden timeout."),
    task("generated-history", 3, "Open generated history and confirm the new artifact is recorded."),
    task("download-generated-asset", 2, "Download at least one generated asset and verify the saved file exists."),
  ];

  if (actorId === "owner" || actorId === "editor") {
    return commonWritable;
  }

  if (actorId === "viewer") {
    return [
      task("session-resolve", 5, "Viewer session resolves on an existing workspace."),
      task("inspect-workflow", 6, "Viewer can inspect Workflow Pro state and generated history."),
      task("mutation-denied", 9, "Run/start/save/create attempt is blocked by UI or returns clean permission denied."),
      task("no-artifact-created", 5, "Denied mutation does not create a generated artifact."),
    ];
  }

  return [
    task("session-resolve", 8, "New account session creates or resolves a writable workspace."),
    task("no-permission-loop", 8, "New account does not remain stuck on Permission denied."),
    task("benchmark-a", 9, "New account runs benchmark A successfully from the screen."),
  ];
}

function task(id, points, expectation) {
  return {
    id,
    expectation,
    points,
    result: "pending",
    routeStatusOnFailure: "",
    generatedAssetCount: null,
    downloadResult: "",
    evidence: {
      manualNote: "",
      requestIdOrTraceId: "",
      screenshotPath: "",
    },
  };
}

function summarizeEvidence(evidence) {
  const findings = [];
  let total = 0;
  let max = 0;

  for (const actor of evidence.actors ?? []) {
    for (const item of actor.tasks ?? []) {
      max += Number(item.points ?? 0);

      if (item.result === "pass") {
        total += Number(item.points ?? 0);
      } else if (item.result === "fail") {
        findings.push({
          actor: actor.id,
          code: "screenTask.failed",
          task: item.id,
        });
      } else {
        findings.push({
          actor: actor.id,
          code: "screenTask.pending",
          task: item.id,
        });
      }

      for (const [path, value] of flattenObject(item)) {
        if (typeof value === "string" && containsSecretLikeText(value)) {
          findings.push({
            actor: actor.id,
            code: "forbiddenEvidence.secretLikeText",
            path,
            task: item.id,
          });
        }
      }
    }
  }

  return {
    findings,
    score: {
      max,
      percent: max === 0 ? 0 : Math.round((total / max) * 100),
      total,
    },
    status: findings.length === 0 ? "pass" : "pending-or-failed",
  };
}

function containsSecretLikeText(value) {
  return /(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{20,}|refresh_token|access_token|api[_-]?key|cookie\s*:)/i.test(
    value,
  );
}

function* flattenObject(value, prefix = "$") {
  if (!value || typeof value !== "object") {
    yield [prefix, value];
    return;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      yield* flattenObject(value[index], `${prefix}[${index}]`);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    yield* flattenObject(nested, `${prefix}.${key}`);
  }
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2).replace(/-([a-z])/g, (_match, letter) =>
      letter.toUpperCase(),
    );

    if (key === "strict") {
      parsed.strict = true;
      continue;
    }

    parsed[key] = argv[index + 1];
    index += 1;
  }

  return parsed;
}

function printOrWrite(value, outPath) {
  const output = `${JSON.stringify(value, null, 2)}\n`;

  if (!outPath) {
    process.stdout.write(output);
    return;
  }

  writeFileSync(outPath, output);
  process.stdout.write(
    `${JSON.stringify({
      continue: true,
      systemMessage: `Workflow Pro account matrix evidence ${command} saved to ${outPath}`,
    })}\n`,
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

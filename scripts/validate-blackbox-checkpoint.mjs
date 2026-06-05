#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const EVENT_SCHEMA = "nexus.workflowPro.blackbox.event.v1";
const DEFAULT_ROOT =
  "docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints";

const EVENT_TYPES = new Set([
  "checkpoint.created",
  "checkpoint.read",
  "phase.started",
  "evidence.added",
  "no_evidence_available",
  "inference.added",
  "contradiction.added",
  "risk.added",
  "next_probe.added",
  "live_evidence.added",
  "verdict.added",
  "phase.completed",
  "final_report.created",
]);

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bsk-proj-[A-Za-z0-9_-]{16,}\b/g,
  /\bAuthorization\s*[:=]\s*(?:Bearer\s+)?["']?[A-Za-z0-9._~+/-]{8,}=*["']?/gi,
  /\b(?:access_token|refresh_token|api[_-]?key|secret)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/-]{12,}=*["']?/gi,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function pushFailure(report, code, message, file = null) {
  report.failures.push({ code, message, file });
}

function pushWarning(report, code, message, file = null) {
  report.warnings.push({ code, message, file });
}

function hasSecretLikeValue(text) {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

function validateNoSecrets(report, filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readText(filePath);
  if (hasSecretLikeValue(text)) {
    pushFailure(
      report,
      "secret-like-value-detected",
      "Checkpoint artifacts must not contain raw secrets or bearer credentials.",
      filePath,
    );
  }
}

function listRunDirectories(targetPath) {
  const absolute = resolve(targetPath);
  if (!existsSync(absolute)) {
    return [];
  }

  const stats = statSync(absolute);
  if (!stats.isDirectory()) {
    return [];
  }

  if (existsSync(join(absolute, "events.ndjson"))) {
    return [absolute];
  }

  return readdirSync(absolute)
    .map((entry) => join(absolute, entry))
    .filter((entryPath) => {
      try {
        return statSync(entryPath).isDirectory() && existsSync(join(entryPath, "events.ndjson"));
      } catch {
        return false;
      }
    });
}

function parseEvents(report, eventsPath) {
  const text = readText(eventsPath);
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const events = [];

  lines.forEach((line, index) => {
    try {
      const event = JSON.parse(line);
      events.push({ ...event, __line: index + 1 });
    } catch (error) {
      pushFailure(
        report,
        "events-ndjson-parse-error",
        `events.ndjson line ${index + 1} is not valid JSON: ${error.message}`,
        eventsPath,
      );
    }
  });

  if (lines.length === 0) {
    pushFailure(
      report,
      "events-ndjson-empty",
      "events.ndjson must contain at least checkpoint.created and checkpoint.read events.",
      eventsPath,
    );
  }

  return events;
}

function validateEventShape(report, event, eventsPath) {
  const required = [
    "schema",
    "runId",
    "eventId",
    "timestamp",
    "protocolId",
    "eventType",
    "summary",
    "secretRedactionStatus",
  ];

  for (const key of required) {
    if (event[key] === undefined || event[key] === null || event[key] === "") {
      pushFailure(
        report,
        "event-required-field-missing",
        `Event on line ${event.__line} is missing required field ${key}.`,
        eventsPath,
      );
    }
  }

  if (event.schema !== EVENT_SCHEMA) {
    pushFailure(
      report,
      "event-schema-invalid",
      `Event ${event.eventId ?? `line ${event.__line}`} must use ${EVENT_SCHEMA}.`,
      eventsPath,
    );
  }

  if (!EVENT_TYPES.has(event.eventType)) {
    pushFailure(
      report,
      "event-type-invalid",
      `Event ${event.eventId ?? `line ${event.__line}`} has unsupported eventType ${event.eventType}.`,
      eventsPath,
    );
  }

  if (Number.isNaN(Date.parse(event.timestamp))) {
    pushFailure(
      report,
      "event-timestamp-invalid",
      `Event ${event.eventId ?? `line ${event.__line}`} has an invalid timestamp.`,
      eventsPath,
    );
  }

  if (!["checked", "redacted", "not_applicable"].includes(event.secretRedactionStatus)) {
    pushFailure(
      report,
      "event-redaction-status-invalid",
      `Event ${event.eventId ?? `line ${event.__line}`} has invalid secretRedactionStatus.`,
      eventsPath,
    );
  }

  if (event.eventType === "phase.started") {
    if (!event.phaseId || !event.checkpointReadEventId) {
      pushFailure(
        report,
        "phase-start-missing-checkpoint-read",
        `phase.started event ${event.eventId} must include phaseId and checkpointReadEventId.`,
        eventsPath,
      );
    }
  }

  if (["evidence.added", "live_evidence.added"].includes(event.eventType)) {
    if (!event.phaseId || !event.evidence?.evidenceId || !event.evidence?.method) {
      pushFailure(
        report,
        "evidence-event-incomplete",
        `${event.eventType} event ${event.eventId} must include phaseId, evidence.evidenceId, and evidence.method.`,
        eventsPath,
      );
    }
  }

  if (event.eventType === "verdict.added" && !event.verdict?.claim) {
    pushFailure(
      report,
      "verdict-event-incomplete",
      `verdict.added event ${event.eventId} must include verdict.claim.`,
      eventsPath,
    );
  }

  if (event.eventType === "final_report.created" && !event.finalReportPath) {
    pushFailure(
      report,
      "final-report-event-missing-path",
      `final_report.created event ${event.eventId} must include finalReportPath.`,
      eventsPath,
    );
  }

  const serialized = JSON.stringify(event);
  if (hasSecretLikeValue(serialized)) {
    pushFailure(
      report,
      "event-secret-like-value-detected",
      `Event ${event.eventId ?? `line ${event.__line}`} appears to contain a raw secret.`,
      eventsPath,
    );
  }
}

function validateSequence(report, events, eventsPath) {
  if (events.length === 0) {
    return;
  }

  if (events[0].eventType !== "checkpoint.created") {
    pushFailure(
      report,
      "first-event-not-checkpoint-created",
      "The first event must be checkpoint.created.",
      eventsPath,
    );
  }

  const eventIds = new Set();
  const evidenceIds = new Set();
  const liveEvidenceIds = new Set();
  const computerUseEvidenceIds = new Set();
  const readEventIds = new Set();
  const phases = new Map();
  let hasFinalReportEvent = false;

  for (const event of events) {
    if (event.eventId) {
      if (eventIds.has(event.eventId)) {
        pushFailure(
          report,
          "duplicate-event-id",
          `Duplicate eventId ${event.eventId}.`,
          eventsPath,
        );
      }
      eventIds.add(event.eventId);
    }

    if (event.eventType === "checkpoint.read") {
      readEventIds.add(event.eventId);
    }

    if (event.eventType === "phase.started") {
      if (!readEventIds.has(event.checkpointReadEventId)) {
        pushFailure(
          report,
          "phase-start-references-missing-read",
          `phase.started event ${event.eventId} references checkpoint read ${event.checkpointReadEventId}, but it was not found earlier.`,
          eventsPath,
        );
      }
      phases.set(event.phaseId, {
        started: true,
        evidence: false,
        completed: false,
      });
    }

    if (["evidence.added", "no_evidence_available", "live_evidence.added"].includes(event.eventType)) {
      const phase = phases.get(event.phaseId);
      if (!phase) {
        pushFailure(
          report,
          "evidence-before-phase-start",
          `Event ${event.eventId} adds evidence for ${event.phaseId}, but that phase was not started first.`,
          eventsPath,
        );
      } else {
        phase.evidence = true;
      }
    }

    if (event.eventType === "evidence.added" && event.evidence?.evidenceId) {
      evidenceIds.add(event.evidence.evidenceId);
    }

    if (event.eventType === "live_evidence.added" && event.evidence?.evidenceId) {
      evidenceIds.add(event.evidence.evidenceId);
      liveEvidenceIds.add(event.evidence.evidenceId);
      if (event.evidence.method === "computer_use_live") {
        computerUseEvidenceIds.add(event.evidence.evidenceId);
      }
    }

    if (event.eventType === "phase.completed") {
      const phase = phases.get(event.phaseId);
      if (!phase) {
        pushFailure(
          report,
          "phase-complete-before-start",
          `phase.completed event ${event.eventId} references ${event.phaseId}, but that phase was not started first.`,
          eventsPath,
        );
      } else {
        phase.completed = true;
      }
    }

    if (event.eventType === "verdict.added") {
      const requiresLiveEvidence =
        event.verdict?.requiresLiveEvidence === true &&
        !["static-only", "blocked", "not-yet-verified"].includes(event.verdict?.tier);
      const requiresComputerUseEvidence =
        event.verdict?.requiresComputerUseEvidence === true ||
        event.verdict?.tier === "computer-use-live";

      if (requiresLiveEvidence) {
        const refs = event.verdict?.liveEvidenceRefs ?? [];
        if (refs.length === 0) {
          pushFailure(
            report,
            "live-verdict-missing-live-evidence-refs",
            `verdict.added event ${event.eventId} requires live evidence but has no liveEvidenceRefs.`,
            eventsPath,
          );
        }

        for (const ref of refs) {
          if (!liveEvidenceIds.has(ref)) {
            pushFailure(
              report,
              "live-verdict-ref-not-found",
              `verdict.added event ${event.eventId} references missing live evidence ${ref}.`,
              eventsPath,
            );
          }
        }
      }

      if (requiresComputerUseEvidence) {
        const refs = event.verdict?.liveEvidenceRefs ?? [];
        if (refs.length === 0) {
          pushFailure(
            report,
            "computer-use-verdict-missing-live-evidence-refs",
            `verdict.added event ${event.eventId} requires Computer Use evidence but has no liveEvidenceRefs.`,
            eventsPath,
          );
        }

        for (const ref of refs) {
          if (!computerUseEvidenceIds.has(ref)) {
            pushFailure(
              report,
              "computer-use-verdict-ref-not-found",
              `verdict.added event ${event.eventId} references ${ref}, but it is not prior computer_use_live evidence.`,
              eventsPath,
            );
          }
        }
      }
    }

    if (event.eventType === "final_report.created") {
      hasFinalReportEvent = true;
    }
  }

  for (const [phaseId, phase] of phases) {
    if (phase.completed && !phase.evidence) {
      pushFailure(
        report,
        "phase-completed-without-evidence",
        `Phase ${phaseId} completed without evidence.added, live_evidence.added, or no_evidence_available.`,
        eventsPath,
      );
    }
  }

  return { hasFinalReportEvent };
}

function validateRunDirectory(runDir) {
  const report = {
    ok: true,
    runDir,
    failures: [],
    warnings: [],
    counts: {
      events: 0,
      liveEvidence: 0,
      computerUseEvidence: 0,
      verdicts: 0,
      phases: 0,
    },
  };

  const activeCheckpointPath = join(runDir, "00-active-checkpoint.md");
  const eventsPath = join(runDir, "events.ndjson");
  const finalReportPath = join(runDir, "final-report.md");

  if (!existsSync(activeCheckpointPath)) {
    pushFailure(
      report,
      "active-checkpoint-missing",
      "00-active-checkpoint.md must exist before validation can pass.",
      activeCheckpointPath,
    );
  }

  if (!existsSync(eventsPath)) {
    pushFailure(report, "events-ndjson-missing", "events.ndjson is required.", eventsPath);
    report.ok = false;
    return report;
  }

  validateNoSecrets(report, activeCheckpointPath);
  validateNoSecrets(report, eventsPath);
  validateNoSecrets(report, finalReportPath);

  for (const entry of readdirSync(runDir)) {
    if (/^branch-.+\.md$/.test(entry)) {
      validateNoSecrets(report, join(runDir, entry));
    }
  }

  const events = parseEvents(report, eventsPath);
  report.counts.events = events.length;
  report.counts.liveEvidence = events.filter((event) => event.eventType === "live_evidence.added").length;
  report.counts.computerUseEvidence = events.filter(
    (event) => event.eventType === "live_evidence.added" && event.evidence?.method === "computer_use_live",
  ).length;
  report.counts.verdicts = events.filter((event) => event.eventType === "verdict.added").length;
  report.counts.phases = events.filter((event) => event.eventType === "phase.started").length;

  for (const event of events) {
    validateEventShape(report, event, eventsPath);
  }

  const sequence = validateSequence(report, events, eventsPath);

  if (existsSync(finalReportPath) && !sequence?.hasFinalReportEvent) {
    pushFailure(
      report,
      "final-report-file-without-event",
      "final-report.md exists, but events.ndjson has no final_report.created event.",
      finalReportPath,
    );
  }

  if (!existsSync(finalReportPath)) {
    pushWarning(
      report,
      "final-report-not-yet-written",
      "No final-report.md found. This is acceptable for an in-progress run.",
      finalReportPath,
    );
  }

  report.ok = report.failures.length === 0;
  return report;
}

function main() {
  const target = process.argv[2] ?? DEFAULT_ROOT;
  const runDirs = listRunDirectories(target);
  const reports = runDirs.map(validateRunDirectory);

  const result = {
    ok: reports.every((report) => report.ok),
    checkedAt: new Date().toISOString(),
    target: resolve(target),
    runCount: reports.length,
    reports,
    note:
      reports.length === 0
        ? "No checkpoint runs with events.ndjson were found. Pass a run directory to validate one run."
        : undefined,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main();

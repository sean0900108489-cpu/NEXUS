import { createHash } from "node:crypto";

import {
  containsSensitiveCredential,
  findSensitiveStringMatches,
  isSensitiveFieldName,
  maskSensitiveString,
  summarizeSecretForStorage,
  type RedactionMatchKind,
} from "../primitives/redaction";
import {
  createBackendMetadata,
  type BackendMetadata,
  type BackendProvenance,
  type JsonValue,
} from "../primitives/metadata";

export type SecretScanMatch = {
  path: string;
  kind: RedactionMatchKind;
  length: number;
  hash: string;
};

export type SecretScanResult = {
  hasSecrets: boolean;
  matches: SecretScanMatch[];
};

export type RedactedValue = JsonValue | BackendMetadata;

export class SecretBoundaryViolationError extends Error {
  constructor(readonly scan: SecretScanResult) {
    super(
      `Secret boundary violation: ${scan.matches.length} sensitive value(s) detected.`,
    );
    this.name = "SecretBoundaryViolationError";
  }
}

export class SecretBoundaryService {
  scanForSecrets(input: unknown): SecretScanResult {
    const matches: SecretScanMatch[] = [];
    this.scanValue(input, "$", matches);

    return {
      hasSecrets: matches.length > 0,
      matches,
    };
  }

  redact(input: unknown): RedactedValue {
    return this.redactValue(input, "$") as RedactedValue;
  }

  assertNoSecrets(input: unknown): void {
    const scan = this.scanForSecrets(input);

    if (scan.hasSecrets) {
      throw new SecretBoundaryViolationError(scan);
    }
  }

  sanitizeAuditMetadata(metadata: Record<string, unknown> = {}): BackendMetadata {
    const scan = this.scanForSecrets(metadata);
    const redacted = this.redact(metadata);
    const redactedRecord = isRecord(redacted) ? redacted : {};
    const provenance = normalizeProvenance(redactedRecord.provenance);

    const sanitized = createBackendMetadata(
      {
        source: "security",
        ...provenance,
      },
      {
        ...toJsonRecord(redactedRecord),
        schemaVersion:
          typeof redactedRecord.schemaVersion === "number"
            ? redactedRecord.schemaVersion
            : 1,
        source: "security",
        redactionStatus: scan.hasSecrets ? "redacted" : "clean",
      },
    );

    this.assertNoSecrets(sanitized);

    return sanitized;
  }

  private scanValue(input: unknown, path: string, matches: SecretScanMatch[]) {
    if (typeof input === "string") {
      for (const match of findSensitiveStringMatches(input)) {
        matches.push({
          path,
          kind: match.kind,
          length: match.value.length,
          hash: hashSecret(match.value),
        });
      }
      return;
    }

    if (Array.isArray(input)) {
      input.forEach((item, index) => this.scanValue(item, `${path}[${index}]`, matches));
      return;
    }

    if (!isRecord(input)) {
      return;
    }

    for (const [key, value] of Object.entries(input)) {
      const nextPath = `${path}.${key}`;

      if (isSensitiveFieldName(key)) {
        if (isRedactedSummary(value)) {
          continue;
        }

        const stringValue = stringifyForSecretScan(value);
        matches.push({
          path: nextPath,
          kind: inferMatchKindFromFieldName(key),
          length: stringValue.length,
          hash: hashSecret(stringValue),
        });
        continue;
      }

      this.scanValue(value, nextPath, matches);
    }
  }

  private redactValue(input: unknown, path: string): JsonValue {
    void path;

    if (typeof input === "string") {
      return containsSensitiveCredential(input) ? maskSensitiveString(input) : input;
    }

    if (
      input === null ||
      typeof input === "number" ||
      typeof input === "boolean"
    ) {
      return input;
    }

    if (input instanceof Error) {
      return {
        name: input.name,
        message: containsSensitiveCredential(input.message)
          ? maskSensitiveString(input.message)
          : input.message,
      };
    }

    if (Array.isArray(input)) {
      return input.map((item, index) => this.redactValue(item, `${path}[${index}]`));
    }

    if (!isRecord(input)) {
      return String(input);
    }

    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => {
        if (isSensitiveFieldName(key)) {
          const stringValue = stringifyForSecretScan(value);
          return [
            key,
            {
              ...summarizeSecretForStorage(stringValue),
              redactionStatus: "hash_only",
              hash: hashSecret(stringValue),
            },
          ];
        }

        return [key, this.redactValue(value, `${path}.${key}`)];
      }),
    );
  }
}

function inferMatchKindFromFieldName(fieldName: string): RedactionMatchKind {
  const normalized = fieldName.toLowerCase();

  if (normalized.includes("authorization")) {
    return "authorization";
  }

  if (normalized.includes("service")) {
    return "serviceRole";
  }

  if (normalized.includes("provider")) {
    return "providerToken";
  }

  if (normalized.includes("api")) {
    return "apiKey";
  }

  return "secretLike";
}

function stringifyForSecretScan(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRedactedSummary(value: unknown) {
  return (
    isRecord(value) &&
    (value.redactionStatus === "redacted" ||
      value.redactionStatus === "hash_only") &&
    typeof value.length === "number" &&
    typeof value.hash !== "undefined"
  );
}

function normalizeProvenance(value: unknown): BackendProvenance {
  if (!isRecord(value)) {
    return {};
  }

  return toJsonRecord(value) as BackendProvenance;
}

function toJsonRecord(record: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toJsonValue(value)]),
  );
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskSensitiveString(value.message),
    };
  }

  if (isRecord(value)) {
    return toJsonRecord(value);
  }

  return String(value);
}

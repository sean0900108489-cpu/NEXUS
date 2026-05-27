import type { RedactionStatus } from "./metadata";

export type RedactedSecretSummary = {
  redactionStatus: Extract<RedactionStatus, "redacted" | "hash_only">;
  length: number;
  hash?: string;
};

export type RedactionMatchKind =
  | "authorization"
  | "apiKey"
  | "providerToken"
  | "bearerToken"
  | "serviceRole"
  | "environmentSecret"
  | "secretLike";

export type RedactionMatch = {
  kind: RedactionMatchKind;
  value: string;
};

const secretFieldNamePattern =
  /(?:authorization|api[-_\s]?key|x-api-key|provider[-_\s]?token|access[-_\s]?token|refresh[-_\s]?token|service[-_\s]?role|supabase[-_\s]?service[-_\s]?role[-_\s]?key|secret)/i;

const sensitiveStringPatterns: Array<{
  kind: RedactionMatchKind;
  pattern: RegExp;
}> = [
  {
    kind: "authorization",
    pattern:
      /\bAuthorization\s*[:=]\s*(?:Bearer\s+)?["']?([A-Za-z0-9._~+/-]{8,}=*)["']?/gi,
  },
  {
    kind: "apiKey",
    pattern:
      /\b(?:api[-_\s]?key|x-api-key)\s*[:=]\s*["']?([A-Za-z0-9._~+/-]{8,}=*)["']?/gi,
  },
  {
    kind: "providerToken",
    pattern:
      /\bprovider[-_\s]?token\s*[:=]\s*["']?([A-Za-z0-9._~+/-]{8,}=*)["']?/gi,
  },
  {
    kind: "bearerToken",
    pattern: /\bBearer\s+([A-Za-z0-9._~+/-]{8,}=*)/gi,
  },
  {
    kind: "serviceRole",
    pattern:
      /\b(?:service[-_\s]?role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["']?([A-Za-z0-9._~+/-]{8,}=*)["']?/gi,
  },
  {
    kind: "environmentSecret",
    pattern:
      /\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=\s*["']?([^\s"']{8,})["']?/g,
  },
  {
    kind: "secretLike",
    pattern:
      /\b(?:sk|sk-ant|sk-proj|xoxb|ghp|github_pat|rk|ak)-[A-Za-z0-9_-]{8,}\b/g,
  },
];

export function isSensitiveFieldName(fieldName: string) {
  return secretFieldNamePattern.test(fieldName);
}

export function findSensitiveStringMatches(value: string): RedactionMatch[] {
  const matches: RedactionMatch[] = [];

  for (const { kind, pattern } of sensitiveStringPatterns) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      matches.push({
        kind,
        value: match[1] ?? match[0],
      });
    }
  }

  return matches;
}

export function containsSensitiveCredential(value: string) {
  return findSensitiveStringMatches(value).length > 0;
}

export function maskSensitiveString(value: string) {
  let masked = value;

  for (const { pattern } of sensitiveStringPatterns) {
    pattern.lastIndex = 0;
    masked = masked.replace(pattern, (match, captured: string | undefined) => {
      if (!captured) {
        return maskSecretValue(match);
      }

      return match.replace(captured, maskSecretValue(captured));
    });
  }

  return masked;
}

export function maskSecretValue(value: string) {
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }

  const visiblePrefix = value.slice(0, 2);
  const visibleSuffix = value.slice(-2);

  return `${visiblePrefix}${"*".repeat(Math.max(4, value.length - 4))}${visibleSuffix}`;
}

export function summarizeSecretForStorage(value: string): RedactedSecretSummary {
  return {
    redactionStatus: "redacted",
    length: value.length,
  };
}

export function redactSensitiveRecord<T extends Record<string, unknown>>(
  record: T,
): Record<keyof T, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      redactSensitiveValue(value, [key]),
    ]),
  ) as Record<keyof T, unknown>;
}

export function redactSensitiveValue(value: unknown, keyPath: string[] = []): unknown {
  const currentKey = keyPath[keyPath.length - 1];

  if (typeof value === "string") {
    if (currentKey && isSensitiveFieldName(currentKey)) {
      return summarizeSecretForStorage(value);
    }

    return containsSensitiveCredential(value) ? maskSensitiveString(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactSensitiveValue(item, [...keyPath, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveFieldName(key)
          ? summarizeSecretForStorage(String(nestedValue ?? ""))
          : redactSensitiveValue(nestedValue, [...keyPath, key]),
      ]),
    );
  }

  return value;
}

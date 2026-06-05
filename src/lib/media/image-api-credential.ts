const DIRECT_API_KEY_FIELDS = [
  "apiKey",
  "OPENAI_API_KEY",
  "openaiApiKey",
  "imageApiKey",
  "key",
];

const PROVIDER_FIELDS = [
  "openai",
  "openai-compatible",
  "custom-openai-compatible",
  "image",
  "img2",
  "providerCredentials",
];

export function normalizeImageApiKeyCandidate(value: unknown): string | undefined {
  const normalized = normalizeCredentialText(value);

  if (!normalized) {
    return undefined;
  }

  const bearerMatch = /^Bearer\s+([\s\S]+)$/i.exec(normalized);
  const candidate = normalizeCredentialText(bearerMatch?.[1] ?? normalized);

  if (!candidate) {
    return undefined;
  }

  if (candidate.startsWith("{") || candidate.startsWith("[") || candidate.startsWith("\"")) {
    return extractImageApiKeyFromJson(candidate);
  }

  return candidate;
}

export function normalizeCredentialText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value.replace(/[^\x20-\x7E]/g, "").trim() || undefined
    : undefined;
}

function extractImageApiKeyFromJson(value: string): string | undefined {
  try {
    return findImageApiKeyLikeValue(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function findImageApiKeyLikeValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const candidate = normalizeImageApiKeyCandidate(value);

    return candidate?.startsWith("sk-") ? candidate : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findImageApiKeyLikeValue(entry);

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of DIRECT_API_KEY_FIELDS) {
    const direct = normalizeImageApiKeyCandidate(record[key]);

    if (direct) {
      return direct;
    }
  }

  for (const key of PROVIDER_FIELDS) {
    const nested = findImageApiKeyLikeValue(record[key]);

    if (nested) {
      return nested;
    }
  }

  return undefined;
}

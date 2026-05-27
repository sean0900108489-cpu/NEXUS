import { NextResponse } from "next/server";

import { MEMORY_COMPRESSION_PROFILE_REGISTRY } from "@/lib/nexus-registry";
import type {
  ICompressedMemoryResult,
  IMemoryCompressionConfig,
  IMemoryCompressionWeights,
} from "@/lib/nexus-types";

export const runtime = "edge";
export const maxDuration = 300;

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_PROFILE_ID = "default-context-compressor";
const MAX_CUSTOM_FOCUS_LENGTH = 1_200;

type MemoryCompressRequest = {
  payload?: unknown;
  config?: Partial<IMemoryCompressionConfig>;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function sanitizeHeaderValue(value: string | null | undefined) {
  return value?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";
}

function getBearerToken(header: string | null) {
  if (!header) {
    return "";
  }

  const [scheme, token] = header.split(/\s+/, 2);

  return scheme?.toLowerCase() === "bearer" ? sanitizeHeaderValue(token) : "";
}

function getCompatibleBaseUrl(value: string | null | undefined) {
  const candidate = sanitizeHeaderValue(value) || DEFAULT_BASE_URL;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return DEFAULT_BASE_URL;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

function clampRetentionRatio(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(5, value))
    : 30;
}

function clampWeight(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(10, Math.max(0, Math.round(value)))
    : 5;
}

function normalizeAdvancedWeights(value: unknown): Required<IMemoryCompressionWeights> {
  const record =
    value && typeof value === "object"
      ? (value as Partial<IMemoryCompressionWeights>)
      : {};

  return {
    contextArchitecture: clampWeight(record.contextArchitecture),
    semanticMeaning: clampWeight(record.semanticMeaning),
    taskContinuity: clampWeight(record.taskContinuity),
    uiUxIntent: clampWeight(record.uiUxIntent),
  };
}

function sanitizePromptText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_CUSTOM_FOCUS_LENGTH);

  return normalized || undefined;
}

function normalizeConfig(value: unknown): IMemoryCompressionConfig {
  const record = value && typeof value === "object" ? (value as Partial<IMemoryCompressionConfig>) : {};

  return {
    mode: record.mode === "full" ? "full" : "summary",
    retentionRatio: clampRetentionRatio(record.retentionRatio),
    compressorModelId:
      typeof record.compressorModelId === "string" && record.compressorModelId.trim()
        ? record.compressorModelId.trim()
        : DEFAULT_MODEL,
    customFocusPrompt: sanitizePromptText(record.customFocusPrompt),
    advancedWeights: normalizeAdvancedWeights(record.advancedWeights),
    compressorProfileId:
      typeof record.compressorProfileId === "string" && record.compressorProfileId.trim()
        ? record.compressorProfileId.trim()
        : DEFAULT_PROFILE_ID,
  };
}

function supportsTemperature(model: string) {
  const normalized = model.toLowerCase();

  return !normalized.startsWith("o") && !normalized.startsWith("gpt-5");
}

function extractJsonObject(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Compression response did not contain JSON.");
    }

    return JSON.parse(match[0]) as unknown;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
    : [];
}

function normalizeCompressedMemoryResult(
  value: unknown,
  config: IMemoryCompressionConfig,
): ICompressedMemoryResult {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const compressionSummary =
    typeof record.compressionSummary === "string" && record.compressionSummary.trim()
      ? record.compressionSummary.trim()
      : "Compressed branch context retained architecture, constraints, decisions, and next actions.";
  const contextNotesSource = Array.isArray(record.contextNotes)
    ? record.contextNotes
    : [
        {
          title: "Compressed Branch Context",
          value: compressionSummary,
          source: "memory",
        },
      ];

  const contextNotes = contextNotesSource
    .map((item, index): ICompressedMemoryResult["contextNotes"][number] | undefined => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const note = item as Record<string, unknown>;
      const value = typeof note.value === "string" ? note.value.trim() : "";

      if (!value) {
        return undefined;
      }

      return {
        id:
          typeof note.id === "string" && note.id.trim()
            ? note.id.trim()
            : `compressed-context-${index + 1}`,
        title:
          typeof note.title === "string" && note.title.trim()
            ? note.title.trim()
            : `Compressed Context ${index + 1}`,
        source: "memory",
        value,
      };
    })
    .filter(
      (note): note is ICompressedMemoryResult["contextNotes"][number] =>
        Boolean(note),
    );

  return {
    retainedRatio: clampRetentionRatio(record.retainedRatio ?? config.retentionRatio),
    compressionSummary,
    contextNotes,
    architectureNotes: stringArray(record.architectureNotes),
    keyDecisions: stringArray(record.keyDecisions),
    unresolvedBugs: stringArray(record.unresolvedBugs),
  };
}

function shouldRetryWithoutResponseFormat(detail: string) {
  const normalized = detail.toLowerCase();

  return (
    normalized.includes("response_format") ||
    normalized.includes("json_object") ||
    normalized.includes("unsupported")
  );
}

function buildAdvancedWeightInstructions(weights?: IMemoryCompressionWeights) {
  if (!weights) {
    return "";
  }

  const contextArchitecture = clampWeight(weights.contextArchitecture);
  const semanticMeaning = clampWeight(weights.semanticMeaning);
  const taskContinuity = clampWeight(weights.taskContinuity);
  const uiUxIntent = clampWeight(weights.uiUxIntent);
  const instructions = [
    "[ADVANCED EVALUATION WEIGHTS]",
    `Weight map, scale 0-10: contextArchitecture=${contextArchitecture}, semanticMeaning=${semanticMeaning}, uiUxIntent=${uiUxIntent}, taskContinuity=${taskContinuity}.`,
    "These weights are qualitative filters inside the existing retention ratio. Do not exceed the requested retention size.",
  ];

  if (uiUxIntent > 7) {
    instructions.push(
      "CRITICAL: UI/UX Intent has been heavily weighted. You MUST preserve designer constraints, visual directions, component behavior, interaction rules, and interface tone at all costs.",
    );
  }

  if (contextArchitecture > 7) {
    instructions.push(
      "CRITICAL: Context Architecture has been heavily weighted. You MUST preserve file names, routes, schemas, registries, state boundaries, API contracts, and dependency relationships.",
    );
  }

  if (taskContinuity > 7) {
    instructions.push(
      "CRITICAL: Task Continuity has been heavily weighted. You MUST preserve TODOs, blockers, acceptance criteria, verification state, failing commands, and next implementation steps.",
    );
  }

  if (semanticMeaning > 7) {
    instructions.push(
      "CRITICAL: Semantic Meaning has been heavily weighted. You MUST preserve intent, rationale, domain vocabulary, decisions, unresolved ambiguity, and cause-effect relationships.",
    );
  }

  return `\n\n${instructions.join("\n")}`;
}

function buildCompressionUserPrompt(
  sourcePayload: unknown,
  config: IMemoryCompressionConfig,
) {
  const serializedPayload = JSON.stringify(sourcePayload);

  if (!config.customFocusPrompt) {
    return serializedPayload;
  }

  return [
    "[Layer 2 User Weighting Input]",
    config.customFocusPrompt,
    "",
    "[Source Transcript Payload]",
    serializedPayload,
  ].join("\n");
}

async function fetchCompressedMemory({
  apiKey,
  baseUrl,
  config,
  sourcePayload,
}: {
  apiKey: string;
  baseUrl: string;
  config: IMemoryCompressionConfig;
  sourcePayload: unknown;
}) {
  const profile =
    MEMORY_COMPRESSION_PROFILE_REGISTRY[config.compressorProfileId ?? DEFAULT_PROFILE_ID] ??
    MEMORY_COMPRESSION_PROFILE_REGISTRY[DEFAULT_PROFILE_ID];
  const model = config.compressorModelId || DEFAULT_MODEL;
  const systemPrompt = `${profile.fixedSystemPrompt}\n\nStrict Rule: Compress and retain exactly the most important ${config.retentionRatio}% of data.${buildAdvancedWeightInstructions(config.advancedWeights)}`;
  const userPrompt = buildCompressionUserPrompt(sourcePayload, config);
  const body = {
    model,
    ...(supportsTemperature(model) ? { temperature: 0.2 } : {}),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  };
  const requestInit = (includeResponseFormat: boolean): RequestInit => ({
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      includeResponseFormat
        ? body
        : {
            ...body,
            response_format: undefined,
          },
    ),
  });

  let response = await fetch(`${baseUrl}/chat/completions`, requestInit(true));

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);

    if (shouldRetryWithoutResponseFormat(detail)) {
      response = await fetch(`${baseUrl}/chat/completions`, requestInit(false));
    }

    if (!response.ok) {
      throw new Error(detail || `Memory compression returned ${response.status}.`);
    }
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  return normalizeCompressedMemoryResult(extractJsonObject(content), config);
}

export async function POST(request: Request) {
  const apiKey = getBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    return NextResponse.json({ mockFallback: true });
  }

  let requestPayload: MemoryCompressRequest = {};

  try {
    requestPayload = (await request.json()) as MemoryCompressRequest;
  } catch {
    return NextResponse.json({ mockFallback: true, error: "invalid-json" });
  }

  const config = normalizeConfig(requestPayload.config);
  const baseUrl = getCompatibleBaseUrl(
    request.headers.get("x-openai-base-url") || process.env.OPENAI_BASE_URL,
  );

  try {
    const result = await fetchCompressedMemory({
      apiKey,
      baseUrl,
      config,
      sourcePayload: requestPayload.payload,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ mockFallback: true, error: "compression-failed" });
  }
}

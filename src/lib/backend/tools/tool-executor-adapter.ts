import type {
  AgentTool,
  NexusAgent,
  ToolExecutorPermissions,
  ToolRiskLevel,
} from "@/lib/nexus-types";
import type {
  ToolExecutor as LegacyToolExecutor,
  ToolExecutorInput,
} from "@/lib/tool-executors";

import { ApiError } from "../api/api-errors";
import { stableStringify } from "../api/request-hash";
import { SecretBoundaryService } from "../security/secret-boundary-service";

import type { ToolRegistryResolution } from "./tool-registry-validator";

export type ToolExecutorAdapterInput = {
  executableInput: Record<string, unknown>;
  resolution: ToolRegistryResolution;
  runtimeApiKey?: string;
  workspaceId: string;
  agentId?: string | null;
};

export type ToolExecutorAdapterResult = {
  outputRedacted: Record<string, unknown>;
  outputHash: string;
  materializationStatus: "not_requested" | "TOOL_MATERIALIZATION_NOT_AVAILABLE";
};

export interface ToolExecutorAdapter {
  execute(input: ToolExecutorAdapterInput): Promise<ToolExecutorAdapterResult>;
}

export interface ToolExecutor<I = Record<string, unknown>, O = Record<string, unknown>> {
  inputSchema: "bounded-json";
  outputSchema: "redacted-json";
  riskLevel: ToolRiskLevel;
  execute(input: I): Promise<O>;
}

export class ExistingToolExecutorAdapter implements ToolExecutorAdapter {
  constructor(private readonly secretBoundaryService = new SecretBoundaryService()) {}

  async execute(input: ToolExecutorAdapterInput) {
    const executorInput = normalizeToolExecutorInput(input.executableInput);
    const result = await input.resolution.executor.run(
      makeRuntimeAgent(input),
      makeRuntimeTool(input.resolution),
      {
        ...executorInput,
        apiKey: input.runtimeApiKey,
      },
    );
    const materializationStatus: ToolExecutorAdapterResult["materializationStatus"] =
      result.media || input.resolution.requiresMaterializationHook
        ? "TOOL_MATERIALIZATION_NOT_AVAILABLE"
        : "not_requested";
    const output = {
      content: result.content,
      materializationStatus,
      media: result.media
        ? {
            createdAt: result.media.createdAt,
            prompt: result.media.prompt,
            type: result.media.type,
            url: result.media.url,
          }
        : undefined,
    };
    const redacted = this.secretBoundaryService.redact(output);
    const outputRedacted: Record<string, unknown> = isRecord(redacted)
      ? compactUndefined(redacted)
      : {};

    this.secretBoundaryService.assertNoSecrets(outputRedacted);

    return {
      materializationStatus,
      outputHash: await createToolHash(outputRedacted),
      outputRedacted,
    };
  }
}

export function normalizeExecutableInput(input: unknown) {
  if (input === undefined || input === null) {
    return {};
  }

  if (!isRecord(input)) {
    throw new ApiError("TOOL_INPUT_INVALID", "Tool input must be an object.", 400, {
      issues: [
        {
          code: "invalid_type",
          message: "Tool input must be an object.",
          path: ["input"],
        },
      ],
    });
  }

  const normalized: Record<string, unknown> = {};

  if (typeof input.prompt === "string" && input.prompt.trim()) {
    normalized.prompt = sanitizeText(input.prompt, 4_000);
  }

  if (typeof input.url === "string" && input.url.trim()) {
    normalized.url = sanitizeText(input.url, 2_048);
  }

  if (typeof input.path === "string" && input.path.trim()) {
    normalized.path = sanitizeText(input.path, 512);
  }

  if (typeof input.secretRef === "string" && input.secretRef.trim()) {
    normalized.secretRef = sanitizeText(input.secretRef, 256);
  }

  return normalized;
}

export async function createToolHash(value: unknown) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableStringify(value)),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
}

function normalizeToolExecutorInput(input: Record<string, unknown>): ToolExecutorInput {
  return {
    path: typeof input.path === "string" ? input.path : undefined,
    prompt: typeof input.prompt === "string" ? input.prompt : undefined,
    url: typeof input.url === "string" ? input.url : undefined,
  };
}

function makeRuntimeTool(resolution: ToolRegistryResolution): AgentTool {
  return {
    executorId: resolution.executorId,
    id: resolution.registryToolId,
    name: resolution.executor.label,
    scope: resolution.slot?.description ?? "V7 tool execution",
    status: "running",
  };
}

function makeRuntimeAgent(input: ToolExecutorAdapterInput): NexusAgent {
  const now = new Date().toISOString();

  return {
    accent: "#22d3ee",
    avatar: "AI",
    callsign: input.agentId ?? "TOOL",
    capabilities: {
      supportedModels: [],
      type: input.resolution.slot?.capability ?? "search",
    },
    contextNotes: [],
    createdAt: now,
    id: input.agentId ?? "tool-runtime-agent",
    identity: "NEXUS V7 tool runtime adapter",
    executionPrompt: "",
    layout: {
      height: 320,
      width: 420,
      x: 0,
      y: 0,
      zIndex: 0,
    },
    maximized: false,
    memory: [],
    messages: [],
    minimized: false,
    mission: `Execute ${input.resolution.registryToolId} for ${input.workspaceId}.`,
    model: "tool-runtime",
    modelSettings: {},
    profileLocked: false,
    provider: "tool-runtime",
    status: "thinking",
    telemetry: {
      confidence: 1,
      errors: 0,
      latency: 0,
      tasks: 0,
      tokens: 0,
      toolRuns: 0,
    },
    title: "Tool Runtime",
    tools: [makeRuntimeTool(input.resolution)],
    updatedAt: now,
  };
}

function sanitizeText(value: string, maxLength: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function compactUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type ToolExecutorAdapterDefinition = {
  id: string;
  inputSchema: "bounded-json";
  outputSchema: "redacted-json";
  permissions?: ToolExecutorPermissions;
  riskLevel: ToolRiskLevel;
  executor: LegacyToolExecutor;
};

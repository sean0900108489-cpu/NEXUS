import type {
  AgentContextNote,
  ICompressedMemoryResult,
  IMemoryCompressionConfig,
} from "@/lib/nexus-types";

export interface MemoryCompressionPayload {
  payload: unknown;
  config: IMemoryCompressionConfig;
}

const DEFAULT_MOCK_SUMMARY =
  "Mock compression preserved architecture, task continuity, UI/UX intent, constraints, and unresolved implementation notes for a safe branch handoff.";

function sanitizeHeaderValue(value: string | null | undefined) {
  return value?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";
}

function createContextNote({
  content,
  id,
  title,
}: {
  content: string;
  id: string;
  title: string;
}): AgentContextNote {
  return {
    id,
    source: "memory",
    title,
    value: content,
  };
}

function normalizeTextArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
    : undefined;
}

function normalizeContextNotes(value: unknown, fallbackSummary: string) {
  if (!Array.isArray(value)) {
    return [
      createContextNote({
        id: "compressed-context-summary",
        title: "Compressed Context Summary",
        content: fallbackSummary,
      }),
    ];
  }

  const notes = value
    .map((item, index): AgentContextNote | undefined => {
      if (!item || typeof item !== "object") {
        return undefined;
      }

      const record = item as Partial<AgentContextNote>;
      const title =
        typeof record.title === "string" && record.title.trim()
          ? record.title.trim()
          : `Compressed Context ${index + 1}`;
      const content =
        typeof record.value === "string" && record.value.trim()
          ? record.value.trim()
          : undefined;

      if (!content) {
        return undefined;
      }

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id.trim()
            : `compressed-context-${index + 1}`,
        source: record.source ?? "memory",
        title,
        value: content,
      };
    })
    .filter((note): note is AgentContextNote => Boolean(note));

  return notes.length
    ? notes
    : [
        createContextNote({
          id: "compressed-context-summary",
          title: "Compressed Context Summary",
          content: fallbackSummary,
        }),
      ];
}

function normalizeCompressedMemoryResult(
  value: unknown,
  config: IMemoryCompressionConfig,
): ICompressedMemoryResult {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fallbackSummary =
    typeof record.compressionSummary === "string" && record.compressionSummary.trim()
      ? record.compressionSummary.trim()
      : DEFAULT_MOCK_SUMMARY;
  const retainedRatio =
    typeof record.retainedRatio === "number" && Number.isFinite(record.retainedRatio)
      ? Math.min(100, Math.max(5, record.retainedRatio))
      : config.retentionRatio;

  return {
    retainedRatio,
    compressionSummary: fallbackSummary,
    contextNotes: normalizeContextNotes(record.contextNotes, fallbackSummary),
    architectureNotes: normalizeTextArray(record.architectureNotes),
    keyDecisions: normalizeTextArray(record.keyDecisions),
    unresolvedBugs: normalizeTextArray(record.unresolvedBugs),
  };
}

export class MockMemoryCompressor {
  static compress(
    _payload: unknown,
    config: IMemoryCompressionConfig,
  ): ICompressedMemoryResult {
    const summary = `${DEFAULT_MOCK_SUMMARY} Retention target: ${config.retentionRatio}%.`;

    return {
      retainedRatio: config.retentionRatio,
      compressionSummary: summary,
      contextNotes: [
        createContextNote({
          id: "mock-compressed-architecture",
          title: "Architecture / Constraints",
          content:
            "Preserve registry-first expansion, local-first state, Supabase as secondary sync, and existing UI boundaries.",
        }),
        createContextNote({
          id: "mock-compressed-continuity",
          title: "Task Continuity",
          content:
            "Continue from the source agent decisions without carrying low-signal transcript filler.",
        }),
        createContextNote({
          id: "mock-compressed-ui-intent",
          title: "UI/UX Intent",
          content:
            "Maintain the cyberpunk engineering command-center aesthetic and avoid disruptive layout changes.",
        }),
      ],
      architectureNotes: ["Registry-first slots are authoritative."],
      keyDecisions: ["Use deterministic mock compression when live compression is unavailable."],
      unresolvedBugs: [],
    };
  }
}

export class LlmMemoryCompressor {
  static async compress(
    payload: unknown,
    config: IMemoryCompressionConfig,
  ): Promise<ICompressedMemoryResult> {
    try {
      const { useNexusStore } = await import("@/store/nexus-store");
      const authVault = useNexusStore.getState().authVault;
      const apiKey = sanitizeHeaderValue(authVault.globalApiKey);
      const baseUrl = sanitizeHeaderValue(authVault.globalBaseUrl);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      if (baseUrl) {
        headers["x-openai-base-url"] = baseUrl;
      }

      const response = await fetch("/api/memory-compress", {
        method: "POST",
        headers,
        body: JSON.stringify({ payload, config } satisfies MemoryCompressionPayload),
      });

      if (!response.ok) {
        return MockMemoryCompressor.compress(payload, config);
      }

      const result = (await response.json()) as unknown;

      if (
        result &&
        typeof result === "object" &&
        "mockFallback" in result &&
        result.mockFallback
      ) {
        return MockMemoryCompressor.compress(payload, config);
      }

      return normalizeCompressedMemoryResult(result, config);
    } catch {
      return MockMemoryCompressor.compress(payload, config);
    }
  }
}

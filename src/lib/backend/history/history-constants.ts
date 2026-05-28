import type { AgentMemoryRecordType } from "@/lib/nexus-types";

export const MESSAGE_HISTORY_DEFAULT_LIMIT = 50;
export const MESSAGE_HISTORY_MAX_LIMIT = 100;
export const ACTIVE_WINDOW_DEFAULT_LIMIT = 80;
export const ACTIVE_WINDOW_MAX_LIMIT = 250;
export const HISTORY_CURSOR_TTL_MS = 24 * 60 * 60 * 1000;
export const AGENT_MEMORY_CONTENT_MAX_BYTES = 32 * 1024;

export const AGENT_MEMORY_RECORD_TYPES = [
  "active",
  "compressed",
  "archived",
  "context_note",
] as const satisfies readonly AgentMemoryRecordType[];

export function clampHistoryLimit(limit: unknown) {
  const numeric = typeof limit === "number" ? limit : Number(limit);

  if (!Number.isFinite(numeric)) {
    return MESSAGE_HISTORY_DEFAULT_LIMIT;
  }

  return Math.min(MESSAGE_HISTORY_MAX_LIMIT, Math.max(1, Math.floor(numeric)));
}

export function clampActiveWindowLimit(limit: unknown) {
  const numeric = typeof limit === "number" ? limit : Number(limit);

  if (!Number.isFinite(numeric)) {
    return ACTIVE_WINDOW_DEFAULT_LIMIT;
  }

  return Math.min(ACTIVE_WINDOW_MAX_LIMIT, Math.max(1, Math.floor(numeric)));
}

export function isAgentMemoryRecordType(value: unknown): value is AgentMemoryRecordType {
  return (
    typeof value === "string" &&
    AGENT_MEMORY_RECORD_TYPES.includes(value as AgentMemoryRecordType)
  );
}

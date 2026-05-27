import type {
  AgentRuntimeEventType,
  AgentRuntimeSessionStatus,
  AgentTaskStatus,
  AgentTaskType,
} from "@/lib/nexus-types";

export const AGENT_TASK_TYPES = [
  "chat",
  "memory_compress",
  "tool_chain",
  "handoff",
  "branch",
] as const satisfies readonly AgentTaskType[];

export const AGENT_TASK_STATUSES = [
  "created",
  "queued",
  "running",
  "streaming",
  "waiting_for_tool",
  "waiting_for_confirmation",
  "completed",
  "failed",
  "cancelled",
  "retrying",
] as const satisfies readonly AgentTaskStatus[];

export const TERMINAL_AGENT_TASK_STATUSES = [
  "completed",
  "failed",
  "cancelled",
] as const satisfies readonly AgentTaskStatus[];

export const AGENT_RUNTIME_SESSION_STATUSES = [
  "active",
  "ended",
  "failed",
  "cancelled",
] as const satisfies readonly AgentRuntimeSessionStatus[];

export const AGENT_RUNTIME_EVENT_TYPES = [
  "stream_started",
  "first_token",
  "fallback_used",
  "stream_completed",
  "stream_failed",
] as const satisfies readonly AgentRuntimeEventType[];

export function isAgentTaskType(value: string): value is AgentTaskType {
  return (AGENT_TASK_TYPES as readonly string[]).includes(value);
}

export function isAgentTaskStatus(value: string): value is AgentTaskStatus {
  return (AGENT_TASK_STATUSES as readonly string[]).includes(value);
}

export function isTerminalAgentTaskStatus(status: AgentTaskStatus) {
  return (TERMINAL_AGENT_TASK_STATUSES as readonly string[]).includes(status);
}

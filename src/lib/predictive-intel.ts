import type { NexusAgent } from "@/lib/nexus-types";

const STARTER_SUGGESTIONS = [
  "Summarize the current objective and next action.",
  "Identify the highest-risk blocker in this workflow.",
  "Draft a tactical implementation checklist.",
] as const;

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePredictiveIntelSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => compactText(item))
    .filter(Boolean)
    .slice(0, 3);
}

export function buildMockPredictiveIntelSuggestions({
  agent,
  lastAssistantMessage,
}: {
  agent?: Partial<Pick<NexusAgent, "callsign" | "mission" | "title">>;
  lastAssistantMessage?: string;
}) {
  const context = compactText(lastAssistantMessage ?? "");

  if (!context) {
    return [...STARTER_SUGGESTIONS];
  }

  const mission = compactText(agent?.mission ?? agent?.title ?? "the active mission");
  const callsign = agent?.callsign ?? "agent";

  return [
    `Ask ${callsign} to turn this into the next executable step.`,
    `Find the main risk or missing dependency in: ${context.slice(0, 82)}`,
    `Convert the result into a concise checklist for ${mission.slice(0, 72)}.`,
  ];
}

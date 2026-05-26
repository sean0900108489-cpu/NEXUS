import type { AgentStreamRequest } from "@/lib/nexus-types";

export function buildMockReply(payload: AgentStreamRequest) {
  const lastUser =
    [...payload.messages].reverse().find((message) => message.role === "user")
      ?.content ?? "Continue mission analysis.";
  const memory = payload.agent.memory[0]?.label ?? "mission memory";
  const context = payload.agent.contextNotes[0]?.title ?? "workspace context";

  return [
    `${payload.agent.callsign} received the packet.`,
    `I am binding the request to ${memory} and ${context}.`,
    `Primary read: ${lastUser}`,
    "Recommended next move: split the work into a visible objective, a state checkpoint, and a tool handoff so another agent can join without losing context.",
    "Mock mode is active by design until this agent has an API key configured in Settings.",
  ].join(" ");
}

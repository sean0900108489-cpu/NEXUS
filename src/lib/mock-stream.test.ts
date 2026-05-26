import { describe, expect, it } from "vitest";

import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import { buildMockReply } from "@/lib/mock-stream";

describe("mock stream builder", () => {
  it("builds deterministic operator-ready mock text without an API key", () => {
    const workspace = createDefaultWorkspace();
    const agent = workspace.agents.find((candidate) => candidate.callsign === "ARCHIVIST");

    expect(agent).toBeDefined();

    const reply = buildMockReply({
      agent: {
        identity: agent!.identity,
        callsign: agent!.callsign,
        title: agent!.title,
        mission: agent!.mission,
        provider: agent!.provider,
        model: agent!.model,
        memory: agent!.memory,
        contextNotes: agent!.contextNotes,
      },
      messages: [{ role: "user", content: "compress this context" }],
    });

    expect(reply).toContain("ARCHIVIST received the packet");
    expect(reply).toContain("compress this context");
    expect(reply).toContain("Mock mode is active by design");
  });
});

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("E-2 chat detail page contract", () => {
  it("uses the Next 16 promise params contract for the chat id", () => {
    const source = readPageSource();

    expect(source).toContain('"use client"');
    expect(source).toMatch(/import\s+\{\s*use\b[\s\S]*\}\s+from\s+["']react["']/);
    expect(source).toMatch(/params:\s*Promise<\{\s*id:\s*string\s*\}>/);
    expect(source).toMatch(/const\s+\{\s*id\s*\}\s*=\s*use\(params\)/);
  });

  it("replaces the thin placeholder with a real conversation detail surface", () => {
    const source = readPageSource();

    expect(source).toContain("nexus-chat-detail-shell");
    expect(source).toContain("NexusChatCanvas");
    expect(source).not.toContain("thin page placeholder");
    expect(source).not.toContain("planned for a future release");
  });

  it("loads exactly the selected conversation messages through the global chat adapter", () => {
    const source = readPageSource();

    expect(source).toContain("nexusHomeApi.listGlobalMessages(id)");
    expect(source).toContain("nexusHomeApi.listWorkspaces()");
    expect(source).toContain("nexusHomeApi.listModels()");
    expect(source).toContain("conversationId={id}");
  });

  it("handles loading, unauthenticated, empty, error, and send states without fake data", () => {
    const source = readPageSource();

    expect(source).toContain("chat-detail-loading");
    expect(source).toContain("chat-detail-unauthenticated");
    expect(source).toContain("chat-detail-empty");
    expect(source).toContain("chat-detail-error");
    expect(source).toContain("handleSend");
    expect(source).not.toMatch(/mockMessages|fakeMessages|sampleMessages/);
  });
});

function readPageSource() {
  return readFileSync(new URL("page.tsx", import.meta.url), "utf8");
}

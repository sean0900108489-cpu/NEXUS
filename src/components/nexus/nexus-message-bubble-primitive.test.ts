import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus message bubble production primitive", () => {
  it("keeps message bubble rendering anchored on the existing article wrapper", () => {
    const source = readMessageBubbleSource();

    expect(source).toContain("<article");
    expect(source).toContain('"nexus-message-bubble border p-3"');
    expect(source).toContain('message.role === "user"');
    expect(source).toContain('message.role === "assistant"');
    expect(source).toContain('message.role === "tool"');
    expect(source).toContain("nexus-message-bubble-user");
    expect(source).toContain("nexus-message-bubble-assistant");
    expect(source).toContain("nexus-message-bubble-tool");
  });

  it("preserves message content, streaming, reasoning, media, and role label rendering", () => {
    const source = readMessageBubbleSource();

    expect(source).toContain("{message.content}");
    expect(source).toContain("message.streaming");
    expect(source).toContain("message.interrupted");
    expect(source).toContain("message.reasoningContent");
    expect(source).toContain("reasoningPreview");
    expect(source).toContain("message.media");
    expect(source).toContain("<MediaArtifactPreview");
    expect(source).toContain('{isUser ? "operator" : isTool ? "tool" : "agent"}');
  });

  it("does not add behavior authority to MessageBubble", () => {
    const source = readMessageBubbleSource();
    const forbiddenPatterns = [
      /\buse[A-Z][A-Za-z]+\s*\(/,
      /\buseEffect\b/,
      /\buseLayoutEffect\b/,
      /\bon[A-Z][A-Za-z]+\s*=/,
      /\{\.\.\./,
      /\bref\s*=/,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
      /\bfetch\b/,
      /\brunTool\b/,
      /\breadStreamEvents\b/,
      /\bappendToMessage\b/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `MessageBubble should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("has generic and role-aware message bubble aliases with fallback chains", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-shell .nexus-message-bubble");
    expect(css).toContain(".nexus-shell .nexus-message-bubble-user");
    expect(css).toContain(".nexus-shell .nexus-message-bubble-assistant");
    expect(css).toContain(".nexus-shell .nexus-message-bubble-tool");
    expect(css).toContain('[data-theme="terminal"] .nexus-message-bubble');
    expect(css).toContain('[data-theme="terminal"] .nexus-message-bubble-user');
    expect(css).toContain('[data-theme="terminal"] .nexus-message-bubble-assistant');
    expect(css).toContain('[data-theme="terminal"] .nexus-message-bubble-tool');
    expect(css).toContain("--nexus-message-bubble-bg");
    expect(css).toContain("--nexus-message-bubble-border");
    expect(css).toContain("--nexus-message-bubble-shadow");
    expect(css).toContain("--nexus-message-bubble-radius");
    expect(css).toContain("--nexus-message-user-bg");
    expect(css).toContain("--nexus-message-assistant-bg");
    expect(css).toContain("--nexus-message-tool-bg");
    expect(css).toContain(
      "var(--nexus-message-user-bg, var(--nexus-message-bubble-bg, var(--nexus-panel-bg, rgb(217 70 239 / 0.1))))",
    );
    expect(css).toContain(
      "var(--nexus-message-assistant-bg, var(--nexus-message-bubble-bg, var(--nexus-panel-bg, rgb(210 210 210 / 0.07))))",
    );
    expect(css).toContain(
      "var(--nexus-message-tool-bg, var(--nexus-message-bubble-bg, var(--nexus-panel-bg, rgb(16 185 129 / 0.07))))",
    );
  });
});

function readMessageBubbleSource() {
  const source = readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");

  return source.match(/function MessageBubble\([\s\S]*?\n}\n\nfunction WorkspaceChatComposerShell/)?.[0] ?? "";
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

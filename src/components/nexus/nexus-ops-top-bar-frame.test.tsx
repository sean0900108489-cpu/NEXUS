import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  NexusOpsTopBarFrame,
  type NexusOpsTopBarFrameProps,
} from "./nexus-ops-top-bar-frame";

describe("NexusOpsTopBarFrame", () => {
  it("renders children inside the existing top bar frame element", () => {
    const html = renderToStaticMarkup(
      <NexusOpsTopBarFrame>
        <button type="button">Workspace menu</button>
        <span data-testid="sync">Synced</span>
      </NexusOpsTopBarFrame>,
    );

    expect(html).toContain("<header");
    expect(html).toContain('<button type="button">Workspace menu</button>');
    expect(html).toContain('<span data-testid="sync">Synced</span>');
  });

  it("preserves the existing top bar visual class marker", () => {
    const html = renderToStaticMarkup(
      <NexusOpsTopBarFrame>
        <span>child</span>
      </NexusOpsTopBarFrame>,
    );

    expect(html).toContain("nexus-top-bar-frame");
    expect(html).toContain(
      "flex h-11 shrink-0 items-center border-b border-white/10 bg-black/20 px-3",
    );
  });

  it("has dedicated TopBar CSS aliases with panel and cyberpunk fallbacks", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-shell .nexus-top-bar-frame");
    expect(css).toContain("--nexus-top-bar-bg");
    expect(css).toContain("--nexus-top-bar-border");
    expect(css).toContain("--nexus-top-bar-shadow");
    expect(css).toContain("--nexus-top-bar-blur");
    expect(css).toContain("--nexus-top-bar-radius");
    expect(css).toContain("var(--nexus-panel-bg, rgb(0 0 0 / 0.2))");
    expect(css).toContain(
      "var(--nexus-panel-border, rgb(255 255 255 / 0.1))",
    );
    expect(css).toContain("var(--nexus-panel-shadow, 0 0 0 transparent)");
    expect(css).toContain("var(--nexus-panel-blur, var(--glass-blur))");
    expect(css).toContain("var(--nexus-panel-radius, 0)");
  });

  it("does not expose behavior authority through props", () => {
    const source = readTopBarFrameSource();
    const propsBlock = source.match(
      /export type NexusOpsTopBarFrameProps = \{[\s\S]*?\};/,
    )?.[0];

    expect(propsBlock).toContain("children");
    expect(propsBlock).not.toMatch(
      /\b(className|style|layout|geometry|focus|keyboard|zIndex|overflow|route|feature|component|mapping|behavior)\b/,
    );
    expect(propsBlock).not.toMatch(/\bon[A-Z][A-Za-z]+/);

    const validProps: NexusOpsTopBarFrameProps = {
      children: "child",
    };

    expect(validProps.children).toBe("child");
  });

  it("does not use hooks, effects, event handlers, prop spreading, or style mutation", () => {
    const source = readTopBarFrameSource();
    const forbiddenPatterns = [
      /\buse[A-Z][A-Za-z]+\s*\(/,
      /\buseEffect\b/,
      /\buseLayoutEffect\b/,
      /\bon[A-Z][A-Za-z]+\s*=/,
      /\{\.\.\./,
      /\bstyle\s*=/,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `top bar frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("imports no forbidden runtime modules", () => {
    const source = readTopBarFrameSource();
    const forbiddenPatterns = [
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@\/lib\/style-engine\//,
      /from\s+["']@supabase\//,
      /from\s+["']@xyflow\//,
      /from\s+["']react-rnd/,
      /from\s+["']next\/dynamic["']/,
      /from\s+["']framer-motion["']/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `top bar frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readTopBarFrameSource() {
  return readFileSync(
    new URL("nexus-ops-top-bar-frame.tsx", import.meta.url),
    "utf8",
  );
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

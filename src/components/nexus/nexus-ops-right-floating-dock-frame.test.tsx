import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  NexusOpsRightFloatingDockFrame,
  type NexusOpsRightFloatingDockFrameProps,
} from "./nexus-ops-right-floating-dock-frame";

describe("NexusOpsRightFloatingDockFrame", () => {
  it("renders children inside the existing right dock frame elements", () => {
    const html = renderToStaticMarkup(
      <NexusOpsRightFloatingDockFrame>
        <button type="button">Intel</button>
        <button type="button">Providers</button>
      </NexusOpsRightFloatingDockFrame>,
    );

    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Right workspace tools"');
    expect(html).toContain('<button type="button">Intel</button>');
    expect(html).toContain('<button type="button">Providers</button>');
  });

  it("keeps the right dock material fallback neutral while preserving frame markers", () => {
    const html = renderToStaticMarkup(
      <NexusOpsRightFloatingDockFrame>
        <span>child</span>
      </NexusOpsRightFloatingDockFrame>,
    );

    expect(html).toContain(
      'class="pointer-events-none fixed right-3 top-1/2 z-[130] hidden -translate-y-1/2 xl:block"',
    );
    expect(html).toContain(
      'class="nexus-right-floating-dock-rail pointer-events-auto grid gap-2 border border-white/10 bg-black/35 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"',
    );
    expect(html).not.toContain("border-cyan-300/25");
    expect(html).not.toContain("bg-slate-950/90");
    expect(html).not.toContain("rgba(34,211,238");
  });

  it("keeps a stable rail class for token alias adoption", () => {
    const source = readRightFloatingDockFrameSource();

    expect(source).toContain("nexus-right-floating-dock-rail");
  });

  it("does not expose behavior authority through props", () => {
    const source = readRightFloatingDockFrameSource();
    const propsBlock = source.match(
      /export type NexusOpsRightFloatingDockFrameProps = \{[\s\S]*?\};/,
    )?.[0];

    expect(propsBlock).toContain("children");
    expect(propsBlock).not.toMatch(
      /\b(className|style|layout|geometry|focus|keyboard|zIndex|overflow|route|feature|component|mapping|behavior)\b/,
    );
    expect(propsBlock).not.toMatch(/\bon[A-Z][A-Za-z]+/);

    const validProps: NexusOpsRightFloatingDockFrameProps = {
      children: "child",
    };

    expect(validProps.children).toBe("child");
  });

  it("does not use hooks, effects, event handlers, prop spreading, or style mutation", () => {
    const source = readRightFloatingDockFrameSource();
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
      expect(source, `right dock frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("imports no forbidden runtime modules", () => {
    const source = readRightFloatingDockFrameSource();
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
      expect(source, `right dock frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("declares right dock CSS variable aliases with panel and baseline fallback", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-right-floating-dock-rail");
    expect(css).toContain("--nexus-right-dock-bg");
    expect(css).toContain("--nexus-right-dock-border");
    expect(css).toContain("--nexus-right-dock-shadow");
    expect(css).toContain("--nexus-right-dock-blur");
    expect(css).toContain("--nexus-right-dock-radius");
    expect(css).toContain("var(--nexus-panel-bg");
    expect(css).toContain("var(--nexus-panel-border");
    expect(css).toContain("var(--nexus-panel-shadow");
    expect(css).toContain("var(--nexus-panel-blur");
    expect(css).toContain("var(--nexus-panel-radius");
  });
});

function readRightFloatingDockFrameSource() {
  return readFileSync(
    new URL("nexus-ops-right-floating-dock-frame.tsx", import.meta.url),
    "utf8",
  );
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

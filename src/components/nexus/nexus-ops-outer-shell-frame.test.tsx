import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  NexusOpsOuterShellFrame,
  type NexusOpsOuterShellFrameProps,
} from "./nexus-ops-outer-shell-frame";

describe("NexusOpsOuterShellFrame", () => {
  it("renders children inside the existing outer shell element", () => {
    const html = renderToStaticMarkup(
      <NexusOpsOuterShellFrame>
        <section data-testid="existing-shell-children">Existing shell children</section>
      </NexusOpsOuterShellFrame>,
    );

    expect(html).toContain("<main");
    expect(html).toContain(
      '<section data-testid="existing-shell-children">Existing shell children</section>',
    );
  });

  it("preserves the existing outer shell visual class marker", () => {
    const html = renderToStaticMarkup(
      <NexusOpsOuterShellFrame>
        <span>child</span>
      </NexusOpsOuterShellFrame>,
    );

    expect(html).toContain(
      'class="nexus-shell nexus-outer-shell-frame flex h-dvh min-h-0 flex-col overflow-x-hidden overflow-y-auto text-neutral-100"',
    );
  });

  it("has a stable outer shell selector for token alias adoption", () => {
    const source = readOuterShellFrameSource();

    expect(source).toContain("nexus-outer-shell-frame");
  });

  it("keeps the outer shell as a transparent structure boundary with a bottom backdrop", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-shell.nexus-outer-shell-frame");
    expect(css).toContain("position: relative");
    expect(css).toContain("isolation: isolate");
    expect(css).toContain("background: transparent");
    expect(css).toContain("background-image: none");
    expect(css).toContain(".nexus-shell.nexus-outer-shell-frame::before");
    expect(css).toContain("z-index: -1");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("var(--nexus-root-backdrop-bg, var(--shell-surface))");
  });

  it("does not expose behavior authority through props", () => {
    const source = readOuterShellFrameSource();
    const propsBlock = source.match(
      /export type NexusOpsOuterShellFrameProps = \{[\s\S]*?\};/,
    )?.[0];

    expect(propsBlock).toContain("children");
    expect(propsBlock).not.toMatch(
      /\b(className|style|layout|geometry|focus|keyboard|zIndex|overflow|route|feature|component|mapping|behavior)\b/,
    );
    expect(propsBlock).not.toMatch(/\bon[A-Z][A-Za-z]+/);

    const validProps: NexusOpsOuterShellFrameProps = {
      children: "child",
    };

    expect(validProps.children).toBe("child");
  });

  it("does not use hooks, effects, event handlers, prop spreading, or style mutation", () => {
    const source = readOuterShellFrameSource();
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
      expect(source, `outer shell frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("imports no forbidden runtime modules", () => {
    const source = readOuterShellFrameSource();
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
      expect(source, `outer shell frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readOuterShellFrameSource() {
  return readFileSync(
    new URL("nexus-ops-outer-shell-frame.tsx", import.meta.url),
    "utf8",
  );
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

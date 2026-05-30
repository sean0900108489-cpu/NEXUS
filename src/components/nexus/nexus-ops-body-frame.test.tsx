import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  NexusOpsBodyFrame,
  type NexusOpsBodyFrameProps,
} from "./nexus-ops-body-frame";

describe("NexusOpsBodyFrame", () => {
  it("renders children inside the existing body frame element", () => {
    const html = renderToStaticMarkup(
      <NexusOpsBodyFrame>
        <aside data-testid="left-dock">Left dock</aside>
        <section data-testid="workspace">Workspace</section>
      </NexusOpsBodyFrame>,
    );

    expect(html).toContain("<section");
    expect(html).toContain('<aside data-testid="left-dock">Left dock</aside>');
    expect(html).toContain(
      '<section data-testid="workspace">Workspace</section>',
    );
  });

  it("preserves the existing body visual class marker", () => {
    const html = renderToStaticMarkup(
      <NexusOpsBodyFrame>
        <span>child</span>
      </NexusOpsBodyFrame>,
    );

    expect(html).toContain('class="flex min-h-0 flex-1 gap-2 p-2"');
  });

  it("does not expose behavior authority through props", () => {
    const source = readBodyFrameSource();
    const propsBlock = source.match(
      /export type NexusOpsBodyFrameProps = \{[\s\S]*?\};/,
    )?.[0];

    expect(propsBlock).toContain("children");
    expect(propsBlock).not.toMatch(
      /\b(className|style|layout|geometry|focus|keyboard|zIndex|overflow|route|feature|component|mapping|behavior)\b/,
    );
    expect(propsBlock).not.toMatch(/\bon[A-Z][A-Za-z]+/);

    const validProps: NexusOpsBodyFrameProps = {
      children: "child",
    };

    expect(validProps.children).toBe("child");
  });

  it("does not use hooks, effects, event handlers, prop spreading, or style mutation", () => {
    const source = readBodyFrameSource();
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
      expect(source, `body frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("imports no forbidden runtime modules", () => {
    const source = readBodyFrameSource();
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
      expect(source, `body frame should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readBodyFrameSource() {
  return readFileSync(
    new URL("nexus-ops-body-frame.tsx", import.meta.url),
    "utf8",
  );
}

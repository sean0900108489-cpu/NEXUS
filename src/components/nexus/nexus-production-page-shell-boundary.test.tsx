import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1,
  NexusProductionPageShellBoundary,
  type NexusProductionPageShellBoundaryProps,
} from "./nexus-production-page-shell-boundary";

describe("NexusProductionPageShellBoundary", () => {
  it("renders children unchanged inside an inert wrapper", () => {
    const html = renderToStaticMarkup(
      <NexusProductionPageShellBoundary shellId="workspace">
        <main data-testid="existing-nexus-ops">Existing NexusOps</main>
      </NexusProductionPageShellBoundary>,
    );

    expect(html).toContain(
      '<main data-testid="existing-nexus-ops">Existing NexusOps</main>',
    );
  });

  it("emits expected inert data attributes and display class", () => {
    const html = renderToStaticMarkup(
      <NexusProductionPageShellBoundary shellId="workspace">
        <span>child</span>
      </NexusProductionPageShellBoundary>,
    );

    expect(html).toContain('class="contents"');
    expect(html).toContain('data-nexus-production-page-shell-boundary="v1"');
    expect(html).toContain('data-nexus-page-shell="workspace"');
    expect(html).toContain('data-nexus-production-apply="blocked"');
  });

  it("only accepts the workspace shell id", () => {
    expect(NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1).toEqual(["workspace"]);

    const validProps: NexusProductionPageShellBoundaryProps = {
      children: "child",
      shellId: "workspace",
    };

    expect(validProps.shellId).toBe("workspace");

    const invalidProps: NexusProductionPageShellBoundaryProps = {
      children: "child",
      // @ts-expect-error settings is intentionally not a production shell id yet.
      shellId: "settings",
    };

    expect(invalidProps.shellId).toBe("settings");
  });

  it("does not expose layout or behavior authority through props", () => {
    const source = readBoundarySource();
    const propsBlock = source.match(
      /export type NexusProductionPageShellBoundaryProps = \{[\s\S]*?\};/,
    )?.[0];

    expect(propsBlock).toContain("children");
    expect(propsBlock).toContain("shellId");
    expect(propsBlock).not.toMatch(
      /\b(className|style|layout|geometry|focus|keyboard|zIndex|overflow|route|feature|component|mapping|behavior)\b/,
    );
    expect(propsBlock).not.toMatch(/\bon[A-Z][A-Za-z]+/);
  });

  it("does not use hooks, effects, event handlers, style mutation, or forbidden runtime imports", () => {
    const source = readBoundarySource();

    const forbiddenPatterns = [
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@supabase\//,
      /from\s+["']@xyflow\//,
      /from\s+["']react-rnd/,
      /\buse[A-Z][A-Za-z]+\s*\(/,
      /\buseEffect\b/,
      /\buseLayoutEffect\b/,
      /\bon[A-Z][A-Za-z]+\s*=/,
      /\bstyle\s*=/,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source, `boundary should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});

function readBoundarySource() {
  return readFileSync(
    new URL("nexus-production-page-shell-boundary.tsx", import.meta.url),
    "utf8",
  );
}

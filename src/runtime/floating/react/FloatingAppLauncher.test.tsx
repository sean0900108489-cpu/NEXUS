import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { FloatingAppDefinition } from "@/runtime/floating/registry/floating-app-types";
import { FloatingAppLauncher } from "./FloatingAppLauncher";

describe("FloatingAppLauncher", () => {
  it("renders registry app definitions as visible launch actions", () => {
    const html = renderToStaticMarkup(
      <FloatingAppLauncher
        apps={[makeApp(), makeApp({ kind: "feed", title: "Feed", icon: "rss" })]}
        onOpen={vi.fn()}
      />,
    );

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('data-floating-app-launcher="workspace"');
    expect(html).toContain('data-floating-app-kind="developer-inspector"');
    expect(html).toContain('aria-label="Open Dev Inspector"');
    expect(html).toContain('title="Open Dev Inspector"');
    expect(html).toContain("Dev Inspector");
    expect(html).toContain('data-floating-app-kind="feed"');
    expect(html).toContain('aria-label="Open Feed"');
    expect(html).toContain('title="Open Feed"');
  });

  it("renders nothing when no apps are registered", () => {
    const html = renderToStaticMarkup(
      <FloatingAppLauncher apps={[]} onOpen={vi.fn()} />,
    );

    expect(html).toBe("");
  });
});

function makeApp(overrides: Partial<FloatingAppDefinition> = {}): FloatingAppDefinition {
  return {
    kind: "developer-inspector",
    title: "Dev Inspector",
    scope: "account",
    defaultSize: { width: 680, height: 520 },
    icon: "code",
    component: () => null,
    ...overrides,
  };
}

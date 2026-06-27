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

  it("keeps the launcher scrollable and button widths stable for the R5 app set", () => {
    const apps = [
      makeApp(),
      makeApp({ kind: "feed", title: "Feed", icon: "rss" }),
      makeApp({ kind: "artifact-library", title: "Artifacts", icon: "folder-open" }),
      makeApp({ kind: "profile-preview", title: "Profile", icon: "user" }),
      makeApp({ kind: "notes", title: "Notes", icon: "sticky-note" }),
      makeApp({ kind: "forum", title: "Forum", icon: "message-square" }),
      makeApp({ kind: "global-chat", title: "Global Chat", icon: "message-circle" }),
      makeApp({ kind: "service-board", title: "Service Board", icon: "briefcase" }),
    ];

    const html = renderToStaticMarkup(
      <FloatingAppLauncher apps={apps} onOpen={vi.fn()} />,
    );

    expect(html).toContain('data-floating-app-count="8"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("overscroll-x-contain");
    expect(html).toContain("shrink-0");
    expect(html).toContain('data-floating-app-kind="service-board"');
    expect(html).toContain('aria-label="Open Service Board"');
    expect(html.match(/data-floating-app-kind=/g)).toHaveLength(8);
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

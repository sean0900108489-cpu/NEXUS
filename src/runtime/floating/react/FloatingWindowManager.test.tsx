import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createMemoryFloatingHostAdapter } from "@/runtime/floating/adapters/memory-floating-host";
import { createFloatingAppRegistry } from "@/runtime/floating/registry/floating-app-registry";
import type { FloatingAppProps } from "@/runtime/floating/registry/floating-app-types";
import { FloatingWindowManager } from "./FloatingWindowManager";

describe("FloatingWindowManager", () => {
  it("renders registered app content through the floating frame", () => {
    const registry = createFloatingAppRegistry();
    registry.register({
      kind: "feed",
      title: "Feed",
      scope: "workspace",
      defaultSize: { width: 620, height: 480 },
      minSize: { width: 360, height: 260 },
      component: FeedApp,
    });
    const host = createMemoryFloatingHostAdapter({
      hostId: "workspace",
      bounds: { width: 1000, height: 700 },
      lifecycle: {
        createId: (kind, index) => `window-${kind}-${index}`,
        now: () => "2026-06-27T00:00:00.000Z",
      },
    });

    host.openWindow({
      kind: "feed",
      title: "Feed",
      scope: "workspace",
      defaultSize: { width: 620, height: 480 },
    });

    const html = renderToStaticMarkup(
      <FloatingWindowManager host={host} registry={registry} zIndexBase={100} />,
    );

    expect(html).toContain('data-floating-window-manager="workspace"');
    expect(html).toContain('data-floating-window-kind="feed"');
    expect(html).toContain('data-bounds-width="1000"');
    expect(html).toContain('data-bounds-height="700"');
    expect(html).toContain('data-min-width="360"');
    expect(html).toContain('data-min-height="260"');
    expect(html).toContain("z-index:101");
    expect(html).toContain('<section data-testid="feed-app">Feed / window-feed-1</section>');
  });

  it("renders a recoverable panel for missing app definitions", () => {
    const host = createMemoryFloatingHostAdapter({
      hostId: "workspace",
      bounds: { width: 1000, height: 700 },
      lifecycle: {
        createId: (kind, index) => `window-${kind}-${index}`,
        now: () => "2026-06-27T00:00:00.000Z",
      },
    });

    host.openWindow({
      kind: "missing-app",
      title: "Missing App",
      scope: "workspace",
      defaultSize: { width: 420, height: 320 },
    });

    const html = renderToStaticMarkup(
      <FloatingWindowManager host={host} registry={createFloatingAppRegistry()} />,
    );

    expect(html).toContain("No floating app registered for kind");
    expect(html).toContain("missing-app");
  });
});

function FeedApp({ window }: FloatingAppProps) {
  return <section data-testid="feed-app">Feed / {window.id}</section>;
}

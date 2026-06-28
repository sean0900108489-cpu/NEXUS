import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FloatingWindowFrame } from "./FloatingWindowFrame";
import type { FloatingWindowInstance } from "@/runtime/floating";

describe("FloatingWindowFrame", () => {
  it("renders accessible generic chrome around an app slot", () => {
    const html = renderToStaticMarkup(
      <FloatingWindowFrame
        focused={true}
        onClose={vi.fn()}
        onFocus={vi.fn()}
        onMaximize={vi.fn()}
        onMinimize={vi.fn()}
        onMove={vi.fn()}
        onResize={vi.fn()}
        onRestore={vi.fn()}
        minSize={{ width: 360, height: 260 }}
        window={makeWindow()}
        zIndexBase={100}
      >
        <div data-testid="app-slot">Feed app</div>
      </FloatingWindowFrame>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Feed floating window"');
    expect(html).toContain('aria-label="Move Feed window"');
    expect(html).toContain('aria-label="Close window"');
    expect(html).toContain('aria-label="Minimize window"');
    expect(html).toContain('aria-label="Maximize window"');
    expect(html).toContain('aria-label="Lock window position"');
    expect(html).toContain('aria-label="Resize window"');
    expect(html).toContain('data-floating-window-kind="feed"');
    expect(html).toContain('data-min-width="360"');
    expect(html).toContain('data-min-height="260"');
    expect(html).toContain('data-position-locked="false"');
    expect(html).toContain("position:absolute");
    expect(html).toContain("z-index:107");
    expect(html).toContain('<div data-testid="app-slot">Feed app</div>');
  });

  it("does not render minimized windows into the stage", () => {
    const html = renderToStaticMarkup(
      <FloatingWindowFrame
        focused={false}
        onClose={vi.fn()}
        onFocus={vi.fn()}
        onMaximize={vi.fn()}
        onMinimize={vi.fn()}
        onMove={vi.fn()}
        onResize={vi.fn()}
        onRestore={vi.fn()}
        window={makeWindow({ minimized: true })}
      >
        <div>Hidden app</div>
      </FloatingWindowFrame>,
    );

    expect(html).toBe("");
  });
});

function makeWindow(overrides: Partial<FloatingWindowInstance> = {}): FloatingWindowInstance {
  return {
    id: "window-1",
    kind: "feed",
    title: "Feed",
    scope: "workspace",
    layout: { x: 12, y: 24, width: 640, height: 420, zIndex: 7 },
    minimized: false,
    maximized: false,
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides,
  };
}

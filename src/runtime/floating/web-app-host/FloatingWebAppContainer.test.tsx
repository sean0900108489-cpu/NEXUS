import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FloatingWebAppContainer } from "./FloatingWebAppContainer";
import type {
  FloatingAppProps,
  FloatingWebAppManifest,
} from "@/runtime/floating/registry/floating-app-types";

const manifest: FloatingWebAppManifest = {
  id: "local-web-app-pilot",
  kind: "external-web-app",
  title: "Local Web App",
  entry: "http://localhost:5173",
  mode: "iframe",
  permissions: ["frame:render", "workspace:read"],
  sandbox: [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups",
    "allow-downloads",
    "allow-modals",
  ],
  bridge: {
    commandBridge: false,
    authBridge: false,
    storageBridge: false,
    apiBridge: false,
    workspaceContext: true,
  },
};

describe("FloatingWebAppContainer", () => {
  it("hosts an external web app manifest inside a sandboxed iframe", () => {
    const html = renderToStaticMarkup(
      <FloatingWebAppContainer {...makeProps()} manifest={manifest} />,
    );

    expect(html).toContain('data-floating-web-app-host="iframe"');
    expect(html).toContain('data-floating-web-app-id="local-web-app-pilot"');
    expect(html).toContain('data-floating-window-id="window-external-web-app-test"');
    expect(html).toContain('src="http://localhost:5173"');
    expect(html).toContain('title="Local Web App"');
    expect(html).toContain(
      'sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"',
    );
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain("border-0");
  });

  it("keeps auth, storage, API, and command bridges disabled for the Stage5 context pilot", () => {
    const html = renderToStaticMarkup(
      <FloatingWebAppContainer {...makeProps()} manifest={manifest} />,
    );

    expect(html).toContain('data-bridge-command="false"');
    expect(html).toContain('data-bridge-auth="false"');
    expect(html).toContain('data-bridge-storage="false"');
    expect(html).toContain('data-bridge-api="false"');
    expect(html).toContain('data-bridge-workspace-context="true"');
    expect(html).toContain('data-context-bridge-origin="http://localhost:5173"');
  });
});

function makeProps(): FloatingAppProps {
  return {
    close: vi.fn(),
    setTitle: vi.fn(),
    window: {
      id: "window-external-web-app-test",
      kind: "external-web-app",
      title: "Web App Host",
      scope: "workspace",
      workspaceId: "workspace-r5",
      layout: { x: 0, y: 0, width: 960, height: 720, zIndex: 1 },
      minimized: false,
      maximized: false,
      createdAt: "2026-06-29T00:00:00.000Z",
      updatedAt: "2026-06-29T00:00:00.000Z",
    },
  };
}

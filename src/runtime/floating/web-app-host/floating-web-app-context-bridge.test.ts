import { describe, expect, it, vi } from "vitest";

import {
  FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE,
  buildFloatingWebAppContextBridgeMessage,
  isAllowedFloatingWebAppOrigin,
  isFloatingWebAppContextBridgeMessage,
  postFloatingWebAppContextBridgeMessage,
  parseFloatingWebAppMessageEvent,
} from "./floating-web-app-context-bridge";
import type {
  FloatingWindowInstance,
  FloatingWebAppManifest,
} from "@/runtime/floating";

describe("floating web app context bridge", () => {
  it("builds a safe parent-to-iframe workspace context message for allowed origins", () => {
    const result = buildFloatingWebAppContextBridgeMessage({
      manifest: makeManifest(),
      window: makeWindow({ workspaceId: "workspace-123" }),
      theme: "dark",
    });

    expect(result).toEqual({
      targetOrigin: "http://localhost:5173",
      message: {
        type: FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE,
        payload: {
          appInstanceId: "floating-window-external-web-app-1",
          appKind: "external-web-app",
          floatingWindowId: "floating-window-external-web-app-1",
          host: {
            bridge: "workspace-context",
            version: "r5-stage5-context-v1",
          },
          manifestId: "local-web-app-pilot",
          theme: "dark",
          viewport: { height: 720, width: 960 },
          workspaceId: "workspace-123",
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("token");
    expect(JSON.stringify(result)).not.toContain("supabase");
    expect(JSON.stringify(result)).not.toContain("service_role");
  });

  it("does not build context messages when the bridge is disabled or lacks workspace permission", () => {
    expect(
      buildFloatingWebAppContextBridgeMessage({
        manifest: makeManifest({ bridge: { ...makeManifest().bridge, workspaceContext: false } }),
        window: makeWindow(),
      }),
    ).toBeNull();
    expect(
      buildFloatingWebAppContextBridgeMessage({
        manifest: makeManifest({ permissions: ["frame:render"] }),
        window: makeWindow(),
      }),
    ).toBeNull();
  });

  it("posts context messages only when an enabled context bridge has a target window", () => {
    const result = buildFloatingWebAppContextBridgeMessage({
      manifest: makeManifest(),
      window: makeWindow({ workspaceId: "workspace-123" }),
    });
    const target = {
      postMessage: vi.fn(),
    };

    expect(postFloatingWebAppContextBridgeMessage(target, result)).toBe(true);
    expect(target.postMessage).toHaveBeenCalledWith(
      result?.message,
      "http://localhost:5173",
    );

    expect(postFloatingWebAppContextBridgeMessage(target, null)).toBe(false);
    expect(postFloatingWebAppContextBridgeMessage(null, result)).toBe(false);
  });

  it("allowlists only the manifest entry origin", () => {
    const manifest = makeManifest();

    expect(isAllowedFloatingWebAppOrigin(manifest, "http://localhost:5173")).toBe(true);
    expect(isAllowedFloatingWebAppOrigin(manifest, "http://localhost:5174")).toBe(false);
    expect(isAllowedFloatingWebAppOrigin(manifest, "https://example.com")).toBe(false);
  });

  it("validates context bridge message schema and rejects malformed events", () => {
    const result = buildFloatingWebAppContextBridgeMessage({
      manifest: makeManifest(),
      window: makeWindow({ workspaceId: "workspace-123" }),
    });

    expect(result).not.toBeNull();
    expect(isFloatingWebAppContextBridgeMessage(result!.message)).toBe(true);
    expect(isFloatingWebAppContextBridgeMessage({ type: "other", payload: {} })).toBe(false);
    expect(parseFloatingWebAppMessageEvent(
      {
        data: result!.message,
        origin: "http://localhost:5174",
      },
      makeManifest(),
    )).toBeNull();
    expect(parseFloatingWebAppMessageEvent(
      {
        data: { type: FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE, payload: { token: "nope" } },
        origin: "http://localhost:5173",
      },
      makeManifest(),
    )).toBeNull();
  });
});

function makeManifest(
  overrides: Partial<FloatingWebAppManifest> = {},
): FloatingWebAppManifest {
  return {
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
    ...overrides,
  };
}

function makeWindow(
  overrides: Partial<FloatingWindowInstance> = {},
): FloatingWindowInstance {
  return {
    id: "floating-window-external-web-app-1",
    kind: "external-web-app",
    title: "Web App Host",
    scope: "workspace",
    layout: { x: 0, y: 0, width: 960, height: 720, zIndex: 4 },
    minimized: false,
    maximized: false,
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
    ...overrides,
  };
}

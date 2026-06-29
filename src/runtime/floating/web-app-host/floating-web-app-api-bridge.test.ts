import { describe, expect, it } from "vitest";

import {
  FLOATING_WEB_APP_API_REQUEST_TYPE,
  FLOATING_WEB_APP_API_RESPONSE_TYPE,
  buildFloatingWebAppApiBridgeResponse,
  parseFloatingWebAppApiBridgeRequestEvent,
} from "./floating-web-app-api-bridge";
import type { FloatingWebAppManifest } from "@/runtime/floating";

describe("floating web app API bridge", () => {
  it("accepts only allowlisted Community Board API bridge requests", () => {
    const message = {
      type: FLOATING_WEB_APP_API_REQUEST_TYPE,
      payload: {
        action: "community-posts:create",
        body: { body: "hello", title: "first post" },
        requestId: "req-1",
      },
    };

    expect(
      parseFloatingWebAppApiBridgeRequestEvent(
        { data: message, origin: "http://localhost:5175" },
        makeManifest(),
      ),
    ).toEqual(message);
    expect(
      parseFloatingWebAppApiBridgeRequestEvent(
        { data: message, origin: "http://localhost:5174" },
        makeManifest(),
      ),
    ).toBeNull();
    expect(
      parseFloatingWebAppApiBridgeRequestEvent(
        { data: message, origin: "http://localhost:5175" },
        makeManifest({ bridge: { ...makeManifest().bridge, apiBridge: false } }),
      ),
    ).toBeNull();
    expect(
      parseFloatingWebAppApiBridgeRequestEvent(
        {
          data: {
            type: FLOATING_WEB_APP_API_REQUEST_TYPE,
            payload: {
              action: "api:anything",
              path: "/api/admin/new-api-token-group-sync",
              requestId: "req-2",
            },
          },
          origin: "http://localhost:5175",
        },
        makeManifest(),
      ),
    ).toBeNull();
  });

  it("builds response messages without exposing credentials", () => {
    const response = buildFloatingWebAppApiBridgeResponse({
      data: { posts: [] },
      requestId: "req-1",
    });

    expect(response).toEqual({
      type: FLOATING_WEB_APP_API_RESPONSE_TYPE,
      payload: {
        data: { posts: [] },
        ok: true,
        requestId: "req-1",
      },
    });
    expect(JSON.stringify(response)).not.toContain("token");
    expect(JSON.stringify(response)).not.toContain("service_role");
  });
});

function makeManifest(
  overrides: Partial<FloatingWebAppManifest> = {},
): FloatingWebAppManifest {
  return {
    id: "nexus-community-board",
    kind: "external-web-app",
    title: "Community Board",
    entry: "http://localhost:5175",
    mode: "iframe",
    permissions: ["frame:render", "workspace:read", "user:read"],
    sandbox: ["allow-scripts", "allow-same-origin"],
    bridge: {
      apiBridge: true,
      authBridge: false,
      commandBridge: false,
      storageBridge: false,
      userContext: true,
      workspaceContext: true,
    },
    ...overrides,
  };
}

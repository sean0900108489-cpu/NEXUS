import type { FloatingWebAppManifest } from "@/runtime/floating";

import { isAllowedFloatingWebAppOrigin } from "./floating-web-app-context-bridge";

export const FLOATING_WEB_APP_API_REQUEST_TYPE =
  "nexus:floating-web-app-api-request:v1";
export const FLOATING_WEB_APP_API_RESPONSE_TYPE =
  "nexus:floating-web-app-api-response:v1";

export type FloatingWebAppApiBridgeAction =
  | "community-posts:create"
  | "community-posts:list";

export type FloatingWebAppApiBridgeRequestMessage = {
  type: typeof FLOATING_WEB_APP_API_REQUEST_TYPE;
  payload: {
    action: FloatingWebAppApiBridgeAction;
    body?: unknown;
    requestId: string;
  };
};

export type FloatingWebAppApiBridgeResponseMessage = {
  type: typeof FLOATING_WEB_APP_API_RESPONSE_TYPE;
  payload:
    | {
        data: unknown;
        ok: true;
        requestId: string;
      }
    | {
        error: {
          message: string;
        };
        ok: false;
        requestId: string;
      };
};

export type FloatingWebAppApiBridgeEventLike = {
  data: unknown;
  origin: string;
};

const COMMUNITY_BOARD_ACTIONS = new Set<FloatingWebAppApiBridgeAction>([
  "community-posts:create",
  "community-posts:list",
]);

export function parseFloatingWebAppApiBridgeRequestEvent(
  event: FloatingWebAppApiBridgeEventLike,
  manifest: FloatingWebAppManifest,
): FloatingWebAppApiBridgeRequestMessage | null {
  if (!manifest.bridge.apiBridge) return null;
  if (!isAllowedFloatingWebAppOrigin(manifest, event.origin)) return null;
  if (!isFloatingWebAppApiBridgeRequestMessage(event.data)) return null;
  if (!isAllowedFloatingWebAppApiBridgeAction(manifest, event.data.payload.action)) {
    return null;
  }

  return event.data;
}

export function buildFloatingWebAppApiBridgeResponse(input: {
  data?: unknown;
  error?: unknown;
  requestId: string;
}): FloatingWebAppApiBridgeResponseMessage {
  if (input.error) {
    return {
      type: FLOATING_WEB_APP_API_RESPONSE_TYPE,
      payload: {
        error: {
          message:
            input.error instanceof Error
              ? input.error.message
              : "Request failed.",
        },
        ok: false,
        requestId: input.requestId,
      },
    };
  }

  return {
    type: FLOATING_WEB_APP_API_RESPONSE_TYPE,
    payload: {
      data: input.data,
      ok: true,
      requestId: input.requestId,
    },
  };
}

function isAllowedFloatingWebAppApiBridgeAction(
  manifest: FloatingWebAppManifest,
  action: string,
) {
  return manifest.id === "nexus-community-board" && COMMUNITY_BOARD_ACTIONS.has(
    action as FloatingWebAppApiBridgeAction,
  );
}

function isFloatingWebAppApiBridgeRequestMessage(
  value: unknown,
): value is FloatingWebAppApiBridgeRequestMessage {
  if (!isRecord(value)) return false;
  if (value.type !== FLOATING_WEB_APP_API_REQUEST_TYPE) return false;
  if (!isRecord(value.payload)) return false;
  if (typeof value.payload.requestId !== "string") return false;
  if (typeof value.payload.action !== "string") return false;

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

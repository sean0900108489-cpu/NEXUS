import type {
  FloatingWindowInstance,
  FloatingWebAppManifest,
} from "@/runtime/floating";

export const FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE =
  "nexus:floating-web-app-context:v1";

export type FloatingWebAppContextBridgeMessage = {
  type: typeof FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE;
  payload: {
    appInstanceId: string;
    appKind: string;
    floatingWindowId: string;
    host: {
      bridge: "workspace-context";
      version: "r5-stage5-context-v1";
    };
    manifestId: string;
    theme: "dark" | "light" | "system";
    viewport: {
      height: number;
      width: number;
    };
    workspaceId?: string;
  };
};

export type FloatingWebAppContextBridgeBuildInput = {
  manifest: FloatingWebAppManifest;
  window: FloatingWindowInstance;
  theme?: "dark" | "light" | "system";
};

export type FloatingWebAppContextBridgeBuildResult = {
  message: FloatingWebAppContextBridgeMessage;
  targetOrigin: string;
};

export type FloatingWebAppMessageEventLike = {
  data: unknown;
  origin: string;
};

export function buildFloatingWebAppContextBridgeMessage({
  manifest,
  theme = "system",
  window,
}: FloatingWebAppContextBridgeBuildInput): FloatingWebAppContextBridgeBuildResult | null {
  if (!manifest.bridge.workspaceContext) return null;
  if (!manifest.permissions.includes("workspace:read")) return null;

  const targetOrigin = getFloatingWebAppManifestOrigin(manifest);
  if (!targetOrigin) return null;

  return {
    targetOrigin,
    message: {
      type: FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE,
      payload: {
        appInstanceId: window.id,
        appKind: window.kind,
        floatingWindowId: window.id,
        host: {
          bridge: "workspace-context",
          version: "r5-stage5-context-v1",
        },
        manifestId: manifest.id,
        theme,
        viewport: {
          height: window.layout.height,
          width: window.layout.width,
        },
        ...(window.workspaceId ? { workspaceId: window.workspaceId } : {}),
      },
    },
  };
}

export function getFloatingWebAppManifestOrigin(
  manifest: FloatingWebAppManifest,
): string | null {
  try {
    return new URL(manifest.entry).origin;
  } catch {
    return null;
  }
}

export function isAllowedFloatingWebAppOrigin(
  manifest: FloatingWebAppManifest,
  origin: string,
) {
  return getFloatingWebAppManifestOrigin(manifest) === origin;
}

export function parseFloatingWebAppMessageEvent(
  event: FloatingWebAppMessageEventLike,
  manifest: FloatingWebAppManifest,
): FloatingWebAppContextBridgeMessage | null {
  if (!isAllowedFloatingWebAppOrigin(manifest, event.origin)) {
    return null;
  }

  return isFloatingWebAppContextBridgeMessage(event.data) ? event.data : null;
}

export function isFloatingWebAppContextBridgeMessage(
  value: unknown,
): value is FloatingWebAppContextBridgeMessage {
  if (!isRecord(value)) return false;
  if (value.type !== FLOATING_WEB_APP_CONTEXT_MESSAGE_TYPE) return false;
  if (!isRecord(value.payload)) return false;

  const payload = value.payload;
  if (typeof payload.appInstanceId !== "string") return false;
  if (typeof payload.appKind !== "string") return false;
  if (typeof payload.floatingWindowId !== "string") return false;
  if (typeof payload.manifestId !== "string") return false;
  if (!["dark", "light", "system"].includes(String(payload.theme))) return false;
  if (
    payload.workspaceId !== undefined &&
    typeof payload.workspaceId !== "string"
  ) {
    return false;
  }
  if (!isRecord(payload.viewport)) return false;
  if (typeof payload.viewport.height !== "number") return false;
  if (typeof payload.viewport.width !== "number") return false;
  if (!isRecord(payload.host)) return false;
  if (payload.host.bridge !== "workspace-context") return false;
  if (payload.host.version !== "r5-stage5-context-v1") return false;

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

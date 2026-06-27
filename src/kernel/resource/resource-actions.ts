/**
 * NEXUS Window OS — Resource Actions
 *
 * Opens resources in the appropriate window app.
 * Uses the Window Kernel Store to open windows for resource types.
 *
 * Never crashes — all failures result in notifications, not exceptions.
 *
 * @module kernel/resource/resource-actions
 */

"use client";

import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import type { NexusWindowKind } from "@/kernel/window/window-types";
import type { NexusResourceRef } from "./resource-ref";

// ── Resource → Window Kind Mapping ─────────────────────────────────

const RESOURCE_WINDOW_MAP: Record<string, string> = {
  attachment: "artifact-preview",
  artifact: "artifact-preview",
  "global-conversation": "global-chat",
  workspace: "workspace",
  profile: "profile-preview",
};

export const UNKNOWN_RESOURCE_FALLBACK_WINDOW = "artifact-preview";

export function getWindowKindForResourceType(type: string): string | undefined {
  return RESOURCE_WINDOW_MAP[type];
}

/**
 * Open a resource in the appropriate window.
 * Returns the window ID on success, null on failure.
 * All failures are surfaced via notification center — never crashes.
 */
export function openResource(ref: NexusResourceRef): string | null {
  // Determine target window kind
  const windowKind = getWindowKindForResourceType(ref.type);

  if (!windowKind) {
    // Unknown resource type — use fallback
    console.warn(`[ResourceActions] Unknown resource type: ${ref.type}. Using fallback.`);
    return openFallbackResource(ref);
  }

  const appDef = getWindowApp(windowKind as NexusWindowKind);

  if (!appDef) {
    console.warn(`[ResourceActions] No app registered for kind: ${windowKind}`);
    useNotificationStore.getState().addNotification({
      type: "warning",
      title: "Cannot open resource",
      message: `No window app is registered for "${ref.type}" resources.`,
      autoDismissMs: 5000,
    });
    return null;
  }

  try {
    return useWindowStore.getState().openWindow({
      kind: windowKind as NexusWindowKind,
      title: ref.label ?? `${ref.type}: ${ref.id.slice(0, 8)}`,
      scope: "account",
      defaultSize: appDef.defaultSize,
      resourceId: ref.id,
      state: { resourceRef: ref as unknown as Record<string, unknown> },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error opening resource";
    console.error(`[ResourceActions] Failed to open resource:`, err);
    useNotificationStore.getState().addNotification({
      type: "error",
      title: "Failed to open resource",
      message: msg,
      autoDismissMs: 6000,
    });
    return null;
  }
}

/**
 * Fallback: open the generic artifact-preview window for unknown or unreachable resources.
 */
function openFallbackResource(ref: NexusResourceRef): string | null {
  const fallbackApp = getWindowApp(UNKNOWN_RESOURCE_FALLBACK_WINDOW as NexusWindowKind);

  if (!fallbackApp) {
    useNotificationStore.getState().addNotification({
      type: "error",
      title: "Cannot open resource",
      message: "No preview window is available.",
      autoDismissMs: 5000,
    });
    return null;
  }

  useNotificationStore.getState().addNotification({
    type: "info",
    title: "Opening resource",
    message: `${ref.type}: ${ref.label ?? ref.id.slice(0, 8)}`,
    autoDismissMs: 2500,
  });

  return useWindowStore.getState().openWindow({
    kind: UNKNOWN_RESOURCE_FALLBACK_WINDOW,
    title: ref.label ?? `${ref.type}: ${ref.id.slice(0, 8)}`,
    scope: "account",
    defaultSize: fallbackApp.defaultSize,
    resourceId: ref.id,
    state: { resourceRef: ref as unknown as Record<string, unknown> },
  });
}

/**
 * Build a resource ref from an attachment in a chat message.
 */
export function attachmentToResourceRef(attachment: {
  id: string;
  kind: string;
  filename: string;
  mimeType?: string;
}): NexusResourceRef {
  return {
    type: "attachment",
    id: attachment.id,
    label: attachment.filename,
    meta: {
      kind: attachment.kind,
      mimeType: attachment.mimeType,
    },
  };
}

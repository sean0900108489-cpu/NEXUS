/**
 * NEXUS Window OS — Notification Store
 *
 * Local-only notification state. No Supabase, no push.
 *
 * @module kernel/notifications/notification-store
 */

"use client";

import { create } from "zustand";
import type { NexusNotification, NexusNotificationType } from "./notification-types";

// ── Helpers ────────────────────────────────────────────────────────

let counter = 0;

function makeId(): string {
  counter += 1;
  return `notif:${Date.now().toString(36)}-${counter.toString(36)}`;
}

// ── Store ──────────────────────────────────────────────────────────

type NotificationStore = {
  notifications: NexusNotification[];

  /** Add a notification. Returns its ID. */
  addNotification: (params: {
    type: NexusNotificationType;
    title: string;
    message?: string;
    autoDismissMs?: number;
  }) => string;

  /** Dismiss a single notification */
  dismissNotification: (id: string) => void;

  /** Dismiss all notifications */
  clearAll: () => void;

  /** Count of undismissed notifications */
  unreadCount: () => number;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (params) => {
    const id = makeId();
    const notification: NexusNotification = {
      id,
      type: params.type,
      title: params.title,
      message: params.message,
      createdAt: new Date().toISOString(),
      dismissed: false,
      autoDismissMs: params.autoDismissMs,
    };

    set((s) => ({
      notifications: [...s.notifications, notification],
    }));

    // Auto-dismiss
    if (params.autoDismissMs && params.autoDismissMs > 0) {
      setTimeout(() => {
        get().dismissNotification(id);
      }, params.autoDismissMs);
    }

    return id;
  },

  dismissNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n,
      ),
    }));
  },

  clearAll: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, dismissed: true })),
    }));
  },

  unreadCount: () => {
    return get().notifications.filter((n) => !n.dismissed).length;
  },
}));

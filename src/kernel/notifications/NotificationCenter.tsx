/**
 * NEXUS Window OS — Notification Center
 *
 * Renders undismissed notifications as a floating panel.
 *
 * @module kernel/notifications/NotificationCenter
 */

"use client";

import { useCallback } from "react";
import {
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useNotificationStore } from "./notification-store";
import type { NexusNotificationType } from "./notification-types";

// ── Icon Resolver ──────────────────────────────────────────────────

function typeIcon(type: NexusNotificationType) {
  switch (type) {
    case "info":
      return <Info className="w-4 h-4 text-blue-400" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "success":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
  }
}

function typeBorder(type: NexusNotificationType) {
  switch (type) {
    case "info":
      return "border-blue-500/30";
    case "warning":
      return "border-yellow-500/30";
    case "error":
      return "border-red-500/30";
    case "success":
      return "border-green-500/30";
  }
}

// ── Component ──────────────────────────────────────────────────────

export function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const undismissed = notifications.filter((n) => !n.dismissed);

  if (undismissed.length === 0) return null;

  return (
    <div className="fixed top-3 right-3 z-[9999] flex flex-col gap-1.5 max-w-[360px] w-full pointer-events-none">
      {undismissed.slice(0, 5).map((notif) => (
        <div
          key={notif.id}
          className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-lg border bg-black/90 backdrop-blur-md shadow-lg ${typeBorder(notif.type)}`}
        >
          <div className="shrink-0 mt-0.5">{typeIcon(notif.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/90 truncate">
              {notif.title}
            </p>
            {notif.message && (
              <p className="text-[10px] text-white/50 mt-0.5 line-clamp-2">
                {notif.message}
              </p>
            )}
          </div>
          <button
            className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
            onClick={() => dismissNotification(notif.id)}
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {undismissed.length > 1 && (
        <button
          className="pointer-events-auto self-end text-[10px] text-white/30 hover:text-white/50 transition-colors px-2 py-1"
          onClick={clearAll}
        >
          Clear all ({undismissed.length})
        </button>
      )}
    </div>
  );
}

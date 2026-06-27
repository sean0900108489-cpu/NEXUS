/**
 * NEXUS Window OS — Share Button Primitive
 *
 * Placeholder/local share action. No real sharing backend.
 *
 * @module features/interactions
 */

"use client";

import { Share2 } from "lucide-react";
import { useNotificationStore } from "@/kernel/notifications/notification-store";

export function ShareButton({ shareText }: { shareText: string }) {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        addNotification({ type: "success", title: "Copied share text", autoDismissMs: 2000 });
        return;
      }
      addNotification({ type: "info", title: "Share ready", message: shareText, autoDismissMs: 3000 });
    } catch {
      addNotification({ type: "warning", title: "Share unavailable", autoDismissMs: 3000 });
    }
  };

  return (
    <button
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/75"
      onClick={(event) => {
        event.stopPropagation();
        void handleShare();
      }}
      title="Share"
      aria-label="Share"
    >
      <Share2 className="h-3.5 w-3.5" />
    </button>
  );
}

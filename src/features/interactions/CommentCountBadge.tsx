/**
 * NEXUS Window OS — Comment Count Badge
 *
 * @module features/interactions
 */

"use client";

import { MessageCircle } from "lucide-react";

export function CommentCountBadge({ count = 0 }: { count?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/35"
      title={`${count} comments`}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      <span>{count}</span>
    </span>
  );
}

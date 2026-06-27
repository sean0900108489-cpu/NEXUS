/**
 * NEXUS Window OS — Forum Reply Composer
 *
 * Quick reply input for a thread.
 *
 * @module features/forum
 */

"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

export function ForumReplyComposer({
  onSubmit,
}: {
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!body.trim()) return;
    setSending(true);
    onSubmit(body);
    setBody("");
    setSending(false);
  }, [body, onSubmit]);

  return (
    <div className="flex items-center gap-2 p-3 border-t border-white/5 bg-white/[0.02] shrink-0">
      <input
        className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
        placeholder="Write a reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <button
        className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-30 flex items-center gap-1"
        onClick={handleSubmit}
        disabled={!body.trim() || sending}
      >
        {sending && <Loader2 className="w-3 h-3 animate-spin" />}
        Reply
      </button>
    </div>
  );
}

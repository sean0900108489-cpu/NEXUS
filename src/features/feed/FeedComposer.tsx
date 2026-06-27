/**
 * NEXUS Window OS — Feed Composer
 *
 * Plain local feed item composer. No media upload or backend submit.
 *
 * @module features/feed
 */

"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function FeedComposer({
  onSubmit,
}: {
  onSubmit: (title: string | undefined, body: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const canSubmit = body.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(title.trim() || undefined, body.trim());
    setTitle("");
    setBody("");
  };

  return (
    <div className="border-b border-white/5 p-3">
      <div className="rounded-lg border border-white/8 bg-white/[0.025] p-2">
        <input
          className="w-full bg-transparent px-1 py-1 text-xs font-medium text-white outline-none placeholder:text-white/20"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          id="feed-composer-body"
          className="mt-1 min-h-20 w-full resize-none bg-transparent px-1 py-1 text-sm text-white/75 outline-none placeholder:text-white/20"
          placeholder="Write a feed item..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            <Send className="h-3.5 w-3.5" />
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

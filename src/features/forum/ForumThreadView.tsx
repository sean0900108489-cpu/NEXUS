/**
 * NEXUS Window OS — Forum Thread View
 *
 * Thread detail with replies.
 *
 * @module features/forum
 */

"use client";

import { ChevronLeft } from "lucide-react";
import { ForumPostCard, buildProps, buildReplyProps } from "./ForumPostCard";
import { ForumReplyComposer } from "./ForumReplyComposer";
import type { ForumThreadDetail } from "./forum-api";
import { openResource } from "@/kernel/resource/resource-actions";

export function ForumThreadView({
  detail,
  onBack,
  onReply,
}: {
  detail: ForumThreadDetail;
  onBack: () => void;
  onReply: (body: string) => void;
}) {
  const threadProps = buildProps(detail.thread);

  const handleAttachmentClick = (ref: { type: string; id: string; label?: string }) => {
    openResource({
      type: ref.type as "attachment",
      id: ref.id,
      label: ref.label,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
        <button className="text-white/40 hover:text-white transition-colors p-0.5" onClick={onBack} title="Back">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-white/50 truncate flex-1">
          {detail.thread.title}
        </span>
        <span className="text-[10px] text-white/20 shrink-0">
          {detail.replies.length} repl{detail.replies.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Original thread */}
        <ForumPostCard {...threadProps} onAttachmentClick={handleAttachmentClick} />

        {/* Replies */}
        {detail.replies.map((reply) => (
          <div key={reply.id} className="ml-4 pl-3 border-l border-white/5">
            <ForumPostCard
              {...buildReplyProps(reply)}
              onAttachmentClick={handleAttachmentClick}
            />
          </div>
        ))}
      </div>

      {/* Reply composer */}
      <ForumReplyComposer onSubmit={onReply} />
    </div>
  );
}

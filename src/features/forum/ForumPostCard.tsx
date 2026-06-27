/**
 * NEXUS Window OS — Forum Post Card
 *
 * Single thread or reply display.
 *
 * @module features/forum
 */

"use client";

import { MessageSquare, Paperclip, Image as ImageIcon } from "lucide-react";
import type { ForumThread, ForumReply } from "./forum-api";
import { ForumPostActions } from "./ForumPostActions";
import { ProfileBadge } from "@/features/profiles";
import type { NexusAuthorRef } from "@/features/profiles";

type ForumPostCardProps = {
  id: string;
  title?: string;
  body: string;
  attachments: { type: string; id: string; label?: string }[];
  createdAt: string;
  replyCount?: number;
  isReply?: boolean;
  author?: NexusAuthorRef;
  onAttachmentClick?: (ref: { type: string; id: string; label?: string }) => void;
};

function buildProps(thread: ForumThread): ForumPostCardProps {
  return {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    attachments: thread.attachments,
    createdAt: thread.createdAt,
    replyCount: thread.replyCount,
    author: thread.author ?? authorFromLabel(thread.authorLabel),
  };
}

function buildReplyProps(reply: ForumReply): ForumPostCardProps {
  return {
    id: reply.id,
    body: reply.body,
    attachments: reply.attachments,
    createdAt: reply.createdAt,
    isReply: true,
    author: reply.author ?? authorFromLabel(reply.authorLabel),
  };
}

export { buildProps, buildReplyProps };

export function ForumPostCard(props: ForumPostCardProps) {
  const hasAttachments = props.attachments.length > 0;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 group">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-3.5 h-3.5 text-white/20 shrink-0" />
        {props.title && (
          <h3 className="text-sm font-medium text-white/80 truncate flex-1">
            {props.title}
          </h3>
        )}
        <span className="text-[10px] text-white/20 shrink-0">
          {new Date(props.createdAt).toLocaleString()}
          {!props.isReply && props.replyCount != null && props.replyCount > 0 && (
            <span className="ml-1">· {props.replyCount} repl{props.replyCount === 1 ? "y" : "ies"}</span>
          )}
        </span>
      </div>

      {/* Author */}
      <div className="mb-2">
        <ProfileBadge author={props.author} fallbackLabel="You" />
      </div>

      {/* Body */}
      <div className="text-xs text-white/60 whitespace-pre-wrap break-words mb-2">
        {props.body}
      </div>

      {/* Attachments */}
      {hasAttachments && (
        <div className="flex flex-wrap gap-1 mb-2">
          {props.attachments.map((att, idx) => (
            <button
              key={`${att.type}:${att.id}:${idx}`}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-white/40 hover:text-white/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                props.onAttachmentClick?.(att);
              }}
            >
              {att.type === "attachment" ? <Paperclip className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
              <span className="truncate max-w-[120px]">{att.label ?? att.id.slice(0, 8)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <ForumPostActions
        body={props.body}
        attachments={props.attachments}
      />
    </div>
  );
}

function authorFromLabel(authorLabel?: string): NexusAuthorRef | undefined {
  return authorLabel?.trim() ? { displayName: authorLabel.trim() } : undefined;
}

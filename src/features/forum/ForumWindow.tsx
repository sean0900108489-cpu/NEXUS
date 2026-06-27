/**
 * NEXUS Window OS — Forum Window App
 *
 * Minimal forum: thread list, create, detail, reply.
 * localStorage-first (forum-api.ts). Attachments via shared attachmentApi.
 * Notes bridge via current-note-store.
 *
 * Sub-components:
 *   ForumThreadList     — thread sidebar
 *   ForumThreadView     — thread + replies
 *   ForumThreadComposer — new thread form
 *   ForumStates         — loading/empty/error
 *
 * @module features/forum
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { forumApi } from "./forum-api";
import type { ForumThread, ForumThreadDetail } from "./forum-api";
import { buildAttachmentReferences } from "@/features/attachments/attachment-api";
import type { ComposerAttachment } from "@/features/attachments/attachment-api";
import { ForumThreadList } from "./ForumThreadList";
import { ForumThreadView } from "./ForumThreadView";
import { ForumThreadComposer } from "./ForumThreadComposer";
import { ForumLoadingState, ForumEmptyState, ForumErrorState } from "./ForumStates";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";
import { useNotificationStore } from "@/kernel/notifications/notification-store";

type ForumView =
  | { mode: "list" }
  | { mode: "compose" }
  | { mode: "thread"; threadId: string };

export function ForumWindow({ setTitle }: NexusWindowAppProps) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ForumView>({ mode: "list" });
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ForumThreadDetail | null>(null);

  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => { setTitle("Forum"); }, [setTitle]);

  // ── Load threads ─────────────────────────────────────────

  const loadThreads = useCallback(() => {
    setLoading(true); setError(null);
    try {
      const result = forumApi.listThreads();
      setThreads(result.threads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // ── Create thread ────────────────────────────────────────

  const handleCreateThread = useCallback((title: string, body: string, attachments: ComposerAttachment[]) => {
    const refs = buildAttachmentReferences(attachments).map((a) => ({
      type: "attachment" as const, id: a.id, label: a.filename, meta: { kind: a.kind, mimeType: a.mimeType },
    }));
    const thread = forumApi.createThread({ title, body, attachments: refs });
    setThreads((prev) => [thread, ...prev]);
    setView({ mode: "thread", threadId: thread.id });
    setSelectedThreadId(thread.id);
    const detail = forumApi.getThread(thread.id);
    if (detail) setThreadDetail(detail);
    addNotification({ type: "success", title: "Thread posted", autoDismissMs: 2000 });
  }, [addNotification]);

  // ── Select thread ────────────────────────────────────────

  const handleSelectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    const detail = forumApi.getThread(threadId);
    if (detail) {
      setThreadDetail(detail);
      setView({ mode: "thread", threadId });
    }
  }, []);

  // ── Reply ────────────────────────────────────────────────

  const handleReply = useCallback((body: string) => {
    if (!selectedThreadId) return;
    forumApi.createReply({ threadId: selectedThreadId, body });
    const detail = forumApi.getThread(selectedThreadId);
    if (detail) setThreadDetail(detail);
    // Update thread list reply counts
    setThreads(forumApi.listThreads().threads);
    addNotification({ type: "success", title: "Reply posted", autoDismissMs: 2000 });
  }, [selectedThreadId, addNotification]);

  // ── Back to list ─────────────────────────────────────────

  const handleBackToList = useCallback(() => {
    setView({ mode: "list" });
    loadThreads();
  }, [loadThreads]);

  // ── Render ─────────────────────────────────────────────

  if (loading) return <ForumLoadingState />;
  if (error && threads.length === 0) return <ForumErrorState message={error} onRetry={loadThreads} />;

  // Thread detail view
  if (view.mode === "thread" && threadDetail) {
    return <ForumThreadView detail={threadDetail} onBack={handleBackToList} onReply={handleReply} />;
  }

  // Compose view
  if (view.mode === "compose") {
    return (
      <ForumThreadComposer
        onSubmit={handleCreateThread}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  // List view
  return (
    <div className="flex h-full">
      <div className="w-52 sm:w-60 shrink-0 border-r border-white/5 flex flex-col h-full overflow-y-auto">
        <div className="px-3 py-2 border-b border-white/5 text-xs font-medium text-white/50 uppercase tracking-wider">
          Threads
        </div>
        {threads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <ForumEmptyState onCreate={() => setView({ mode: "compose" })} />
          </div>
        ) : (
          <ForumThreadList
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelect={handleSelectThread}
            onCreate={() => setView({ mode: "compose" })}
          />
        )}
      </div>
      <div className="flex-1 flex items-center justify-center text-white/15 text-xs">
        Select a thread or create a new one
      </div>
    </div>
  );
}

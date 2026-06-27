/**
 * NEXUS Feature API — Forum
 *
 * Feature-level API client for forum threads and replies.
 * localStorage-first MVP. Future migration to Supabase requires
 * only changing this file.
 *
 * @module features/forum
 */

import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

// ── Types ──────────────────────────────────────────────────────────

export type ForumThread = {
  id: string;
  title: string;
  body: string;
  attachments: NexusResourceRef[];
  createdAt: string;
  updatedAt: string;
  /** Optional display name */
  authorLabel?: string;
  /** Cached reply count */
  replyCount: number;
};

export type ForumReply = {
  id: string;
  threadId: string;
  body: string;
  attachments: NexusResourceRef[];
  createdAt: string;
  updatedAt: string;
  authorLabel?: string;
};

export type ForumThreadListResponse = {
  threads: ForumThread[];
};

export type ForumThreadDetail = {
  thread: ForumThread;
  replies: ForumReply[];
};

// ── Storage Keys ───────────────────────────────────────────────────

const THREADS_INDEX_KEY = "nexus-forum:v1:threads-index";
const THREAD_PREFIX = "nexus-forum:v1:thread:";
const REPLIES_PREFIX = "nexus-forum:v1:replies:";

// ── Helpers ────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently degrade
  }
}

// ── API ────────────────────────────────────────────────────────────

export const forumApi = {
  // ── Threads ─────────────────────────────────────────────

  listThreads(): ForumThreadListResponse {
    const ids = readJSON<string[]>(THREADS_INDEX_KEY, []);
    const threads: ForumThread[] = [];
    for (const id of ids) {
      const t = readJSON<ForumThread | null>(`${THREAD_PREFIX}${id}`, null);
      if (t) threads.push(t);
    }
    return { threads };
  },

  getThread(threadId: string): ForumThreadDetail | null {
    const thread = readJSON<ForumThread | null>(`${THREAD_PREFIX}${threadId}`, null);
    if (!thread) return null;
    const replies = readJSON<ForumReply[]>(`${REPLIES_PREFIX}${threadId}`, []);
    return { thread, replies };
  },

  createThread(input: { title: string; body: string; attachments?: NexusResourceRef[] }): ForumThread {
    const id = makeId("thread");
    const ts = now();
    const thread: ForumThread = {
      id,
      title: input.title.trim() || "Untitled Thread",
      body: input.body,
      attachments: input.attachments ?? [],
      createdAt: ts,
      updatedAt: ts,
      replyCount: 0,
    };
    writeJSON(`${THREAD_PREFIX}${id}`, thread);

    const ids = readJSON<string[]>(THREADS_INDEX_KEY, []);
    ids.unshift(id);
    writeJSON(THREADS_INDEX_KEY, ids);

    return thread;
  },

  updateThread(threadId: string, patch: Partial<Pick<ForumThread, "title" | "body" | "attachments">>): ForumThread | null {
    const existing = readJSON<ForumThread | null>(`${THREAD_PREFIX}${threadId}`, null);
    if (!existing) return null;
    const thread: ForumThread = { ...existing, ...patch, updatedAt: now() };
    writeJSON(`${THREAD_PREFIX}${threadId}`, thread);
    return thread;
  },

  deleteThread(threadId: string): boolean {
    try {
      window.localStorage.removeItem(`${THREAD_PREFIX}${threadId}`);
      window.localStorage.removeItem(`${REPLIES_PREFIX}${threadId}`);
      const ids = readJSON<string[]>(THREADS_INDEX_KEY, []);
      writeJSON(THREADS_INDEX_KEY, ids.filter((i) => i !== threadId));
      return true;
    } catch {
      return false;
    }
  },

  // ── Replies ─────────────────────────────────────────────

  createReply(input: { threadId: string; body: string; attachments?: NexusResourceRef[] }): ForumReply | null {
    const thread = readJSON<ForumThread | null>(`${THREAD_PREFIX}${input.threadId}`, null);
    if (!thread) return null;

    const id = makeId("reply");
    const ts = now();
    const reply: ForumReply = {
      id,
      threadId: input.threadId,
      body: input.body,
      attachments: input.attachments ?? [],
      createdAt: ts,
      updatedAt: ts,
    };

    const replies = readJSON<ForumReply[]>(`${REPLIES_PREFIX}${input.threadId}`, []);
    replies.push(reply);
    writeJSON(`${REPLIES_PREFIX}${input.threadId}`, replies);

    // Update reply count on thread
    thread.replyCount = replies.length;
    thread.updatedAt = ts;
    writeJSON(`${THREAD_PREFIX}${input.threadId}`, thread);

    return reply;
  },

  updateReply(threadId: string, replyId: string, patch: Partial<Pick<ForumReply, "body" | "attachments">>): ForumReply | null {
    const replies = readJSON<ForumReply[]>(`${REPLIES_PREFIX}${threadId}`, []);
    const idx = replies.findIndex((r) => r.id === replyId);
    if (idx === -1) return null;

    replies[idx] = { ...replies[idx], ...patch, updatedAt: now() };
    writeJSON(`${REPLIES_PREFIX}${threadId}`, replies);
    return replies[idx];
  },

  deleteReply(threadId: string, replyId: string): boolean {
    const replies = readJSON<ForumReply[]>(`${REPLIES_PREFIX}${threadId}`, []);
    const filtered = replies.filter((r) => r.id !== replyId);
    writeJSON(`${REPLIES_PREFIX}${threadId}`, filtered);

    // Update reply count
    const thread = readJSON<ForumThread | null>(`${THREAD_PREFIX}${threadId}`, null);
    if (thread) {
      thread.replyCount = filtered.length;
      writeJSON(`${THREAD_PREFIX}${threadId}`, thread);
    }
    return true;
  },
};

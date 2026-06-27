/**
 * NEXUS Window OS — Forum Backend Contract Types
 *
 * Repository interface for Forum persistence.
 * Current implementation: localStorage (forum-api.ts).
 * Future implementation: Supabase (SupabaseForumRepository).
 *
 * @module features/forum/forum-backend-types
 */

import type { NexusResourceRef } from "@/kernel/resource/resource-ref";
import type { ForumThread, ForumReply, ForumThreadDetail } from "./forum-api";

// ── Repository Interface ───────────────────────────────────────────

/**
 * The ForumRepository is the contract between the Forum feature
 * and any persistence backend.
 */
export interface ForumRepository {
  /** List published threads. Newest first. */
  listThreads(params?: {
    status?: "published" | "closed" | "archived";
    limit?: number;
    cursor?: string;
  }): Promise<ForumThread[]>;

  /** Get thread with all replies */
  getThread(threadId: string): Promise<ForumThreadDetail | null>;

  /** Create a new thread */
  createThread(input: {
    title: string;
    body: string;
    attachments?: NexusResourceRef[];
    workspaceId?: string;
  }): Promise<ForumThread>;

  /** Update a thread */
  updateThread(
    threadId: string,
    patch: {
      title?: string;
      body?: string;
      status?: string;
    },
  ): Promise<ForumThread | null>;

  /** Soft-delete a thread */
  deleteThread(threadId: string): Promise<boolean>;

  /** Create a reply to a thread */
  createReply(input: {
    threadId: string;
    body: string;
    attachments?: NexusResourceRef[];
  }): Promise<ForumReply>;

  /** Update a reply */
  updateReply(
    threadId: string,
    replyId: string,
    patch: { body?: string },
  ): Promise<ForumReply | null>;

  /** Soft-delete a reply */
  deleteReply(threadId: string, replyId: string): Promise<boolean>;

  /** Add a resource reference to a post */
  addResource(
    postType: "thread" | "reply",
    postId: string,
    ref: NexusResourceRef,
  ): Promise<boolean>;

  /** Remove a resource reference from a post */
  removeResource(
    postType: "thread" | "reply",
    postId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;
}

// ── Migration Types ────────────────────────────────────────────────

export type ForumMigrationState = {
  version: 1;
  lastExportedAt?: string;
  lastImportedAt?: string;
  migratedIds: string[];
  failedIds: string[];
};

export type ForumMigrationReport = {
  threadsTotal: number;
  threadsMigrated: number;
  threadsFailed: number;
  repliesTotal: number;
  repliesMigrated: number;
  repliesFailed: number;
  errors: string[];
};

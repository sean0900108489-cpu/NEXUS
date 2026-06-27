/**
 * NEXUS Window OS — Interaction Primitive Types
 *
 * Shared interaction data shapes for feed items, forum posts, notes,
 * artifacts, and future marketplace tasks.
 *
 * @module features/interactions
 */

export type NexusReactionKind =
  | "like"
  | "upvote"
  | "bookmark";

export type NexusInteractionTarget = {
  type:
    | "feed-item"
    | "forum-thread"
    | "forum-reply"
    | "note"
    | "artifact"
    | "marketplace-task";
  id: string;
};

export type NexusInteractionCounts = {
  comments?: number;
  reactions?: Partial<Record<NexusReactionKind, number>>;
  saves?: number;
};

export type NexusInteractionState = {
  viewerReacted?: Partial<Record<NexusReactionKind, boolean>>;
  viewerSaved?: boolean;
};

export type NexusInteractionSnapshot = {
  counts: NexusInteractionCounts;
  state: NexusInteractionState;
};

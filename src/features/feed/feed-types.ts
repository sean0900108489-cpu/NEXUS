/**
 * NEXUS Window OS — Feed Primitive Types
 *
 * Primitive feed item contract. This is not a Reddit, Instagram, or
 * marketplace implementation.
 *
 * @module features/feed
 */

import type { NexusAuthorRef } from "@/features/profiles";
import type { NexusInteractionCounts } from "@/features/interactions";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

export type NexusFeedItem = {
  id: string;
  title?: string;
  body: string;
  author?: NexusAuthorRef;
  attachments?: NexusResourceRef[];
  linkedResources?: NexusResourceRef[];
  counts?: NexusInteractionCounts;
  createdAt: string;
  updatedAt?: string;
  source?: {
    type: "manual" | "forum" | "chat" | "note" | "marketplace";
    id?: string;
  };
};

export type CreateFeedItemInput = Omit<NexusFeedItem, "id" | "createdAt" | "updatedAt">;

export type UpdateFeedItemInput = Partial<Omit<NexusFeedItem, "id" | "createdAt">>;

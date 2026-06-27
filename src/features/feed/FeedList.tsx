/**
 * NEXUS Window OS — Feed List
 *
 * @module features/feed
 */

"use client";

import { FeedItemCard } from "./FeedItemCard";
import type { NexusFeedItem } from "./feed-types";

export function FeedList({ items }: { items: NexusFeedItem[] }) {
  return (
    <div className="space-y-2 p-3">
      {items.map((item) => (
        <FeedItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

/**
 * NEXUS Window OS — Feed Window App
 *
 * Primitive local feed demo. It lists local feed items, creates manual items,
 * renders author badges/resources, and exposes shared interaction primitives.
 *
 * @module features/feed
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { feedApi } from "./feed-api";
import { FeedComposer } from "./FeedComposer";
import { FeedList } from "./FeedList";
import { FeedEmptyState, FeedErrorState, FeedLoadingState } from "./FeedStates";
import type { NexusFeedItem } from "./feed-types";
import { profileApi, type NexusAuthorRef, type NexusProfile } from "@/features/profiles";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

const FALLBACK_AUTHOR: NexusAuthorRef = {
  userId: "current-user",
  profileId: "profile:current-user",
  displayName: "You",
};

export function FeedWindow({ setTitle }: NexusWindowAppProps) {
  const [items, setItems] = useState<NexusFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAuthor, setCurrentAuthor] = useState<NexusAuthorRef>(FALLBACK_AUTHOR);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    setTitle("Feed");
  }, [setTitle]);

  useEffect(() => {
    let active = true;

    profileApi.getCurrentProfile().then((profile) => {
      if (active) setCurrentAuthor(authorRefFromProfile(profile));
    });

    return () => {
      active = false;
    };
  }, []);

  const loadItems = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      setItems(feedApi.listItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

  const handleCreate = useCallback((title: string | undefined, body: string) => {
    const item = feedApi.createItem({
      title,
      body,
      author: currentAuthor,
      counts: { comments: 0, reactions: { like: 0 }, saves: 0 },
      source: { type: "manual" },
    });

    setItems((prev) => [item, ...prev]);
    addNotification({ type: "success", title: "Feed item created", autoDismissMs: 2000 });
  }, [addNotification, currentAuthor]);

  const handleFocusComposer = useCallback(() => {
    document.getElementById("feed-composer-body")?.focus();
  }, []);

  if (loading) return <FeedLoadingState />;
  if (error && items.length === 0) return <FeedErrorState message={error} onRetry={loadItems} />;

  return (
    <div className="flex h-full flex-col bg-neutral-950/35">
      <div className="border-b border-white/5 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wider text-white/45">
          Feed Primitive
        </p>
      </div>
      <FeedComposer onSubmit={handleCreate} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <FeedEmptyState onCreate={handleFocusComposer} />
        ) : (
          <FeedList items={items} />
        )}
      </div>
    </div>
  );
}

function authorRefFromProfile(profile: NexusProfile): NexusAuthorRef {
  return {
    userId: profile.userId,
    profileId: profile.id,
    displayName: profile.displayName,
    handle: profile.handle,
    avatarUrl: profile.avatarUrl,
  };
}

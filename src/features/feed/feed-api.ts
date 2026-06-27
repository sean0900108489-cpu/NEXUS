/**
 * NEXUS Window OS — Feed Primitive API
 *
 * LocalStorage-first demo repository for feed items. No DB, no pagination
 * backend, no recommendation/ranking system.
 *
 * @module features/feed
 */

import type { CreateFeedItemInput, NexusFeedItem, UpdateFeedItemInput } from "./feed-types";

const FEED_ITEMS_KEY = "nexus-feed:v1:items";

export type FeedStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type FeedApiOptions = {
  storage?: FeedStorage;
  now?: () => string;
  createId?: () => string;
};

function getBrowserStorage(): FeedStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function createVolatileStorage(): FeedStorage {
  const records = new Map<string, string>();
  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => {
      records.set(key, value);
    },
    removeItem: (key) => {
      records.delete(key);
    },
  };
}

function defaultId() {
  return `feed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readItems(storage: FeedStorage): NexusFeedItem[] {
  try {
    const raw = storage.getItem(FEED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as NexusFeedItem[] : [];
  } catch {
    return [];
  }
}

function writeItems(storage: FeedStorage, items: NexusFeedItem[]) {
  storage.setItem(FEED_ITEMS_KEY, JSON.stringify(items));
}

export function createFeedApi(options: FeedApiOptions = {}) {
  const storage = options.storage ?? getBrowserStorage() ?? createVolatileStorage();
  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? defaultId;

  return {
    listItems(): NexusFeedItem[] {
      return readItems(storage);
    },

    createItem(input: CreateFeedItemInput): NexusFeedItem {
      const timestamp = now();
      const item: NexusFeedItem = {
        ...input,
        id: createId(),
        body: input.body.trim(),
        title: input.title?.trim() || undefined,
        attachments: input.attachments ?? [],
        linkedResources: input.linkedResources ?? [],
        createdAt: timestamp,
      };
      const items = [item, ...readItems(storage)];
      writeItems(storage, items);
      return item;
    },

    updateItem(id: string, patch: UpdateFeedItemInput): NexusFeedItem | null {
      const items = readItems(storage);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;

      const next: NexusFeedItem = {
        ...items[index],
        ...patch,
        title: patch.title?.trim() || patch.title,
        body: patch.body?.trim() ?? items[index].body,
        updatedAt: now(),
      };

      const nextItems = [...items];
      nextItems[index] = next;
      writeItems(storage, nextItems);
      return next;
    },

    deleteItem(id: string): boolean {
      const items = readItems(storage);
      const next = items.filter((item) => item.id !== id);
      if (next.length === items.length) return false;
      writeItems(storage, next);
      return true;
    },

    clear() {
      storage.removeItem(FEED_ITEMS_KEY);
    },
  };
}

export const feedApi = createFeedApi();

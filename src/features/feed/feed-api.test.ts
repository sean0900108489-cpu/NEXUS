import { describe, expect, it } from "vitest";

import { createFeedApi, type FeedStorage } from "./feed-api";

function createMemoryStorage(): FeedStorage {
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

describe("feedApi local CRUD", () => {
  it("creates and lists local feed items with author and interaction counts", () => {
    const api = createFeedApi({
      storage: createMemoryStorage(),
      now: () => "2026-06-27T00:00:00.000Z",
      createId: () => "feed-1",
    });

    const created = api.createItem({
      title: "Phase 5B",
      body: "Feed primitive demo item",
      author: { userId: "user-1", displayName: "Sean", handle: "sean" },
      counts: { comments: 2, reactions: { like: 4 } },
      source: { type: "manual" },
    });

    expect(created).toMatchObject({
      id: "feed-1",
      title: "Phase 5B",
      body: "Feed primitive demo item",
      author: { userId: "user-1", displayName: "Sean", handle: "sean" },
      counts: { comments: 2, reactions: { like: 4 } },
      createdAt: "2026-06-27T00:00:00.000Z",
      source: { type: "manual" },
    });
    expect(api.listItems()).toEqual([created]);
  });

  it("updates and deletes local feed items", () => {
    let id = 0;
    const api = createFeedApi({
      storage: createMemoryStorage(),
      now: () => "2026-06-27T00:00:00.000Z",
      createId: () => `feed-${++id}`,
    });

    const first = api.createItem({ body: "First" });
    api.createItem({ body: "Second" });

    expect(api.updateItem(first.id, { title: "Updated", body: "Updated body" }))
      .toMatchObject({
        id: "feed-1",
        title: "Updated",
        body: "Updated body",
        updatedAt: "2026-06-27T00:00:00.000Z",
      });

    expect(api.deleteItem(first.id)).toBe(true);
    expect(api.listItems().map((item) => item.body)).toEqual(["Second"]);
  });
});

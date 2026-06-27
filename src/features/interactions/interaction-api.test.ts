import { describe, expect, it } from "vitest";

import { createInteractionApi, type InteractionStorage } from "./interaction-api";
import type { NexusInteractionTarget } from "./interaction-types";

function createMemoryStorage(): InteractionStorage {
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

describe("interactionApi local state", () => {
  it("toggles a local-only reaction and keeps counts bounded", () => {
    const api = createInteractionApi({ storage: createMemoryStorage() });
    const target: NexusInteractionTarget = { type: "feed-item", id: "feed-1" };

    const liked = api.toggleReaction(target, "like", {
      comments: 3,
      reactions: { like: 2 },
    });

    expect(liked).toEqual({
      counts: { comments: 3, reactions: { like: 3 } },
      state: { viewerReacted: { like: true } },
    });

    const unliked = api.toggleReaction(target, "like", {
      comments: 3,
      reactions: { like: 2 },
    });

    expect(unliked).toEqual({
      counts: { comments: 3, reactions: { like: 2 } },
      state: { viewerReacted: { like: false } },
    });
  });

  it("marks a target as saved with local-only state", () => {
    const api = createInteractionApi({ storage: createMemoryStorage() });
    const target: NexusInteractionTarget = { type: "forum-thread", id: "thread-1" };

    expect(api.markSaved(target, { saves: 1 })).toEqual({
      counts: { saves: 2 },
      state: { viewerSaved: true },
    });
    expect(api.markSaved(target, { saves: 1 })).toEqual({
      counts: { saves: 2 },
      state: { viewerSaved: true },
    });
  });
});

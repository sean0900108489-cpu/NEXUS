import { describe, expect, it } from "vitest";

import { buildFeedNotePayload } from "./FeedItemCard";
import type { NexusFeedItem } from "./feed-types";

describe("FeedItemCard note payload", () => {
  it("builds note content and deduped resources from a feed item", () => {
    const item: NexusFeedItem = {
      id: "feed-1",
      title: "Phase 5B",
      body: "Feed primitive demo body",
      attachments: [
        { type: "attachment", id: "att-1", label: "diagram.png" },
      ],
      linkedResources: [
        { type: "attachment", id: "att-1", label: "diagram.png" },
        { type: "note", id: "note-1", label: "Source note" },
      ],
      createdAt: "2026-06-27T00:00:00.000Z",
    };

    expect(buildFeedNotePayload(item)).toEqual({
      title: "Phase 5B",
      content: "Phase 5B\n\nFeed primitive demo body",
      linkedResources: [
        { type: "attachment", id: "att-1", label: "diagram.png" },
        { type: "note", id: "note-1", label: "Source note" },
      ],
    });
  });
});

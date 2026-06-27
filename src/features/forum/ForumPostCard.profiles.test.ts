import { describe, expect, it } from "vitest";

import { buildProps, buildReplyProps } from "./ForumPostCard";
import type { ForumReply, ForumThread } from "./forum-api";

describe("ForumPostCard profile props", () => {
  it("passes a thread author ref through to card props", () => {
    const thread: ForumThread = {
      id: "thread-1",
      title: "Hello",
      body: "Post body",
      attachments: [],
      createdAt: "2026-06-27T00:00:00.000Z",
      updatedAt: "2026-06-27T00:00:00.000Z",
      replyCount: 0,
      author: {
        userId: "user-1",
        displayName: "Sean",
        handle: "sean",
      },
    };

    expect(buildProps(thread).author).toEqual(thread.author);
  });

  it("falls back to authorLabel for legacy replies", () => {
    const reply: ForumReply = {
      id: "reply-1",
      threadId: "thread-1",
      body: "Reply body",
      attachments: [],
      createdAt: "2026-06-27T00:00:00.000Z",
      updatedAt: "2026-06-27T00:00:00.000Z",
      authorLabel: "Legacy Author",
    };

    expect(buildReplyProps(reply).author).toEqual({
      displayName: "Legacy Author",
    });
  });
});

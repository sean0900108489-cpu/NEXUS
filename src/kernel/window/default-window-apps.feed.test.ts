import { describe, expect, it } from "vitest";

import { DEFAULT_WINDOW_APPS } from "./default-window-apps";

describe("feed window app registration", () => {
  it("registers feed as a singleton social feed primitive window app", () => {
    const app = DEFAULT_WINDOW_APPS.find((item) => item.kind === "feed");

    expect(app).toMatchObject({
      kind: "feed",
      title: "Feed",
      scope: "account",
      singleton: true,
      allowMultiple: false,
      icon: "rss",
      capabilities: ["feed", "composer", "profiles", "resource-preview", "notes-capture"],
      archetype: "social-feed-app",
    });
  });
});

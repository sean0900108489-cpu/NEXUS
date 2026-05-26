import { describe, expect, it } from "vitest";

import { getEmbeddableUrl } from "@/lib/embed-url";

describe("getEmbeddableUrl", () => {
  it("converts YouTube watch URLs to embed URLs", () => {
    expect(getEmbeddableUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts YouTube short links and shorts URLs", () => {
    expect(getEmbeddableUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
    expect(getEmbeddableUrl("https://www.youtube.com/shorts/abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
  });

  it("leaves existing YouTube embed URLs untouched", () => {
    const embedUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";

    expect(getEmbeddableUrl(embedUrl)).toBe(embedUrl);
  });

  it("converts YouTube playlist URLs to videoseries embeds", () => {
    expect(
      getEmbeddableUrl("https://www.youtube.com/playlist?list=PL123"),
    ).toBe("https://www.youtube.com/embed/videoseries?list=PL123");
  });

  it("converts Twitch channel URLs with a localhost parent fallback", () => {
    expect(getEmbeddableUrl("https://www.twitch.tv/examplechannel")).toBe(
      "https://player.twitch.tv/?channel=examplechannel&parent=localhost",
    );
  });

  it("converts Vimeo numeric video URLs", () => {
    expect(getEmbeddableUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("converts Google surfaces to iframe-friendlier preview URLs", () => {
    expect(getEmbeddableUrl("https://www.google.com/search?q=nexus")).toBe(
      "https://www.google.com/search?q=nexus&igu=1",
    );
    expect(getEmbeddableUrl("https://www.google.com/")).toBe(
      "https://www.google.com/webhp?igu=1",
    );
    expect(
      getEmbeddableUrl("https://docs.google.com/document/d/doc-id/edit"),
    ).toBe("https://docs.google.com/document/d/doc-id/preview");
    expect(getEmbeddableUrl("https://drive.google.com/file/d/file-id/view")).toBe(
      "https://drive.google.com/file/d/file-id/preview",
    );
    expect(getEmbeddableUrl("https://www.google.com/maps?q=taipei")).toBe(
      "https://www.google.com/maps?q=taipei&output=embed",
    );
  });

  it("passes through ordinary and invalid URLs", () => {
    expect(getEmbeddableUrl("https://developer.mozilla.org/en-US/")).toBe(
      "https://developer.mozilla.org/en-US/",
    );
    expect(getEmbeddableUrl("not a url")).toBe("not a url");
  });
});

import { describe, expect, it } from "vitest";

import { profileApi } from "./profile-api";

describe("profileApi", () => {
  it("resolves an author ref into a profile preview model", async () => {
    const profile = await profileApi.resolveAuthorRef({
      userId: "user-123",
      displayName: "Sean",
      handle: "sean",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(profile).toMatchObject({
      id: "profile:user-123",
      userId: "user-123",
      displayName: "Sean",
      handle: "sean",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("returns a safe current-user fallback without a browser auth session", async () => {
    const profile = await profileApi.getCurrentProfile();

    expect(profile).toMatchObject({
      id: "profile:current-user",
      userId: "current-user",
      displayName: "You",
    });
  });

  it("normalizes profile resource ids when looking up a user profile", async () => {
    const profile = await profileApi.getProfileByUserId("profile:current-user");

    expect(profile).toMatchObject({
      id: "profile:current-user",
      userId: "current-user",
      displayName: "You",
    });
  });

  it("returns an unknown profile fallback for an empty author ref", async () => {
    const profile = await profileApi.resolveAuthorRef({});

    expect(profile).toMatchObject({
      id: "profile:unknown",
      userId: "unknown",
      displayName: "Unknown user",
    });
  });
});

import { describe, expect, it } from "vitest";

import { DEFAULT_WINDOW_APPS } from "./default-window-apps";

describe("profile window app registration", () => {
  it("registers profile preview as a reusable profiles window app", () => {
    const app = DEFAULT_WINDOW_APPS.find((item) => item.kind === "profile-preview");

    expect(app).toMatchObject({
      kind: "profile-preview",
      title: "Profile",
      scope: "account",
      singleton: false,
      allowMultiple: true,
      capabilities: ["profiles"],
    });
  });
});

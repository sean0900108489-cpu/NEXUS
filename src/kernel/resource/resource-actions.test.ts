import { describe, expect, it } from "vitest";

import { getWindowKindForResourceType } from "./resource-actions";

describe("resource action routing", () => {
  it("routes profile resources to the profile preview window", () => {
    expect(getWindowKindForResourceType("profile")).toBe("profile-preview");
  });

  it("keeps unknown resource types unrouted for notification fallback", () => {
    expect(getWindowKindForResourceType("unknown-resource")).toBeUndefined();
  });
});

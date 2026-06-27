import { describe, expect, it } from "vitest";

import { createFloatingAppRegistry } from "./floating-app-registry";
import type { FloatingAppDefinition } from "./floating-app-types";

describe("floating app registry", () => {
  it("registers app definitions in insertion order and returns metadata unchanged", () => {
    const registry = createFloatingAppRegistry();
    const feed = makeApp({
      kind: "feed",
      title: "Feed",
      capabilities: ["feed", "composer", "profiles"],
      archetype: "social-feed-app",
    });
    const notes = makeApp({
      kind: "notes",
      title: "Notes",
      capabilities: ["composer", "notes-capture"],
      archetype: "knowledge-app",
    });

    registry.register(feed);
    registry.register(notes);

    expect(registry.get("feed")).toBe(feed);
    expect(registry.list().map((app) => app.kind)).toEqual(["feed", "notes"]);
    expect(registry.get("feed")?.capabilities).toEqual(["feed", "composer", "profiles"]);
  });

  it("rejects duplicate app kinds", () => {
    const registry = createFloatingAppRegistry();

    registry.register(makeApp({ kind: "feed" }));

    expect(() => registry.register(makeApp({ kind: "feed" }))).toThrow(
      'Floating app kind "feed" is already registered.',
    );
  });
});

function makeApp(overrides: Partial<FloatingAppDefinition> = {}): FloatingAppDefinition {
  return {
    kind: "test-app",
    title: "Test App",
    scope: "workspace",
    defaultSize: { width: 420, height: 320 },
    component: () => null,
    ...overrides,
  };
}

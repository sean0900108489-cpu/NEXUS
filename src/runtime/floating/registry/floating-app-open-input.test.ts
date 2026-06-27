import { describe, expect, it } from "vitest";

import { createFloatingAppOpenInput } from "./floating-app-open-input";
import type { FloatingAppDefinition } from "./floating-app-types";

describe("createFloatingAppOpenInput", () => {
  it("converts registry metadata into a host open-window input", () => {
    const app = makeApp({
      kind: "developer-inspector",
      title: "Dev Inspector",
      scope: "account",
      defaultSize: { width: 680, height: 520 },
      singleton: true,
      allowMultiple: false,
    });

    expect(
      createFloatingAppOpenInput(app, {
        workspaceId: "workspace-1",
        state: { openedFrom: "launcher" },
      }),
    ).toEqual({
      kind: "developer-inspector",
      title: "Dev Inspector",
      scope: "account",
      defaultSize: { width: 680, height: 520 },
      workspaceId: "workspace-1",
      singleton: true,
      allowMultiple: false,
      state: { openedFrom: "launcher" },
    });
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

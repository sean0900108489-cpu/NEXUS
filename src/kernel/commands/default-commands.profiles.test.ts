import { describe, expect, it, vi } from "vitest";

import { createDefaultCommands } from "./default-commands";

describe("default profile commands", () => {
  it("adds an Open My Profile command that opens profile preview", () => {
    const openWindow = vi.fn();
    const commands = createDefaultCommands({
      openWindow,
      snapLeft: vi.fn(),
      snapRight: vi.fn(),
      cascadeWindows: vi.fn(),
      maximizeFocused: vi.fn(),
      resetLayout: vi.fn(),
    });

    const command = commands.find((item) => item.id === "open-my-profile");
    expect(command).toMatchObject({
      label: "Open My Profile",
    });

    command?.run();

    expect(openWindow).toHaveBeenCalledWith("profile-preview");
  });
});

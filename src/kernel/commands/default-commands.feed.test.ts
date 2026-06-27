import { describe, expect, it, vi } from "vitest";

import { createDefaultCommands } from "./default-commands";

describe("default feed commands", () => {
  it("adds an Open Feed command that opens the feed window", () => {
    const openWindow = vi.fn();
    const commands = createDefaultCommands({
      openWindow,
      snapLeft: vi.fn(),
      snapRight: vi.fn(),
      cascadeWindows: vi.fn(),
      maximizeFocused: vi.fn(),
      resetLayout: vi.fn(),
    });

    const command = commands.find((item) => item.id === "open-feed");
    expect(command).toMatchObject({
      label: "Open Feed",
    });

    command?.run();

    expect(openWindow).toHaveBeenCalledWith("feed");
  });
});

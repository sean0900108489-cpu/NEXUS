/**
 * NEXUS Window OS — Default Commands
 *
 * Built-in commands registered at desktop boot.
 *
 * @module kernel/commands/default-commands
 */

import type { NexusCommand } from "./command-types";

/**
 * Creates default commands bound to a window store and registry.
 * This is a factory so commands have access to the live store state.
 */
export function createDefaultCommands(deps: {
  openWindow: (kind: string) => void;
  snapLeft: () => void;
  snapRight: () => void;
  cascadeWindows: () => void;
  maximizeFocused: () => void;
  resetLayout: () => void;
}): NexusCommand[] {
  return [
    {
      id: "open-global-chat",
      label: "Open Global Chat",
      detail: "Start or continue a conversation",
      icon: undefined,
      shortcut: "⌘1",
      run: () => deps.openWindow("global-chat"),
    },
    {
      id: "open-global-user",
      label: "Open My Account",
      detail: "View wallet, models, and workspaces",
      icon: undefined,
      shortcut: "⌘2",
      run: () => deps.openWindow("global-user"),
    },
    {
      id: "open-workspace",
      label: "Open Workspace",
      detail: "Browse and open workspaces",
      icon: undefined,
      shortcut: "⌘3",
      run: () => deps.openWindow("workspace"),
    },
    {
      id: "open-artifact-library",
      label: "Open Artifact Library",
      detail: "Browse your uploaded files and artifacts",
      icon: undefined,
      shortcut: "⌘4",
      run: () => deps.openWindow("artifact-library"),
    },
    {
      id: "open-notes",
      label: "Open Notes",
      detail: "Create and manage your notes",
      icon: undefined,
      shortcut: "⌘5",
      run: () => deps.openWindow("notes"),
    },
    {
      id: "open-feed",
      label: "Open Feed",
      detail: "Open the local feed primitive",
      icon: undefined,
      shortcut: "⌘6",
      run: () => deps.openWindow("feed"),
    },
    {
      id: "open-forum",
      label: "Open Forum",
      detail: "Browse and participate in discussions",
      icon: undefined,
      shortcut: "⌘7",
      run: () => deps.openWindow("forum"),
    },
    {
      id: "open-developer-inspector",
      label: "Developer Inspector",
      detail: "Inspect capabilities, apps, and archetypes",
      icon: undefined,
      run: () => deps.openWindow("developer-inspector"),
    },
    {
      id: "open-my-profile",
      label: "Open My Profile",
      detail: "Preview your profile identity primitive",
      icon: undefined,
      run: () => deps.openWindow("profile-preview"),
    },
    {
      id: "cascade-windows",
      label: "Cascade Windows",
      detail: "Arrange windows in a cascade",
      icon: undefined,
      run: deps.cascadeWindows,
    },
    {
      id: "maximize-focused",
      label: "Maximize Window",
      detail: "Maximize the focused window",
      icon: undefined,
      shortcut: "⌘↑",
      run: deps.maximizeFocused,
    },
    {
      id: "snap-left",
      label: "Snap Left",
      detail: "Snap focused window to left half",
      icon: undefined,
      shortcut: "⌘←",
      run: deps.snapLeft,
    },
    {
      id: "snap-right",
      label: "Snap Right",
      detail: "Snap focused window to right half",
      icon: undefined,
      shortcut: "⌘→",
      run: deps.snapRight,
    },
    {
      id: "reset-layout",
      label: "Reset Window Layout",
      detail: "Cascade all windows to default positions",
      icon: undefined,
      run: deps.resetLayout,
    },
  ];
}

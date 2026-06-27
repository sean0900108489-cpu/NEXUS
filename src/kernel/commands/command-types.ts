/**
 * NEXUS Window OS — Command Types
 *
 * Minimal command system for keyboard shortcuts and palette actions.
 *
 * @module kernel/commands/command-types
 */

import type { ReactNode } from "react";

export type NexusCommandId = string;

export type NexusCommand = {
  /** Unique command identifier */
  id: NexusCommandId;

  /** Human-readable label */
  label: string;

  /** Short description for the palette */
  detail?: string;

  /** Optional icon (ReactNode for palette display) */
  icon?: ReactNode;

  /** Optional keyboard shortcut hint (e.g. "⌘K") */
  shortcut?: string;

  /** Execute the command */
  run: () => void;
};

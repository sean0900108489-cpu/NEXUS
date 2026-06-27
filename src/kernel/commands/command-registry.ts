/**
 * NEXUS Window OS — Command Registry
 *
 * Stores and retrieves registered commands.
 *
 * @module kernel/commands/command-registry
 */

import type { NexusCommand, NexusCommandId } from "./command-types";

// ── Registry ───────────────────────────────────────────────────────

const commands = new Map<NexusCommandId, NexusCommand>();

// ── Public API ─────────────────────────────────────────────────────

export function registerCommand(cmd: NexusCommand): void {
  if (commands.has(cmd.id)) {
    console.warn(`[CommandRegistry] Overwriting command: ${cmd.id}`);
  }
  commands.set(cmd.id, cmd);
}

export function getCommand(id: NexusCommandId): NexusCommand | undefined {
  return commands.get(id);
}

export function getAllCommands(): NexusCommand[] {
  return Array.from(commands.values());
}

export function clearCommands(): void {
  commands.clear();
}

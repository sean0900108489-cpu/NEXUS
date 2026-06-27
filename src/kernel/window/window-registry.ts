/**
 * NEXUS Window OS — App Registry
 *
 * The registry is the ONLY entry point for adding new window apps.
 * The Desktop Shell does NOT hardcode any feature-specific rendering.
 *
 * Usage:
 *   import { registerWindowApp, getWindowApp } from "@/kernel/window/window-registry";
 *   registerWindowApp(myGlobalChatAppDef);
 *
 * @module kernel/window/window-registry
 */

import type { NexusWindowAppDefinition, NexusWindowKind } from "./window-types";

// ── Registry Map ───────────────────────────────────────────────────

const registry = new Map<NexusWindowKind, NexusWindowAppDefinition>();

// ── Public API ─────────────────────────────────────────────────────

/**
 * Register a window app definition.
 * Throws if the kind is already registered (no silent overwrites).
 */
export function registerWindowApp(def: NexusWindowAppDefinition): void {
  if (registry.has(def.kind)) {
    throw new Error(
      `[WindowRegistry] App kind "${def.kind}" is already registered. ` +
      `Each NexusWindowKind must have exactly one definition.`,
    );
  }
  registry.set(def.kind, def);
}

/**
 * Retrieve a registered window app definition by kind.
 * Returns undefined if not found.
 */
export function getWindowApp(kind: NexusWindowKind): NexusWindowAppDefinition | undefined {
  return registry.get(kind);
}

/**
 * Returns all registered window kinds.
 */
export function getRegisteredKinds(): NexusWindowKind[] {
  return Array.from(registry.keys());
}

/**
 * Returns true if the given kind has been registered.
 */
export function isRegistered(kind: NexusWindowKind): boolean {
  return registry.has(kind);
}

/**
 * Returns all registered app definitions.
 */
export function getAllRegisteredApps(): NexusWindowAppDefinition[] {
  return Array.from(registry.values());
}

/**
 * Clear the registry (useful for testing).
 */
export function clearWindowRegistry(): void {
  registry.clear();
}

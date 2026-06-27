/**
 * NEXUS Window OS — Capability Registry
 *
 * Stores and queries capability definitions.
 * Pure metadata — does not control runtime behavior.
 *
 * @module kernel/capabilities/capability-registry
 */

import type {
  NexusCapabilityKind,
  NexusCapabilityDefinition,
} from "./capability-types";
import type { NexusWindowAppDefinition, NexusWindowKind } from "@/kernel/window/window-types";

// ── Registry ───────────────────────────────────────────────────────

const capabilityMap = new Map<NexusCapabilityKind, NexusCapabilityDefinition>();

// ── Public API ─────────────────────────────────────────────────────

/** Register a single capability definition */
export function registerCapability(def: NexusCapabilityDefinition): void {
  if (capabilityMap.has(def.kind)) {
    console.warn(`[CapabilityRegistry] Overwriting capability: ${def.kind}`);
  }
  capabilityMap.set(def.kind, def);
}

/** Register multiple capability definitions at once */
export function registerCapabilities(defs: NexusCapabilityDefinition[]): void {
  for (const def of defs) {
    registerCapability(def);
  }
}

/** Get a single capability by kind */
export function getCapability(kind: NexusCapabilityKind): NexusCapabilityDefinition | undefined {
  return capabilityMap.get(kind);
}

/** List all registered capabilities */
export function listCapabilities(): NexusCapabilityDefinition[] {
  return Array.from(capabilityMap.values());
}

/** List capabilities matching a maturity filter */
export function listCapabilitiesByMaturity(
  maturity: NexusCapabilityDefinition["maturity"],
): NexusCapabilityDefinition[] {
  return listCapabilities().filter((c) => c.maturity === maturity);
}

/** Get all capabilities provided by a specific window app */
export function getCapabilitiesForApp(
  appKind: NexusWindowKind,
  apps: NexusWindowAppDefinition[],
): NexusCapabilityKind[] {
  const app = apps.find((a) => a.kind === appKind);
  return app?.capabilities ?? [];
}

/** Get all window apps that provide a specific capability */
export function getAppsWithCapability(
  capability: NexusCapabilityKind,
  apps: NexusWindowAppDefinition[],
): NexusWindowAppDefinition[] {
  return apps.filter((a) => a.capabilities?.includes(capability));
}

/** Validate that an app definition references only registered capabilities */
export function validateAppCapabilities(
  app: NexusWindowAppDefinition,
): { valid: true } | { valid: false; unknownCapabilities: string[] } {
  if (!app.capabilities?.length) return { valid: true };

  const unknown = app.capabilities.filter((c) => !capabilityMap.has(c));
  return unknown.length === 0 ? { valid: true } : { valid: false, unknownCapabilities: unknown };
}

/** Clear the registry (testing only) */
export function clearCapabilityRegistry(): void {
  capabilityMap.clear();
}

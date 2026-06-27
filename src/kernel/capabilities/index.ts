/**
 * NEXUS Window OS — Capabilities Kernel Public API
 */

export type {
  NexusCapabilityKind,
  NexusCapabilityDefinition,
  NexusProductArchetypeKind,
  NexusProductArchetype,
} from "./capability-types";

export {
  registerCapability,
  registerCapabilities,
  getCapability,
  listCapabilities,
  listCapabilitiesByMaturity,
  getCapabilitiesForApp,
  getAppsWithCapability,
  validateAppCapabilities,
  clearCapabilityRegistry,
} from "./capability-registry";

export { DEFAULT_CAPABILITIES } from "./default-capabilities";
export { PRODUCT_ARCHETYPES } from "./product-archetypes";

import type { FloatingAppDefinition } from "./floating-app-types";

export type FloatingAppRegistry = {
  register: (definition: FloatingAppDefinition) => void;
  get: (kind: string) => FloatingAppDefinition | undefined;
  has: (kind: string) => boolean;
  list: () => FloatingAppDefinition[];
  clear: () => void;
};

export function createFloatingAppRegistry(): FloatingAppRegistry {
  const registry = new Map<string, FloatingAppDefinition>();

  return {
    register(definition) {
      if (registry.has(definition.kind)) {
        throw new Error(`Floating app kind "${definition.kind}" is already registered.`);
      }
      registry.set(definition.kind, definition);
    },

    get(kind) {
      return registry.get(kind);
    },

    has(kind) {
      return registry.has(kind);
    },

    list() {
      return Array.from(registry.values());
    },

    clear() {
      registry.clear();
    },
  };
}

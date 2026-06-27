import type { ComponentType } from "react";

import type {
  NexusCapabilityKind,
  NexusProductArchetypeKind,
} from "@/kernel/capabilities/capability-types";
import type {
  FloatingWindowInstance,
  FloatingWindowScope,
} from "@/runtime/floating/core/floating-window-types";

export type FloatingAppProps = {
  window: FloatingWindowInstance;
  setTitle: (title: string) => void;
  close: () => void;
};

export type FloatingAppDefinition = {
  kind: string;
  title: string;
  scope: FloatingWindowScope;
  component: ComponentType<FloatingAppProps>;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  singleton?: boolean;
  allowMultiple?: boolean;
  icon?: string;
  capabilities?: NexusCapabilityKind[];
  archetype?: NexusProductArchetypeKind;
  lifecycle?: "active" | "demo" | "internal" | "legacy" | "planned";
};

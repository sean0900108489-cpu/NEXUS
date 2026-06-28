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

export type FloatingAppDataBoundary = {
  namespace: string;
  currentState:
    | "external-project"
    | "runtime-only"
    | "local-demo"
    | "local-storage"
    | "existing-supabase"
    | "planned-supabase";
  durability:
    | "none"
    | "local-only"
    | "external-owned"
    | "existing-supabase"
    | "planned-supabase";
  ownerScope:
    | "account"
    | "workspace"
    | "account-or-workspace"
    | "external-project"
    | "runtime";
  apiRoutes?: string[];
  localStorageKeys?: string[];
  tables?: string[];
  rls?: string;
};

export type FloatingWebAppPermission =
  | "frame:render"
  | "workspace:read"
  | "user:read"
  | "storage:write"
  | "api:call"
  | "command:emit";

export type FloatingWebAppBridgeManifest = {
  commandBridge: boolean;
  authBridge: boolean;
  storageBridge: boolean;
  apiBridge: boolean;
  workspaceContext: boolean;
};

export type FloatingWebAppManifest = {
  id: string;
  kind: "external-web-app";
  title: string;
  entry: string;
  mode: "iframe";
  permissions: FloatingWebAppPermission[];
  sandbox: string[];
  bridge: FloatingWebAppBridgeManifest;
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
  dataBoundary?: FloatingAppDataBoundary;
  webApp?: FloatingWebAppManifest;
};

/**
 * NEXUS Window OS — Window Types
 *
 * Kernel-level type definitions for the Window OS system.
 * These types are PURE — they know nothing about global-chat,
 * notes, forum, marketplace, or any business feature.
 *
 * @module kernel/window/window-types
 */

import type { ComponentType } from "react";
import type {
  NexusCapabilityKind,
  NexusProductArchetypeKind,
} from "@/kernel/capabilities/capability-types";

// ── Window Kind ────────────────────────────────────────────────────

/**
 * Every window app registers with a unique `kind`.
 * New features add their kind here (no shell changes needed).
 */
export type NexusWindowKind =
  | "global-chat"
  | "global-user"
  | "workspace"
  | "notes-demo"
  | "forum-demo"
  | "marketplace-demo"
  | "sandbox"
  | "settings"
  | "artifact-preview"
  | "artifact-library"
  | "notes"
  | "forum";

// ── Window Scope ───────────────────────────────────────────────────

/**
 * Determines the data/access scope for a window.
 *
 * - `account`: Tied to the authenticated user account (global chat, wallet)
 * - `workspace`: Scoped to a specific NEXUS workspace
 * - `public`: No auth required (landing, docs)
 * - `system`: Kernel/desktop-level management
 */
export type NexusWindowScope = "account" | "workspace" | "public" | "system";

// ── Window Layout ──────────────────────────────────────────────────

export type NexusWindowLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

// ── Persistence Snapshot ───────────────────────────────────────────

/**
 * Serialisable snapshot of the entire window kernel state.
 * Written to localStorage on every mutation.
 */
export type NexusWindowKernelSnapshot = {
  version: 1;
  windows: Array<{
    id: string;
    kind: NexusWindowKind;
    title: string;
    resourceId?: string;
    workspaceId?: string;
    scope: NexusWindowScope;
    layout: NexusWindowLayout;
    minimized: boolean;
    maximized: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  maxZIndex: number;
  focusedWindowId: string | null;
  savedAt: string;
};

// ── Window ─────────────────────────────────────────────────────────

export type NexusWindow = {
  /** Unique window instance ID (generated on open) */
  id: string;

  /** Registered app kind */
  kind: NexusWindowKind;

  /** Display title shown in the title bar */
  title: string;

  /** Optional resource identifier (e.g. conversationId, notebookId) */
  resourceId?: string;

  /** Optional workspace scope */
  workspaceId?: string;

  /** Data/access scope */
  scope: NexusWindowScope;

  /** Current layout (position + size + z-index) */
  layout: NexusWindowLayout;

  /** True when minimized to taskbar */
  minimized: boolean;

  /** True when maximized to fill the desktop */
  maximized: boolean;

  /** ISO timestamp when the window was created */
  createdAt: string;

  /** ISO timestamp of last layout/state change */
  updatedAt: string;

  /** Opaque state bag for app-specific data (NOT for kernel use) */
  state?: Record<string, unknown>;
};

// ── Window App Definition ──────────────────────────────────────────

/**
 * Props passed to every window app component by the WindowManager.
 */
export type NexusWindowAppProps = {
  /** The window instance this component renders inside */
  window: NexusWindow;

  /** Call to update the window title from the app */
  setTitle: (title: string) => void;

  /** Call to close this window */
  close: () => void;
};

/**
 * Definition registered in the App Registry.
 * One definition per `NexusWindowKind`.
 */
export type NexusWindowAppDefinition = {
  /** Must match a NexusWindowKind */
  kind: NexusWindowKind;

  /** Default title shown when a new window is opened */
  title: string;

  /** Data/access scope */
  scope: NexusWindowScope;

  /** Default window dimensions */
  defaultSize: {
    width: number;
    height: number;
  };

  /** Minimum window dimensions (optional) */
  minSize?: {
    width: number;
    height: number;
  };

  /**
   * The React component rendered inside the WindowFrame.
   * Use React.lazy() or Next.js dynamic() for code-splitting.
   */
  component: ComponentType<NexusWindowAppProps>;

  /**
   * If true, only ONE instance of this window kind can be open at a time.
   * Opening a second instance will focus the existing window instead.
   *
   * Examples:
   *   - "global-user" → singleton (one account overview)
   *   - "settings" → singleton
   *   - "global-chat" → allowMultiple (multiple conversations)
   */
  singleton?: boolean;

  /**
   * If false (default: true), opening multiple windows of this kind
   * is blocked. Most singleton apps use this.
   *
   * When true AND singleton is false, the same app can be opened
   * multiple times (e.g. multiple Global Chat windows for different conversations).
   */
  allowMultiple?: boolean;

  /**
   * Optional icon identifier for the launcher/taskbar.
   * Can be a Lucide icon name string or an emoji string.
   * The Desktop Shell maps this to the actual icon component.
   */
  icon?: string;

  /**
   * Capabilities provided by this window app.
   * Used by the Capability Registry to map which apps
   * provide which reusable product capabilities.
   *
   * Example: Forum provides ["feed", "thread", "composer", "comments", "media-upload", "notes-capture"]
   */
  capabilities?: NexusCapabilityKind[];

  /**
   * Product archetype this app most closely matches.
   * Helps categorize apps and identify missing capabilities.
   *
   * Example: Forum → "community-app"
   */
  archetype?: NexusProductArchetypeKind;
};

// ── Launcher Item ──────────────────────────────────────────────────

/**
 * A launcher entry displayed in the Desktop Shell taskbar/launcher.
 */
export type NexusLauncherItem = {
  kind: NexusWindowKind;
  label: string;
  /** Optional emoji/icon for the launcher button */
  icon?: string;
};

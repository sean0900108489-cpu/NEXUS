/**
 * NEXUS Window OS — Default Window App Definitions
 *
 * Centralised registry of all window app definitions.
 * This is the SINGLE source of truth for which apps are available
 * on the NEXUS Desktop.
 *
 * To add a new window app:
 *   1. Create the feature folder (src/features/my-app/)
 *   2. Add a definition below
 *   3. Add the kind to NexusWindowKind in window-types.ts (if new)
 *   4. That's it — Desktop Shell picks it up automatically
 *
 * This file is PURE configuration — it does NOT contain business logic.
 * The lazy component imports keep code split per app.
 *
 * @module kernel/window/default-window-apps
 */

import dynamic from "next/dynamic";
import type { NexusWindowAppDefinition } from "./window-types";
import type { NexusCapabilityKind, NexusProductArchetypeKind } from "@/kernel/capabilities/capability-types";

// ── Lazy-load all window app components ─────────────────────────────
// Each import only loads when the app is first opened by the user.

const GlobalChatWindow = dynamic(
  () =>
    import("@/features/global-chat/GlobalChatWindow").then(
      (mod) => mod.GlobalChatWindow,
    ),
  { ssr: false },
);

const GlobalUserWindow = dynamic(
  () =>
    import("@/features/global-user/GlobalUserWindow").then(
      (mod) => mod.GlobalUserWindow,
    ),
  { ssr: false },
);

const WorkspaceWindow = dynamic(
  () =>
    import("@/features/workspace/WorkspaceWindow").then(
      (mod) => mod.WorkspaceWindow,
    ),
  { ssr: false },
);

const NotesDemoWindow = dynamic(
  () =>
    import("@/features/notes-demo/NotesDemoWindow").then(
      (mod) => mod.NotesDemoWindow,
    ),
  { ssr: false },
);

const ForumDemoWindow = dynamic(
  () =>
    import("@/features/forum-demo/ForumDemoWindow").then(
      (mod) => mod.ForumDemoWindow,
    ),
  { ssr: false },
);

const ArtifactPreviewWindow = dynamic(
  () =>
    import("@/features/artifacts/ArtifactPreviewWindow").then(
      (mod) => mod.ArtifactPreviewWindow,
    ),
  { ssr: false },
);

const ArtifactLibraryWindow = dynamic(
  () =>
    import("@/features/artifact-library/ArtifactLibraryWindow").then(
      (mod) => mod.ArtifactLibraryWindow,
    ),
  { ssr: false },
);

const NotesWindow = dynamic(
  () =>
    import("@/features/notes/NotesWindow").then(
      (mod) => mod.NotesWindow,
    ),
  { ssr: false },
);

const ForumWindow = dynamic(
  () =>
    import("@/features/forum/ForumWindow").then(
      (mod) => mod.ForumWindow,
    ),
  { ssr: false },
);

// ── App Definitions ─────────────────────────────────────────────────

/**
 * All window app definitions registered on the NEXUS Desktop.
 *
 * Rules:
 * - Each kind appears exactly once.
 * - `singleton: true` means only one window of this kind can be open.
 * - `icon` is a lucide-react icon name or emoji for the launcher.
 */
export const DEFAULT_WINDOW_APPS: NexusWindowAppDefinition[] = [
  {
    kind: "global-chat",
    title: "Global Chat",
    scope: "account",
    defaultSize: { width: 640, height: 520 },
    minSize: { width: 380, height: 280 },
    icon: "message-circle",
    singleton: false,
    allowMultiple: true,
    capabilities: ["chat", "composer", "media-upload", "resource-preview", "notes-capture"] as NexusCapabilityKind[],
    archetype: "chat-app" as NexusProductArchetypeKind,
    component: GlobalChatWindow,
  },
  {
    kind: "global-user",
    title: "My Account",
    scope: "account",
    defaultSize: { width: 480, height: 560 },
    minSize: { width: 320, height: 360 },
    icon: "user",
    singleton: true,
    allowMultiple: false,
    capabilities: ["profiles"] as NexusCapabilityKind[],
    archetype: "admin-app" as NexusProductArchetypeKind,
    component: GlobalUserWindow,
  },
  {
    kind: "workspace",
    title: "Workspace",
    scope: "workspace",
    defaultSize: { width: 500, height: 420 },
    minSize: { width: 340, height: 280 },
    icon: "layout-grid",
    singleton: false,
    allowMultiple: true,
    capabilities: ["workspace"] as NexusCapabilityKind[],
    archetype: "workspace-app" as NexusProductArchetypeKind,
    component: WorkspaceWindow,
  },
  {
    kind: "notes-demo",
    title: "Notes",
    scope: "account",
    defaultSize: { width: 540, height: 480 },
    minSize: { width: 320, height: 240 },
    icon: "sticky-note",
    singleton: false,
    allowMultiple: true,
    component: NotesDemoWindow,
  },
  {
    kind: "forum-demo",
    title: "Forum",
    scope: "account",
    defaultSize: { width: 600, height: 500 },
    minSize: { width: 360, height: 280 },
    icon: "message-square",
    singleton: false,
    allowMultiple: true,
    component: ForumDemoWindow,
  },
  {
    kind: "artifact-preview",
    title: "Preview",
    scope: "account",
    defaultSize: { width: 560, height: 480 },
    minSize: { width: 320, height: 240 },
    icon: "image",
    singleton: false,
    allowMultiple: true,
    capabilities: ["resource-preview"] as NexusCapabilityKind[],
    archetype: "resource-app" as NexusProductArchetypeKind,
    component: ArtifactPreviewWindow,
  },
  {
    kind: "artifact-library",
    title: "Artifacts",
    scope: "account",
    defaultSize: { width: 720, height: 520 },
    minSize: { width: 400, height: 320 },
    icon: "folder-open",
    singleton: true,
    allowMultiple: false,
    capabilities: ["resource-library", "resource-preview", "search", "media-upload"] as NexusCapabilityKind[],
    archetype: "resource-app" as NexusProductArchetypeKind,
    component: ArtifactLibraryWindow,
  },
  {
    kind: "notes",
    title: "Notes",
    scope: "account",
    defaultSize: { width: 680, height: 500 },
    minSize: { width: 400, height: 320 },
    icon: "sticky-note",
    singleton: true,
    allowMultiple: false,
    capabilities: ["composer", "notes-capture", "resource-preview"] as NexusCapabilityKind[],
    archetype: "knowledge-app" as NexusProductArchetypeKind,
    component: NotesWindow,
  },
  {
    kind: "forum",
    title: "Forum",
    scope: "account",
    defaultSize: { width: 700, height: 520 },
    minSize: { width: 420, height: 340 },
    icon: "message-square",
    singleton: true,
    allowMultiple: false,
    capabilities: ["feed", "thread", "composer", "comments", "media-upload", "notes-capture"] as NexusCapabilityKind[],
    archetype: "community-app" as NexusProductArchetypeKind,
    component: ForumWindow,
  },
];

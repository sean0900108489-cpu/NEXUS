/**
 * NEXUS Window OS — Default Capability Definitions
 *
 * All known capabilities in the NEXUS platform.
 * This is the SINGLE source of truth for what capabilities exist
 * and which apps provide them.
 *
 * @module kernel/capabilities/default-capabilities
 */

import type { NexusCapabilityDefinition } from "./capability-types";

/**
 * All registered capabilities.
 *
 * Capabilities marked "stable" are used by multiple apps.
 * Capabilities marked "mvp" have a first implementation in at least one app.
 * Capabilities marked "planned" are designed but not yet built.
 */
export const DEFAULT_CAPABILITIES: NexusCapabilityDefinition[] = [
  // ── Communication ────────────────────────────────────────
  {
    kind: "chat",
    title: "Chat",
    description: "Real-time or async text conversation with AI or other users",
    maturity: "stable",
    owner: "feature",
    providedBy: ["global-chat"],
  },
  {
    kind: "feed",
    title: "Feed",
    description: "Chronological or ranked list of content items (threads, posts)",
    maturity: "mvp",
    owner: "feature",
    providedBy: ["forum"],
    dependsOn: ["thread"],
  },
  {
    kind: "thread",
    title: "Thread",
    description: "Topical discussion with nested replies",
    maturity: "mvp",
    owner: "feature",
    providedBy: ["forum"],
    dependsOn: ["composer"],
  },
  {
    kind: "composer",
    title: "Composer",
    description: "Rich text or plain text input with media attachment support",
    maturity: "stable",
    owner: "feature",
    providedBy: ["global-chat", "forum", "notes"],
    dependsOn: ["media-upload"],
  },
  {
    kind: "comments",
    title: "Comments",
    description: "User-generated replies on any resource (thread, artifact, note)",
    maturity: "mvp",
    owner: "feature",
    providedBy: ["forum"],
    dependsOn: ["composer"],
  },

  // ── Media & Resources ────────────────────────────────────
  {
    kind: "media-upload",
    title: "Media Upload",
    description: "Upload and store images, documents, and files",
    maturity: "stable",
    owner: "feature",
    providedBy: ["global-chat", "forum"],
  },
  {
    kind: "resource-library",
    title: "Resource Library",
    description: "Browse, search, and filter uploaded resources",
    maturity: "stable",
    owner: "feature",
    providedBy: ["artifact-library"],
    dependsOn: ["media-upload", "search"],
  },
  {
    kind: "resource-preview",
    title: "Resource Preview",
    description: "View attachment/artifact metadata, image preview, download",
    maturity: "stable",
    owner: "feature",
    providedBy: ["artifact-preview"],
  },

  // ── Knowledge ────────────────────────────────────────────
  {
    kind: "notes-capture",
    title: "Notes Capture",
    description: "Save or append content to a note from any app",
    maturity: "stable",
    owner: "feature",
    providedBy: ["notes", "global-chat", "forum", "artifact-library", "artifact-preview"],
  },

  // ── Social ───────────────────────────────────────────────
  {
    kind: "profiles",
    title: "Profiles",
    description: "Shared user identity display primitive: name, handle, avatar, bio",
    maturity: "mvp",
    owner: "feature",
    providedBy: ["global-user", "profile-preview", "forum"],
  },
  {
    kind: "reactions",
    title: "Reactions",
    description: "Emoji or like-based reactions on posts, comments, resources",
    maturity: "planned",
    owner: "future",
  },
  {
    kind: "follow-graph",
    title: "Follow Graph",
    description: "User follows, follower lists, social graph",
    maturity: "planned",
    owner: "future",
    dependsOn: ["profiles"],
  },

  // ── Discovery ────────────────────────────────────────────
  {
    kind: "search",
    title: "Search",
    description: "Full-text or filtered search across resources",
    maturity: "mvp",
    owner: "feature",
    providedBy: ["artifact-library"],
  },

  // ── System ───────────────────────────────────────────────
  {
    kind: "notifications",
    title: "Notifications",
    description: "Local toast notifications for system events (upload, save, error)",
    maturity: "stable",
    owner: "kernel",
    providedBy: ["kernel"],
  },
  {
    kind: "commands",
    title: "Commands",
    description: "Keyboard-driven command palette for quick actions",
    maturity: "stable",
    owner: "kernel",
    providedBy: ["kernel"],
  },

  // ── Governance ───────────────────────────────────────────
  {
    kind: "moderation",
    title: "Moderation",
    description: "Content flagging, reporting, removal, user bans",
    maturity: "planned",
    owner: "future",
  },

  // ── Creative ─────────────────────────────────────────────
  {
    kind: "canvas",
    title: "Canvas",
    description: "Interactive visual editor (drawing, layout, design)",
    maturity: "planned",
    owner: "future",
    dependsOn: ["resource-library"],
  },
  {
    kind: "templates",
    title: "Templates",
    description: "Pre-built content or layout templates for quick creation",
    maturity: "planned",
    owner: "future",
  },
  {
    kind: "export",
    title: "Export",
    description: "Export content to various formats (PDF, PNG, JSON, etc.)",
    maturity: "planned",
    owner: "future",
  },

  // ── Collaboration ────────────────────────────────────────
  {
    kind: "collaboration",
    title: "Collaboration",
    description: "Real-time or async multi-user editing",
    maturity: "planned",
    owner: "future",
    dependsOn: ["profiles", "notifications"],
  },

  // ── Commerce ─────────────────────────────────────────────
  {
    kind: "marketplace",
    title: "Marketplace",
    description: "Task posting, offer creation, contract management",
    maturity: "planned",
    owner: "future",
    dependsOn: ["profiles", "media-upload", "comments"],
  },
  {
    kind: "payments",
    title: "Payments",
    description: "Credit-based or fiat payment processing",
    maturity: "planned",
    owner: "future",
  },
  {
    kind: "reviews",
    title: "Reviews",
    description: "User ratings and reviews on marketplace tasks or resources",
    maturity: "planned",
    owner: "future",
    dependsOn: ["profiles"],
  },

  // ── Platform ─────────────────────────────────────────────
  {
    kind: "workspace",
    title: "Workspace",
    description: "Collaborative workspace with agents, graph, and tools",
    maturity: "stable",
    owner: "feature",
    providedBy: ["workspace"],
  },
];

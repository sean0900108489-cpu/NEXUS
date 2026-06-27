/**
 * NEXUS Window OS — Capability Types
 *
 * A Capability is a reusable unit of product functionality that
 * can be composed into window apps. This is a metadata/architecture
 * layer — it does NOT control runtime behavior.
 *
 * Window apps DECLARE which capabilities they provide.
 * Product archetypes DECLARE which capabilities they require.
 *
 * @module kernel/capabilities/capability-types
 */

// ── Capability Kind ────────────────────────────────────────────────

/**
 * Every reusable product capability across the NEXUS platform.
 *
 * These are NOT window kinds. A single window app (e.g. Forum)
 * can provide multiple capabilities (feed, thread, composer, comments).
 *
 * Add new capabilities when you identify a pattern that multiple
 * future apps will need.
 */
export type NexusCapabilityKind =
  // ── Communication ─────────────────────────────
  | "chat"
  | "feed"
  | "thread"
  | "composer"
  | "comments"

  // ── Media & Resources ─────────────────────────
  | "media-upload"
  | "resource-library"
  | "resource-preview"

  // ── Knowledge ──────────────────────────────────
  | "notes-capture"

  // ── Social ─────────────────────────────────────
  | "profiles"
  | "reactions"
  | "follow-graph"

  // ── Discovery ──────────────────────────────────
  | "search"

  // ── System ─────────────────────────────────────
  | "notifications"
  | "commands"

  // ── Governance ─────────────────────────────────
  | "moderation"

  // ── Creative ───────────────────────────────────
  | "canvas"
  | "templates"
  | "export"

  // ── Collaboration ──────────────────────────────
  | "collaboration"

  // ── Commerce ───────────────────────────────────
  | "marketplace"
  | "payments"
  | "reviews"

  // ── Platform ───────────────────────────────────
  | "workspace";

// ── Capability Definition ──────────────────────────────────────────

/**
 * A single capability definition in the registry.
 */
export type NexusCapabilityDefinition = {
  /** Unique capability kind */
  kind: NexusCapabilityKind;

  /** Human-readable title */
  title: string;

  /** One-sentence description of what this capability provides */
  description: string;

  /**
   * Maturity level:
   * - "planned": Designed but not yet built
   * - "mvp": Minimum viable implementation exists
   * - "stable": Production-quality, used by multiple apps
   */
  maturity: "planned" | "mvp" | "stable";

  /**
   * Ownership:
   * - "kernel": Kernel-level capability (e.g. notifications, commands)
   * - "feature": Provided by a specific feature folder
   * - "future": Not yet implemented
   */
  owner: "kernel" | "feature" | "future";

  /**
   * Which window apps or kernel modules currently provide this capability.
   * e.g. ["global-chat", "forum"]
   */
  providedBy?: string[];

  /**
   * Capabilities this one depends on.
   * e.g. "comments" depends on "composer"
   */
  dependsOn?: NexusCapabilityKind[];
};

// ── Product Archetype ──────────────────────────────────────────────

/**
 * A product archetype is a pattern for building a specific kind of app.
 *
 * Examples:
 * - "social-feed-app" = feed + media-upload + profiles + comments + reactions
 * - "marketplace-app" = marketplace + profiles + media-upload + payments
 */
export type NexusProductArchetypeKind =
  | "chat-app"
  | "knowledge-app"
  | "resource-app"
  | "community-app"
  | "social-feed-app"
  | "creative-editor-app"
  | "marketplace-app"
  | "workspace-app"
  | "admin-app";

export type NexusProductArchetype = {
  kind: NexusProductArchetypeKind;
  title: string;
  description: string;
  /** Capabilities required for this archetype to function */
  requiredCapabilities: NexusCapabilityKind[];
  /** Optional capabilities that enhance the archetype */
  optionalCapabilities: NexusCapabilityKind[];
  /** Real-world product examples */
  examples: string[];
};

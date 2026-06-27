/**
 * NEXUS Window OS — Resource Reference
 *
 * Uniform resource identifiers for cross-app linking.
 * Any app can reference any resource type using the same mechanism.
 *
 * @module kernel/resource/resource-ref
 */

// ── Resource Types ─────────────────────────────────────────────────

export type NexusResourceType =
  | "attachment"
  | "artifact"
  | "global-conversation"
  | "workspace"
  | "note"
  | "forum-post"
  | "marketplace-listing";

// ── Resource Reference ─────────────────────────────────────────────

export type NexusResourceRef = {
  /** Resource type */
  type: NexusResourceType;

  /** Resource ID */
  id: string;

  /** Optional human-readable label */
  label?: string;

  /** Optional metadata for context */
  meta?: Record<string, unknown>;
};

// ── Resource Action ────────────────────────────────────────────────

/**
 * Action to perform when a resource is opened.
 * The Desktop Shell or window manager can dispatch these.
 */
export type NexusResourceAction = {
  ref: NexusResourceRef;

  /** Window kind to open for this resource */
  preferredWindowKind?: string;

  /** Optional additional context */
  context?: Record<string, unknown>;
};

// ── Helpers ────────────────────────────────────────────────────────

export function createResourceRef(
  type: NexusResourceType,
  id: string,
  label?: string,
  meta?: Record<string, unknown>,
): NexusResourceRef {
  return { type, id, label, meta };
}

export function isResourceRef(value: unknown): value is NexusResourceRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value
  );
}

/**
 * NEXUS Feature API — Artifact Library
 *
 * Feature-level API client for listing and browsing user attachments.
 * Wraps GET /api/attachments for list operations.
 *
 * @module features/artifact-library
 */

import { attachmentApi } from "@/features/attachments/attachment-api";

// ── Types ──────────────────────────────────────────────────────────

export type ArtifactLibraryItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  scope: string;
  workspaceId: string | null;
  kind: string;
  createdAt: string;
};

export type ArtifactLibraryListResponse = {
  items: ArtifactLibraryItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type ArtifactLibraryFilter = {
  query?: string;
  mimeType?: string;
  scope?: string;
  limit?: number;
  cursor?: string;
};

// ── Helpers ────────────────────────────────────────────────────────

const ATTACHMENTS_API = "/api/attachments";

async function resolveAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { ensureNexusSupabaseClientConfigured, getNexusSupabaseClient } =
      await import("@/lib/supabase/client");
    await ensureNexusSupabaseClientConfigured();
    const { data } = await getNexusSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

// ── API ────────────────────────────────────────────────────────────

export const artifactLibraryApi = {
  /**
   * List user attachments with optional filters.
   */
  async listItems(
    filter: ArtifactLibraryFilter = {},
  ): Promise<ArtifactLibraryListResponse> {
    const params = new URLSearchParams();
    if (filter.query) params.set("query", filter.query);
    if (filter.mimeType) params.set("mimeType", filter.mimeType);
    if (filter.scope) params.set("scope", filter.scope);
    if (filter.limit) params.set("limit", String(filter.limit));
    if (filter.cursor) params.set("cursor", filter.cursor);
    const qs = params.toString();
    const url = qs ? `${ATTACHMENTS_API}?${qs}` : ATTACHMENTS_API;

    const headers = new Headers();
    const token = await resolveAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg =
        (body as { error?: { message?: string } }).error?.message ??
        `Failed to list attachments (${response.status})`;
      throw new Error(msg);
    }

    return response.json() as Promise<ArtifactLibraryListResponse>;
  },

  /**
   * Get a signed URL for an item (delegates to attachmentApi).
   */
  async getSignedUrl(attachmentId: string): Promise<string | null> {
    return attachmentApi.getSignedUrl(attachmentId);
  },
};

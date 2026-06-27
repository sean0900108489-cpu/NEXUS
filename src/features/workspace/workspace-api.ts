/**
 * NEXUS Feature API — Workspace
 *
 * Feature-level API client for workspace operations.
 * Currently thin — delegates to existing routes.
 *
 * @module features/workspace/workspace-api
 */

import { nexusHomeApi } from "@/lib/nexus-home/api";
import type { WorkspaceShortcut } from "@/lib/nexus-home/types";

export type { WorkspaceShortcut };

export const workspaceApi = {
  /**
   * List available workspaces for the authenticated user.
   */
  async listWorkspaces(): Promise<WorkspaceShortcut[]> {
    return nexusHomeApi.listWorkspaces();
  },

  /**
   * Get the full workspace URL for opening in a new tab.
   */
  getWorkspaceUrl(workspaceId: string): string {
    return `/workspace/${encodeURIComponent(workspaceId)}`;
  },
};

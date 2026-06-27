/**
 * NEXUS Window OS — Notes Backend Contract Types
 *
 * Repository interface for Notes persistence.
 * Current implementation: localStorage (notes-api.ts).
 * Future implementation: Supabase (SupabaseNotesRepository).
 *
 * @module features/notes/notes-backend-types
 */

import type { NexusResourceRef } from "@/kernel/resource/resource-ref";
import type { NexusNote } from "./notes-api";

// ── Repository Interface ───────────────────────────────────────────

/**
 * The NotesRepository is the contract between the Notes feature
 * and any persistence backend.
 *
 * Switching from localStorage to Supabase requires:
 *   1. Implement this interface for Supabase
 *   2. Swap the implementation in notes-api.ts
 *   3. Window components remain unchanged
 */
export interface NotesRepository {
  /** List notes for the current user. Newest first. */
  listNotes(params?: {
    /** Optional workspace filter */
    workspaceId?: string;
    /** Search in title/content */
    query?: string;
    /** Max results */
    limit?: number;
  }): Promise<NexusNote[]>;

  /** Get a single note by ID */
  getNote(id: string): Promise<NexusNote | null>;

  /** Create a new note */
  createNote(input: {
    title?: string;
    content?: string;
    workspaceId?: string;
  }): Promise<NexusNote>;

  /** Update an existing note */
  updateNote(
    id: string,
    patch: {
      title?: string;
      content?: string;
    },
  ): Promise<NexusNote | null>;

  /** Soft-delete a note */
  deleteNote(id: string): Promise<boolean>;

  /** Add a resource reference to a note (de-duplicates) */
  addResource(noteId: string, ref: NexusResourceRef): Promise<boolean>;

  /** Remove a resource reference from a note */
  removeResource(
    noteId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;
}

// ── Migration Types ────────────────────────────────────────────────

export type NotesMigrationState = {
  version: 2;
  lastExportedAt?: string;
  lastImportedAt?: string;
  migratedIds: string[];
  failedIds: string[];
};

export type NotesMigrationReport = {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
};

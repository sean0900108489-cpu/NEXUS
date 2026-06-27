/**
 * NEXUS Window OS — Current Note Store / Notes Bridge
 *
 * Cross-app bridge for the Notes feature.
 * Other features (Global Chat, Artifact Library, Artifact Preview)
 * use this store to interact with the currently active note.
 *
 * Rules:
 * - Other features NEVER access notes localStorage directly.
 * - Other features NEVER import notes-api.ts.
 * - All cross-app note operations go through this store.
 *
 * @module features/notes
 */

"use client";

import { create } from "zustand";
import { notesApi } from "./notes-api";
import type { NexusNote } from "./notes-api";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

// ── Helpers ────────────────────────────────────────────────────────

function isSameResource(a: NexusResourceRef, b: NexusResourceRef): boolean {
  return a.type === b.type && a.id === b.id;
}

// ── Store ──────────────────────────────────────────────────────────

type CurrentNoteStore = {
  /** The currently active note ID (set by NotesWindow) */
  currentNoteId: string | null;

  /** Set the active note ID */
  setCurrentNoteId: (id: string | null) => void;

  /**
   * Add a resource ref to the current note's linkedResources.
   * De-duplicates: if the same type+id already exists, returns false.
   * Returns true if added successfully.
   */
  addResourceToCurrentNote: (ref: NexusResourceRef) => boolean;

  /**
   * Append content to the current note.
   * Returns true if successful, false if no active note.
   */
  appendContentToCurrentNote: (content: string) => boolean;

  /**
   * Create a new note from content with optional linked resources.
   * Returns the created note or null.
   */
  createNoteFromContent: (params: {
    title?: string;
    content: string;
    linkedResources?: NexusResourceRef[];
  }) => NexusNote | null;

  /** Get the current note (reads from localStorage via notesApi) */
  getCurrentNote: () => NexusNote | null;
};

export const useCurrentNoteStore = create<CurrentNoteStore>((set, get) => ({
  currentNoteId: null,

  setCurrentNoteId: (id) => set({ currentNoteId: id }),

  addResourceToCurrentNote: (ref) => {
    const noteId = get().currentNoteId;
    if (!noteId) return false;

    const note = notesApi.getNote(noteId);
    if (!note) return false;

    // De-duplicate
    const alreadyLinked = note.linkedResources.some((r) =>
      isSameResource(r, ref),
    );
    if (alreadyLinked) return false;

    const updated = notesApi.updateNote(noteId, {
      linkedResources: [...note.linkedResources, ref],
    });

    return updated !== null;
  },

  appendContentToCurrentNote: (content) => {
    const noteId = get().currentNoteId;
    if (!noteId) return false;

    const note = notesApi.getNote(noteId);
    if (!note) return false;

    const updated = notesApi.updateNote(noteId, {
      content: note.content
        ? `${note.content}\n\n${content}`
        : content,
    });

    return updated !== null;
  },

  createNoteFromContent: (params) => {
    const note = notesApi.createNote({
      title: params.title ?? params.content.slice(0, 60),
      content: params.content,
    });

    if (params.linkedResources?.length) {
      const updated = notesApi.updateNote(note.id, {
        linkedResources: params.linkedResources,
      });
      return updated ?? note;
    }

    return note;
  },

  getCurrentNote: () => {
    const noteId = get().currentNoteId;
    if (!noteId) return null;
    return notesApi.getNote(noteId);
  },
}));

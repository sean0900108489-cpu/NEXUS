/**
 * NEXUS Feature API — Notes
 *
 * Feature-level API client for notes (localStorage-first MVP).
 * Future migration to Supabase/Obsidian only requires changing this file.
 *
 * Window components use this API — NOT localStorage directly.
 *
 * @module features/notes
 */

import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

// ── Types ──────────────────────────────────────────────────────────

export type NexusNote = {
  id: string;
  title: string;
  content: string;
  linkedResources: NexusResourceRef[];
  createdAt: string;
  updatedAt: string;
};

export type NotesListResponse = {
  notes: NexusNote[];
};

// ── Storage Keys ───────────────────────────────────────────────────

const INDEX_KEY = "nexus-notes:v2:index";
const NOTE_PREFIX = "nexus-notes:v2:note:";

// ── Helpers ────────────────────────────────────────────────────────

function makeId(): string {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function noteKey(id: string): string {
  return `${NOTE_PREFIX}${id}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full — silently degrade
  }
}

// ── Index Management ───────────────────────────────────────────────

function getNoteIds(): string[] {
  return readJSON<string[]>(INDEX_KEY, []);
}

function setNoteIds(ids: string[]): void {
  writeJSON(INDEX_KEY, ids);
}

function addToIndex(id: string): void {
  const ids = getNoteIds();
  if (!ids.includes(id)) {
    ids.unshift(id); // newest first
    setNoteIds(ids);
  }
}

function removeFromIndex(id: string): void {
  setNoteIds(getNoteIds().filter((i) => i !== id));
}

// ── API ────────────────────────────────────────────────────────────

export const notesApi = {
  /**
   * List all notes (newest first).
   */
  listNotes(): NotesListResponse {
    const ids = getNoteIds();
    const notes: NexusNote[] = [];

    for (const id of ids) {
      const note = readJSON<NexusNote | null>(noteKey(id), null);
      if (note) notes.push(note);
    }

    return { notes };
  },

  /**
   * Get a single note by ID.
   */
  getNote(id: string): NexusNote | null {
    return readJSON<NexusNote | null>(noteKey(id), null);
  },

  /**
   * Create a new note.
   */
  createNote(input: { title?: string; content?: string }): NexusNote {
    const id = makeId();
    const timestamp = now();
    const note: NexusNote = {
      id,
      title: input.title?.trim() || "Untitled Note",
      content: input.content ?? "",
      linkedResources: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    writeJSON(noteKey(id), note);
    addToIndex(id);
    return note;
  },

  /**
   * Update an existing note.
   */
  updateNote(
    id: string,
    patch: Partial<Pick<NexusNote, "title" | "content" | "linkedResources">>,
  ): NexusNote | null {
    const existing = readJSON<NexusNote | null>(noteKey(id), null);
    if (!existing) return null;

    const note: NexusNote = {
      ...existing,
      ...patch,
      updatedAt: now(),
    };

    writeJSON(noteKey(id), note);
    return note;
  },

  /**
   * Delete a note.
   */
  deleteNote(id: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      window.localStorage.removeItem(noteKey(id));
      removeFromIndex(id);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * NEXUS Window OS — Notes Window App
 *
 * Minimal notes app: create, edit, save. Cross-app bridge via current-note-store.
 *
 * Sub-components:
 *   NotesSidebar      — note list + create
 *   NotesToolbar      — save, delete, open library
 *   NoteEditor        — title + content editing
 *   NoteResourcePanel — linked resources display
 *   NotesStates       — loading / empty / error
 *
 * @module features/notes
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { notesApi } from "./notes-api";
import type { NexusNote } from "./notes-api";
import { useCurrentNoteStore } from "./current-note-store";
import { NotesSidebar } from "./NotesSidebar";
import { NotesToolbar } from "./NotesToolbar";
import { NoteEditor } from "./NoteEditor";
import { NoteResourcePanel } from "./NoteResourcePanel";
import { NotesLoadingState, NotesEmptyState, NotesErrorState } from "./NotesStates";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";
import { useNotificationStore } from "@/kernel/notifications/notification-store";

// ── Component ──────────────────────────────────────────────────────

export function NotesWindow({ setTitle }: NexusWindowAppProps) {
  const [notes, setNotes] = useState<NexusNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setCurrentNoteId = useCurrentNoteStore((s) => s.setCurrentNoteId);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => { setTitle("Notes"); }, [setTitle]);

  // Sync current note to bridge store
  useEffect(() => {
    setCurrentNoteId(selectedNoteId);
    return () => { setCurrentNoteId(null); };
  }, [selectedNoteId, setCurrentNoteId]);

  // ── Load ─────────────────────────────────────────────────

  const loadNotes = useCallback(() => {
    setLoading(true); setError(null);
    try {
      const result = notesApi.listNotes();
      setNotes(result.notes);
      if (result.notes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(result.notes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  // ── CRUD ─────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    try {
      const note = notesApi.createNote({});
      setNotes((prev) => [note, ...prev]);
      setSelectedNoteId(note.id);
      addNotification({ type: "success", title: "Note created", autoDismissMs: 2000 });
    } catch (err) {
      addNotification({ type: "error", title: "Failed to create note", message: String(err), autoDismissMs: 4000 });
    }
  }, [addNotification]);

  const handleTitleChange = useCallback((title: string) => {
    if (!selectedNoteId) return;
    const updated = notesApi.updateNote(selectedNoteId, { title });
    if (updated) setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? updated : n)));
  }, [selectedNoteId]);

  const handleContentChange = useCallback((content: string) => {
    if (!selectedNoteId) return;
    const updated = notesApi.updateNote(selectedNoteId, { content });
    if (updated) setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? updated : n)));
  }, [selectedNoteId]);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addNotification({ type: "success", title: "Note saved", autoDismissMs: 2000 });
    }, 300);
  }, [addNotification]);

  const handleDelete = useCallback(() => {
    if (!selectedNoteId) return;
    const note = notes.find((n) => n.id === selectedNoteId);
    if (!note) return;
    notesApi.deleteNote(selectedNoteId);
    setNotes((prev) => prev.filter((n) => n.id !== selectedNoteId));
    const remaining = notes.filter((n) => n.id !== selectedNoteId);
    setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    addNotification({ type: "info", title: "Note deleted", message: note.title, autoDismissMs: 3000 });
  }, [selectedNoteId, notes, addNotification]);

  // ── Render ─────────────────────────────────────────────

  if (loading) return <NotesLoadingState />;
  if (error && notes.length === 0) return <NotesErrorState message={error} onRetry={loadNotes} />;
  if (notes.length === 0) return <NotesEmptyState onCreate={handleCreate} />;

  return (
    <div className="flex h-full">
      <NotesSidebar notes={notes} selectedNoteId={selectedNoteId} onSelect={setSelectedNoteId} onCreate={handleCreate} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <NotesToolbar
          updatedAt={selectedNote?.updatedAt ?? null}
          selectedNoteId={selectedNoteId}
          saving={saving}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        {selectedNote ? (
          <>
            <NoteEditor
              title={selectedNote.title}
              content={selectedNote.content}
              onTitleChange={handleTitleChange}
              onContentChange={handleContentChange}
            />
            <NoteResourcePanel resources={selectedNote.linkedResources} />
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-white/15 text-xs">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );
}

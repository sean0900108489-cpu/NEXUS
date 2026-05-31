"use client";

import { Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";

import { useNexusStore } from "@/store/nexus-store";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DatapadWindow({ notebookId }: { notebookId: string }) {
  const notebook = useNexusStore((state) =>
    state.notebooksCache.find((candidate) => candidate.id === notebookId),
  );
  const notebookDraft = useNexusStore((state) => state.notebookDrafts[notebookId]);
  const openNotebookIds = useNexusStore((state) => state.openNotebookIds);
  const zIndex = useNexusStore(
    (state) => state.notebookWindowLayers[notebookId] ?? state.nextZIndex,
  );
  const toggleNotebookOpen = useNexusStore((state) => state.toggleNotebookOpen);
  const focusNotebookWindow = useNexusStore((state) => state.focusNotebookWindow);
  const saveNotebookDraft = useNexusStore((state) => state.saveNotebookDraft);
  const updateNotebook = useNexusStore((state) => state.updateNotebook);
  const deleteNotebook = useNexusStore((state) => state.deleteNotebook);
  const windowIndex = Math.max(0, openNotebookIds.indexOf(notebookId));
  const defaultFrame = useMemo(
    () => ({
      height: 420,
      width: 520,
      x: 72 + windowIndex * 32,
      y: 68 + windowIndex * 28,
    }),
    [windowIndex],
  );
  const recoveryTitle = notebookDraft?.title ?? notebook?.title ?? "";
  const recoveryContent = notebookDraft?.content ?? notebook?.content ?? "";
  const [titleDraft, setTitleDraft] = useState(recoveryTitle);
  const [contentDraft, setContentDraft] = useState(recoveryContent);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTitleDraft(recoveryTitle);
      setContentDraft(recoveryContent);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [recoveryContent, recoveryTitle]);

  useEffect(() => {
    if (!saved) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSaved(false), 1200);

    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  useEffect(() => {
    focusNotebookWindow(notebookId);
  }, [focusNotebookWindow, notebookId]);

  if (!notebook) {
    return null;
  }

  const saveNotebook = () => {
    updateNotebook(notebook.id, titleDraft, contentDraft);
    setSaved(true);
  };
  const handleTitleDraftChange = (value: string) => {
    setTitleDraft(value);
    saveNotebookDraft(notebook.id, value, contentDraft);
  };
  const handleContentDraftChange = (value: string) => {
    setContentDraft(value);
    saveNotebookDraft(notebook.id, titleDraft, value);
  };
  const bringToFront = () => focusNotebookWindow(notebook.id);

  return (
    <Rnd
      bounds="parent"
      className="absolute"
      default={defaultFrame}
      dragHandleClassName="datapad-drag-handle"
      minHeight={260}
      minWidth={320}
      onDragStart={bringToFront}
      onMouseDown={bringToFront}
      onTouchStart={bringToFront}
      style={{ zIndex }}
    >
      <section className="nexus-datapad-shell nexus-datapad-window flex h-full min-h-0 flex-col overflow-hidden border border-white/10 bg-black/70 text-slate-100 shadow-[0_22px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl">
        <header className="datapad-drag-handle flex h-12 shrink-0 cursor-move items-center gap-2 border-b border-emerald-300/15 bg-emerald-300/[0.045] px-3">
          <input
            aria-label="Datapad title"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-emerald-50 outline-none placeholder:text-slate-600"
            onChange={(event) => handleTitleDraftChange(event.currentTarget.value)}
            placeholder="Untitled Datapad"
            value={titleDraft}
          />
          <button
            aria-label="Close datapad"
            className="grid h-8 w-8 place-items-center border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-emerald-300/45 hover:bg-emerald-300/10 hover:text-emerald-100"
            onClick={() => toggleNotebookOpen(notebook.id)}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <textarea
          aria-label="Datapad content"
          className="cyber-scroll min-h-0 flex-1 resize-none border-0 bg-black/35 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:bg-black/45"
          onChange={(event) => handleContentDraftChange(event.currentTarget.value)}
          placeholder="Capture global notes, reusable context, decisions, and operator memory..."
          spellCheck={false}
          value={contentDraft}
        />

        <footer className="flex h-12 shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-black/28 px-3">
          <span
            className={cx(
              "font-mono text-[9px] uppercase tracking-[0.16em]",
              saved ? "text-emerald-200" : "text-slate-600",
            )}
          >
            {saved ? "Saved to cloud queue" : "Global Datapad"}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-8 items-center gap-2 border border-emerald-300/35 bg-emerald-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/20"
              onClick={saveNotebook}
              type="button"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              className="grid h-8 w-8 place-items-center border border-rose-300/30 bg-rose-300/10 text-rose-100 transition hover:bg-rose-300/20"
              onClick={() => deleteNotebook(notebook.id)}
              title="Delete datapad"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </section>
    </Rnd>
  );
}

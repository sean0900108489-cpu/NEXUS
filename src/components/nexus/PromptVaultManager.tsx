"use client";

import { motion } from "framer-motion";
import { Check, Copy, Database, Pen, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { PromptRecord } from "@/lib/nexus-types";
import { useNexusStore } from "@/store/nexus-store";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatPromptDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unsynced";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPromptPreview(prompt: PromptRecord) {
  return prompt.content.trim() || "No prompt content loaded.";
}

export function PromptVaultManager() {
  const activeWorkspaceId = useNexusStore((state) => state.activeWorkspaceId);
  const promptsCache = useNexusStore((state) => state.promptsCache);
  const closeVaultManager = useNexusStore((state) => state.closeVaultManager);
  const deletePrompt = useNexusStore((state) => state.deletePrompt);
  const updatePrompt = useNexusStore((state) => state.updatePrompt);
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>();
  const [copiedPromptId, setCopiedPromptId] = useState<string | undefined>();
  const [editingPromptId, setEditingPromptId] = useState<string | undefined>();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const workspacePrompts = useMemo(
    () => promptsCache.filter((prompt) => prompt.workspace_id === activeWorkspaceId),
    [activeWorkspaceId, promptsCache],
  );
  const selectedPrompt =
    workspacePrompts.find((prompt) => prompt.id === selectedPromptId) ??
    workspacePrompts[0];
  const editing = Boolean(selectedPrompt && editingPromptId === selectedPrompt.id);

  useEffect(() => {
    if (!copiedPromptId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopiedPromptId(undefined), 1400);

    return () => window.clearTimeout(timeoutId);
  }, [copiedPromptId]);

  useEffect(() => {
    if (!selectedPrompt || editing) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDraftTitle(selectedPrompt.title);
      setDraftContent(selectedPrompt.content);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [editing, selectedPrompt]);

  const copySelectedPrompt = () => {
    if (!selectedPrompt || typeof navigator === "undefined") {
      return;
    }

    void navigator.clipboard
      ?.writeText(selectedPrompt.content)
      .then(() => setCopiedPromptId(selectedPrompt.id))
      .catch(() => undefined);
  };

  const startEdit = () => {
    if (!selectedPrompt) {
      return;
    }

    setDraftTitle(selectedPrompt.title);
    setDraftContent(selectedPrompt.content);
    setEditingPromptId(selectedPrompt.id);
  };

  const cancelEdit = () => {
    if (selectedPrompt) {
      setDraftTitle(selectedPrompt.title);
      setDraftContent(selectedPrompt.content);
    }

    setEditingPromptId(undefined);
  };

  const saveEdit = () => {
    if (!selectedPrompt) {
      return;
    }

    updatePrompt(selectedPrompt.id, draftTitle, draftContent);
    setEditingPromptId(undefined);
  };

  const removeSelectedPrompt = () => {
    if (!selectedPrompt) {
      return;
    }

    deletePrompt(selectedPrompt.id);
    setEditingPromptId(undefined);
    setSelectedPromptId(undefined);
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
    >
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex h-[min(760px,92vh)] w-[min(1180px,96vw)] min-h-0 flex-col overflow-hidden border border-blue-500/30 bg-zinc-900/96 shadow-[0_0_70px_rgba(34,211,238,0.18)]"
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-300/15 bg-white/[0.03] px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-cyan-200" />
              <h2 className="truncate font-mono text-sm uppercase tracking-[0.22em] text-white">
                PROMPT VAULT // COMMAND CENTER
              </h2>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {workspacePrompts.length} prompt records / current workspace
            </p>
          </div>
          <button
            aria-label="Close Prompt Vault Manager"
            className="grid h-9 w-9 place-items-center border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-100"
            onClick={closeVaultManager}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[360px_1fr]">
          <aside className="cyber-scroll min-h-0 overflow-y-auto border-b border-white/10 bg-black/20 p-3 md:border-b-0 md:border-r">
            {workspacePrompts.length ? (
              <div className="grid gap-2">
                {workspacePrompts.map((prompt) => {
                  const active = prompt.id === selectedPrompt?.id;

                  return (
                    <button
                      key={prompt.id}
                      className={cx(
                        "border p-3 text-left transition",
                        active
                          ? "border-cyan-300/45 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                          : "border-white/10 bg-white/[0.035] hover:border-fuchsia-300/35 hover:bg-fuchsia-300/10",
                      )}
                      onClick={() => setSelectedPromptId(prompt.id)}
                      type="button"
                    >
                      <span className="block truncate font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-100">
                        {prompt.title}
                      </span>
                      <span className="mt-2 block line-clamp-2 text-xs leading-5 text-slate-400">
                        {getPromptPreview(prompt)}
                      </span>
                      <span className="mt-3 block font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
                        Updated {formatPromptDate(prompt.updated_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid h-full min-h-56 place-items-center border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                <div>
                  <Database className="mx-auto h-6 w-6 text-slate-600" />
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Vault Empty
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Prompt records will appear here after the Supabase vault returns data
                    for this workspace.
                  </p>
                </div>
              </div>
            )}
          </aside>

          <section className="flex min-h-0 flex-col bg-zinc-950/40">
            {selectedPrompt ? (
              <>
                <div className="border-b border-white/10 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-200/80">
                        Selected Prompt
                      </p>
                      <h3 className="mt-2 break-words font-mono text-lg uppercase tracking-[0.12em] text-white">
                        {selectedPrompt.title}
                      </h3>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        Created {formatPromptDate(selectedPrompt.created_at)} / Updated{" "}
                        {formatPromptDate(selectedPrompt.updated_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {editing ? null : (
                        <button
                          className="inline-flex h-9 items-center gap-2 border border-amber-300/25 bg-amber-300/5 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-300/12"
                          onClick={startEdit}
                          type="button"
                        >
                          <Pen size={16} />
                          Edit
                        </button>
                      )}
                      <button
                        className="inline-flex h-9 items-center gap-2 border border-cyan-300/25 bg-cyan-300/5 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-300/12"
                        onClick={copySelectedPrompt}
                        type="button"
                      >
                        {copiedPromptId === selectedPrompt.id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        {copiedPromptId === selectedPrompt.id ? "Copied" : "Copy"}
                      </button>
                      <button
                        className="inline-flex h-9 items-center gap-2 border border-rose-300/25 bg-rose-300/5 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-rose-100 transition hover:border-rose-300/55 hover:bg-rose-300/12"
                        onClick={removeSelectedPrompt}
                        type="button"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="cyber-scroll min-h-0 flex-1 overflow-y-auto p-5">
                  {editing ? (
                    <div className="grid gap-3">
                      <label className="grid gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          Title
                        </span>
                        <input
                          className="border border-amber-300/25 bg-black/35 px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-amber-300/60"
                          onChange={(event) => setDraftTitle(event.currentTarget.value)}
                          value={draftTitle}
                        />
                      </label>
                      <label className="grid min-h-[360px] gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          Content
                        </span>
                        <textarea
                          className="cyber-scroll min-h-[360px] resize-none border border-amber-300/25 bg-black/35 p-4 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-amber-300/60"
                          onChange={(event) => setDraftContent(event.currentTarget.value)}
                          value={draftContent}
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          className="border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                          onClick={cancelEdit}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="border border-emerald-300/35 bg-emerald-300/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-300/20"
                          onClick={saveEdit}
                          type="button"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="min-h-full whitespace-pre-wrap border border-cyan-300/15 bg-black/35 p-4 font-mono text-sm leading-6 text-slate-200 shadow-inner shadow-black/40">
                      {selectedPrompt.content}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
                <div>
                  <Database className="mx-auto h-8 w-8 text-slate-700" />
                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                    Select a prompt to inspect its full command payload
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </motion.section>
    </motion.div>
  );
}

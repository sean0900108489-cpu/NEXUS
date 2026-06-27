/**
 * NEXUS Window OS — Notes Demo Window
 *
 * Placeholder window to prove the registry system works.
 * Will be replaced with real Obsidian/Git-based notes later.
 *
 * @module features/notes-demo
 */

"use client";

import { useEffect } from "react";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";
import { StickyNote } from "lucide-react";

export function NotesDemoWindow({ setTitle }: NexusWindowAppProps) {
  useEffect(() => {
    setTitle("Notes (Demo)");
  }, [setTitle]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 p-6">
      <StickyNote className="w-12 h-12 text-white/10" />
      <p className="text-sm font-medium">Notes — Coming Soon</p>
      <p className="text-xs text-center max-w-[240px]">
        Markdown notes with Obsidian-compatible vault sync.
        This is a placeholder window proving the App Registry works.
      </p>
      <div className="mt-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-md text-[10px] text-white/20 font-mono">
        Kind: notes-demo (registered via registry)
      </div>
    </div>
  );
}

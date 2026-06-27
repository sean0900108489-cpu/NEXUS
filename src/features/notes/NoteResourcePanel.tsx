/**
 * NEXUS Window OS — Note Resource Panel
 *
 * Shows linked resources for a note. Click to open via openResource.
 *
 * @module features/notes
 */

"use client";

import { Link2, ExternalLink } from "lucide-react";
import { openResource } from "@/kernel/resource/resource-actions";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

export function NoteResourcePanel({
  resources,
}: {
  resources: NexusResourceRef[];
}) {
  if (resources.length === 0) {
    return (
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center gap-2 text-white/15 text-xs">
          <Link2 className="w-3 h-3" />
          <span>No linked resources</span>
        </div>
        <p className="text-[10px] text-white/10 mt-1">
          Attach items from the Artifact Library
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01]">
      <div className="flex items-center gap-2 mb-2 text-white/25 text-[10px] uppercase tracking-wider">
        <Link2 className="w-3 h-3" />
        Linked Resources
      </div>
      <div className="space-y-1">
        {resources.map((ref, idx) => (
          <button
            key={`${ref.type}:${ref.id}:${idx}`}
            className="flex items-center gap-1.5 w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors group"
            onClick={() => openResource(ref)}
            title={`Open ${ref.type}: ${ref.label ?? ref.id}`}
          >
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            <span className="truncate">{ref.label ?? `${ref.type}: ${ref.id.slice(0, 8)}`}</span>
            <span className="text-[10px] text-white/15 shrink-0">{ref.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * NEXUS Window OS — Reaction Button Primitive
 *
 * @module features/interactions
 */

"use client";

import { ArrowBigUp, Bookmark, Heart } from "lucide-react";
import type { NexusReactionKind } from "./interaction-types";

const REACTION_LABELS: Record<NexusReactionKind, string> = {
  like: "Like",
  upvote: "Upvote",
  bookmark: "Bookmark",
};

export function ReactionButton({
  kind,
  active,
  count,
  onToggle,
}: {
  kind: NexusReactionKind;
  active?: boolean;
  count?: number;
  onToggle: () => void;
}) {
  const Icon = kind === "upvote" ? ArrowBigUp : kind === "bookmark" ? Bookmark : Heart;

  return (
    <button
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-white/40 hover:bg-white/5 hover:text-white/75"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={REACTION_LABELS[kind]}
      aria-pressed={active === true}
      aria-label={REACTION_LABELS[kind]}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{count ?? 0}</span>
    </button>
  );
}

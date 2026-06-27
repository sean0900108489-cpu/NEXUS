/**
 * NEXUS Window OS — Interaction Bar
 *
 * Shared UI surface for local reactions, comment counts, note capture, and
 * placeholder sharing.
 *
 * @module features/interactions
 */

"use client";

import { useState } from "react";
import { CommentCountBadge } from "./CommentCountBadge";
import { interactionApi } from "./interaction-api";
import { ReactionButton } from "./ReactionButton";
import { SaveToNoteButton } from "./SaveToNoteButton";
import { ShareButton } from "./ShareButton";
import type {
  NexusInteractionCounts,
  NexusInteractionSnapshot,
  NexusInteractionState,
  NexusInteractionTarget,
  NexusReactionKind,
} from "./interaction-types";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

export function InteractionBar({
  target,
  counts,
  state,
  reactionKind = "like",
  noteTitle,
  noteContent,
  linkedResources,
  shareText,
}: {
  target: NexusInteractionTarget;
  counts?: NexusInteractionCounts;
  state?: NexusInteractionState;
  reactionKind?: NexusReactionKind;
  noteTitle?: string;
  noteContent: string;
  linkedResources?: NexusResourceRef[];
  shareText: string;
}) {
  const targetKey = `${target.type}:${target.id}`;
  const [localSnapshot, setLocalSnapshot] = useState<{
    targetKey: string;
    snapshot: NexusInteractionSnapshot;
  }>(() => ({
    targetKey,
    snapshot: interactionApi.getSnapshot(target, counts, state),
  }));

  const snapshot = localSnapshot.targetKey === targetKey
    ? localSnapshot.snapshot
    : interactionApi.getSnapshot(target, counts, state);

  const handleReaction = () => {
    setLocalSnapshot({
      targetKey,
      snapshot: interactionApi.toggleReaction(target, reactionKind, counts),
    });
  };

  const handleSaved = () => {
    setLocalSnapshot({
      targetKey,
      snapshot: interactionApi.markSaved(target, counts),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-white/35">
      <ReactionButton
        kind={reactionKind}
        active={snapshot.state.viewerReacted?.[reactionKind]}
        count={snapshot.counts.reactions?.[reactionKind]}
        onToggle={handleReaction}
      />
      <CommentCountBadge count={snapshot.counts.comments} />
      <SaveToNoteButton
        mode="save"
        title={noteTitle}
        content={noteContent}
        linkedResources={linkedResources}
        onSaved={handleSaved}
      />
      <SaveToNoteButton
        mode="append"
        title={noteTitle}
        content={noteContent}
        linkedResources={linkedResources}
        onSaved={handleSaved}
      />
      <ShareButton shareText={shareText} />
    </div>
  );
}

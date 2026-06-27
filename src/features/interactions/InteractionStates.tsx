/**
 * NEXUS Window OS — Interaction States
 *
 * @module features/interactions
 */

"use client";

export function InteractionLoadingState() {
  return <span className="text-[11px] text-white/25">Loading interactions...</span>;
}

export function InteractionEmptyState() {
  return <span className="text-[11px] text-white/25">No interactions yet</span>;
}

export function InteractionErrorState({ message }: { message: string }) {
  return <span className="text-[11px] text-red-300/70">{message}</span>;
}

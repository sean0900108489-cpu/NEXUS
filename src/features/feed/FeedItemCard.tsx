/**
 * NEXUS Window OS — Feed Item Card
 *
 * Displays one primitive feed item with profile, resources, interactions,
 * and note capture bridge actions.
 *
 * @module features/feed
 */

"use client";

import { FileText, Link2 } from "lucide-react";
import type { NexusFeedItem } from "./feed-types";
import { InteractionBar } from "@/features/interactions";
import { ProfileBadge } from "@/features/profiles";
import { openResource } from "@/kernel/resource/resource-actions";
import type { NexusResourceRef } from "@/kernel/resource/resource-ref";

export function buildFeedNotePayload(item: NexusFeedItem): {
  title: string;
  content: string;
  linkedResources: NexusResourceRef[];
} {
  const title = item.title?.trim() || item.body.slice(0, 60) || "Feed Item";
  const content = item.title?.trim()
    ? `${item.title.trim()}\n\n${item.body}`
    : item.body;

  return {
    title,
    content,
    linkedResources: dedupeResources([
      ...(item.attachments ?? []),
      ...(item.linkedResources ?? []),
    ]),
  };
}

export function FeedItemCard({ item }: { item: NexusFeedItem }) {
  const notePayload = buildFeedNotePayload(item);
  const resources = notePayload.linkedResources;

  return (
    <article className="group rounded-lg border border-white/7 bg-white/[0.025] p-3">
      <div className="flex items-start justify-between gap-3">
        <ProfileBadge author={item.author} fallbackLabel="You" />
        <time className="shrink-0 text-[10px] text-white/20" dateTime={item.createdAt}>
          {new Date(item.createdAt).toLocaleDateString()}
        </time>
      </div>

      {item.title && (
        <h3 className="mt-3 text-sm font-semibold text-white/85">{item.title}</h3>
      )}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/65">
        {item.body}
      </p>

      {resources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resources.map((ref) => (
            <button
              key={`${ref.type}:${ref.id}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/8 px-2 py-1 text-[11px] text-white/45 transition-colors hover:border-white/15 hover:text-white/75"
              onClick={(event) => {
                event.stopPropagation();
                openResource(ref);
              }}
              title={ref.label ?? ref.id}
            >
              {ref.type === "attachment" ? (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Link2 className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{ref.label ?? `${ref.type}:${ref.id}`}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-white/5 pt-2">
        <InteractionBar
          target={{ type: "feed-item", id: item.id }}
          counts={item.counts}
          noteTitle={notePayload.title}
          noteContent={notePayload.content}
          linkedResources={notePayload.linkedResources}
          shareText={notePayload.content}
        />
      </div>
    </article>
  );
}

function dedupeResources(resources: NexusResourceRef[]): NexusResourceRef[] {
  const seen = new Set<string>();
  const deduped: NexusResourceRef[] = [];

  for (const ref of resources) {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }

  return deduped;
}

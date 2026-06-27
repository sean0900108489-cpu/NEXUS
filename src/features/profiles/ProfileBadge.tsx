"use client";

import { ProfileAvatar } from "./ProfileAvatar";
import type { NexusAuthorRef } from "./profile-types";
import { openResource } from "@/kernel/resource/resource-actions";

export function ProfileBadge({
  author,
  fallbackLabel = "You",
}: {
  author?: NexusAuthorRef;
  fallbackLabel?: string;
}) {
  const displayName = author?.displayName?.trim() || fallbackLabel;
  const handle = author?.handle?.trim();
  const profileId = author?.profileId ?? author?.userId ?? "current-user";

  return (
    <button
      className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-white/45 transition-colors hover:bg-white/5 hover:text-white/70"
      onClick={(event) => {
        event.stopPropagation();
        openResource({
          type: "profile",
          id: profileId,
          label: displayName,
          meta: { authorRef: author ?? { displayName } },
        });
      }}
      title={handle ? `${displayName} (@${handle})` : displayName}
    >
      <ProfileAvatar
        avatarUrl={author?.avatarUrl}
        displayName={displayName}
        size="sm"
      />
      <span className="min-w-0">
        <span className="block truncate text-[11px] leading-4">{displayName}</span>
        {handle && (
          <span className="block truncate text-[10px] leading-3 text-white/25">
            @{handle}
          </span>
        )}
      </span>
    </button>
  );
}

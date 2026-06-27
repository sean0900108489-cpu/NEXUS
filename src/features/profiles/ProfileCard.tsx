"use client";

import { ProfileAvatar } from "./ProfileAvatar";
import type { NexusProfile } from "./profile-types";

export function ProfileCard({ profile }: { profile: NexusProfile }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-start gap-4">
        <ProfileAvatar
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium text-white/80">
            {profile.displayName}
          </h3>
          {profile.handle && (
            <p className="truncate text-xs text-white/35">@{profile.handle}</p>
          )}
          {profile.roleLabel && (
            <p className="mt-2 inline-flex rounded bg-white/5 px-2 py-1 text-[10px] text-white/40">
              {profile.roleLabel}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 min-h-10 whitespace-pre-wrap text-xs leading-5 text-white/50">
        {profile.bio?.trim() || "No bio yet."}
      </p>

      <div className="mt-4 border-t border-white/5 pt-3">
        <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/20">
            Reputation
          </p>
          <p className="mt-1 text-xs text-white/35">
            Future reviews and reputation signals will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

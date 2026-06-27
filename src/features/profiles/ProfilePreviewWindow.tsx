"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { profileApi } from "./profile-api";
import { ProfileCard } from "./ProfileCard";
import { ProfileErrorState, ProfileLoadingState } from "./ProfileStates";
import type { NexusAuthorRef, NexusProfile } from "./profile-types";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

type ProfileLoadState =
  | { status: "loading" }
  | { status: "ready"; profile: NexusProfile }
  | { status: "error"; message: string };

export function ProfilePreviewWindow({
  window,
  setTitle,
}: NexusWindowAppProps) {
  const [loadState, setLoadState] = useState<ProfileLoadState>({
    status: "loading",
  });
  const [retryCount, setRetryCount] = useState(0);
  const request = useMemo(() => readProfileRequest(window), [window]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const profile = await resolveProfile(request);
        if (!active) return;
        setTitle(profile.displayName ? `Profile: ${profile.displayName}` : "Profile");
        setLoadState({ status: "ready", profile });
      } catch (error) {
        if (!active) return;
        setTitle("Profile");
        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load profile",
        });
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [request, retryCount, setTitle]);

  if (loadState.status === "loading") {
    return <ProfileLoadingState />;
  }

  if (loadState.status === "error") {
    return (
      <ProfileErrorState
        message={loadState.message}
        onRetry={() => {
          setLoadState({ status: "loading" });
          setRetryCount((count) => count + 1);
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2">
        <UserRound className="h-4 w-4 text-white/35" />
        <span className="truncate text-xs font-medium text-white/50">
          Profile Primitive
        </span>
        <code className="ml-auto truncate text-[10px] text-white/15">
          {loadState.profile.userId}
        </code>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ProfileCard profile={loadState.profile} />
      </div>
    </div>
  );
}

async function resolveProfile(request: ProfileRequest) {
  if (request.authorRef) {
    return profileApi.resolveAuthorRef(request.authorRef);
  }

  if (request.userId) {
    return profileApi.getProfileByUserId(request.userId);
  }

  return profileApi.getCurrentProfile();
}

type ProfileRequest = {
  authorRef?: NexusAuthorRef;
  userId?: string;
};

function readProfileRequest(window: NexusWindowAppProps["window"]): ProfileRequest {
  const state = window.state ?? {};
  const authorRef = readAuthorRef(state.authorRef);
  const resourceRef = readRecord(state.resourceRef);
  const resourceMeta = readRecord(resourceRef?.meta);
  const resourceAuthor = readAuthorRef(resourceMeta?.authorRef);
  const stateUserId = typeof state.userId === "string" ? state.userId : undefined;
  const resourceUserId =
    resourceRef?.type === "profile" && typeof resourceRef.id === "string"
      ? resourceRef.id
      : undefined;

  return {
    authorRef: authorRef ?? resourceAuthor,
    userId: stateUserId ?? resourceUserId ?? window.resourceId,
  };
}

function readAuthorRef(value: unknown): NexusAuthorRef | undefined {
  const record = readRecord(value);
  if (!record) return undefined;

  return {
    userId: readString(record.userId),
    profileId: readString(record.profileId),
    displayName: readString(record.displayName),
    avatarUrl: readString(record.avatarUrl),
    handle: readString(record.handle),
  };
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

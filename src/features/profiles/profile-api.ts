import type { NexusAuthorRef, NexusProfile } from "./profile-types";

type AuthUserLike = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

const CURRENT_USER_ID = "current-user";
const UNKNOWN_USER_ID = "unknown";

export const profileApi = {
  async getCurrentProfile(): Promise<NexusProfile> {
    if (typeof window === "undefined") {
      return createFallbackProfile({
        userId: CURRENT_USER_ID,
        displayName: "You",
      });
    }

    try {
      const { ensureNexusSupabaseClientConfigured, getNexusSupabaseClient } =
        await import("@/lib/supabase/client");

      await ensureNexusSupabaseClientConfigured();
      const { data } = await getNexusSupabaseClient().auth.getUser();

      return data.user
        ? profileFromAuthUser(data.user)
        : createFallbackProfile({ userId: CURRENT_USER_ID, displayName: "You" });
    } catch {
      return createFallbackProfile({ userId: CURRENT_USER_ID, displayName: "You" });
    }
  },

  async getProfileByUserId(userId: string): Promise<NexusProfile> {
    const normalizedUserId = normalizeProfileResourceId(userId);
    const currentProfile = await this.getCurrentProfile();

    if (currentProfile.userId === normalizedUserId) {
      return currentProfile;
    }

    return createFallbackProfile({
      userId: normalizedUserId,
      displayName: "Unknown user",
    });
  },

  async resolveAuthorRef(authorRef: NexusAuthorRef): Promise<NexusProfile> {
    const userId = authorRef.userId ?? authorRef.profileId ?? UNKNOWN_USER_ID;

    if (!authorRef.userId && !authorRef.profileId && !authorRef.displayName) {
      return createFallbackProfile({
        userId: UNKNOWN_USER_ID,
        displayName: "Unknown user",
      });
    }

    return createFallbackProfile({
      userId,
      profileId: authorRef.profileId,
      displayName: authorRef.displayName ?? "Unknown user",
      handle: authorRef.handle,
      avatarUrl: authorRef.avatarUrl,
    });
  },
};

export function profileFromAuthUser(user: AuthUserLike): NexusProfile {
  const metadata = user.user_metadata ?? {};
  const displayName =
    readMetadataString(metadata, "full_name") ??
    readMetadataString(metadata, "name") ??
    readMetadataString(metadata, "display_name") ??
    user.email ??
    "You";

  return createFallbackProfile({
    userId: user.id ?? CURRENT_USER_ID,
    displayName,
    handle:
      readMetadataString(metadata, "preferred_username") ??
      readMetadataString(metadata, "user_name") ??
      readMetadataString(metadata, "handle"),
    avatarUrl:
      readMetadataString(metadata, "avatar_url") ??
      readMetadataString(metadata, "picture"),
    meta: metadata,
  });
}

function createFallbackProfile(input: {
  userId: string;
  profileId?: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  meta?: Record<string, unknown>;
}): NexusProfile {
  return {
    id: input.profileId ?? `profile:${input.userId}`,
    userId: input.userId,
    displayName: input.displayName,
    handle: input.handle,
    avatarUrl: input.avatarUrl,
    meta: input.meta,
  };
}

function readMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeProfileResourceId(value: string) {
  return value.startsWith("profile:") ? value.slice("profile:".length) : value;
}

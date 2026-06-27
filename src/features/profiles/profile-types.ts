export type NexusProfile = {
  id: string;
  userId: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
  roleLabel?: string;
  createdAt?: string;
  updatedAt?: string;
  meta?: Record<string, unknown>;
};

export type NexusAuthorRef = {
  userId?: string;
  profileId?: string;
  displayName?: string;
  avatarUrl?: string;
  handle?: string;
};

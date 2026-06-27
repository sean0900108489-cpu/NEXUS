"use client";

type ProfileAvatarSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ProfileAvatarSize, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-lg",
};

export function ProfileAvatar({
  avatarUrl,
  displayName,
  size = "md",
}: {
  avatarUrl?: string;
  displayName: string;
  size?: ProfileAvatarSize;
}) {
  const initials = getInitials(displayName);

  return (
    <div
      className={`${SIZE_CLASSES[size]} shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.06] text-white/60 flex items-center justify-center font-medium`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`${displayName} avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function getInitials(displayName: string) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";

  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

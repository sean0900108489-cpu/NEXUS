/**
 * NEXUS Window OS — Artifact Library Grid
 *
 * Grid layout for artifact items.
 *
 * @module features/artifact-library
 */

"use client";

import { useEffect, useState } from "react";
import { ArtifactLibraryItemCard } from "./ArtifactLibraryItemCard";
import { artifactLibraryApi } from "./artifact-library-api";
import type { ArtifactLibraryItem } from "./artifact-library-api";

export function ArtifactLibraryGrid({
  items,
  onItemClick,
}: {
  items: ArtifactLibraryItem[];
  onItemClick: (item: ArtifactLibraryItem) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {items.map((item) => (
          <ThumbnailItem
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Thumbnail Item with lazy signed URL ───────────────────────────

function ThumbnailItem({
  item,
  onClick,
}: {
  item: ArtifactLibraryItem;
  onClick: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);

  const isImage = item.kind === "image" || item.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;

    let mounted = true;
    setThumbLoading(true);

    artifactLibraryApi
      .getSignedUrl(item.id)
      .then((url) => {
        if (mounted) {
          setThumbUrl(url);
          setThumbLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setThumbLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [item.id, isImage]);

  return (
    <ArtifactLibraryItemCard
      item={item}
      thumbUrl={thumbUrl}
      thumbLoading={thumbLoading}
      onClick={onClick}
    />
  );
}

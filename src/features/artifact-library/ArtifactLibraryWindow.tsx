/**
 * NEXUS Window OS — Artifact Library Window App
 *
 * Browse, search, and filter user attachments.
 *
 * Sub-components:
 *   ArtifactLibraryToolbar  — search + filter + refresh
 *   ArtifactLibraryGrid     — thumbnail grid
 *   ArtifactLibraryStates   — loading / empty / error
 *
 * @module features/artifact-library
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { artifactLibraryApi } from "./artifact-library-api";
import type { ArtifactLibraryItem } from "./artifact-library-api";
import { ArtifactLibraryToolbar } from "./ArtifactLibraryToolbar";
import type { ArtifactFilterType } from "./ArtifactLibraryToolbar";
import { ArtifactLibraryGrid } from "./ArtifactLibraryGrid";
import {
  ArtifactLibraryLoadingState,
  ArtifactLibraryEmptyState,
  ArtifactLibraryErrorState,
} from "./ArtifactLibraryStates";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";
import { openResource } from "@/kernel/resource/resource-actions";
import { useNotificationStore } from "@/kernel/notifications/notification-store";

// ── MIME type filter mapping ───────────────────────────────────────

function filterToMimeType(filter: ArtifactFilterType): string | undefined {
  switch (filter) {
    case "images":
      return "image/";
    case "documents":
      return "application/";
    case "other":
      // Return a special marker — we filter client-side for non-image, non-document
      return undefined;
    default:
      return undefined;
  }
}

function clientFilter(items: ArtifactLibraryItem[], filter: ArtifactFilterType): ArtifactLibraryItem[] {
  if (filter === "other") {
    return items.filter(
      (item) =>
        !item.mimeType.startsWith("image/") &&
        !item.mimeType.startsWith("application/"),
    );
  }
  return items; // server-side filtered for "images" and "documents"
}

// ── Component ──────────────────────────────────────────────────────

export function ArtifactLibraryWindow({ setTitle }: NexusWindowAppProps) {
  const [items, setItems] = useState<ArtifactLibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<ArtifactFilterType>("all");

  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    setTitle("Artifacts");
  }, [setTitle]);

  // ── Load ─────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mimeType = filterToMimeType(filterType);
      const result = await artifactLibraryApi.listItems({
        query: query || undefined,
        mimeType,
        limit: 100,
      });

      const filtered = clientFilter(result.items, filterType);
      setItems(filtered);
      setTotal(result.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load artifacts";
      setError(msg);
      addNotification({
        type: "error",
        title: "Artifact library load failed",
        message: msg,
        autoDismissMs: 5000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, filterType, addNotification]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ── Refresh ──────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
  }, [loadItems]);

  // ── Open Item ────────────────────────────────────────────

  const handleItemClick = useCallback(
    (item: ArtifactLibraryItem) => {
      const ref = {
        type: "attachment" as const,
        id: item.id,
        label: item.filename,
        meta: { kind: item.kind, mimeType: item.mimeType },
      };

      const windowId = openResource(ref);

      if (!windowId) {
        addNotification({
          type: "warning",
          title: "Cannot open artifact",
          message: "Preview window could not be opened.",
          autoDismissMs: 4000,
        });
      }
    },
    [addNotification],
  );

  // ── Render ─────────────────────────────────────────────

  if (loading && items.length === 0) {
    return <ArtifactLibraryLoadingState />;
  }

  if (error && items.length === 0) {
    return (
      <ArtifactLibraryErrorState message={error} onRetry={handleRefresh} />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ArtifactLibraryToolbar
        query={query}
        onQueryChange={setQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        total={total}
      />

      {items.length === 0 && !loading ? (
        <ArtifactLibraryEmptyState />
      ) : (
        <ArtifactLibraryGrid items={items} onItemClick={handleItemClick} />
      )}
    </div>
  );
}

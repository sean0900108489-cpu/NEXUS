/**
 * NEXUS Window OS — Artifact Library Toolbar
 *
 * Search, filter, and refresh controls.
 *
 * @module features/artifact-library
 */

"use client";

import { Search, RefreshCw, Loader2 } from "lucide-react";

export type ArtifactFilterType = "all" | "images" | "documents" | "other";

export function ArtifactLibraryToolbar({
  query,
  onQueryChange,
  filterType,
  onFilterChange,
  refreshing,
  onRefresh,
  total,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  filterType: ArtifactFilterType;
  onFilterChange: (type: ArtifactFilterType) => void;
  refreshing: boolean;
  onRefresh: () => void;
  total: number;
}) {
  const filterOptions: { value: ArtifactFilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "images", label: "Images" },
    { value: "documents", label: "Documents" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-white/[0.03] border border-white/5 rounded-md px-2.5 py-1.5">
        <Search className="w-3.5 h-3.5 text-white/20 shrink-0" />
        <input
          className="flex-1 bg-transparent text-xs text-white placeholder:text-white/15 outline-none"
          placeholder="Search artifacts..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 shrink-0">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              filterType === opt.value
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/50"
            }`}
            onClick={() => onFilterChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Refresh + count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-white/20">{total} items</span>
        <button
          className="text-white/30 hover:text-white/60 transition-colors p-0.5"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

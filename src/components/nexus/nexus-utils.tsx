"use client";

// =============================================================================
// nexus-utils.tsx — 純工具函數 + 小型 UI 原子元件
// 從 nexus-ops.tsx 第 1 輪拆出（v26ds2）
// =============================================================================

import type { ReactNode } from "react";
import { RadioTower, RefreshCcw } from "lucide-react";
import type {
  ArtifactVaultRecord,
  StreamMode,
  SystemEventRecord,
} from "@/lib/nexus-types";

import type { QueueStatusProjection } from "@/lib/sync/local-sync-queue-adapter";

// ---------------------------------------------------------------------------
// CSS / 字串工具
// ---------------------------------------------------------------------------

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function getFileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > -1 ? fileName.slice(dot) : "";
}

export const WORKSPACE_ATTACHMENT_TEXT_EXTENSIONS = new Set([
  ".css", ".csv", ".html", ".js", ".json", ".jsx", ".md", ".text",
  ".ts", ".tsx", ".tsv", ".txt", ".xml", ".yaml", ".yml",
]);

export function isTextLikeAttachmentFile(file: File) {
  return (
    WORKSPACE_ATTACHMENT_TEXT_EXTENSIONS.has(getFileExtension(file.name)) ||
    file.type === "text/plain" ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    file.type.startsWith("text/")
  );
}

// ---------------------------------------------------------------------------
// Artifact 判斷
// ---------------------------------------------------------------------------

export function artifactPreview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact || "Empty artifact payload";
  return `${compact.slice(0, 117)}...`;
}

export function isGeneratedArtifactRecord(artifact: ArtifactVaultRecord) {
  return artifact.type !== "mock" && artifact.type !== "generated_media_mock";
}

export function isTransientArtifactRecord(artifact: ArtifactVaultRecord) {
  return artifact.type === "mock" || artifact.type === "generated_media_mock";
}

// ---------------------------------------------------------------------------
// Stream / Trace 樣式
// ---------------------------------------------------------------------------

export function streamModeTone(streamMode: StreamMode) {
  if (streamMode === "live") return "border-neutral-300/40 bg-neutral-300/10 text-neutral-100";
  if (streamMode === "mixed") return "border-neutral-300/40 bg-neutral-300/10 text-neutral-100";
  return "border-white/10 bg-white/[0.045] text-neutral-300";
}

export function traceSeverityClass(severity: SystemEventRecord["severity"]) {
  if (severity === "error" || severity === "critical")
    return "border-red-300/30 bg-red-500/10 text-red-100";
  if (severity === "warn")
    return "border-yellow-300/30 bg-yellow-500/10 text-yellow-100";
  return "border-neutral-300/30 bg-neutral-300/10 text-neutral-100";
}

// ---------------------------------------------------------------------------
// 標籤查詢
// ---------------------------------------------------------------------------

import { getModelOption, getProviderOption } from "@/lib/nexus-registry";
import type { PublicModelCatalogEntry } from "@/lib/models/model-catalog-types";

export function getModelLabel(modelId: string) {
  return getModelOption(modelId)?.label ?? modelId;
}

export function getProviderLabel(providerId: string | undefined) {
  return getProviderOption(providerId)?.label ?? providerId ?? "Unknown";
}

export function getCatalogModelLabel(model: PublicModelCatalogEntry): string;
export function getCatalogModelLabel(
  modelCatalog: PublicModelCatalogEntry[],
  modelId: string,
): string;
export function getCatalogModelLabel(
  modelOrCatalog: PublicModelCatalogEntry | PublicModelCatalogEntry[],
  modelId?: string,
): string {
  if (Array.isArray(modelOrCatalog)) {
    return (
      modelOrCatalog.find((model) => model.id === modelId)?.label ??
      getModelLabel(modelId ?? "")
    );
  }
  return modelOrCatalog.label ?? modelOrCatalog.id;
}

// ---------------------------------------------------------------------------
// 小型 UI 元件
// ---------------------------------------------------------------------------

export function IconButton({
  "aria-expanded": ariaExpanded,
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
  children,
  className,
  disabled,
  onClick,
  style,
  title,
}: {
  "aria-expanded"?: boolean;
  "aria-label": string;
  "aria-pressed"?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={cx(
        "grid place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      style={style}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function ToolbarIconButton({
  active,
  children,
  disabled,
  icon,
  label,
  onClick,
  shortcut,
  title,
  tone,
}: {
  active?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  shortcut?: string;
  title?: string;
  tone?: string;
}) {
  const displayIcon = icon ?? children;

  return (
    <button
      className={cx(
        "inline-flex h-8 items-center gap-2 border px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition",
        tone === "danger"
          ? "border-red-300/30 text-red-200 hover:border-red-300/55 hover:text-red-100"
          : active
            ? "border-neutral-300/50 bg-neutral-300/10 text-neutral-100"
            : "border-white/10 bg-white/[0.035] text-neutral-400 hover:border-neutral-300/40 hover:text-neutral-100",
      )}
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      type="button"
    >
      {displayIcon}
      <span>{label}</span>
      {shortcut ? (
        <span className="ml-1 text-[9px] text-neutral-600">{shortcut}</span>
      ) : null}
    </button>
  );
}

export function GraphNode({
  label,
  accent,
  x,
  y,
}: {
  label: string;
  accent: string;
  x: string;
  y: string;
}) {
  return (
    <div
      className="absolute grid h-14 w-24 place-items-center border bg-black/68 px-2 text-center font-mono text-[10px] uppercase tracking-[0.14em]"
      style={{
        borderColor: `${accent}80`,
        color: accent,
        left: x,
        top: y,
      }}
    >
      {label}
    </div>
  );
}

export function SyncBadge({
  onRetry,
  status,
}: {
  onRetry: () => void;
  status: QueueStatusProjection;
}) {
  const hasIssue = status.failed > 0 || status.conflicted > 0;
  const active = status.pending > 0 || status.syncing > 0;
  const label = hasIssue
    ? `${status.failed + status.conflicted} sync issue`
    : active
      ? `${status.pending + status.syncing} syncing`
      : "Synced";

  return (
    <button
      aria-label={hasIssue ? "Retry failed sync operation" : "Sync status"}
      className={cx(
        "inline-flex h-8 items-center gap-2 border px-2 font-mono text-[9px] uppercase tracking-[0.14em] transition",
        hasIssue
          ? "border-neutral-300/45 bg-neutral-300/12 text-neutral-100 hover:bg-neutral-300/20"
          : active
            ? "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
            : "border-neutral-300/25 bg-neutral-300/[0.06] text-neutral-100",
      )}
      onClick={hasIssue ? onRetry : undefined}
      type="button"
    >
      {hasIssue ? <RefreshCcw className="h-3.5 w-3.5" /> : <RadioTower className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function TopMenuAction({
  active,
  disabled,
  disabledReason,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cx(
        "inline-flex h-8 items-center justify-center gap-2 border px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-45",
        active ? "bg-white/[0.075]" : "bg-white/[0.035]",
      )}
      disabled={disabled}
      onClick={onClick}
      style={{
        borderColor: active
          ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 55%, transparent)"
          : "color-mix(in srgb, var(--theme-primary, #e5e5e5) 22%, transparent)",
        borderRadius:
          "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
      }}
      title={disabled ? disabledReason : label}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

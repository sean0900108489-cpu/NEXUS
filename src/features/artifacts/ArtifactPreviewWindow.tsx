/**
 * NEXUS Window OS — Artifact Preview Window
 *
 * Displays attachment/artifact metadata and preview.
 * Supports:
 * - Image preview with signed URL auto-refresh on load error
 * - File metadata + download link
 * - Loading / error / retry states
 * - Missing resource fallback
 * - Notification center integration for errors
 *
 * Canonical identity is the attachment ID — signed URLs are ephemeral.
 *
 * @module features/artifacts
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  Info,
  RefreshCw,
  StickyNote,
} from "lucide-react";
import { attachmentApi, formatAttachmentSize } from "@/features/attachments/attachment-api";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";
import { useNotificationStore } from "@/kernel/notifications/notification-store";
import { useCurrentNoteStore } from "@/features/notes/current-note-store";
import { createResourceRef } from "@/kernel/resource/resource-ref";

// ── Types ──────────────────────────────────────────────────────────

type AttachmentMeta = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  signedUrl: string | null;
};

// ── Component ──────────────────────────────────────────────────────

export function ArtifactPreviewWindow({ window: win, setTitle }: NexusWindowAppProps) {
  const resourceId = win.resourceId;
  const resourceLabel = (win.state?.resourceRef as { label?: string } | undefined)?.label;
  const [meta, setMeta] = useState<AttachmentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (resourceLabel) {
      setTitle(resourceLabel);
    } else {
      setTitle("Attachment Preview");
    }
  }, [resourceLabel, setTitle]);

  // ── Load Metadata + Signed URL ──────────────────────────

  const loadMeta = useCallback(async () => {
    if (!resourceId) {
      setError("No resource ID provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setImageError(false);

    try {
      const signedUrl = await attachmentApi.getSignedUrl(resourceId);

      if (!signedUrl) {
        // Fallback from resource ref
        const refMeta = win.state?.resourceRef as Record<string, unknown> | undefined;
        setMeta({
          id: resourceId,
          filename: (refMeta?.label as string) ?? resourceId,
          mimeType: (refMeta?.mimeType as string) ?? "unknown",
          size: 0,
          signedUrl: null,
        });
        setError("Signed URL unavailable. The attachment may have been deleted or your session may need refreshing.");
        setLoading(false);
        return;
      }

      setMeta({
        id: resourceId,
        filename: resourceLabel ?? "attachment",
        mimeType: (win.state?.resourceRef as Record<string, unknown> | undefined)?.mimeType as string ?? "unknown",
        size: 0,
        signedUrl,
      });
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load attachment";
      setError(msg);
      setLoading(false);
      addNotification({
        type: "error",
        title: "Preview load failed",
        message: msg,
        autoDismissMs: 5000,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, loadAttempt]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // ── Image load error → refresh signed URL ───────────────

  const handleImageError = useCallback(async () => {
    if (!resourceId || imageError) return;
    setImageError(true);

    addNotification({
      type: "info",
      title: "Refreshing preview...",
      message: "The signed URL has expired. Fetching a new one.",
      autoDismissMs: 3000,
    });

    // Re-fetch signed URL
    const newUrl = await attachmentApi.getSignedUrl(resourceId);
    if (newUrl && meta) {
      setMeta({ ...meta, signedUrl: newUrl });
      setImageError(false);
    } else {
      setError("Unable to refresh preview. The signed URL has expired and could not be renewed.");
    }
  }, [resourceId, imageError, meta, addNotification]);

  // ── Retry ───────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    setLoadAttempt((prev) => prev + 1);
  }, []);

  // ── Render ─────────────────────────────────────────────

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/20">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading attachment...</span>
        </div>
      </div>
    );
  }

  // Error with retry
  if (error && !meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <AlertCircle className="w-8 h-8 text-red-400/60" />
        <p className="text-xs text-center text-red-300/80 max-w-xs">{error}</p>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-300 hover:bg-red-500/20 transition-colors"
          onClick={handleRetry}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  // Error with partial meta (e.g. signed URL missing but metadata present)
  if (error && meta) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <AlertCircle className="w-8 h-8 text-yellow-400/60" />
          <p className="text-xs text-center text-yellow-300/80 max-w-xs">{error}</p>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-xs text-yellow-300 hover:bg-yellow-500/20 transition-colors"
            onClick={handleRetry}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
        {/* Still show metadata */}
        <MetadataBar meta={meta} />
      </div>
    );
  }

  // No meta at all
  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-white/20">
        <FileText className="w-10 h-10" />
        <p className="text-xs">No attachment data available.</p>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-white/30 hover:text-white/50 hover:bg-white/10 transition-colors"
          onClick={handleRetry}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const isImage = meta.mimeType?.startsWith("image/");

  return (
    <div className="flex flex-col h-full">
      {/* Preview Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isImage && meta.signedUrl && !imageError ? (
          <img
            src={meta.signedUrl}
            alt={meta.filename}
            className="max-w-full max-h-full object-contain rounded-lg"
            onError={handleImageError}
          />
        ) : isImage && imageError ? (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <Image className="w-12 h-12" />
            <p className="text-xs text-yellow-300/60">Image preview expired</p>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-xs text-yellow-300 hover:bg-yellow-500/20 transition-colors"
              onClick={handleRetry}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        ) : isImage ? (
          <div className="flex flex-col items-center gap-2 text-white/20">
            <Image className="w-12 h-12" />
            <p className="text-xs">Image preview unavailable</p>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-white/30 hover:text-white/50 hover:bg-white/10 transition-colors"
              onClick={handleRetry}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <FileText className="w-16 h-16" />
            <p className="text-sm text-white/40">{meta.filename}</p>
            <p className="text-xs">{meta.mimeType || "Unknown type"}</p>
          </div>
        )}
      </div>

      {/* Metadata Bar */}
      <MetadataBar meta={meta} />
    </div>
  );
}

// ── Metadata Bar ───────────────────────────────────────────────────

function MetadataBar({ meta }: { meta: AttachmentMeta }) {
  const addResource = useCurrentNoteStore((s) => s.addResourceToCurrentNote);
  const currentNoteId = useCurrentNoteStore((s) => s.currentNoteId);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleAddToNote = () => {
    if (!currentNoteId) {
      addNotification({
        type: "warning",
        title: "No active note",
        message: "Open or create a note first to attach this resource.",
        autoDismissMs: 4000,
      });
      return;
    }

    const ref = createResourceRef("attachment", meta.id, meta.filename, {
      mimeType: meta.mimeType,
    });

    const ok = addResource(ref);

    if (ok) {
      addNotification({
        type: "success",
        title: "Added to note",
        message: meta.filename,
        autoDismissMs: 2500,
      });
    } else {
      addNotification({
        type: "info",
        title: "Already linked",
        message: `${meta.filename} is already in the current note.`,
        autoDismissMs: 3000,
      });
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5 bg-white/[0.02] shrink-0">
      <Info className="w-4 h-4 text-white/20 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60 truncate">{meta.filename}</p>
        <p className="text-[10px] text-white/25">
          {meta.mimeType}{" "}
          {meta.size > 0 ? `· ${formatAttachmentSize(meta.size)}` : ""}
        </p>
      </div>

      <button
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/30 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
        onClick={handleAddToNote}
        title="Add to current note"
      >
        <StickyNote className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add to Note</span>
      </button>

      {meta.signedUrl && (
        <a
          href={meta.signedUrl}
          download={meta.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </a>
      )}

      {meta.signedUrl && (
        <a
          href={meta.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

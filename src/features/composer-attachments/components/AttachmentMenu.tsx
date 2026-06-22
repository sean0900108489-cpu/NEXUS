"use client";

import { FileUp, ImageUp } from "lucide-react";

export type AttachmentMenuAction = "upload-image" | "upload-file";

type AttachmentMenuProps = {
  onAction: (action: AttachmentMenuAction) => void;
  onClose: () => void;
  allowImages?: boolean;
  allowFiles?: boolean;
};

export function AttachmentMenu({ onAction, onClose, allowImages = true, allowFiles = true }: AttachmentMenuProps) {
  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-[119]" onClick={onClose} />

      <div
        className="absolute bottom-12 left-0 z-[120] w-56 overflow-hidden border bg-neutral-950/95 p-1 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        style={{
          borderColor: "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
          borderRadius: "var(--nexus-panel-radius, var(--surface-radius))",
        }}
      >
        {allowImages ? (
          <button
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-neutral-100 transition hover:bg-neutral-300/[0.08]"
            onClick={() => { onAction("upload-image"); onClose(); }}
            type="button"
          >
            <ImageUp className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">Upload image</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-neutral-200/65">PNG, JPEG, WebP</span>
            </span>
          </button>
        ) : null}

        {allowFiles ? (
          <button
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-neutral-100 transition hover:bg-neutral-300/[0.08]"
            onClick={() => { onAction("upload-file"); onClose(); }}
            type="button"
          >
            <FileUp className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">Upload file</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-neutral-200/65">PDF, TXT, MD, CSV</span>
            </span>
          </button>
        ) : null}

        {!allowImages && !allowFiles ? (
          <div className="px-3 py-2 text-[11px] text-neutral-500">No attachment types available for this model.</div>
        ) : null}
      </div>
    </>
  );
}

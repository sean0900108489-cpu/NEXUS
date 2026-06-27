/**
 * NEXUS Window OS — Global Chat Attachment Picker
 *
 * File selection trigger for the Global Chat composer.
 *
 * @module features/global-chat
 */

"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";

export function GlobalChatAttachmentPicker({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.csv,.json,.xml,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelect(file);
            // Reset so same file can be selected again
            e.target.value = "";
          }
        }}
      />
      <button
        type="button"
        className="text-white/30 hover:text-white/60 transition-colors p-1 disabled:opacity-20"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="Attach file"
      >
        <Paperclip className="w-4 h-4" />
      </button>
    </>
  );
}

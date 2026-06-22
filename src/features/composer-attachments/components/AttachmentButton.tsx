"use client";

import { Plus } from "lucide-react";

type AttachmentButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  menuOpen?: boolean;
};

export function AttachmentButton({ onClick, disabled, menuOpen }: AttachmentButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={menuOpen}
      aria-label={menuOpen ? "Close attachment menu" : "Add attachment"}
      className="grid h-9 w-9 place-items-center rounded-full border text-neutral-400 transition hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderColor: "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
      }}
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

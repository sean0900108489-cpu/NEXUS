"use client";

// =============================================================================
// nexus-chrome.tsx — 小型 UI Chrome 元件
// 從 nexus-ops.tsx 第 2 輪拆出（v26ds2）
//   - CommandPalette, MinimizedRail, AgentActionToolbar
//   - SidebarToggleButton, CollapsedSidebarRail
// =============================================================================

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Command,
  Copy,
  Download,
  ExternalLink,
  Fullscreen,
  GitBranch,
  Layers3,
  Lock,
  Maximize2,
  Menu,
  Minimize2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  Unlock,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import { cx, formatTime } from "@/components/nexus/nexus-utils";
import type { NexusAgent } from "@/lib/nexus-types";

// ---------------------------------------------------------------------------
// SidebarToggleButton — 折疊/展開按鈕
// ---------------------------------------------------------------------------

export function SidebarToggleButton({
  collapsed,
  label,
  onClick,
  side,
}: {
  collapsed: boolean;
  label: string;
  onClick: () => void;
  side: string;
}) {
  return (
    <button
      aria-label={label}
      className={cx(
        "grid h-8 w-8 place-items-center border text-neutral-400 transition hover:border-neutral-300/45 hover:text-neutral-100",
        side === "left"
          ? collapsed
            ? "border-white/10"
            : "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
          : "border-white/10",
      )}
      onClick={onClick}
      type="button"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// CollapsedSidebarRail — 折疊時的精簡 sidebar
// ---------------------------------------------------------------------------

export function CollapsedSidebarRail(props: {
  agents?: NexusAgent[];
  label?: string;
  onExpand?: () => void;
  onSelectAgent?: (agentId: string) => void;
  onSetViewMode?: (mode: "panels" | "graph" | "workflow-pro") => void;
  selectedAgentId?: string;
  side?: string;
  viewMode?: "panels" | "graph" | "workflow-pro";
}) {
  const { agents = [], label = "Agents", side = "left" } = props;

  return (
    <div className="flex h-full w-12 flex-col items-center gap-2 border-r border-white/10 py-3">
      {props.onExpand ? (
        <button
          aria-label="Expand left sidebar"
          className="grid h-8 w-8 place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:text-neutral-100"
          onClick={props.onExpand}
          type="button"
        >
          <Menu className="h-4 w-4" />
        </button>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={cx(
              "mb-1 grid h-8 w-8 place-items-center border text-xs font-mono transition",
              props.selectedAgentId === agent.id
                ? "border-neutral-300/45 bg-neutral-300/10 text-neutral-100"
                : "border-white/10 text-neutral-500 hover:text-neutral-100",
            )}
            onClick={() => props.onSelectAgent?.(agent.id)}
            title={agent.callsign}
            type="button"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: agent.accent }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentActionToolbar — AgentWindow 上方工具列
// ---------------------------------------------------------------------------

export function AgentActionToolbar({
  agent,
  busy = false,
  isMediaAgent,
  isSandboxAgent,
  latestResponse,
  sandboxEditorCollapsed,
  sandboxInteractionLocked,
  onClose,
  onCopy,
  onDownload,
  onDuplicate,
  onMinimize,
  onOpenBranchInterface,
  onClear,
  onOpenVaultManager,
  onSaveSandboxArtifact,
  onOpenInNewWindow,
  onStop,
  onToggleMaximize,
  onToggleSandboxEditor,
  onToggleSandboxInteractionLock,
}: {
  agent: NexusAgent;
  busy?: boolean;
  isMediaAgent: boolean;
  isSandboxAgent: boolean;
  latestResponse?: string;
  sandboxEditorCollapsed: boolean;
  sandboxInteractionLocked: boolean;
  onClose: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onDuplicate: () => void;
  onMinimize: () => void;
  onOpenBranchInterface: () => void;
  onClear?: () => void;
  onOpenVaultManager?: () => void;
  onSaveSandboxArtifact?: () => void;
  onOpenInNewWindow?: () => void;
  onStop: () => void;
  onToggleMaximize: () => void;
  onToggleSandboxEditor?: () => void;
  onToggleSandboxInteractionLock?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: agent.accent }}
      />
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-100">
        {agent.callsign}
      </span>
      <span className="text-[10px] text-neutral-500">{agent.model}</span>
      <div className="flex items-center gap-1">
        {isSandboxAgent && onToggleSandboxEditor ? (
          <button
            className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
            onClick={onToggleSandboxEditor}
            title={sandboxEditorCollapsed ? "Expand editor" : "Collapse editor"}
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {isSandboxAgent && onToggleSandboxInteractionLock ? (
          <button
            className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
            onClick={onToggleSandboxInteractionLock}
            title={sandboxInteractionLocked ? "Unlock interactions" : "Lock interactions"}
            type="button"
          >
            {sandboxInteractionLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onOpenInNewWindow}
          title="Open in new window"
          type="button"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onDownload}
          title="Download transcript"
          type="button"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onCopy}
          title="Copy last response"
          type="button"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onOpenBranchInterface}
          title="Branch agent"
          type="button"
        >
          <GitBranch className="h-3.5 w-3.5" />
        </button>
        {onClear ? (
          <button className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100" onClick={onClear} title="Clear transcript" type="button"><Trash2 className="h-3.5 w-3.5" /></button>
        ) : null}
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onDuplicate}
          title="Duplicate agent"
          type="button"
        >
          <Layers3 className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onToggleMaximize}
          title="Maximize agent"
          type="button"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onMinimize}
          title="Minimize agent"
          type="button"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
        {busy ? (
          <button
            className="grid h-7 w-7 place-items-center border border-red-300/30 text-red-200 transition hover:text-red-100"
            onClick={onStop}
            title="Stop agent"
            type="button"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          className="grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:text-neutral-100"
          onClick={onClose}
          title="Close agent"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MinimizedRail — 最小化 agent 列表
// ---------------------------------------------------------------------------

export function MinimizedRail({
  agents,
  onRestore,
}: {
  agents: NexusAgent[];
  onRestore: (agentId: string) => void;
}) {
  if (!agents.length) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-30">
      <div className="pointer-events-auto flex items-center gap-2">
        {agents.map((agent) => (
          <button
            key={agent.id}
            className="flex items-center gap-2 border border-white/10 bg-black/70 px-3 py-2 text-left shadow-xl backdrop-blur transition hover:border-neutral-300/50"
            onClick={() => onRestore(agent.id)}
            type="button"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: agent.accent }}
            />
            <span className="min-w-0">
              <span className="block truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white">
                {agent.callsign}
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {agent.capabilities?.type ?? "chat"} / {agent.model}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommandPalette — ⌘K 指令面板
// ---------------------------------------------------------------------------

type PaletteCommand = {
  id: string;
  label: string;
  detail: string;
  icon: ReactNode;
  run: () => void;
};

export function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  const close = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.detail}`.toLowerCase().includes(normalized),
    );
  }, [commands, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[999] grid place-items-start bg-black/62 px-4 pt-24 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={close}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="nexus-command-palette-shell nexus-panel mx-auto w-full max-w-2xl overflow-hidden"
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            onMouseDown={(event) => event.stopPropagation()}
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Search className="h-5 w-5 text-neutral-200" />
              <input
                ref={inputRef}
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-neutral-600"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search command fabric"
                value={query}
              />
              <button
                aria-label="Close command palette"
                className="grid h-8 w-8 place-items-center border border-white/10 text-neutral-400 transition hover:text-white"
                onClick={close}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="system-scroll max-h-[420px] overflow-y-auto p-2">
              {filtered.map((command) => (
                <button
                  key={command.id}
                  className="flex w-full items-center gap-3 border border-transparent p-3 text-left transition hover:border-neutral-300/40 hover:bg-neutral-300/10"
                  onClick={command.run}
                  type="button"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/[0.045] text-neutral-100">
                    {command.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {command.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {command.detail}
                    </span>
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <div className="p-8 text-center text-sm text-neutral-500">
                  No matching command.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

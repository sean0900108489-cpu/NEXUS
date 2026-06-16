"use client";

// =============================================================================
// nexus-panels.tsx
// =============================================================================

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive, BrainCircuit, Check, ChevronDown, Command, Database, Download, Home,
  FileUp, GitBranch, Lock, Menu, PanelRight, Pencil,
  PackageCheck, Plus, Save, ShieldCheck, SlidersHorizontal,
  Settings, Unlock, Workflow, X,
} from "lucide-react";

import { cx, GraphNode, IconButton, streamModeTone, SyncBadge, TopMenuAction } from "@/components/nexus/nexus-utils";
import { NexusOpsRightFloatingDockFrame } from "@/components/nexus/nexus-ops-right-floating-dock-frame";
import { NexusOpsTopBarFrame } from "@/components/nexus/nexus-ops-top-bar-frame";
import type { NexusAgent, NexusWorkspace, StreamMode, WorkspaceRecoveryListItem, WorkspaceViewMode, AgentProfileUpdate } from "@/lib/nexus-types";
import type { QueueStatusProjection } from "@/lib/sync/local-sync-queue-adapter";

import { hasToolExecutor } from "@/lib/tool-executors";
type WorkspaceSessionRole = string;
type RightDockPanelId = "intel" | "providers" | "models" | "theme" | "memory" | "artifacts" | "generations" | "workflows" | "account";


const rightDockPanels: Array<{
  id: RightDockPanelId;
  label: string;
  detail: string;
  icon: ReactNode;
}> = [
  {
    id: "intel",
    label: "Intel",
    detail: "Selected agent mission, memory, tools, and telemetry",
    icon: <PanelRight className="h-4 w-4" />,
  },
  {
    id: "providers",
    label: "Providers",
    detail: "Provider credentials, base URLs, and live verification",
    icon: <Lock className="h-4 w-4" />,
  },
  {
    id: "models",
    label: "Models",
    detail: "Per-agent model routing and capability recognition",
    icon: <BrainCircuit className="h-4 w-4" />,
  },
  {
    id: "theme",
    label: "Theme",
    detail: "Workspace style controls",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: "memory",
    label: "Memory",
    detail: "Branching defaults and workspace datapads",
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: "artifacts",
    label: "Artifacts",
    detail: "Artifact vault references",
    icon: <Archive className="h-4 w-4" />,
  },
  {
    id: "generations",
    label: "生成紀錄",
    detail: "Generated file asset records",
    icon: <PackageCheck className="h-4 w-4" />,
  },
  {
    id: "workflows",
    label: "Workflows",
    detail: "Macro blueprint vault",
    icon: <Workflow className="h-4 w-4" />,
  },
  {
    id: "account",
    label: "Account",
    detail: "Operator identity and logout",
    icon: <Home className="h-4 w-4" />,
  },
];
export function RightFloatingDock({
  activePanel,
  onTogglePanel,
}: {
  activePanel: RightDockPanelId | null;
  onTogglePanel: (panel: RightDockPanelId) => void;
}) {
  return (
    <NexusOpsRightFloatingDockFrame>
      {rightDockPanels.map((panel) => (
        <button
          key={panel.id}
          aria-label={panel.label}
          aria-pressed={activePanel === panel.id}
          className={cx(
            "grid h-9 w-9 place-items-center border text-neutral-400 transition",
            activePanel === panel.id
              ? "border-neutral-300/55 bg-neutral-300/15 text-neutral-100"
              : "border-white/10 bg-black/25 hover:border-neutral-300/35 hover:text-neutral-100",
          )}
          onClick={() => onTogglePanel(panel.id)}
          title={panel.label}
          type="button"
        >
          {panel.icon}
        </button>
      ))}
    </NexusOpsRightFloatingDockFrame>
  );
}


export function TopBar({
  activeWorkspaceId,
  workspaceName,
  workspaces,
  notice,
  onCreateWorkspace,
  onOpenPalette,
  onSpawn,
  onImport,
  onExport,
  onSave,
  onSaveMacro,
  onRenameWorkspace,
  onRecoverWorkspace,
  onSwitchWorkspace,
  onSyncRetry,
  onToggleSettings,
  settingsOpen,
  streamMode,
  syncStatus,
  viewMode,
  workspaceRecoveryItems,
  workspaceRecoveryLoading,
  workspaceReadOnly,
  workspaceReadOnlyMessage,
  workspaceRole,
  onSetViewMode,
}: {
  activeWorkspaceId: string;
  workspaceName: string;
  workspaces: NexusWorkspace[];
  notice: string;
  onCreateWorkspace: () => void;
  onOpenPalette: () => void;
  onSpawn: () => void;
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
  onSaveMacro: () => void;
  onRenameWorkspace: (name: string) => void;
  onRecoverWorkspace: (workspaceId: string) => void;
  onSwitchWorkspace: (workspaceId: string) => void;
  onSyncRetry: () => void;
  onToggleSettings: () => void;
  settingsOpen: boolean;
  streamMode: StreamMode;
  syncStatus: QueueStatusProjection;
  viewMode: WorkspaceViewMode;
  workspaceRecoveryItems: WorkspaceRecoveryListItem[];
  workspaceRecoveryLoading: boolean;
  workspaceReadOnly: boolean;
  workspaceReadOnlyMessage: string;
  workspaceRole?: WorkspaceSessionRole;
  onSetViewMode: (mode: WorkspaceViewMode) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(workspaceName);
  const [menuOpen, setMenuOpen] = useState(false);

  function cancelRename() {
    setDraftName(workspaceName);
    setRenaming(false);
  }

  function openRename() {
    setDraftName(workspaceName);
    setRenaming(true);
  }

  function commitRename(event?: FormEvent) {
    event?.preventDefault();
    const nextName = draftName.trim();

    if (nextName && nextName !== workspaceName) {
      onRenameWorkspace(nextName);
    }

    setRenaming(false);
  }

  const visibleWorkspaceModes: Array<Exclude<WorkspaceViewMode, "workflow-pro">> = [
    "panels",
    "graph",
  ];

  return (
    <NexusOpsTopBarFrame>
      <div className="relative">
        <button
          aria-expanded={menuOpen}
          aria-label="Workspace menu"
          className="flex h-8 max-w-[min(420px,calc(100vw-24px))] items-center gap-2 border px-2.5 text-left text-neutral-100 transition hover:bg-white/10"
          onClick={() => setMenuOpen((current) => !current)}
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--theme-primary, #e5e5e5) 7%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--theme-primary, #e5e5e5) 28%, transparent)",
            borderRadius:
              "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
          }}
          type="button"
        >
          <Menu className="h-4 w-4 shrink-0" />
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em]">
            {workspaceName}
          </span>
          <ChevronDown
            className={cx("h-3.5 w-3.5 shrink-0 transition", menuOpen && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="nexus-workspace-menu-panel absolute left-0 top-[calc(100%+8px)] z-[90] w-[min(420px,calc(100vw-24px))] border bg-neutral-950/98 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.62)] backdrop-blur-xl"
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              style={{
                background:
                  "var(--nexus-workspace-menu-bg, rgb(10 10 10 / 0.98))",
                borderColor:
                  "var(--nexus-workspace-menu-border, color-mix(in srgb, var(--theme-primary, #e5e5e5) 42%, rgb(255 255 255 / 0.12)))",
                borderRadius:
                  "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
                boxShadow:
                  "var(--nexus-workspace-menu-shadow, 0 24px 90px rgba(0,0,0,0.62), 0 0 42px color-mix(in srgb, var(--theme-primary, #e5e5e5) 16%, transparent))",
              }}
              transition={{ duration: 0.14 }}
            >
              <div className="border-b border-white/10 px-2 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-neutral-400">
                      Workspace
                    </div>
                    <div className="mt-1 truncate font-mono text-sm uppercase tracking-[0.14em] text-white">
                      {workspaceName}
                    </div>
                    <div className="mt-1 truncate text-xs text-neutral-500">{notice}</div>
                  </div>
                  <span
                    className={cx(
                      "shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
                      streamModeTone(streamMode),
                    )}
                  >
                    STREAM: {streamMode}
                  </span>
                  {workspaceRole ? (
                    <span
                      className={cx(
                        "shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
                        workspaceReadOnly
                          ? "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
                          : "border-white/10 bg-white/[0.045] text-neutral-300",
                      )}
                      title={workspaceReadOnly ? workspaceReadOnlyMessage : "Workspace is editable"}
                    >
                      ROLE: {workspaceRole}
                    </span>
                  ) : null}
                </div>

                {renaming ? (
                  <form className="mt-3 flex items-center gap-2" onSubmit={commitRename}>
                    <input
                      aria-label="Workspace name"
                      autoFocus
                      className="min-w-0 flex-1 border border-neutral-300/30 bg-black/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-white outline-none transition focus:border-neutral-200"
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      value={draftName}
                    />
                    <button
                      aria-label="Apply workspace name"
                      className="grid h-8 w-8 place-items-center border border-neutral-300/40 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20"
                      type="submit"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Cancel workspace rename"
                      className="grid h-8 w-8 place-items-center border border-white/10 bg-white/[0.045] text-neutral-400 transition hover:text-white"
                      onClick={cancelRename}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    className="mt-3 inline-flex h-7 items-center gap-2 border bg-white/[0.035] px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-400 transition hover:bg-white/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={workspaceReadOnly}
                    onClick={openRename}
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--theme-primary, #e5e5e5) 22%, transparent)",
                      borderRadius:
                        "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
                    }}
                    title={workspaceReadOnly ? workspaceReadOnlyMessage : "Rename workspace"}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </button>
                )}
              </div>

              <div className="grid gap-2 border-b border-white/10 p-2">
                <div className="grid grid-cols-2 gap-1">
                  {visibleWorkspaceModes.map((mode) => (
                    <button
                      key={mode}
                      className={cx(
                        "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition hover:bg-white/10 hover:text-neutral-100",
                        viewMode === mode
                          ? "text-neutral-100"
                          : "text-neutral-500",
                      )}
                      onClick={() => {
                        onSetViewMode(mode);
                        setMenuOpen(false);
                      }}
                      style={{
                        backgroundColor:
                          viewMode === mode
                            ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 12%, transparent)"
                            : "rgb(255 255 255 / 0.025)",
                        borderColor:
                          viewMode === mode
                            ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 45%, transparent)"
                            : "rgb(255 255 255 / 0.1)",
                        borderRadius:
                          "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
                      }}
                      type="button"
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="system-scroll max-h-44 overflow-y-auto">
                  {workspaces.map((workspace) => {
                    const active = workspace.id === activeWorkspaceId;

                    return (
                      <button
                        key={workspace.id}
                        className={cx(
                          "mb-1 flex w-full items-center gap-3 border px-3 py-2 text-left transition hover:bg-white/10",
                          active ? "text-neutral-100" : "text-neutral-300",
                        )}
                        onClick={() => {
                          setMenuOpen(false);
                          onSwitchWorkspace(workspace.id);
                        }}
                        style={{
                          backgroundColor: active
                            ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 11%, transparent)"
                            : "rgb(255 255 255 / 0.025)",
                          borderColor: active
                            ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 42%, transparent)"
                            : "rgb(255 255 255 / 0.1)",
                          borderRadius:
                            "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
                        }}
                        type="button"
                      >
                        <span
                          className={cx(
                            "grid h-7 w-7 shrink-0 place-items-center border",
                            active ? "text-neutral-100" : "text-neutral-500",
                          )}
                          style={{
                            backgroundColor: active
                              ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 15%, transparent)"
                              : "rgb(0 0 0 / 0.2)",
                            borderColor: active
                              ? "color-mix(in srgb, var(--theme-primary, #e5e5e5) 52%, transparent)"
                              : "rgb(255 255 255 / 0.1)",
                            borderRadius:
                              "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
                          }}
                        >
                          {active ? <Check className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs uppercase tracking-[0.16em]">
                            {workspace.name}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                            {workspace.id}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="flex w-full items-center justify-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100 transition hover:bg-white/10"
                  onClick={() => {
                    setMenuOpen(false);
                    onCreateWorkspace();
                  }}
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--theme-primary, #e5e5e5) 12%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--theme-primary, #e5e5e5) 45%, transparent)",
                    borderRadius:
                      "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Workspace
                </button>
              </div>

              {(workspaceRecoveryItems.length || workspaceRecoveryLoading) ? (
                <div className="grid gap-1 border-b border-white/10 p-2">
                  <div className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                    Cloud Recovery
                  </div>
                  {workspaceRecoveryLoading ? (
                    <div className="border border-white/10 bg-white/[0.025] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                      Refreshing
                    </div>
                  ) : null}
                  {workspaceRecoveryItems.map((item) => (
                    <button
                      key={item.workspaceId}
                      className={cx(
                        "flex w-full items-center gap-3 border px-3 py-2 text-left transition",
                        item.isLocalChecksumMatch
                          ? "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
                          : "border-white/10 bg-white/[0.025] text-neutral-300 hover:border-neutral-300/30 hover:bg-neutral-300/10",
                      )}
                      onClick={() => {
                        setMenuOpen(false);
                        onRecoverWorkspace(item.workspaceId);
                      }}
                      type="button"
                    >
                      <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs uppercase tracking-[0.14em]">
                          {item.workspaceName}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                          {item.isLocalChecksumMatch ? "Current checksum" : item.updatedAt}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-1 p-2">
                <TopMenuAction icon={<Command className="h-3.5 w-3.5" />} label="Palette" onClick={() => {
                  setMenuOpen(false);
                  onOpenPalette();
                }} />
                <TopMenuAction disabled={workspaceReadOnly} disabledReason={workspaceReadOnlyMessage} icon={<Plus className="h-3.5 w-3.5" />} label="Spawn" onClick={() => {
                  setMenuOpen(false);
                  onSpawn();
                }} />
                <TopMenuAction disabled={workspaceReadOnly} disabledReason={workspaceReadOnlyMessage} icon={<Save className="h-3.5 w-3.5" />} label="Save" onClick={() => {
                  setMenuOpen(false);
                  onSave();
                }} />
                {viewMode === "graph" ? (
                  <TopMenuAction disabled={workspaceReadOnly} disabledReason={workspaceReadOnlyMessage} icon={<Archive className="h-3.5 w-3.5" />} label="Pack" onClick={() => {
                    setMenuOpen(false);
                    onSaveMacro();
                  }} />
                ) : null}
                <TopMenuAction disabled={workspaceReadOnly} disabledReason={workspaceReadOnlyMessage} icon={<FileUp className="h-3.5 w-3.5" />} label="Import" onClick={() => {
                  setMenuOpen(false);
                  onImport();
                }} />
                <TopMenuAction icon={<Download className="h-3.5 w-3.5" />} label="Export" onClick={() => {
                  setMenuOpen(false);
                  onExport();
                }} />
                <TopMenuAction
                  active={settingsOpen}
                  icon={<Settings className="h-3.5 w-3.5" />}
                  label="Settings"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleSettings();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <SyncBadge status={syncStatus} onRetry={onSyncRetry} />
      </div>
    </NexusOpsTopBarFrame>
  );
}


export function MacroComposerModal({
  description,
  name,
  onClose,
  onConfirm,
  onDescriptionChange,
  onNameChange,
  open,
}: {
  description: string;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  open: boolean;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[140] grid place-items-center bg-black/68 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.form
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-[min(520px,calc(100vw-32px))] border border-neutral-300/35 bg-neutral-950/96 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.62),0_0_52px_rgba(217,70,239,0.16)]"
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            onSubmit={submit}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-100">
                  <PackageCheck className="h-4 w-4" />
                  Pack Workflow
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Freeze the current graph topology, agent configs, and visual wiring
                  into a reusable cloud blueprint.
                </p>
              </div>
              <IconButton aria-label="Close macro composer" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                Macro Name
              </span>
              <input
                autoFocus
                className="mt-2 w-full border border-neutral-300/25 bg-black/35 px-3 py-2.5 font-mono text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/70"
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="NEXUS Incident Response Mesh"
                type="text"
                value={name}
              />
            </label>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                Description
              </span>
              <textarea
                className="mt-2 min-h-28 w-full resize-none border border-white/10 bg-black/35 px-3 py-2.5 text-sm leading-6 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/70"
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Describe when this blueprint should be spawned."
                value={description}
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="border border-white/10 bg-white/[0.045] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:text-white"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="border border-neutral-300/45 bg-neutral-300/12 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100 transition hover:bg-neutral-300/22 disabled:opacity-40"
                disabled={!name.trim()}
                type="submit"
              >
                Confirm Vault Lock
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export function RightIntel({
  agent,
  agents,
  activeAgent,
  selectedAgentId,
  onSelectAgent,
  onSetAgentProfileLocked,
  onUpdateAgentCallsign,
  onUpdateAgentProfile,
  onUpdateMission,
  onUpdateMemory,
  onRunTool,
}: {
  agent?: NexusAgent;
  agents: NexusAgent[];
  activeAgent?: NexusAgent;
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onSetAgentProfileLocked: (agentId: string, locked: boolean) => void;
  onUpdateAgentCallsign: (agentId: string, callsign: string) => void;
  onUpdateAgentProfile: (agentId: string, profile: AgentProfileUpdate) => void;
  onUpdateMission: (agentId: string, mission: string) => void;
  onUpdateMemory: (agentId: string, memoryId: string, content: string) => void;
  onRunTool: (agentId: string, toolId: string) => Promise<void>;
}) {
  const [profilePanelAgentId, setProfilePanelAgentId] = useState<string | null>(null);

  return (
    <aside className="nexus-panel hidden h-full min-h-0 flex-col overflow-hidden xl:flex">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-300">
            Ops Matrix
          </h2>
          <PanelRight className="h-4 w-4 text-neutral-200" />
        </div>
        <div className="mt-4 border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-neutral-200" />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white">
              Selected Agent
            </span>
          </div>
          <p className="text-sm text-neutral-300">
            {agent ? `${agent.callsign} / ${agent.title}` : "No agent selected"}
          </p>
        </div>
        <div className="mt-3 grid gap-2">
          {agents.map((candidate) => {
            const selected = selectedAgentId === candidate.id;
            const open = profilePanelAgentId === candidate.id;
            const locked = Boolean(candidate.profileLocked);

            return (
              <article
                key={candidate.id}
                className={cx(
                  "border bg-black/24 transition",
                  selected ? "border-neutral-300/35" : "border-white/10",
                )}
              >
                <div className="flex items-start gap-2 px-3 py-2">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectAgent(candidate.id)}
                    type="button"
                  >
                    <span className="block min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white">
                          {candidate.callsign}
                        </span>
                        {locked ? (
                          <Lock className="h-3 w-3 shrink-0 text-neutral-200" />
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-neutral-500">
                        {candidate.model}
                      </span>
                    </span>
                  </button>
                  <button
                    aria-expanded={open}
                    aria-label={`${candidate.callsign} custom settings`}
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center border text-neutral-500 transition hover:border-neutral-300/45 hover:bg-neutral-300/10 hover:text-neutral-100",
                      open &&
                        "border-neutral-300/55 bg-neutral-300/15 text-neutral-100",
                    )}
                    onClick={() => {
                      onSelectAgent(candidate.id);
                      setProfilePanelAgentId((current) =>
                        current === candidate.id ? null : candidate.id,
                      );
                    }}
                    title={`${candidate.callsign} custom settings`}
                    type="button"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open ? (
                  <div className="grid gap-2 border-t border-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                        Custom Agent
                      </span>
                      <button
                        aria-pressed={locked}
                        className={cx(
                          "grid h-7 w-7 place-items-center border transition",
                          locked
                            ? "border-neutral-300/45 bg-neutral-300/10 text-neutral-100"
                            : "border-white/10 bg-white/[0.035] text-neutral-500 hover:border-neutral-300/45 hover:text-neutral-100",
                        )}
                        onClick={() => onSetAgentProfileLocked(candidate.id, !locked)}
                        title={locked ? "Unlock custom agent" : "Lock custom agent"}
                        type="button"
                      >
                        {locked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                        Name
                      </span>
                      <input
                        className="w-full border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[11px] text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateAgentCallsign(candidate.id, event.currentTarget.value)
                        }
                        value={candidate.callsign}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                        Role
                      </span>
                      <input
                        className="w-full border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateAgentProfile(candidate.id, {
                            identity: event.currentTarget.value,
                          })
                        }
                        value={candidate.identity}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                        Task
                      </span>
                      <textarea
                        className="min-h-20 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateMission(candidate.id, event.currentTarget.value)
                        }
                        value={candidate.mission}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                        Execution
                      </span>
                      <textarea
                        className="min-h-24 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateAgentProfile(candidate.id, {
                            executionPrompt: event.currentTarget.value,
                          })
                        }
                        value={candidate.executionPrompt}
                      />
                    </label>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <div className="system-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              Collaboration Graph
            </h3>
            <Workflow className="h-4 w-4 text-neutral-200" />
          </div>
          <div className="relative h-48 border border-white/10 bg-black/28">
            <GraphNode
              accent="#d4d4d4"
              label={activeAgent?.callsign ?? "ACTIVE"}
              x="18%"
              y="22%"
            />
            <GraphNode
              accent="#c4c4c4"
              label={agent?.callsign ?? "SELECT"}
              x="58%"
              y="42%"
            />
            <GraphNode accent="#c8c8c8" label="TOOLS" x="28%" y="70%" />
            <GraphNode accent="#d0d0d0" label="MEMORY" x="70%" y="72%" />
            <div className="absolute left-[28%] top-[31%] h-px w-[34%] rotate-[18deg] bg-neutral-200/30" />
            <div className="absolute left-[38%] top-[67%] h-px w-[32%] -rotate-[24deg] bg-neutral-200/30" />
            <div className="absolute left-[63%] top-[52%] h-px w-[20%] rotate-[56deg] bg-neutral-200/30" />
          </div>
        </section>

        {agent && (
          <>
            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                <GitBranch className="h-4 w-4 text-neutral-200" />
                Context Stack
              </div>
              <div className="grid gap-2">
                {agent.contextNotes.map((item) => (
                  <div key={item.id} className="border border-white/10 bg-white/[0.035] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100">
                      {item.source}
                    </div>
                    <div className="mt-1 text-sm text-neutral-200">{item.title}</div>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                <SlidersHorizontal className="h-4 w-4 text-neutral-200" />
                Tool Ports
              </div>
              <div className="grid gap-2">
                {agent.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="grid gap-2 border border-white/10 bg-white/[0.035] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-neutral-200">
                          {tool.name}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          {tool.scope}
                        </span>
                      </span>
                      <span
                        className={cx(
                          "shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                          tool.status === "available" || tool.status === "done"
                            ? "border-neutral-300/35 text-neutral-100"
                            : tool.status === "running"
                              ? "border-neutral-300/35 text-neutral-100"
                              : "border-neutral-300/35 text-neutral-100",
                        )}
                      >
                        {hasToolExecutor(tool) ? tool.status : "planned"}
                      </span>
                    </div>
                    {hasToolExecutor(tool) && (
                      <button
                        className="border border-neutral-300/30 bg-neutral-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:opacity-40"
                        disabled={tool.status === "running"}
                        onClick={() => {
                          void onRunTool(agent.id, tool.id);
                        }}
                        type="button"
                      >
                        Run executor
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                <Database className="h-4 w-4 text-neutral-200" />
                Memory Edit
              </div>
              <div className="grid gap-2">
                {agent.memory.map((memory) => (
                  <label
                    key={memory.id}
                    className="grid gap-2 border border-white/10 bg-white/[0.035] p-3"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100">
                      {memory.label}
                    </span>
                    <textarea
                      className="min-h-20 resize-none border border-white/10 bg-black/30 p-2 text-xs leading-5 text-neutral-200 outline-none transition focus:border-neutral-300/50"
                      onChange={(event) =>
                        onUpdateMemory(agent.id, memory.id, event.target.value)
                      }
                      value={memory.content}
                    />
                  </label>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}

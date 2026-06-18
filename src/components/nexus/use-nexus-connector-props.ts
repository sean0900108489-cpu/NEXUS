/**
 * NEXUS Connector Props Hooks
 *
 * Pure prop-assembly hooks for existing UI components.
 * These hooks collect state/actions/callbacks and return props objects.
 * They perform ZERO mutations, ZERO side effects.
 *
 * Phase 2B — UI Connector Hooks extraction.
 */

import { useCallback, useMemo } from "react";
import { useNexusStore } from "@/store/nexus-store";
import type {
  IAuthVault,
  NexusAgent,
  NexusWorkspace,
  NotebookRecord,
  StreamMode,
  WorkflowRuntimeLiteState,
  WorkspaceBranchingSettings,
  WorkspaceViewMode,
} from "@/lib/nexus-types";

// Relaxed types — these are pure prop assemblers;
// exact types are enforced by the receiving components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RightDockPanelId = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicModelCatalogEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueueStatusProjection = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArtifactVaultRecord = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkflowProRuntimeEvidenceReport = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkflowProRunHistoryGroupsReport = any;

// ─────────────────────────────────────────────
// useTopBarProps
// ─────────────────────────────────────────────

export interface UseTopBarPropsInputs {
  activeRightPanel: RightDockPanelId | null;
  activeWorkspaceId: string;
  activeWorkspaceReadOnly: boolean;
  activeWorkspaceReadOnlyMessage: string;
  activeWorkspaceRole: string | null | undefined;
  effectiveStreamMode: StreamMode;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  notice: string;
  setNotice: (notice: string) => void;
  setPaletteOpen: (open: boolean) => void;
  setActiveRightPanel: (
    value: React.SetStateAction<RightDockPanelId | null>,
  ) => void;
  syncQueueStatus: QueueStatusProjection;
  viewMode: WorkspaceViewMode;
  workspaceName: string;
  workspaceRecoveryItems: any[];
  workspaceRecoveryLoading: boolean;
  workspaces: NexusWorkspace[];
  // callbacks — relaxed types to accept actual store signatures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockReadOnlyWorkspaceMutation: (label: string) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createWorkspace: () => any;
  handleExport: () => void;
  openMacroComposer: () => void;
  recoverSelectedWorkspace: (workspaceId: string) => void;
  renameWorkspace: (name: string) => void;
  retryFailedSyncOperation: () => void;
  saveWorkspaceSnapshot: () => void;
  setViewMode: (mode: WorkspaceViewMode) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spawnAgent: (templateId?: string, capabilityType?: any) => string;
  switchWorkspace: (workspaceId: string) => void;
  focusAgent: (agentId: string) => void;
}

export function useTopBarProps(inputs: UseTopBarPropsInputs) {
  const {
    activeRightPanel,
    activeWorkspaceId,
    activeWorkspaceReadOnly,
    activeWorkspaceReadOnlyMessage,
    activeWorkspaceRole,
    effectiveStreamMode,
    fileInputRef,
    notice,
    setNotice,
    setPaletteOpen,
    setActiveRightPanel,
    syncQueueStatus,
    viewMode,
    workspaceName,
    workspaceRecoveryItems,
    workspaceRecoveryLoading,
    workspaces,
    blockReadOnlyWorkspaceMutation,
    createWorkspace,
    handleExport,
    openMacroComposer,
    recoverSelectedWorkspace,
    renameWorkspace,
    retryFailedSyncOperation,
    saveWorkspaceSnapshot,
    setViewMode,
    spawnAgent,
    switchWorkspace,
    focusAgent,
  } = inputs;

  const onCreateWorkspace = useCallback(() => {
    const nextWorkspace = createWorkspace();
    setNotice(`Workspace ${nextWorkspace.name} created and synced to cloud.`);
  }, [createWorkspace, setNotice]);

  const onImport = useCallback(() => {
    if (blockReadOnlyWorkspaceMutation("Import workspace")) {
      return;
    }
    fileInputRef.current?.click();
  }, [blockReadOnlyWorkspaceMutation, fileInputRef]);

  const onRenameWorkspace = useCallback(
    (name: string) => {
      if (blockReadOnlyWorkspaceMutation("Rename workspace")) {
        return;
      }
      renameWorkspace(name);
      setNotice("Workspace renamed");
    },
    [blockReadOnlyWorkspaceMutation, renameWorkspace, setNotice],
  );

  const onSwitchWorkspace = useCallback(
    (workspaceId: string) => {
      const target = workspaces.find(
        (candidate) => candidate.id === workspaceId,
      );
      switchWorkspace(workspaceId);
      setNotice(`${target?.name ?? "Workspace"} active`);
    },
    [switchWorkspace, workspaces, setNotice],
  );

  const onToggleSettings = useCallback(
    () => setActiveRightPanel((current: RightDockPanelId | null) => (current ? null : "providers")),
    [setActiveRightPanel],
  );

  const onSave = useCallback(() => {
    if (blockReadOnlyWorkspaceMutation("Save workspace snapshot")) {
      return;
    }
    saveWorkspaceSnapshot();
    setNotice("Workspace snapshot saved");
  }, [blockReadOnlyWorkspaceMutation, saveWorkspaceSnapshot, setNotice]);

  const onSaveMacro = useCallback(() => {
    if (blockReadOnlyWorkspaceMutation("Pack workspace macro")) {
      return;
    }
    openMacroComposer();
  }, [blockReadOnlyWorkspaceMutation, openMacroComposer]);

  const onSpawn = useCallback(() => {
    if (blockReadOnlyWorkspaceMutation("Spawn agent")) {
      return;
    }
    const id = spawnAgent();
    focusAgent(id);
    setNotice("Agent spawned");
  }, [blockReadOnlyWorkspaceMutation, spawnAgent, focusAgent, setNotice]);

  return useMemo(
    () => ({
      activeWorkspaceId,
      notice,
      onCreateWorkspace,
      onExport: handleExport,
      onImport,
      onOpenPalette: () => setPaletteOpen(true),
      onRenameWorkspace,
      onRecoverWorkspace: recoverSelectedWorkspace,
      onSwitchWorkspace,
      onToggleSettings,
      onSave,
      onSaveMacro,
      onSpawn,
      onSyncRetry: retryFailedSyncOperation,
      settingsOpen: Boolean(activeRightPanel),
      streamMode: effectiveStreamMode,
      syncStatus: syncQueueStatus,
      viewMode,
      workspaceRecoveryItems,
      workspaceRecoveryLoading,
      workspaceReadOnly: activeWorkspaceReadOnly,
      workspaceReadOnlyMessage: activeWorkspaceReadOnlyMessage,
      workspaceRole: activeWorkspaceRole ?? undefined,
      onSetViewMode: setViewMode,
      workspaceName,
      workspaces,
    }),
    [
      activeRightPanel,
      activeWorkspaceId,
      notice,
      onCreateWorkspace,
      handleExport,
      onImport,
      setPaletteOpen,
      onRenameWorkspace,
      recoverSelectedWorkspace,
      onSwitchWorkspace,
      onToggleSettings,
      onSave,
      onSaveMacro,
      onSpawn,
      retryFailedSyncOperation,
      effectiveStreamMode,
      syncQueueStatus,
      viewMode,
      workspaceRecoveryItems,
      workspaceRecoveryLoading,
      activeWorkspaceReadOnly,
      activeWorkspaceReadOnlyMessage,
      activeWorkspaceRole,
      setViewMode,
      workspaceName,
      workspaces,
    ],
  );
}

// ─────────────────────────────────────────────
// useRightDockProps
// ─────────────────────────────────────────────

export function useRightDockProps(
  activePanel: RightDockPanelId | null,
  setActivePanel: (
    value: React.SetStateAction<RightDockPanelId | null>,
  ) => void,
) {
  return useMemo(
    () => ({
      activePanel,
      onTogglePanel: (panel: RightDockPanelId) =>
        setActivePanel((current: RightDockPanelId | null) => (current === panel ? null : panel)),
    }),
    [activePanel, setActivePanel],
  );
}

// ─────────────────────────────────────────────
// useAgentSettingsSidebarProps
// ─────────────────────────────────────────────

export interface UseAgentSettingsSidebarPropsInputs {
  activeAgent: NexusAgent | undefined;
  activeRightPanel: RightDockPanelId | null;
  activeWorkspaceId: string;
  agents: NexusAgent[];
  artifactError: string | undefined;
  artifactVault: ArtifactVaultRecord[];
  artifactsLoading: boolean;
  authVault: IAuthVault;
  branchingSettings: WorkspaceBranchingSettings | undefined;
  effectiveStreamMode: StreamMode;
  macroError: string | undefined;
  macros: any[];
  macrosLoading: boolean;
  modelCatalog: PublicModelCatalogEntry[];
  modelCatalogPlan: any;
  notebooksCache: NotebookRecord[];
  openNotebookIds: string[];
  selectedAgent: NexusAgent | undefined;
  workspace: NexusWorkspace | undefined;
  workspaceName: string | undefined;
  workspaceStylePayloadReview: any;
  workflowProRunHistoryGroups: WorkflowProRunHistoryGroupsReport | undefined;
  workflowProRuntimeEvidence:
    | WorkflowProRuntimeEvidenceReport
    | undefined;
  workflowRuntimeLite: WorkflowRuntimeLiteState | undefined;
  // callbacks — relaxed types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockReadOnlyWorkspaceMutation: (label: string) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createNotebook: () => any;
  focusAgent: (agentId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCopyArtifact: (artifact: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDownloadArtifact: (artifact: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSaveWorkspaceThemeStyleControls: (controls: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSpawnMacro: (macro: any) => void;
  logout: () => void;
  refreshArtifacts: () => void;
  refreshMacros: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retryWorkflowRuntimeTraceSync: (runId: string) => Promise<any>;
  runTool: (agentId: string, toolId: string) => Promise<void>;
  selectAgent: (agentId: string) => void;
  setActiveRightPanel: (
    value: React.SetStateAction<RightDockPanelId | null>,
  ) => void;
  setAgentProfileLocked: (agentId: string, locked: boolean) => void;
  setNotice: (notice: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spawnAgent: (templateId?: string, capabilityType?: any) => string;
  toggleNotebookOpen: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAgentCallsign: (agentId: string, callsign: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAgentMission: (agentId: string, mission: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAgentModel: (agentId: string, model: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAgentProfile: (agentId: string, profile: any) => void;
  updateBranchingSettings: (
    settings: Partial<WorkspaceBranchingSettings>,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMemoryBlock: (agentId: string, memoryId: string, content: any) => void;
}

export function useAgentSettingsSidebarProps(
  inputs: UseAgentSettingsSidebarPropsInputs,
) {
  const {
    activeAgent,
    activeRightPanel,
    activeWorkspaceId,
    agents,
    artifactError,
    artifactVault,
    artifactsLoading,
    authVault,
    branchingSettings,
    effectiveStreamMode,
    macroError,
    macros,
    macrosLoading,
    modelCatalog,
    modelCatalogPlan,
    notebooksCache,
    openNotebookIds,
    selectedAgent,
    workspace,
    workspaceName,
    workspaceStylePayloadReview,
    workflowProRunHistoryGroups,
    workflowProRuntimeEvidence,
    workflowRuntimeLite,
    blockReadOnlyWorkspaceMutation,
    createNotebook,
    focusAgent,
    handleCopyArtifact,
    handleDownloadArtifact,
    handleSaveWorkspaceThemeStyleControls,
    handleSpawnMacro,
    logout,
    refreshArtifacts,
    refreshMacros,
    retryWorkflowRuntimeTraceSync,
    runTool,
    selectAgent,
    setActiveRightPanel,
    setAgentProfileLocked,
    setNotice,
    spawnAgent,
    toggleNotebookOpen,
    updateAgentCallsign,
    updateAgentMission,
    updateAgentModel,
    updateAgentProfile,
    updateBranchingSettings,
    updateMemoryBlock,
  } = inputs;

  const onAddAgent = useCallback(
    (type: unknown) => {
      const id = spawnAgent(undefined, type);
      focusAgent(id);
      setNotice(`${String(type).toUpperCase()} agent spawned`);
    },
    [spawnAgent, focusAgent, setNotice],
  );

  const onCreateNotebook = useCallback(() => {
    const id = createNotebook();
    setNotice("Global datapad created");
    return id;
  }, [createNotebook, setNotice]);

  const onRetryWorkflowRuntimeTraceSync = useCallback(
    async (runId: string) => {
      if (blockReadOnlyWorkspaceMutation("Workflow trace resync")) {
        return;
      }

      setNotice(`Workflow trace resync started: ${runId}`);
      const run = (await retryWorkflowRuntimeTraceSync(runId)) as
        | { traceSync?: { status: string; error?: string } }
        | undefined;

      if (!run) {
        setNotice(`Workflow trace resync failed: missing run ${runId}`);
        return;
      }

      setNotice(
        run.traceSync?.status === "synced"
          ? `Workflow trace resynced: ${runId}`
          : `Workflow trace resync ${run.traceSync?.status ?? "unknown"}: ${run.traceSync?.error ?? runId}`,
      );
    },
    [
      blockReadOnlyWorkspaceMutation,
      retryWorkflowRuntimeTraceSync,
      setNotice,
    ],
  );

  return useMemo(
    () => ({
      activeAgent,
      activePanel: activeRightPanel ?? "providers",
      agents,
      agent: selectedAgent,
      authVault,
      modelCatalog,
      modelCatalogPlan,
      artifactError,
      artifacts: artifactVault,
      artifactsLoading,
      workspaceId: workspace?.id ?? activeWorkspaceId,
      workspaceName,
      workflowRunHistoryGroups: workflowProRunHistoryGroups,
      workflowRuntimeLite,
      workflowRuntimeEvidence: workflowProRuntimeEvidence,
      macroError,
      macros,
      macrosLoading,
      notebooks: notebooksCache,
      openNotebookIds,
      branchingSettings,
      onAddAgent,
      onClose: () => setActiveRightPanel(null),
      onCopyArtifact: handleCopyArtifact,
      onCreateNotebook,
      onDownloadArtifact: handleDownloadArtifact,
      onRefreshArtifacts: refreshArtifacts,
      onRefreshMacros: refreshMacros,
      onRetryWorkflowRuntimeTraceSync,
      onSpawnMacro: handleSpawnMacro,
      onToggleNotebook: toggleNotebookOpen,
      onLogout: logout,
      onRunTool: runTool,
      onSelectAgent: selectAgent,
      onUpdateMemory: updateMemoryBlock,
      onUpdateAgentCallsign: updateAgentCallsign,
      onUpdateAgentProfile: updateAgentProfile,
      onSetAgentProfileLocked: setAgentProfileLocked,
      onUpdateMission: updateAgentMission,
      onSaveWorkspaceThemeStyleControls:
        handleSaveWorkspaceThemeStyleControls,
      onUpdateBranchingSettings: updateBranchingSettings,
      onUpdateAgentModel: updateAgentModel,
      open: Boolean(activeRightPanel),
      streamMode: effectiveStreamMode,
      workspaceStylePayloadReview,
    }),
    [
      activeAgent,
      activeRightPanel,
      agents,
      selectedAgent,
      authVault,
      modelCatalog,
      modelCatalogPlan,
      artifactError,
      artifactVault,
      artifactsLoading,
      workspace,
      activeWorkspaceId,
      workspaceName,
      workflowProRunHistoryGroups,
      workflowRuntimeLite,
      workflowProRuntimeEvidence,
      macroError,
      macros,
      macrosLoading,
      notebooksCache,
      openNotebookIds,
      branchingSettings,
      onAddAgent,
      setActiveRightPanel,
      handleCopyArtifact,
      onCreateNotebook,
      handleDownloadArtifact,
      refreshArtifacts,
      refreshMacros,
      onRetryWorkflowRuntimeTraceSync,
      handleSpawnMacro,
      toggleNotebookOpen,
      logout,
      runTool,
      selectAgent,
      updateMemoryBlock,
      updateAgentCallsign,
      updateAgentProfile,
      setAgentProfileLocked,
      updateAgentMission,
      handleSaveWorkspaceThemeStyleControls,
      updateBranchingSettings,
      updateAgentModel,
      effectiveStreamMode,
      workspaceStylePayloadReview,
    ],
  );
}

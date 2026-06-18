# State & Store Map — NEXUS // AI OPS

## Overview

NEXUS uses a **single Zustand store** with persistence and temporal (undo/redo) middleware.

| Metric | Count |
|---|---|
| Store files | 1 |
| Store lines | 4679 |
| Store state fields (top-level) | ~40 |
| Store actions | ~100 |
| Store test lines | 1818 |

---

## Store Technology Stack

| Technology | Purpose |
|---|---|
| **Zustand** (`create`) | State management |
| **zundo** (`temporal` middleware) | Undo/redo history |
| **idb-keyval** | IndexedDB persistence (fallback when no Supabase) |
| **zustand/middleware** `persist` | Local persistence middleware |
| **zustand/middleware** `createJSONStorage` | JSON serialization for IndexedDB |

**Source**: `src/store/nexus-store.ts` lines 1-10

---

## State Fields — Complete Inventory

### Core Identity
| Field | Type | Description |
|---|---|---|
| `activeWorkspaceId` | `string` | Currently active workspace |
| `workspaces` | `NexusWorkspace[]` | All workspaces |
| `selectedAgentId` | `string \| undefined` | Currently selected agent |
| `nextZIndex` | `number` | Next z-index for window stacking |

### View & UI State
| Field | Type | Description |
|---|---|---|
| `streamMode` | `StreamMode` (`"mock" \| "live" \| "mixed"`) | Agent streaming behavior |
| `viewMode` | `WorkspaceViewMode` (`"panels" \| "graph" \| "workflow-pro"`) | Current view mode |
| `isVaultManagerOpen` | `boolean` | Prompt vault overlay visibility |
| `openNotebookIds` | `string[]` | Open notebook/datapad IDs |
| `notebookWindowLayers` | `Record<string, number>` | Notebook window z-ordering |

### Auth & Security
| Field | Type | Description |
|---|---|---|
| `authVault` | `IAuthVault` | Auth credentials (user, API keys, provider credentials) |

### Data Caches
| Field | Type | Description |
|---|---|---|
| `artifactVault` | `ArtifactVaultCache` | Cached artifact records |
| `historicalMessages` | `Record<string, HistoricalMessageCacheEntry>` | Cached historical message pages |
| `promptsCache` | `PromptRecord[]` | Cached prompt records |
| `notebooksCache` | `NotebookRecord[]` | Cached notebook records |
| `deletedNotebooksCache` | `NotebookRecord[]` | Soft-deleted notebook cache |
| `notebookDrafts` | `Record<string, NotebookDraftRecord>` | Unsaved notebook drafts |

### History & Audit
| Field | Type | Description |
|---|---|---|
| `transactionHistory` | `ITransactionLog[]` | Transaction audit log |
| `branchingStatus` | `AgentBranchingStatus` | Agent branching state machine |
| `lastSavedAt` | `string \| undefined` | Last cloud save timestamp |
| `lastImportError` | `string \| undefined` | Last import error message |

---

## Actions — Complete Inventory

### Workspace Lifecycle
| Action | Signature | Description |
|---|---|---|
| `materializeDefaultWorkspace` | `() => void` | Create default workspace on first load |
| `saveWorkspaceSnapshot` | `() => void` | Save active workspace to cloud |
| `createWorkspace` | `() => WorkspaceIdentity` | Create new workspace |
| `switchWorkspace` | `(workspaceId: string) => void` | Switch active workspace |
| `bindActiveWorkspaceToCloudSession` | `({workspaceId, workspaceName?}) => void` | Bind to cloud session |
| `renameWorkspace` | `(name: string) => void` | Rename active workspace |
| `exportActiveWorkspace` | `({notebookRecovery?}) => WorkspaceSnapshot` | Export workspace snapshot |
| `importWorkspace` | `(snapshot: WorkspaceSnapshot) => void` | Import workspace snapshot |
| `applyWorkspaceRecoveryState` | `(recovery) => WorkspaceRecoveryApplyResult` | Apply cloud recovery |

### Agent Lifecycle
| Action | Signature | Description |
|---|---|---|
| `spawnAgent` | `(templateId?, capabilityType?) => string` | Create new agent |
| `branchAgent` | `(sourceAgentId, config) => Promise<string \| null>` | Fork agent with compression |
| `duplicateAgent` | `(agentId: string) => void` | Clone agent |
| `removeAgent` | `(agentId: string) => void` | Delete agent |
| `focusAgent` | `(agentId: string) => void` | Focus agent window |
| `selectAgent` | `(agentId: string) => void` | Select agent for settings |
| `minimizeAgent` | `(agentId: string) => void` | Minimize agent window |
| `restoreAgent` | `(agentId: string) => void` | Restore from minimized |
| `toggleMaximizeAgent` | `(agentId: string, bounds: WorkspaceBounds) => void` | Toggle maximize |
| `minimizeAll` | `() => void` | Minimize all agents |
| `restoreAll` | `() => void` | Restore all agents |
| `arrangeAgents` | `(bounds: WorkspaceBounds) => void` | Auto-arrange windows |
| `updateLayout` | `(agentId: string, layout: Partial<AgentLayout>) => void` | Update position/size |

### Agent Configuration
| Action | Signature | Description |
|---|---|---|
| `updateAgentProfile` | `(agentId, profile: AgentProfileUpdate) => void` | Update agent profile |
| `updateAgentCallsign` | `(agentId, callsign: string) => void` | Update callsign |
| `setAgentProfileLocked` | `(agentId, locked: boolean) => void` | Lock/unlock profile |
| `updateAgentMission` | `(agentId, mission: string) => void` | Update mission |
| `updateAgentModel` | `(agentId, model: string) => void` | Change model |
| `updateAgentModelSettings` | `(agentId, settings: Partial<AgentModelSettings>) => void` | Update model params |
| `updateAgentTemplateProfile` | `(templateId, profile) => void` | Update template |

### Messaging
| Action | Signature | Description |
|---|---|---|
| `addMessage` | `(agentId, message: AgentMessage) => void` | Add message to agent |
| `appendToMessage` | `(agentId, messageId, token: string) => void` | Append streaming token |
| `appendReasoningToMessage` | `(agentId, messageId, token: string) => void` | Append reasoning token |
| `finishMessage` | `(agentId, messageId, fallback?, interrupted?) => void` | Mark message complete |
| `setAgentStatus` | `(agentId, status: AgentStatus) => void` | Update agent status |

### Auth & Credentials
| Action | Signature | Description |
|---|---|---|
| `login` | `(user: IAuthVault["user"]) => void` | Set authenticated user |
| `logout` | `() => void` | Clear auth |
| `setGlobalApiKey` | `(key: string) => void` | Set global API key |
| `setGlobalBaseUrl` | `(baseUrl: string) => void` | Set global base URL |
| `setProviderApiKey` | `(providerId, key: string) => void` | Set provider-specific key |
| `setProviderBaseUrl` | `(providerId, baseUrl: string) => void` | Set provider base URL |
| `setProviderVerificationStatus` | `(providerId, status, error?) => void` | Verify provider |
| `lockProviderCredential` | `(providerId: string) => void` | Lock credential |
| `unlockProviderCredential` | `(providerId: string) => void` | Unlock credential |
| `deleteProviderCredential` | `(providerId: string) => void` | Delete credential |
| `lockVault` | `() => void` | Lock all credentials |
| `unlockVault` | `() => void` | Unlock vault |
| `deleteApiKey` | `() => void` | Delete global API key |

### Theme & Style
| Action | Signature | Description |
|---|---|---|
| `updateThemeConfig` | `(config: WorkspaceThemeConfigUpdate) => void` | Update theme |
| `updateBranchingSettings` | `(settings: WorkspaceBranchingSettingsUpdate) => void` | Update branch config |

### Sandbox
| Action | Signature | Description |
|---|---|---|
| `updateSandboxCode` | `(agentId, sandboxCode: string) => void` | Update sandbox srcDoc |
| `updateSandboxUrl` | `(agentId, sandboxUrl: string) => void` | Update sandbox iframe URL |

### Artifacts
| Action | Signature | Description |
|---|---|---|
| `saveArtifactToCloud` | `(agentId, content, type: string) => void` | Save artifact |
| `fetchArtifactsFromCloud` | `() => Promise<ArtifactVaultRecord[]>` | Fetch artifacts |

### Historical Data
| Action | Signature | Description |
|---|---|---|
| `fetchHistoricalMessages` | `(agentId: string) => Promise<void>` | Fetch message history |

### Prompts
| Action | Signature | Description |
|---|---|---|
| `setPromptsCache` | `(prompts: PromptRecord[]) => void` | Set prompt cache |
| `addPromptToCache` | `(prompt: PromptRecord) => void` | Add prompt |
| `updatePrompt` | `(id, newTitle, newContent) => void` | Edit prompt |
| `deletePrompt` | `(id: string) => void` | Delete prompt |

### Notebooks
| Action | Signature | Description |
|---|---|---|
| `setNotebooksCache` | `(notebooks: NotebookRecord[]) => void` | Set notebook cache |
| `toggleNotebookOpen` | `(id: string) => void` | Toggle notebook open |
| `focusNotebookWindow` | `(id: string) => void` | Bring to front |
| `createNotebook` | `() => string` | Create notebook |
| `saveNotebookDraft` | `(id, title, content) => void` | Save draft |
| `clearNotebookDraft` | `(id: string) => void` | Clear draft |
| `updateNotebook` | `(id, title, content) => void` | Update notebook |
| `deleteNotebook` | `(id: string) => void` | Delete notebook |

### Memory Blocks
| Action | Signature | Description |
|---|---|---|
| `updateMemoryBlock` | `(agentId, memoryId, content: string) => void` | Edit memory block |

### Checkpoints & Transactions
| Action | Signature | Description |
|---|---|---|
| `createCheckpoint` | `(reason: string) => string \| undefined` | Create undo checkpoint |
| `restoreCheckpoint` | `(checkpointId: string) => boolean` | Restore checkpoint |
| `recordTransaction` | `(entry: ITransactionLog) => void` | Record transaction |

### Canvas Macros (Graph View)
| Action | Signature | Description |
|---|---|---|
| `saveCurrentCanvasAsMacro` | `(name: string, description: string) => void` | Save as macro |
| `instantiateMacro` | `(template: WorkflowTemplateRecord) => string[]` | Load from template |
| `spawnMacro` | `(blueprintData: WorkflowTemplateBlueprintData) => string[]` | Create from blueprint |

### Global Toggles
| Action | Signature | Description |
|---|---|---|
| `setStreamMode` | `(mode: StreamMode) => void` | Set stream mode |
| `setViewMode` | `(mode: WorkspaceViewMode) => void` | Set view mode |
| `openVaultManager` | `() => void` | Open prompt vault |
| `closeVaultManager` | `() => void` | Close prompt vault |

---

## Persistence Strategy

The store uses a three-tier persistence strategy:

1. **IndexedDB** (via `idb-keyval`): Local browser persistence for offline-first
2. **Zustand persist middleware**: Automatic serialization to IndexedDB
3. **Supabase Cloud Sync**: `supabaseStateSyncManager` syncs state to Supabase via `state-sync.ts`
4. **Workspace Snapshots**: `createWorkspaceSnapshot` / `materializeWorkspaceFromCloudSnapshot` for durable cloud persistence
5. **Temporal (zundo)**: Undo/redo history in memory

**Source**: `src/store/nexus-store.ts` — `PERSIST_STORAGE_NAME = "nexus-ai-ops-workspace"`, zustand `persist` middleware, `temporal` from zundo

---

## Derived/Computed Values

The store doesn't use zustand computed values explicitly. Computations are done inline in components or via selector patterns. Key derived patterns:

- `getCapabilityType(agent)` — in nexus-ops.tsx, derived from agent.capabilities
- `getModelOptionsForCapability()` — from nexus-registry.ts
- `normalizeAgentModelSettings()` — from nexus-registry.ts
- Workspace theme control normalization — in nexus-ops.tsx (stylePayload)

---

## Store Risk Assessment

- **Monolithic store**: 4679 lines in a single file is past the maintainability threshold
- **Cross-cutting concerns**: Agent, workspace, sync, auth, notebook, prompt, and workflow state all in one file
- **Action density**: ~100 actions makes the store hard to reason about
- **Test coverage**: 1818 lines of tests exist but may not cover all action paths
- **Dependency imports**: 80+ import statements at the top of the file

---

*Evidence: `src/store/nexus-store.ts` type definition (lines ~130-260), action listings (lines throughout)*
*Store configuration: zustand + zundo + idb-keyval + persist middleware*
*Action count: `grep -c "^  [a-z]" src/store/nexus-store.ts` = 458 (includes local functions)*

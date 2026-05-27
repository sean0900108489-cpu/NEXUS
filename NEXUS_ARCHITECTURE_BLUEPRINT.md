# NEXUS // AI OPS - SYSTEM ARCHITECTURE BLUEPRINT
*(Auto-generated via Macro Scan)*

Generated: 2026-05-27  
Updated: 2026-05-27 - post-deployment Supabase/Vercel auth environment correction.  
Scope: read-only macro scan of the current NEXUS // AI OPS architecture before Infinite Canvas / tldraw expansion.  
Primary files scanned:

- `src/lib/nexus-types.ts`
- `src/lib/nexus-registry.ts`
- `src/lib/state-sync.ts`
- `src/store/nexus-store.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/app/api/memory-compress/route.ts`
- `src/lib/supabase/database.types.ts`

Supplemental files scanned for flow completeness:

- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/auth-screen.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/DatapadWindow.tsx`
- `src/lib/adapters/memory-compression-adapter.ts`
- `src/lib/supabase/client.ts`
- `src/lib/nexus-defaults.ts`
- `src/lib/tool-executors.ts`
- `src/app/globals.css`
- `tailwind.config.ts`

---

## 1. System Integrity & Core Principles

### 1.1 Schema-First Expansion

NEXUS is organized around canonical TypeScript schemas and registries. Future agents must scan and extend the existing sockets before inventing new structures.

Authoritative schema layer:

- `src/lib/nexus-types.ts`
- Defines workspaces, agents, graph topology, memory compression, persistence records, tool executors, artifacts, prompts, notebooks, and backend sync contracts.

Authoritative registry layer:

- `src/lib/nexus-registry.ts`
- Defines model catalog, memory compression profiles, capability slots, graph node slots, real executor slots, tool slots, and handoff rule slots.

Registry rule:

- `NEXUS_REGISTRY_RULE` states that new tools, capabilities, graph nodes, provider adapters, or handoff behavior must first check and extend `src/lib/nexus-registry.ts`.
- Do not create parallel model maps, capability enums, graph node enums, tool registries, or compression prompt stores outside the canonical registry unless the registry itself delegates to them.

Frontend/backend sync rule:

- `src/lib/supabase/database.types.ts` contains an explicit `SYNC-EXPANSION` rule.
- If a new database column is introduced, the corresponding optional frontend property must be added to `src/lib/nexus-types.ts` at the same time.

### 1.2 Zero-Interference Design

The current system is built around additive sockets and non-blocking persistence. New architecture must not disturb existing user workflows:

- Agent windows retain their local layout contract through `AgentLayout`.
- React Flow graph state remains a projection of `workspace.graph`.
- Supabase sync is fire-and-forget from the UI store and should not block local interaction.
- Compression fallback is deterministic: when live compression fails or no key exists, the mock compressor returns structured branch memory.
- UI overlays have fixed z-axis priority. New overlays must choose an explicit layer and avoid accidental stacking conflicts.

Recommended expansion posture:

- Add new surface area as new schema fields, registry entries, store actions, and isolated UI components.
- Preserve `NexusWorkspace` as the root active working-set object.
- Preserve `NexusAgent` as the core unit for memory, messages, tools, model, mission, and layout.
- Keep large or durable history out of unbounded local UI state once backend-backed paging is enabled.

### 1.3 Tiered State Architecture

NEXUS separates active interaction state from durable persistence.

Tier 1: Active UI state in Zustand

- Source: `src/store/nexus-store.ts`
- Owns the current workspaces array, active workspace id, selected agent id, z-index counter, stream/view modes, vault state, caches, open datapads, transaction history, branch status, import errors, and local UI actions.
- This is the immediate interaction cache for dragging windows, sending messages, selecting agents, updating graph nodes, opening panels, and editing workbench state.

Tier 2: Local persistence through IndexedDB

- Source: Zustand `persist` middleware backed by `idb-keyval`.
- Store name: `nexus-ai-ops`
- Object store: `workspace-state`
- Persist key: `nexus-ai-ops-workspace`
- Legacy fallback keys: `nexus-workspace-storage`, `nexus-ai-ops-workspace`
- Fallback: `localStorage` if IndexedDB is unavailable.

Tier 3: Cloud persistence through Supabase

- Source: `src/lib/state-sync.ts`
- Sync manager: `supabaseStateSyncManager`
- Used for workspaces, messages, macros, artifacts, prompts, prompt revisions, notebooks, and transaction logs.
- Most store calls use `void ... .catch(() => undefined)`, so Supabase failures should not block the active workbench.

Tier 4: Historical data boundary

- `IAsyncDataFetcher` and `IStateSyncManager` explicitly mark historical messages and artifacts as backend/paged data.
- Current Zustand still stores active agent messages, but the documented boundary says unbounded transcripts and media URLs should move through fetcher/sync ports once L4 sync is fully enabled.

### 1.4 Z-Axis Management Rules

Current stacking priority observed in `nexus-ops.tsx`, `AgentBranchModal.tsx`, and `DatapadWindow.tsx`:

| Layer | Current Element | z-index |
| --- | --- | --- |
| Emergency modal | Agent Branch Modal | `z-[9999]` |
| Command Palette | Global command palette | `z-[999]` |
| Macro modal | Macro Composer Modal | `z-[140]` |
| Settings sidebar | Account / Vault Settings sidebar | `z-[120]` |
| Datapad floating windows | Global Datapads | `z-[95]` |
| Intel sidebar | Right Intel rail container | `z-[80]` |
| Sidebar toggle buttons | Collapse/expand rail buttons | `z-[70]` |
| Minimized rail | Minimized agent buttons | `z-[50]` |
| Agent toolbar | Per-agent action toolbar | `z-40` |
| Agent toolbar popovers | Prompt Vault / Predictive Intel inside agent window | `z-30` |
| Agent windows | `react-rnd` windows | dynamic `agent.layout.zIndex` |
| Workspace base | Main workspace canvas | `z-0 isolate` |

Expansion rules:

- tldraw / Infinite Canvas should live inside or beside the workspace base layer unless it is a modal surface.
- Do not place permanent canvas UI above `z-[80]` unless it must cover the Intel rail.
- Do not place normal workbench content above `z-[120]`; that is the settings sidebar tier.
- Emergency or confirmation modals may use `z-[999]` or higher, but should remain rare.
- Floating tool windows should either use dynamic per-window z-index like agents or a stable lane below settings and above base canvas.

---

## 2. Core Schemas & Registries (The Sockets)

### 2.1 Core Capability Types

`AgentCapabilityType` currently supports:

- `chat`
- `image`
- `video`
- `sandbox`
- `audio`
- `search`
- `data-analysis`

Creation UI currently exposes:

- `chat`
- `image`
- `video`
- `sandbox`

Media capabilities:

- `image`
- `video`

Workspace view modes:

- `panels`
- `graph`

Stream modes:

- `mock`
- `live`
- `mixed`

### 2.2 Agent Schema

`NexusAgent` is the core operational unit.

Shape:

- `id`: stable agent id.
- `callsign`: compact visible identity.
- `title`: user-facing role title.
- `identity`: persona / operator identity.
- `mission`: operational instruction.
- `provider`: provider namespace, e.g. OpenAI-compatible, local sandbox, media provider.
- `model`: active model id. Model ids must come from or be compatible with `NEXUS_MODEL_CATALOG`.
- `capabilities`: `{ type, supportedModels }`.
- `sandboxCode?`: local `srcDoc` code for sandbox agents.
- `sandboxUrl?`: external embeddable URL for sandbox agents.
- `status`: `idle`, `thinking`, `streaming`, or `error`.
- `accent`: per-agent UI color.
- `avatar`: short avatar text.
- `memory`: array of `AgentMemoryBlock`.
- `contextNotes`: array of `AgentContextNote`.
- `messages`: array of active `AgentMessage`.
- `tools`: array of `AgentTool`.
- `layout`: `AgentLayout` for floating window geometry.
- `previousLayout?`: stored layout for maximize/restore.
- `minimized`: whether panel is minimized.
- `maximized`: whether panel occupies workspace bounds.
- `createdAt`, `updatedAt`: ISO timestamps.
- `telemetry`: tokens, latency, confidence, tasks, tool runs, errors.
- `branchMetadata?`: provenance for forked agents.

Important sub-schemas:

- `AgentMessage`: `{ id, role, content, createdAt, streaming?, interrupted?, media? }`
- `AgentMediaArtifact`: `{ type, url, prompt, createdAt }`
- `AgentMemoryBlock`: `{ id, label, content, intensity, updatedAt }`
- `AgentContextNote`: `{ id, title, value, source }`
- `AgentTool`: `{ id, name, scope, status, executorId?, lastRunAt?, result?, error? }`
- `AgentLayout`: `{ x, y, width, height, zIndex }`
- `AgentTelemetry`: `{ tokens, latency, confidence, tasks, toolRuns, errors }`

Branch metadata:

- `IAgentBranchMetadata.sourceAgentId`
- `IAgentBranchMetadata.sourceAgentCallsign`
- `IAgentBranchMetadata.mode`
- `IAgentBranchMetadata.createdAt`
- `IAgentBranchMetadata.compressionConfig?`
- `IAgentBranchMetadata.retainedRatio?`
- `IAgentBranchMetadata.compressionSummary?`

### 2.3 Workspace Schema

`NexusWorkspace` is the active workspace root.

Shape:

- `id`: workspace id.
- `name`: display name.
- `agents`: `NexusAgent[]`.
- `panels`: `WorkspacePanel[]`, derived from agents by `syncPanels`.
- `graph`: `WorkspaceGraph`.
- `activeAgentId?`: current active/focused agent.
- `selectedAgentId?`: selected agent for sidebars/graph.
- `themeConfig?`: LEGO Theme Engine workspace variables.
- `checkpoints?`: bounded manual snapshots.
- `settings`: `WorkspaceSettings`.
- `createdAt`, `updatedAt`: ISO timestamps.

Workspace settings:

- `provider`
- `model`
- `streamMode`
- `viewMode`
- `autosave`
- `branchingSettings`

Branching settings:

- `defaultRetentionRatio`
- `futureDefaultWeights?`

Graph schema:

- `WorkspaceGraph.nodes`: agent graph nodes with `agentId`, `x`, `y`, optional `nodeType`.
- `WorkspaceGraph.edges`: edges with source/target agent ids, optional branch metadata, label, style, animation.

Workflow node sockets:

- `agent-node`
- `tool-node`
- `memory-node`
- `condition-node`

Only `agent-node` is implemented in the current React Flow UI.

### 2.4 Memory Compression Schema

Compression config:

- `mode`: `full` or `summary`.
- `retentionRatio`: clamped between 5 and 100.
- `compressorModelId`: chat model used for compression.
- `customFocusPrompt?`: optional Layer 2 user weighting prompt.
- `advancedWeights?`: optional weights for context architecture, semantic meaning, task continuity, UI/UX intent.
- `compressorProfileId?`: key into `MEMORY_COMPRESSION_PROFILE_REGISTRY`.

Compressed result:

- `retainedRatio`
- `compressionSummary`
- `contextNotes`
- `architectureNotes?`
- `keyDecisions?`
- `unresolvedBugs?`

### 2.5 Model Catalog

Canonical registry: `NEXUS_MODEL_CATALOG`

Active chat model ids:

- `gpt-5.5-2026-04-23`: custom OpenAI-compatible, advanced.
- `gpt-5.5-pro-2026-04-23`: custom OpenAI-compatible, pro.
- `gpt-5.5`: custom OpenAI-compatible, custom tier.
- `gpt-5`: custom OpenAI-compatible, advanced.
- `gpt-4.1`: OpenAI-compatible, standard.
- `gpt-4o`: OpenAI-compatible, standard.
- `gpt-4o-mini`: OpenAI-compatible, standard.
- `o4-mini`: OpenAI-compatible, standard.

Active image model ids:

- `dall-e-3`
- `gpt-image-1`
- `imagen-4`

Active video model ids:

- `sora`
- `runway-gen-3`
- `veo-3`

Active sandbox model id:

- `html-css-js`

Helpers:

- `getModelOption(modelId)`
- `getModelOptionsForCapability(capability)`

Rules:

- Model `id` is the exact provider payload value.
- `label` is display-only.
- Do not create parallel model maps elsewhere.

### 2.6 Memory Compression Profile Registry

Registry: `MEMORY_COMPRESSION_PROFILE_REGISTRY`

Active slot:

- `default-context-compressor`
  - Label: `Default Context Compressor`
  - Default retention ratio: `30`
  - Purpose: preserve architecture decisions, interface contracts, registry rules, design intent, security constraints, unresolved bugs, verification results, and next actions while removing filler.

Expansion rule:

- Add future compression behavior by adding profiles here and pointing `compressorProfileId` to them.
- Do not create one-off compression prompts inside UI components or store actions.

### 2.7 Capability Registry

Registry: `CAPABILITY_REGISTRY`

Active slots:

- `chat`
  - State: `implemented`
  - Owner layer: `L1`
  - Provider slot: `openai-compatible-chat`
  - Tool slot: `mock-review-mesh`

- `image`
  - State: `mock`
  - Owner layer: `L1`
  - Provider slots: `openai-image-generation`, `dall-e-api`
  - Tool slots: `mock-image-gen`, `real-image-gen`

- `video`
  - State: `mock`
  - Owner layer: `L1`
  - Provider slots: `sora-api`, `runway-api`
  - Tool slots: `mock-video-gen`, `real-video-gen`

- `sandbox`
  - State: `implemented`
  - Owner layer: `L3`
  - Provider slot: `local-srcdoc-preview`
  - Tool slot: `preview-runtime`

- `audio`
  - State: `not-implemented`
  - Owner layer: `L4`
  - Reserved for speech, transcription, and audio generation.

- `search`
  - State: `implemented`
  - Owner layer: `L4`
  - Provider slots: `search-api`, `local-index`
  - Tool slots: `web-surfer`, `real-web-search`, `real-file-scanner`

- `data-analysis`
  - State: `not-implemented`
  - Owner layer: `L4`
  - Reserved for tabular analysis, charting, notebook-style agents.

### 2.8 Graph Node Registry

Registry: `GRAPH_NODE_REGISTRY`

Active slots:

- `agent-node`: implemented.
- `tool-node`: not implemented, reserved for standalone tools and executors.
- `memory-node`: not implemented, reserved for memory blocks, vector stores, context packs.
- `condition-node`: not implemented, reserved for routing conditions.

Current visual graph implementation:

- File: `src/components/nexus/nexus-graph.tsx`
- Engine: `@xyflow/react`
- Node type in React Flow: `agent`
- Edge type in React Flow: `blueprint`
- Persisted graph still uses `WorkspaceGraph` from `nexus-types.ts`.

### 2.9 Tool Executor Registry

Registry: `TOOL_EXECUTOR_REGISTRY`

Executor type sockets:

- `local-fs`: contains `new LocalFsScannerExecutor()`.
- `rest-api`: contains `new WebSurferExecutor()`.
- `db-query`: empty array, intentional future socket.

Registered tool slots in `TOOL_SLOT_REGISTRY`:

- `real-image-gen`
  - State: `implemented`
  - Capability: `image`
  - Executor type: `rest-api`
  - Description: DALL-E image adapter slot with mock fallback when no agent key is set.

- `mock-image-gen`
  - State: `mock`
  - Capability: `image`
  - Executor type: `rest-api`

- `real-video-gen`
  - State: `not-implemented`
  - Capability: `video`
  - Executor type: `rest-api`

- `real-file-scanner`
  - State: `implemented`
  - Capability: `search`
  - Executor type: `local-fs`
  - Permissions: `LOCAL_FS_SCANNER_PERMISSIONS`

- `web-surfer`
  - State: `implemented`
  - Capability: `search`
  - Executor type: `rest-api`
  - Uses lightweight webpage reading through r.jina.ai markdown conversion.

- `real-db-query`
  - State: `not-implemented`
  - Capability: `data-analysis`
  - Executor type: `db-query`

Runtime executor map:

- File: `src/lib/tool-executors.ts`
- Active executor ids:
  - `mock.review-mesh`
  - `mock-image-gen`
  - `real-image-gen`
  - `real-file-scanner`
  - `web-surfer`
  - `mock-video-gen`

Important mismatch to preserve consciously:

- `TOOL_SLOT_REGISTRY` has `real-video-gen`, but runtime currently uses `mock-video-gen`.
- `CAPABILITY_REGISTRY.chat.toolSlots` mentions `mock-review-mesh`, but runtime executor id is `mock.review-mesh`.
- Future cleanup should be deliberate, not incidental.

### 2.10 Handoff Registry

Registry: `HANDOFF_RULE_REGISTRY`

Current state:

- Empty array.
- Explicitly reserved for L2 autonomous handoff routing.

Current handoff behavior:

- Implemented in `workflow-engine` and consumed by `NexusOps`.
- Evaluates graph edges and agent state.
- Blocks cycles, skips busy targets, skips unsupported targets, and queues dispatches.

---

## 3. State Management & Persistence (Zustand + Zundo + Supabase)

### 3.1 Zustand Store Shape

Store: `useNexusStore` in `src/store/nexus-store.ts`

Top-level state:

- `activeWorkspaceId`
- `workspaces`
- `selectedAgentId`
- `nextZIndex`
- `streamMode`
- `viewMode`
- `isVaultManagerOpen`
- `authVault`
- `artifactVault`
- `promptsCache`
- `notebooksCache`
- `openNotebookIds`
- `transactionHistory`
- `branchingStatus`
- `lastSavedAt`
- `lastImportError`

Core workspace actions:

- `materializeDefaultWorkspace`
- `saveWorkspaceSnapshot`
- `createWorkspace`
- `switchWorkspace`
- `renameWorkspace`
- `exportActiveWorkspace`
- `importWorkspace`
- `resetWorkspace`

Agent actions:

- `spawnAgent`
- `branchAgent`
- `duplicateAgent`
- `removeAgent`
- `focusAgent`
- `selectAgent`
- `updateLayout`
- `updateAgentMission`
- `updateAgentModel`
- `updateMemoryBlock`
- `minimizeAgent`
- `restoreAgent`
- `toggleMaximizeAgent`
- `minimizeAll`
- `restoreAll`
- `arrangeAgents`
- `clearAgentMessages`

Messaging and execution actions:

- `addMessage`
- `appendToMessage`
- `finishMessage`
- `setAgentStatus`
- `updateAgentTelemetry`
- `runTool`

Graph actions:

- `updateGraphNodePosition`
- `connectGraphAgents`
- `removeGraphEdges`

Persistence and cloud-cache actions:

- `saveCurrentCanvasAsMacro`
- `instantiateMacro`
- `spawnMacro`
- `saveArtifactToCloud`
- `fetchArtifactsFromCloud`
- `setPromptsCache`
- `addPromptToCache`
- `updatePrompt`
- `deletePrompt`
- `setNotebooksCache`
- `toggleNotebookOpen`
- `createNotebook`
- `updateNotebook`
- `deleteNotebook`

Vault and theme actions:

- `login`
- `logout`
- `setGlobalApiKey`
- `setGlobalBaseUrl`
- `lockVault`
- `unlockVault`
- `deleteApiKey`
- `openVaultManager`
- `closeVaultManager`
- `updateThemeConfig`
- `updateBranchingSettings`
- `setStreamMode`
- `setViewMode`

### 3.2 Local Persistence via IndexedDB

Middleware stack:

- `persist(temporal(store))`
- Persist storage: `createJSONStorage(() => indexedDbStateStorage)`
- Temporal history: `zundo`

IndexedDB adapter:

- Uses `idb-keyval`.
- Database/store: `createStore("nexus-ai-ops", "workspace-state")`
- Uses async `getItem`, `setItem`, `removeItem`.

Fallback behavior:

- If IndexedDB does not exist, use `localStorage`.
- On first read, if IndexedDB is empty but legacy localStorage has data, migrate it to IndexedDB and clear legacy keys.
- `initialStorageReadFinished` prevents early writes before hydration has completed.

Persisted fields:

- `activeWorkspaceId`
- `authVault`
- `notebooksCache`
- `openNotebookIds`
- `workspaces` after `prepareWorkspacesForLocalPersistence`
- `selectedAgentId`
- `nextZIndex`
- `streamMode`
- `viewMode`
- `transactionHistory` capped to 100
- `lastSavedAt`
- `lastImportError`

Not persisted:

- `artifactVault`
- `promptsCache`
- `branchingStatus`
- `isVaultManagerOpen`
- transient modal state from `NexusOps`
- streaming abort controllers and workflow dispatch refs

Persistence version:

- Current version: `10`

Migration behavior:

- Invalid persisted state resets to default workspace.
- Existing workspaces are sanitized through `normalizeWorkspaces` and `sanitizeWorkspace`.
- Auth vault is normalized through `normalizeAuthVault`.
- `nextZIndex` is recalculated as max current agent z-index plus one.
- `promptsCache` is intentionally reset to empty on migration/hydration and refreshed from Supabase.
- `notebooksCache` may persist locally and is sorted.
- `branchingStatus` resets to `idle`.

### 3.3 Zundo Temporal History

Temporal state tracked:

- `activeWorkspaceId`
- `nextZIndex`
- `selectedAgentId`
- `viewMode`
- `workspaces`

Temporal limit:

- `50`

Equality:

- Custom `temporalStatesAreEqual`.
- Compares a JSON signature from `temporalWorkspaceSignature`.

Tracked inside workspace signature:

- `activeAgentId`
- Agent identity and structural fields:
  - `callsign`
  - `capabilities`
  - `id`
  - `identity`
  - `layout`
  - `maximized`
  - `minimized`
  - `mission`
  - `model`
  - `previousLayout`
  - `provider`
  - `title`
- `graph`
- `id`
- `name`
- `panels`
- `selectedAgentId`
- selected `settings`
  - `autosave`
  - `branchingSettings`
  - `model`
  - `provider`
  - `viewMode`
- `themeConfig`

Explicitly ignored by temporal history:

- Agent `messages`
- Agent `memory`
- Agent `contextNotes`
- Agent `tools`
- Agent `telemetry`
- `artifactVault`
- `promptsCache`
- `notebooksCache`
- `openNotebookIds`
- `authVault`
- `transactionHistory`
- `branchingStatus`
- `streamMode`
- `lastSavedAt`
- `lastImportError`
- UI modal booleans in `NexusOps`

Keyboard binding:

- `Cmd/Ctrl+Z` triggers undo.
- `Cmd/Ctrl+Shift+Z` triggers redo.
- Native undo is preserved for inputs, textareas, and contenteditable targets.

### 3.4 Supabase Sync Manager

Interface: `IStateSyncManager`

Implemented classes:

- `MockStateSyncManager`
- `SupabaseStateSyncManager`

Exported instances:

- `mockAsyncDataFetcher`
- `mockStateSyncManager`
- `supabaseStateSyncManager`

Supabase tables mapped in `database.types.ts`:

- `workspaces`
- `agent_profiles`
- `workspace_agents`
- `messages`
- `artifacts`
- `prompts`
- `prompt_revisions`
- `notebooks`
- `workflow_templates`

Enums:

- `agent_profile_type`
- `message_type`
- `artifact_type`

### 3.5 Exact Fire-and-Forget Sync Ports

Workspace sync:

- Store helper: `queueWorkspaceCloudSync(workspace)`
- Supabase method: `upsertWorkspace(workspace.id, workspace.name)`
- Table: `workspaces`
- Payload: `{ id, name }`
- Triggered by:
  - `materializeDefaultWorkspace`
  - `saveWorkspaceSnapshot`
  - `createWorkspace`
  - `renameWorkspace`
  - `importWorkspace`
  - `resetWorkspace`
  - debounced theme config sync via `queueThemeConfigCloudSync`

Important limitation:

- `syncActiveUiState(snapshot)` currently delegates only to `upsertWorkspace(snapshot.id, snapshot.name)`.
- It does not persist full graph/layout/settings snapshots to Supabase yet.

Message sync:

- Store helper: `queueMessageCloudSync({ workspaceId, agentId, message })`
- Supabase method: `insertMessage`
- Table: `messages`
- Payload:
  - `workspace_id`
  - `agent_id`
  - `content`
  - `type`
- Skips if:
  - no workspace id
  - message is streaming
  - message content is empty
- Triggered by:
  - `addMessage`
  - `finishMessage` when finalizing a streamed assistant message
  - `runTool` when tool output message is added

Macro sync:

- Store action: `saveCurrentCanvasAsMacro`
- Supabase method: `saveMacro`
- Table: `workflow_templates`
- Payload:
  - `name`
  - `description`
  - `blueprint_data`
- Blueprint data is created by `createWorkflowTemplateBlueprint(workspace)`.
- Macros are fetched through `fetchMacros`.

Artifact sync:

- Store action: `saveArtifactToCloud`
- Local cache: prepends to `artifactVault`, capped to 80.
- Supabase method: `saveArtifact`
- Table: `artifacts`
- Payload:
  - `workspace_id`
  - `source_message_id`
  - `content_url`
  - `type`
- Fetch method: `fetchArtifactsFromCloud` calls `fetchArtifacts`.

Prompt sync:

- Store actions:
  - `updatePrompt`
  - `deletePrompt`
  - `setPromptsCache`
  - `addPromptToCache`
- Supabase methods:
  - `fetchPrompts(workspaceId)`
  - `upsertPrompt(prompt)`
  - `deletePrompt(id)`
  - `fetchPromptRevisions(promptId)`
- Tables:
  - `prompts`
  - `prompt_revisions`
- Revision behavior:
  - `SupabaseStateSyncManager.upsertPrompt` checks existing prompt content.
  - If content changed, inserts a row into `prompt_revisions`.
  - Frontend `PromptRecord.revisions` can hold local metadata including title changes, but backend `Prompt_Revisions` stores previous/new content only.

Datapad / Notebook sync:

- Store actions:
  - `createNotebook`
  - `updateNotebook`
  - `deleteNotebook`
  - `setNotebooksCache`
  - `toggleNotebookOpen`
- Supabase methods:
  - `fetchNotebooks`
  - `upsertNotebook`
  - `deleteNotebook`
- Table: `notebooks`
- Local cache:
  - `notebooksCache`
  - `openNotebookIds`
- Notebook updates are fire-and-forget and sorted by updated time.

Historical sync stubs:

- `syncHistoricalMessage(record)` currently returns `synced()` without persisting.
- `syncHistoricalArtifact(record)` currently returns `synced()` without persisting.
- `flush()` currently returns `synced()`.

Transaction logging:

- `supabaseStateSyncManager.setTransactionLogger` pushes transaction logs into store `transactionHistory`.
- Logs are capped to 100 entries.

### 3.6 Auth Runtime & Deployment Env Contract

Auth entrypoint:

- UI component: `src/components/nexus/auth-screen.tsx`
- Supabase client factory: `src/lib/supabase/client.ts`
- Session owner: `NexusOps` in `src/components/nexus/nexus-ops.tsx`
- Store state: `authVault.user`, `authVault.isLocked`, `authVault.globalApiKey`, `authVault.globalBaseUrl`

Runtime flow:

1. `NexusOps` calls `getNexusSupabaseClient()`.
2. It subscribes to `supabase.auth.onAuthStateChange`.
3. It calls `supabase.auth.getSession()`.
4. `syncSupabaseSessionUser(session?.user ?? null)` mirrors the authenticated user into `authVault.user`.
5. `authChecked` becomes `true` after session lookup completes.
6. If no user is present, `AuthScreen` remains mounted and renders the login/sign-up gate.

Auth screen message invariant:

- Initial status is `"Checking session..."` while `authChecked` is false.
- Once `checked` is true and no custom auth result message has replaced the initial status, `AuthScreen` derives the visible message as `"Authenticate to unlock NEXUS // AI OPS."`.
- Do not rely on an effect that synchronously calls `setState` only to mirror `checked`; React lint rejects that pattern.
- Form submit status messages, Supabase error messages, and sign-up confirmation messages remain stored in component state.

Required public Supabase environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Deployment contract:

- Local development may read these from ignored `.env.local`.
- Production Vercel deployments must define both variables in the Vercel project environment before build.
- These are intentionally `NEXT_PUBLIC_*` values and become visible in the browser bundle; do not place service-role keys, private tokens, OpenAI keys, Vercel tokens, or any other secret behind a `NEXT_PUBLIC_` prefix.
- The Supabase service-role key must never be used in this frontend client.
- Missing variables make `getNexusSupabaseClient()` throw: `"Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."`
- Because these values are baked into the Next.js client bundle at build time, adding or changing them in Vercel requires a new production deployment.

Operational deployment notes:

- Stable production alias observed after correction: `https://nexus-swart-ten.vercel.app`
- Immutable deployment URLs, such as `https://nexus-gflj7w651-sean-s-projects10.vercel.app`, do not receive later env or code fixes.
- For user-facing online testing, prefer the stable production alias or the latest production deployment URL.
- Vercel project env var inspection should report only variable names and encrypted/present status, never values.

---

## 4. The Agent Forking & Compression Engine

### 4.1 UI Trigger Flow

Current user journey:

1. Agent window renders `AgentActionToolbar`.
2. Toolbar contains `Branch agent` button with `GitBranch` icon.
3. Clicking it calls `onOpenBranchInterface(agent.id)`.
4. `NexusOps` stores that id in `branchAgentId`.
5. If `branchAgentId` resolves to an agent, `AgentBranchModal` opens.
6. Modal configures:
   - branch mode: `full` or `summary`
   - compressor model
   - retention ratio
   - custom focus prompt
   - advanced evaluation weights
7. Modal calls `useNexusStore.getState().branchAgent(agent.id, config)`.
8. On success, `NexusOps` focuses the new agent and displays `[BRANCH SECURED] New agent deployed to canvas.`
9. Store creates the agent and a branch edge in `workspace.graph`.
10. In panels mode, the new fork appears as a floating `react-rnd` workstation.
11. In graph mode, React Flow renders the new node and branch edge from `workspace.graph`.

Important nuance:

- The modal text still says "Phase 1 configuration shell. Execution pipeline reserved.", but the execution pipeline is implemented in the store and compressor adapter.

### 4.2 `branchAgent` Data Flow

Store action: `branchAgent(sourceAgentId, config)`

Flow:

1. Resolve active workspace.
2. Find source agent.
3. If missing, set `branchingStatus` to `error` and return `null`.
4. Snapshot source workspace id, source agent, and source graph node.
5. Normalize config:
   - clamp `retentionRatio` between 5 and 100.
   - default `compressorModelId` to source agent model.
6. Generate branch id and timestamp.
7. Set `branchingStatus`:
   - `compressing` for summary branches.
   - `creating` for full branches.
8. Build base branch metadata:
   - source agent id/callsign
   - mode
   - createdAt
   - cloned compression config
9. Clone default branch content from source:
   - messages with new ids and `streaming: false`
   - context notes with new ids
   - memory blocks with new ids and updated timestamp
10. If mode is `summary`, call `LlmMemoryCompressor.compress`.
11. On compression success:
   - set `branchingStatus` to `creating`.
   - add retained ratio and compression summary to branch metadata.
   - replace messages with one system summary message.
   - replace context notes with compressed context notes.
   - replace memory with one `Compressed Branch Memory` block.
12. Re-read latest store state to avoid stale state after async compression.
13. Resolve target workspace by original source workspace id.
14. Increment z-index.
15. Build branched agent:
   - same source fields, new id.
   - callsign becomes `${source}-FORK`.
   - identity becomes `${source.identity} Fork`.
   - status resets to `idle`.
   - tools are cloned with new ids and cleared runtime result/error.
   - layout is offset by `+36` x/y and gets new z-index.
   - minimized/maximized reset.
   - `branchMetadata` attached.
16. Build graph node:
   - placed `+350` x and `+150` y from source graph node.
   - fallback to default graph position if source node missing.
17. Build graph edge:
   - id from `makeId("edge")`
   - `edgeKind: "branch"`
   - `branchMode`
   - animated
   - label `COMPRESSED BRANCH` or `FULL BRANCH`
   - dashed style using `var(--color-primary)`
18. Insert branched agent, graph node, and graph edge into the original source workspace.
19. Set active/selected agent to new id.
20. Set `branchingStatus` to `done`.
21. Return new agent id.
22. On any error, set `branchingStatus` to `error` and return `null`.

No Supabase-specific branch persistence exists yet beyond normal local persisted workspace state.

### 4.3 Full Branch Mode

Full branch behavior:

- Does not call the compression API.
- Clones source active memory, context notes, and non-streaming messages.
- Preserves source memory footprint with fresh ids.
- Adds branch metadata with mode `full`.

Use this when:

- Operator wants an exact working fork.
- Compression API is unavailable.
- Source context is small enough to keep intact.

### 4.4 Summary Branch Mode

Summary branch behavior:

- Calls `LlmMemoryCompressor.compress`.
- Uses global API vault key and base URL if present.
- Sends payload to `/api/memory-compress`.
- Falls back to `MockMemoryCompressor` if:
  - fetch fails
  - response is not ok
  - API returns `{ mockFallback: true }`
  - JSON cannot normalize

Compressed branch output:

- One system summary message.
- Compressed context notes.
- One memory block containing compression summary.
- Branch metadata includes retained ratio and compression summary.

### 4.5 Dual-Prompt Wrapper Logic

Edge route: `src/app/api/memory-compress/route.ts`

Runtime:

- `edge`
- `maxDuration = 300`

Request security and normalization:

- Extracts Bearer token from `Authorization`.
- Sanitizes headers to printable ASCII.
- Reads base URL from `x-openai-base-url` or `process.env.OPENAI_BASE_URL`.
- Falls back to `https://api.openai.com/v1`.
- If no API key exists, returns `{ mockFallback: true }`.
- Invalid JSON returns `{ mockFallback: true, error: "invalid-json" }`.

Config normalization:

- mode defaults to `summary` unless explicitly `full`.
- retention ratio clamps to 5-100.
- compressor model defaults to `gpt-4o-mini`.
- custom focus prompt is stripped of control characters and capped at 1,200 chars.
- advanced weights clamp to 0-10.
- profile id defaults to `default-context-compressor`.

Prompt construction:

- System prompt layer:
  - Starts from the selected compression profile `fixedSystemPrompt`.
  - Appends strict retention instruction:
    - "Compress and retain exactly the most important X% of data."
  - Appends advanced weight instructions when present.
  - If a weight is above 7, adds a CRITICAL preservation instruction for that dimension.

- User prompt layer:
  - If no custom focus prompt, user content is raw serialized source payload.
  - If custom focus exists, user content becomes:
    - `[Layer 2 User Weighting Input]`
    - custom focus prompt
    - blank line
    - `[Source Transcript Payload]`
    - serialized source payload

This is the current Dual-Prompt Wrapper:

- Layer 1 fixed system prompt from registry.
- Layer 2 operator weighting prompt from modal.
- Source payload remains separately labeled.

Chat completion request:

- POST `${baseUrl}/chat/completions`
- `model`: selected compressor model.
- `temperature: 0.2` only for models that support temperature.
- `response_format: { type: "json_object" }`
- messages: system + user.

Compatibility fallback:

- If provider rejects `response_format` / `json_object` / unsupported fields, retries once without `response_format`.
- If still failing, returns `{ mockFallback: true, error: "compression-failed" }`.

Result normalization:

- Extracts JSON object from the model response.
- Ensures `compressionSummary`.
- Ensures `contextNotes`, defaulting to a memory note if missing.
- Ensures `retainedRatio`.
- Preserves optional arrays:
  - `architectureNotes`
  - `keyDecisions`
  - `unresolvedBugs`

### 4.6 Compression Expansion Rules

Future expansion should:

- Add compression profiles to `MEMORY_COMPRESSION_PROFILE_REGISTRY`.
- Keep API config inside `IMemoryCompressionConfig`.
- Keep compressed result shape compatible with `ICompressedMemoryResult`.
- Preserve mock fallback behavior so branch creation remains usable without live keys.
- Keep custom focus prompt capped and sanitized.
- Avoid sending secrets anywhere except request headers.

---

## 5. UI/UX Ecosystem

### 5.1 Main Layout

Root component:

- `NexusOps`

Main shell:

- `<main className="nexus-shell flex h-dvh min-h-0 flex-col overflow-hidden text-slate-100">`

Primary regions:

- `TopBar`
- left agent dock
- central workspace
- right intel dock
- command palette
- macro composer modal
- prompt vault manager
- branch modal
- settings sidebar

Central workspace:

- `section.nexus-workspace.nexus-scanline`
- `relative z-0 isolate`
- owns either:
  - panel mode: floating agent windows + minimized rail + datapads
  - graph mode: `NexusGraph`

Left dock:

- hidden below `xl`.
- width animates between `266` and `44`.
- collapsed rail label: `Agents`.

Right Intel:

- hidden below `xl`.
- width animates between `306` and `44`.
- z-index `z-[80]`.
- collapsed rail label: `Intel`.

Settings sidebar:

- fixed right side from `top-[88px]` to bottom.
- width `min(390px, calc(100vw - 24px))`.
- z-index `z-[120]`.
- contains account/vault, theme, branch defaults, model routing, add-agent controls, global datapads, artifact vault, macro vault.

### 5.2 Panel Mode

Panel mode renders:

- every non-minimized agent as `AgentWindow`.
- minimized agents in `MinimizedRail`.
- every open notebook id as `DatapadWindow`.

Agent windows:

- Implemented with dynamic `react-rnd` import to avoid SSR.
- `bounds="parent"` means windows cannot leave workspace bounds.
- Drag handle class: `nexus-drag-handle`.
- Minimum size:
  - width `390`
  - height `360`
- `style={{ zIndex: agent.layout.zIndex }}`
- Focus/drag/resize increments z-index through store actions.

Agent window content by capability:

- `chat`: scrollable messages + textarea composer.
- `image` / `video`: `MediaCanvas` + generation prompt composer.
- `sandbox`: `SandboxCanvas` with code/preview split and save artifact controls.

Agent toolbar:

- Absolute right rail inside each agent window.
- z-index `z-40`.
- Expands on hover/click.
- Actions include maximize, minimize, duplicate, branch, delete, copy, new reply, prompt vault, predictive intel, clear transcript, stop stream.

### 5.3 Graph Mode

Graph mode component:

- `NexusGraph`

Engine:

- `@xyflow/react`

Graph is derived from:

- `workspace.agents`
- `workspace.graph.nodes`
- `workspace.graph.edges`

Node behavior:

- Every agent becomes one React Flow node.
- Node id is agent id.
- Position comes from `workspace.graph.nodes`; fallback uses `getDefaultGraphPosition`.
- Clicking node calls `onFocusAgent(node.id)`.
- Opening node switches back to panel mode and focuses agent.
- Drag stop persists graph node position through `updateGraphNodePosition`.

Edge behavior:

- Edges render as custom `BlueprintEdge`.
- Connection creates a `WorkspaceGraphEdge` with id `edge-${source}-${target}-${Date.now()}`.
- Deleting selected edges uses Backspace/Delete.
- Branch edges created by `branchAgent` carry:
  - `edgeKind: "branch"`
  - `branchMode`
  - label
  - dashed style

Graph expansion rules:

- Keep persisted topology in `WorkspaceGraph`.
- Add new visual node types by extending `WorkflowGraphNodeType`, `GRAPH_NODE_REGISTRY`, and `NexusGraph` mapping together.
- Avoid making React Flow local state authoritative; it is a rendering/projection layer.

### 5.4 LEGO Theme Engine

Theme controls:

- `LegoThemeEngineControls`
- Stored per workspace in `workspace.themeConfig`.
- Committed by `updateThemeConfig`.
- Debounced cloud sync calls only workspace upsert currently.

CSS variable mapping:

- `radius` -> `--radius-base`
- `blur` -> `--backdrop-blur`
- `borderWidth` -> `--border-width`
- `iconWeight` -> `--icon-weight`
- `fontFamily` -> `--font-main`
- `chatOpacity` -> `--chat-panel-opacity`

Defaults:

- radius: `4px`
- blur: `8px`
- border width: `1px`
- icon weight: `2px`
- font family: Geist sans stack
- chat opacity: `88%`

Runtime behavior:

- `applyLegoThemeConfigToDom` mutates `document.documentElement.style`.
- Sliders update CSS variables immediately for 0ms visual feedback.
- Commit calls persist workspace theme config.
- `readLegoThemeConfigFromDom` reads current computed values when controls mount/update.

Theme foundation:

- `next-themes` controls high-level theme id:
  - `cyberpunk`
  - `apple`
  - `tesla`
  - `terminal`
- `src/app/globals.css` defines theme variables and maps Tailwind color tokens to CSS variables.
- `tailwind.config.ts` maps semantic colors like `background`, `foreground`, `primary`, `muted`, `success`, `warning`, `danger` to CSS variables.

Expansion rules:

- Prefer CSS variables for global visual semantics and Tailwind classes for layout.
- Do not hard-code new global colors when an existing variable expresses the semantic layer.
- Workspace-specific visual tweaks should pass through `WorkspaceThemeConfig` or a future typed extension of it.

### 5.5 Floating Window Mechanics

Agent workstations:

- Source: `AgentWindow` in `nexus-ops.tsx`.
- Uses dynamically imported `Rnd`.
- Geometry source of truth: `agent.layout`.
- Drag stop calls `updateLayout(agent.id, { x, y })`.
- Resize stop calls `updateLayout(agent.id, { width, height, x, y })`.
- Focus calls `focusAgent`, which:
  - sets minimized false.
  - increments `nextZIndex`.
  - updates `agent.layout.zIndex`.
  - sets active and selected agent ids.
- Maximize stores `previousLayout`, sets workspace-fit layout, and restores with next z-index.
- Arrange clamps layouts to workspace bounds.

Global Datapads:

- Source: `DatapadWindow.tsx`.
- Uses direct `Rnd` import.
- Geometry is currently local/default only, not persisted:
  - width `520`
  - height `420`
  - x `72 + index * 32`
  - y `68 + index * 28`
- Bounds: parent workspace.
- z-index: `z-[95]`.
- Drag handle class: `datapad-drag-handle`.
- Minimum size:
  - width `320`
  - height `260`
- Content source of truth:
  - `notebooksCache`
  - `openNotebookIds`
- Save calls `updateNotebook`, which fire-and-forget upserts to Supabase.

Expansion note:

- If datapad geometry must persist, add a typed layout field to `NotebookRecord` or create a new workspace-local window layout registry. Do not overload notebook content.

### 5.6 Chat / Stream UX

Chat send flow:

- `handleSend(agentId, content)` in `NexusOps`.
- Adds a user message and streaming assistant placeholder.
- Calls `/api/agent-stream`.
- Sends:
  - agent identity/callsign/title/mission/provider/model/memory/contextNotes
  - last 16 non-system, non-streaming messages
- Uses global API key and base URL from `authVault`.
- Reads server-sent style stream events:
  - `meta`
  - `token`
  - `done`
- Appends tokens into assistant message.
- Finalizes streaming message through `finishMessage`.
- Updates telemetry based on received character count.

Abort flow:

- `abortControllersRef` maps agent id to controller.
- Stop stream button aborts the active controller.
- Interrupted messages are marked with `[interrupted]`.

Mock/live behavior:

- Effective stream mode is based on presence of `authVault.globalApiKey`.
- Without key, system runs mock streams.

### 5.7 Prompt Vault, Predictive Intel, Artifacts, Macros

Prompt Vault:

- Prompt cache is workspace-filtered inside agent toolbar.
- Prompt Vault Manager opens as a global component when `isVaultManagerOpen`.
- Prompt revisions are tracked locally and in Supabase.

Predictive Intel:

- Agent toolbar can request three suggestions.
- Calls `/api/predictive-intel` when possible.
- Falls back to `buildMockPredictiveIntelSuggestions`.

Artifact Vault:

- Saved sandbox/media/code/url outputs live in `artifactVault`.
- Settings sidebar can refresh from Supabase.
- Sandbox save calls `saveArtifactToCloud`.

Macro Blueprint Vault:

- Saves current graph topology and agent configuration through `saveCurrentCanvasAsMacro`.
- Stores `WorkflowTemplateBlueprintData`.
- Spawn path:
  - fetch macro
  - instantiate macro
  - create checkpoint first
  - spawn cloned agents
  - append cloned graph nodes and graph edges
  - switch view to `graph`

### 5.8 Boundary Check: Stable vs Reserved

Stable operating cores:

- `NexusAgent` and `NexusWorkspace` schemas.
- Zustand local-first active workbench.
- IndexedDB persistence with legacy localStorage fallback.
- Supabase Auth login gate with Vercel production env contract.
- Agent floating windows and z-index focus behavior.
- React Flow graph projection from `WorkspaceGraph`.
- Chat streaming with mock/live mode.
- Global API vault.
- Model catalog lookup.
- Memory compression API with mock fallback.
- Macro blueprint save/spawn.
- Artifact save/fetch.
- Prompt cache and revisions.
- Global datapad CRUD.
- Local filesystem scanner executor.
- Web surfer executor.
- Image generation adapter slot with mock fallback.
- Sandbox `srcDoc` preview.

Reserved or partial sockets:

- `audio` capability.
- `data-analysis` capability.
- `tool-node`, `memory-node`, `condition-node`.
- `db-query` executor type.
- `real-video-gen`.
- `real-db-query`.
- `HANDOFF_RULE_REGISTRY`.
- `futureDefaultWeights` in workspace branching settings.
- Full Supabase persistence for active UI snapshots.
- Historical message/artifact paging through `IAsyncDataFetcher`.
- Persisted datapad geometry.
- tldraw / Infinite Canvas integration.

### 5.9 Infinite Canvas / tldraw Integration Guardrails

Future canvas expansion should follow these boundaries:

- Add a typed canvas schema in `nexus-types.ts` before storing tldraw state.
- Add a registry socket if canvas nodes introduce new agent/tool/memory/condition node types.
- Decide whether canvas state is workspace-local active UI, durable cloud state, or both.
- Do not store unbounded canvas history in Zustand persist without partialization.
- Keep React Flow and tldraw authority separate:
  - React Flow currently owns workflow graph topology.
  - tldraw should either be a new workspace view mode or a typed artifact/canvas layer.
- If tldraw becomes a view mode, extend `WorkspaceViewMode` and update store, UI controls, persistence migration, and temporal signature.
- If tldraw embeds agent windows, respect current z-axis:
  - canvas base at `z-0`
  - normal floating content below settings
  - modals above settings
- If tldraw stores artifacts, route durable payloads through Supabase artifact or a new typed table synchronized with `nexus-types.ts`.

---

## 6. L4 Supabase Backend Mapping

### 6.1 Table Map

`workspaces`

- Row: `Workspaces`
- Fields:
  - `id`
  - `name`
  - `created_at`
- Upsert type: `WorkspaceUpsert = Pick<Workspaces, "id" | "name">`

`agent_profiles`

- Row: `Agent_Profiles`
- Fields:
  - `id`
  - `name`
  - `type`
  - `system_prompt`
  - `created_at`

`workspace_agents`

- Row: `Workspace_Agents`
- Fields:
  - `workspace_id`
  - `agent_id`
  - `assigned_role`

`messages`

- Row: `Messages`
- Fields:
  - `id`
  - `workspace_id`
  - `agent_id`
  - `content`
  - `type`
  - `created_at`
- Insert type: `MessageInsert`

`artifacts`

- Row: `Artifacts`
- Fields:
  - `id`
  - `workspace_id`
  - `source_message_id`
  - `content_url`
  - `type`
  - `created_at`
- Insert type: `ArtifactInsert`

`workflow_templates`

- Row: `Workflow_Templates`
- Fields:
  - `id`
  - `name`
  - `description`
  - `blueprint_data`
  - `created_at`
- Insert type: `WorkflowTemplateInsert`

`prompts`

- Row: `Prompts`
- Fields:
  - `id`
  - `workspace_id`
  - `title`
  - `content`
  - `created_at`
  - `updated_at`
- Upsert type: `PromptUpsert`

`prompt_revisions`

- Row: `Prompt_Revisions`
- Fields:
  - `id`
  - `prompt_id`
  - `previous_content`
  - `new_content`
  - `created_at`
- Insert type: `PromptRevisionInsert`

`notebooks`

- Row: `Notebooks`
- Fields:
  - `id`
  - `title`
  - `content`
  - `created_at`
  - `updated_at`
- Upsert type: `NotebookUpsert`

### 6.2 Backend Boundary Risks

Current durable backend mapping is narrower than frontend workspace state.

Persisted in Supabase today:

- workspace id/name
- messages
- artifacts
- workflow templates
- prompts
- prompt revisions
- notebooks

Not yet persisted as full backend records:

- full agent profiles generated in the current workspace
- full workspace graph/layout/settings snapshots
- agent memory/context/tools as normalized backend records
- active UI snapshot beyond workspace id/name
- historical paging implementation for messages/artifacts

Implication:

- IndexedDB is currently the only full-fidelity persistence for complete active workspace state.
- Supabase is the durable cloud support plane for selected records, not yet the full workspace source of truth.

---

## 7. Default Runtime Topology

Default workspace:

- id: `workspace-nexus-ops`
- name: `NEXUS // AI OPS`
- active/selected agent: `agent-operator`
- settings:
  - provider: `openai`
  - model: `gpt-4o-mini`
  - streamMode: `mock`
  - viewMode: `panels`
  - autosave: `true`
  - branching default retention ratio: `30`

Default agents:

- `ARCHITECT`
  - id: `agent-architect`
  - model: `gpt-5.5-pro-2026-04-23`
  - role: system architecture and planning
  - tools include `real-file-scanner` and `mock.review-mesh`

- `OPERATOR`
  - id: `agent-operator`
  - model: `gpt-5.5-2026-04-23`
  - role: code/operator experience

- `SENTINEL`
  - id: `agent-sentinel`
  - model: `gpt-5.5-2026-04-23`
  - role: debugging, brittle states, deployment assumptions

- `ARCHIVIST`
  - id: `agent-archivist`
  - model: `gpt-5.5-2026-04-23`
  - role: documentation and memory synthesis
  - tools include `web-surfer`

Default graph:

- one graph node per default agent.
- no default edges.

Normalization behavior:

- `normalizeWorkspaces` sanitizes workspaces and ensures `ARCHIVIST` exists.
- `syncPanels` keeps `workspace.panels` and `workspace.graph.nodes` aligned with `workspace.agents`.

---

## 8. Agent Instructions for Future Development

Before changing NEXUS architecture:

1. Read this blueprint.
2. Read `src/lib/nexus-types.ts`.
3. Read `src/lib/nexus-registry.ts`.
4. Identify the existing socket you are extending.
5. If no socket exists, add one to the registry/schema first.
6. Decide state tier:
   - transient component state
   - active Zustand state
   - local persisted Zustand state
   - Supabase durable state
   - paged historical backend data
7. Decide z-axis tier before adding UI.
8. Keep local interaction non-blocking when cloud sync fails.
9. Add migration/normalization if persisted state shape changes.
10. Do not duplicate source-of-truth maps for models, capabilities, tool slots, graph node types, or compression profiles.
11. For online auth or Supabase changes, confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist in the target Vercel environment and redeploy after any env change.
12. Never commit `.env*`, `.vercel/`, service-role keys, private API keys, or token values; report env status by variable name only.

High-risk files for architectural edits:

- `src/lib/nexus-types.ts`
- `src/lib/nexus-registry.ts`
- `src/store/nexus-store.ts`
- `src/lib/state-sync.ts`
- `src/lib/supabase/client.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/auth-screen.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/lib/supabase/database.types.ts`

Current expansion-ready surfaces:

- capability registry
- graph node registry
- tool slot registry
- executor registry
- memory compression profile registry
- workspace settings
- workspace theme config
- workflow template blueprint schema
- Supabase table definitions
- React Flow projection layer
- floating window layout pattern

Final invariant:

NEXUS is local-first, registry-first, schema-first, and z-axis disciplined. New systems should dock into the existing sockets without taking ownership away from the current workspace, agent, graph, and persistence contracts.

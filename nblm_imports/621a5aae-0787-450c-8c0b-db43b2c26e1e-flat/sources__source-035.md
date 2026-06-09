# Source 035 - reports__component-inventory__component-catalog.json.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: ce1101b2-d964-4989-897d-91eee4d90b90
- title: reports__component-inventory__component-catalog.json.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 13
- token_count: 44
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/ce1101b2-d964-4989-897d-91eee4d90b90
- source_added_timestamp: 2026-06-05T05:51:13.498192Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/component-inventory/component-catalog.json
- local_mirror_estimated_word_count: 3331

## Local Mirror Content

```json
[
  {
    "file": "src/components/nexus/AgentBranchModal.tsx",
    "lineCount": 490,
    "components": [
      "AgentBranchModal",
      "DEFAULT_PROFILE"
    ],
    "propsTypes": [
      "AgentBranchModalProps"
    ],
    "events": [
      "onBranchComplete",
      "onChange",
      "onClick",
      "onClose",
      "onInput"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "LLM Node"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/AgentBranchModal.tsx",
        "line": 17,
        "text": "import { useNexusStore } from \"@/store/nexus-store\";"
      },
      {
        "file": "src/components/nexus/AgentBranchModal.tsx",
        "line": 19,
        "text": "type AgentBranchModalProps = {"
      },
      {
        "file": "src/components/nexus/AgentBranchModal.tsx",
        "line": 26,
        "text": "const DEFAULT_PROFILE = MEMORY_COMPRESSION_PROFILE_REGISTRY[\"default-context-compressor\"];"
      },
      {
        "file": "src/components/nexus/AgentBranchModal.tsx",
        "line": 40,
        "text": "export function AgentBranchModal({"
      },
      {
        "file": "src/components/nexus/AgentBranchModal.tsx",
        "line": 51,
        "text": "const branchAgent = useNexusStore((state) => state.branchAgent);"
      },
      {
        "file": "src/components/nexus/AgentBranchModal.tsx",
        "line": 52,
        "text": "const branchingStatus = useNexusStore((state) => state.branchingStatus);"
      }
    ]
  },
  {
    "file": "src/components/nexus/DatapadWindow.tsx",
    "lineCount": 157,
    "components": [
      "DatapadWindow"
    ],
    "propsTypes": [],
    "events": [
      "onChange",
      "onClick",
      "onDragStart",
      "onMouseDown",
      "onTouchStart"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Agent Context"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 7,
        "text": "import { useNexusStore } from \"@/store/nexus-store\";"
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 13,
        "text": "export function DatapadWindow({ notebookId }: { notebookId: string }) {"
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 14,
        "text": "const notebook = useNexusStore((state) =>"
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 17,
        "text": "const notebookDraft = useNexusStore((state) => state.notebookDrafts[notebookId]);"
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 18,
        "text": "const openNotebookIds = useNexusStore((state) => state.openNotebookIds);"
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 19,
        "text": "const zIndex = useNexusStore("
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 22,
        "text": "const toggleNotebookOpen = useNexusStore((state) => state.toggleNotebookOpen);"
      },
      {
        "file": "src/components/nexus/DatapadWindow.tsx",
        "line": 23,
        "text": "const focusNotebookWindow = useNexusStore((state) => state.focusNotebookWindow);"
      }
    ]
  },
  {
    "file": "src/components/nexus/PromptVaultManager.tsx",
    "lineCount": 323,
    "components": [
      "PromptVaultManager"
    ],
    "propsTypes": [],
    "events": [
      "onChange",
      "onClick"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "Input / Ingestion"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 8,
        "text": "import { useNexusStore } from \"@/store/nexus-store\";"
      },
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 31,
        "text": "export function PromptVaultManager() {"
      },
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 32,
        "text": "const activeWorkspaceId = useNexusStore((state) => state.activeWorkspaceId);"
      },
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 33,
        "text": "const promptsCache = useNexusStore((state) => state.promptsCache);"
      },
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 34,
        "text": "const closeVaultManager = useNexusStore((state) => state.closeVaultManager);"
      },
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 35,
        "text": "const deletePrompt = useNexusStore((state) => state.deletePrompt);"
      },
      {
        "file": "src/components/nexus/PromptVaultManager.tsx",
        "line": 36,
        "text": "const updatePrompt = useNexusStore((state) => state.updatePrompt);"
      }
    ]
  },
  {
    "file": "src/components/nexus/auth-screen.tsx",
    "lineCount": 171,
    "components": [
      "AUTH_PROMPT_MESSAGE",
      "AuthScreen",
      "CHECKING_SESSION_MESSAGE"
    ],
    "propsTypes": [
      "AuthScreenProps"
    ],
    "events": [
      "onAuthenticated",
      "onChange",
      "onClick",
      "onSubmit"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "Input / Ingestion"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/auth-screen.tsx",
        "line": 11,
        "text": "import { useNexusStore } from \"@/store/nexus-store\";"
      },
      {
        "file": "src/components/nexus/auth-screen.tsx",
        "line": 13,
        "text": "type AuthScreenProps = {"
      },
      {
        "file": "src/components/nexus/auth-screen.tsx",
        "line": 21,
        "text": "const AUTH_PROMPT_MESSAGE = \"Authenticate to unlock NEXUS // AI OPS.\";"
      },
      {
        "file": "src/components/nexus/auth-screen.tsx",
        "line": 22,
        "text": "const CHECKING_SESSION_MESSAGE = \"Checking session...\";"
      },
      {
        "file": "src/components/nexus/auth-screen.tsx",
        "line": 24,
        "text": "export function AuthScreen({ checked, onAuthenticated }: AuthScreenProps) {"
      },
      {
        "file": "src/components/nexus/auth-screen.tsx",
        "line": 25,
        "text": "const login = useNexusStore((state) => state.login);"
      }
    ]
  },
  {
    "file": "src/components/nexus/dynamic-icon.tsx",
    "lineCount": 42,
    "components": [
      "DynamicIcon",
      "Icon"
    ],
    "propsTypes": [
      "DynamicIconProps",
      "LucideProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Unknown"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/dynamic-icon.tsx",
        "line": 2,
        "text": "import { Box, type LucideProps } from \"lucide-react\";"
      },
      {
        "file": "src/components/nexus/dynamic-icon.tsx",
        "line": 5,
        "text": "type DynamicIconProps = LucideProps & {"
      },
      {
        "file": "src/components/nexus/dynamic-icon.tsx",
        "line": 26,
        "text": "export function DynamicIcon({"
      },
      {
        "file": "src/components/nexus/dynamic-icon.tsx",
        "line": 34,
        "text": "const Icon = isRenderableIcon(candidate)"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts",
    "lineCount": 95,
    "components": [
      "AgentBranchModal"
    ],
    "propsTypes": [],
    "events": [
      "onBranchComplete",
      "onChange",
      "onClick",
      "onClose"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "LLM Node"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts",
        "line": 9,
        "text": "expect(source).toContain(\"export function AgentBranchModal({\");"
      },
      {
        "file": "src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts",
        "line": 28,
        "text": "expect(source).toContain(\"const branchAgent = useNexusStore((state) => state.branchAgent);\");"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-agent-window-chrome-primitive.test.ts",
    "lineCount": 119,
    "components": [
      "AgentWindow",
      "SandboxCanvas"
    ],
    "propsTypes": [],
    "events": [
      "onDragStop",
      "onResizeStop"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-agent-window-chrome-primitive.test.ts",
        "line": 106,
        "text": "return source.match(/function AgentWindow\\([\\s\\S]*?\\n}\\n\\nfunction SandboxCanvas/)?.[0] ?? \"\";"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-command-palette-shell-selector.test.ts",
    "lineCount": 125,
    "components": [
      "CommandPalette"
    ],
    "propsTypes": [],
    "events": [
      "onChange",
      "onClick",
      "onClose",
      "onMouseDown"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Input / Ingestion"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-command-palette-shell-selector.test.ts",
        "line": 9,
        "text": "expect(source).toContain(\"function CommandPalette({\");"
      },
      {
        "file": "src/components/nexus/nexus-command-palette-shell-selector.test.ts",
        "line": 109,
        "text": "const start = source.indexOf(\"function CommandPalette(\");"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-control-primitive-selector.test.ts",
    "lineCount": 57,
    "components": [],
    "propsTypes": [],
    "events": [
      "onClick"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": []
  },
  {
    "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
    "lineCount": 94,
    "components": [
      "DatapadWindow"
    ],
    "propsTypes": [],
    "events": [
      "onChange",
      "onClick",
      "onDragStart",
      "onMouseDown",
      "onTouchStart"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 9,
        "text": "expect(source).toContain(\"export function DatapadWindow({ notebookId }\");"
      },
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 24,
        "text": "expect(source).toContain('import { useNexusStore } from \"@/store/nexus-store\";');"
      },
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 25,
        "text": "expect(source).toContain(\"const zIndex = useNexusStore(\");"
      },
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 26,
        "text": "expect(source).toContain(\"const focusNotebookWindow = useNexusStore\");"
      },
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 27,
        "text": "expect(source).toContain(\"const saveNotebookDraft = useNexusStore\");"
      },
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 28,
        "text": "expect(source).toContain(\"const updateNotebook = useNexusStore\");"
      },
      {
        "file": "src/components/nexus/nexus-datapad-shell-selector.test.ts",
        "line": 29,
        "text": "expect(source).toContain(\"const deleteNotebook = useNexusStore\");"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-generated-history-hydration.test.ts",
    "lineCount": 15,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": []
  },
  {
    "file": "src/components/nexus/nexus-graph.tsx",
    "lineCount": 2346,
    "components": [
      "AgentNode",
      "BlueprintEdge",
      "FileRuntimeEditor",
      "InputTextRuntimeEditor",
      "ModelImageRuntimeEditor",
      "ModelRuntimeEditor",
      "NexusGraph",
      "RuntimeHandles",
      "RuntimeNode",
      "WorkflowGeneratedAssetMenu",
      "WorkflowGraphAction",
      "WorkflowGraphBrainPanel",
      "WorkflowGraphStatus"
    ],
    "propsTypes": [
      "EdgeProps",
      "NodeProps"
    ],
    "events": [
      "onAddWorkflowNode",
      "onAppendWorkflowContractText",
      "onChange",
      "onClick",
      "onClose",
      "onConnect",
      "onConnectAgents",
      "onConnectWorkflowNodes",
      "onCopyInput",
      "onCopyOutput",
      "onCopyWorkflowInput",
      "onCopyWorkflowOutput",
      "onDownloadArtifact",
      "onDragOver",
      "onDragStart",
      "onDrop",
      "onEdgeClick",
      "onEdgesChange",
      "onFocusAgent",
      "onInit",
      "onKeyDown",
      "onNodeClick",
      "onNodeDragStop",
      "onNodesChange",
      "onOpenAgent",
      "onPaneClick",
      "onPauseWorkflow",
      "onPointerDown",
      "onRemoveAgent",
      "onRemoveEdge",
      "onRemoveEdges",
      "onRemoveNode",
      "onRemoveWorkflowEdges",
      "onRemoveWorkflowNodes",
      "onRunFromInput",
      "onRunWorkflow",
      "onRunWorkflowFromInput",
      "onSelectEdge",
      "onUpdateNodeData",
      "onUpdateNodePosition",
      "onUpdateWorkflowNodeData",
      "onUpdateWorkflowNodePosition"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Input / Ingestion",
      "LLM Node"
    ],
    "largeComponent": true,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 17,
        "text": "type EdgeProps,"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 20,
        "text": "type NodeProps,"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 191,
        "text": "function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 304,
        "text": "function RuntimeNode({ data, selected }: NodeProps<RuntimeFlowNode>) {"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 461,
        "text": "function RuntimeHandles({ node }: { node: WorkflowNodeInstance }) {"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 480,
        "text": "function InputTextRuntimeEditor({"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 555,
        "text": "function ModelRuntimeEditor({"
      },
      {
        "file": "src/components/nexus/nexus-graph.tsx",
        "line": 721,
        "text": "function FileRuntimeEditor({"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-message-bubble-primitive.test.ts",
    "lineCount": 97,
    "components": [
      "MessageBubble",
      "WorkspaceChatComposerShell"
    ],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-message-bubble-primitive.test.ts",
        "line": 91,
        "text": "return source.match(/function MessageBubble\\([\\s\\S]*?\\n}\\n\\nfunction WorkspaceChatComposerShell/)?.[0] ?? \"\";"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-body-frame.test.tsx",
    "lineCount": 110,
    "components": [],
    "propsTypes": [
      "NexusOpsBodyFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-body-frame.test.tsx",
        "line": 8,
        "text": "type NexusOpsBodyFrameProps,"
      },
      {
        "file": "src/components/nexus/nexus-ops-body-frame.test.tsx",
        "line": 44,
        "text": "/export type NexusOpsBodyFrameProps = \\{[\\s\\S]*?\\};/,"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-body-frame.tsx",
    "lineCount": 19,
    "components": [
      "NexusOpsBodyFrame"
    ],
    "propsTypes": [
      "NexusOpsBodyFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-body-frame.tsx",
        "line": 3,
        "text": "export type NexusOpsBodyFrameProps = {"
      },
      {
        "file": "src/components/nexus/nexus-ops-body-frame.tsx",
        "line": 7,
        "text": "export function NexusOpsBodyFrame({ children }: NexusOpsBodyFrameProps) {"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-extraction-map.test.ts",
    "lineCount": 135,
    "components": [],
    "propsTypes": [],
    "events": [
      "onDragStop",
      "onResizeStop"
    ],
    "storeHooks": [
      "useNexusStore"
    ],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-extraction-map.test.ts",
        "line": 20,
        "text": "expect(source).toContain('import { useNexusStore } from \"@/store/nexus-store\";');"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-outer-shell-frame.test.tsx",
    "lineCount": 131,
    "components": [],
    "propsTypes": [
      "NexusOpsOuterShellFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-outer-shell-frame.test.tsx",
        "line": 8,
        "text": "type NexusOpsOuterShellFrameProps,"
      },
      {
        "file": "src/components/nexus/nexus-ops-outer-shell-frame.test.tsx",
        "line": 60,
        "text": "/export type NexusOpsOuterShellFrameProps = \\{[\\s\\S]*?\\};/,"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-outer-shell-frame.tsx",
    "lineCount": 16,
    "components": [
      "NexusOpsOuterShellFrame"
    ],
    "propsTypes": [
      "NexusOpsOuterShellFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-outer-shell-frame.tsx",
        "line": 3,
        "text": "export type NexusOpsOuterShellFrameProps = {"
      },
      {
        "file": "src/components/nexus/nexus-ops-outer-shell-frame.tsx",
        "line": 7,
        "text": "export function NexusOpsOuterShellFrame({"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx",
    "lineCount": 147,
    "components": [],
    "propsTypes": [
      "NexusOpsRightFloatingDockFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx",
        "line": 8,
        "text": "type NexusOpsRightFloatingDockFrameProps,"
      },
      {
        "file": "src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx",
        "line": 53,
        "text": "/export type NexusOpsRightFloatingDockFrameProps = \\{[\\s\\S]*?\\};/,"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-right-floating-dock-frame.tsx",
    "lineCount": 21,
    "components": [
      "NexusOpsRightFloatingDockFrame"
    ],
    "propsTypes": [
      "NexusOpsRightFloatingDockFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-right-floating-dock-frame.tsx",
        "line": 3,
        "text": "export type NexusOpsRightFloatingDockFrameProps = {"
      },
      {
        "file": "src/components/nexus/nexus-ops-right-floating-dock-frame.tsx",
        "line": 7,
        "text": "export function NexusOpsRightFloatingDockFrame({"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-top-bar-frame.test.tsx",
    "lineCount": 146,
    "components": [],
    "propsTypes": [
      "NexusOpsTopBarFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-top-bar-frame.test.tsx",
        "line": 8,
        "text": "type NexusOpsTopBarFrameProps,"
      },
      {
        "file": "src/components/nexus/nexus-ops-top-bar-frame.test.tsx",
        "line": 76,
        "text": "/export type NexusOpsTopBarFrameProps = \\{[\\s\\S]*?\\};/,"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops-top-bar-frame.tsx",
    "lineCount": 26,
    "components": [
      "NexusOpsTopBarFrame"
    ],
    "propsTypes": [
      "NexusOpsTopBarFrameProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops-top-bar-frame.tsx",
        "line": 3,
        "text": "export type NexusOpsTopBarFrameProps = {"
      },
      {
        "file": "src/components/nexus/nexus-ops-top-bar-frame.tsx",
        "line": 7,
        "text": "export function NexusOpsTopBarFrame({ children }: NexusOpsTopBarFrameProps) {"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-ops.tsx",
    "lineCount": 9654,
    "components": [
      "AgentActionToolbar",
      "AgentModelTuningPanel",
      "AgentSettingsSidebar",
      "AgentTemplateProfilePanel",
      "AgentWindow",
      "CollapsedSidebarRail",
      "CommandPalette",
      "EMPTY_AGENTS",
      "EMPTY_GRAPH",
      "GraphNode",
      "Icon",
      "IconButton",
      "LEGO_THEME_DEFAULTS",
      "LEGO_THEME_VARIABLES",
      "LeftDock",
      "MacroComposerModal",
      "MediaArtifactPreview",
      "MediaCanvas",
      "MessageBubble",
      "MinimizedRail",
      "ModelTuningSelect",
      "NexusOps",
      "ProviderVaultPanel",
      "RightFloatingDock",
      "RightIntel",
      "Rnd",
      "SANDBOX_MAX_SPLIT",
      "SANDBOX_MIN_SPLIT",
      "SandboxCanvas",
      "SidebarToggleButton",
      "SyncBadge",
      "ToolbarIconButton",
      "TopBar",
      "TopMenuAction",
      "WORKSPACE_ATTACHMENT_BINARY_INLINE_MAX_BYTES",
      "WORKSPACE_ATTACHMENT_CONTEXT_MAX_CHARS",
      "WORKSPACE_ATTACHMENT_TEXT_EXTENSIONS",
      "WorkspaceChatComposerShell",
      "WorkspaceStyleControlsPanel"
    ],
    "propsTypes": [],
    "events": [
      "onAddAgent",
      "onAddWorkflowNode",
      "onAppendWorkflowContractText",
      "onApplyPlan",
      "onAttachmentSaved",
      "onAuthStateChange",
      "onAuthenticated",
      "onBlur",
      "onBranchComplete",
      "onChange",
      "onClear",
      "onClearImportedContract",
      "onClick",
      "onClose",
      "onComposerModeChange",
      "onConfirm",
      "onConnectAgents",
      "onConnectWorkflowNodes",
      "onCopyArtifact",
      "onCopyWorkflowInput",
      "onCopyWorkflowOutput",
      "onCreateNotebook",
      "onCreateWorkspace",
      "onDeleteApiKey",
      "onDeleteProviderCredential",
      "onDescriptionChange",
      "onDownloadArtifact",
      "onDragStart",
      "onDragStop",
      "onDuplicate",
      "onEvent",
      "onExport",
      "onExportContract",
      "onFocus",
      "onFocusAgent",
      "onGenerateImage",
      "onGenerateMedia",
      "onImageSettingsChange",
      "onImport",
      "onImportContractText",
      "onInput",
      "onKeyDown",
      "onLockProviderCredential",
      "onLockVault",
      "onLogout",
      "onMinimize",
      "onMouseDown",
      "onMouseEnter",
      "onMouseLeave",
      "onNameChange",
      "onNotify",
      "onOpenAgent",
      "onOpenArtifacts",
      "onOpenBranchInterface",
      "onOpenGraph",
      "onOpenPalette",
      "onOpenPanels",
      "onOpenVaultManager",
      "onPauseWorkflow",
      "onPointerDown"
    ],
    "storeHooks": [
      "getState",
      "setState",
      "useNexusStore"
    ],
    "apiCalls": [
      "get",
      "post"
    ],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "Input / Ingestion",
      "LLM Node"
    ],
    "largeComponent": true,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 108,
        "text": "nexusApiClient,"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 224,
        "text": "import { useNexusStore } from \"@/store/nexus-store\";"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 236,
        "text": "const Rnd = dynamic(() => import(\"react-rnd\").then((module) => module.Rnd), {"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 240,
        "text": "const EMPTY_AGENTS: NexusAgent[] = [];"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 241,
        "text": "const EMPTY_GRAPH = { nodes: [], edges: [] };"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 242,
        "text": "const SANDBOX_MIN_SPLIT = 20;"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 243,
        "text": "const SANDBOX_MAX_SPLIT = 80;"
      },
      {
        "file": "src/components/nexus/nexus-ops.tsx",
        "line": 259,
        "text": "const LEGO_THEME_DEFAULTS: Required<WorkspaceThemeConfig> = {"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-production-page-shell-boundary.test.tsx",
    "lineCount": 105,
    "components": [],
    "propsTypes": [
      "NexusProductionPageShellBoundaryProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-production-page-shell-boundary.test.tsx",
        "line": 9,
        "text": "type NexusProductionPageShellBoundaryProps,"
      },
      {
        "file": "src/components/nexus/nexus-production-page-shell-boundary.test.tsx",
        "line": 60,
        "text": "/export type NexusProductionPageShellBoundaryProps = \\{[\\s\\S]*?\\};/,"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-production-page-shell-boundary.tsx",
    "lineCount": 32,
    "components": [
      "NEXUS_PRODUCTION_PAGE_SHELL_BOUNDARY_VERSION_V1",
      "NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1",
      "NexusProductionPageShellBoundary"
    ],
    "propsTypes": [
      "NexusProductionPageShellBoundaryProps"
    ],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-production-page-shell-boundary.tsx",
        "line": 3,
        "text": "export const NEXUS_PRODUCTION_PAGE_SHELL_BOUNDARY_VERSION_V1 = \"v1\" as const;"
      },
      {
        "file": "src/components/nexus/nexus-production-page-shell-boundary.tsx",
        "line": 5,
        "text": "export const NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1 = [\"workspace\"] as const;"
      },
      {
        "file": "src/components/nexus/nexus-production-page-shell-boundary.tsx",
        "line": 10,
        "text": "export type NexusProductionPageShellBoundaryProps = {"
      },
      {
        "file": "src/components/nexus/nexus-production-page-shell-boundary.tsx",
        "line": 15,
        "text": "export function NexusProductionPageShellBoundary({"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-production-preview-controller.test.ts",
    "lineCount": 76,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": []
  },
  {
    "file": "src/components/nexus/nexus-production-preview-controller.tsx",
    "lineCount": 460,
    "components": [
      "NexusProductionPreviewController"
    ],
    "propsTypes": [
      "NexusProductionPreviewControllerProps"
    ],
    "events": [
      "onClick"
    ],
    "storeHooks": [
      "setState"
    ],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "Workflow Orchestration"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-production-preview-controller.tsx",
        "line": 70,
        "text": "type NexusProductionPreviewControllerProps = {"
      },
      {
        "file": "src/components/nexus/nexus-production-preview-controller.tsx",
        "line": 118,
        "text": "export function NexusProductionPreviewController({"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-production-style-layer-contract.test.ts",
    "lineCount": 149,
    "components": [
      "NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR"
    ],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "LLM Node"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-production-style-layer-contract.test.ts",
        "line": 50,
        "text": "expect(stylePreviewMapperSource).not.toContain(\"fetch(\");"
      },
      {
        "file": "src/components/nexus/nexus-production-style-layer-contract.test.ts",
        "line": 57,
        "text": "'export const NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR =\\n \"main.nexus-shell.nexus-outer-shell-frame\" as const;',"
      },
      {
        "file": "src/components/nexus/nexus-production-style-layer-contract.test.ts",
        "line": 120,
        "text": "expect(saveHandlerSource).not.toContain(\"nexusApiClient\");"
      },
      {
        "file": "src/components/nexus/nexus-production-style-layer-contract.test.ts",
        "line": 121,
        "text": "expect(saveHandlerSource).not.toContain(\"fetch(\");"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-theme-panel-live-style-controls.test.ts",
    "lineCount": 333,
    "components": [
      "WorkspaceStyleControlsPanel"
    ],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "LLM Node"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/nexus-theme-panel-live-style-controls.test.ts",
        "line": 23,
        "text": "\"function WorkspaceStyleControlsPanel\","
      },
      {
        "file": "src/components/nexus/nexus-theme-panel-live-style-controls.test.ts",
        "line": 131,
        "text": "expect(controlsPanelSource).not.toContain(\"fetch(\");"
      },
      {
        "file": "src/components/nexus/nexus-theme-panel-live-style-controls.test.ts",
        "line": 161,
        "text": "expect(bootApplySource).not.toContain(\"fetch(\");"
      },
      {
        "file": "src/components/nexus/nexus-theme-panel-live-style-controls.test.ts",
        "line": 172,
        "text": "expect(saveHandlerSource).not.toContain(\"nexusApiClient\");"
      }
    ]
  },
  {
    "file": "src/components/nexus/nexus-workspace-chat-composer-shell.test.ts",
    "lineCount": 231,
    "components": [],
    "propsTypes": [],
    "events": [
      "onComposerModeChange",
      "onDownloadArtifact",
      "onFillPrompt",
      "onFocusAgent",
      "onGenerateImage",
      "onGenerateMedia",
      "onLoadHistory",
      "onNewReply",
      "onOpenModelSettings",
      "onSend",
      "onUpdateAgentModelSettings"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": []
  },
  {
    "file": "src/components/nexus/nexus-workspace-primitive.test.ts",
    "lineCount": 75,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": []
  },
  {
    "file": "src/components/nexus/nexus-workspace-readonly-gate.test.ts",
    "lineCount": 33,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": []
  },
  {
    "file": "src/components/nexus/nexus-workspace-style-payload-export-import.test.ts",
    "lineCount": 88,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": false,
    "evidence": []
  },
  {
    "file": "src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx",
    "lineCount": 237,
    "components": [],
    "propsTypes": [
      "WorkflowProSurfaceProps"
    ],
    "events": [
      "onApplyPlan",
      "onClearImportedContract",
      "onExportContract",
      "onImportContractText",
      "onOpenGraph",
      "onOpenPanels"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx",
        "line": 7,
        "text": "type WorkflowProSurfaceProps,"
      }
    ]
  },
  {
    "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
    "lineCount": 1722,
    "components": [
      "WorkflowProActiveModeBay",
      "WorkflowProActiveModeDetails",
      "WorkflowProBrainProposalIntake",
      "WorkflowProCapabilityRegistry",
      "WorkflowProDesignGate",
      "WorkflowProDetailGrid",
      "WorkflowProEvidenceGateSummary",
      "WorkflowProFilePipelinePath",
      "WorkflowProLane",
      "WorkflowProProposalReviewQueue",
      "WorkflowProRuntimeDatum",
      "WorkflowProSurface"
    ],
    "propsTypes": [
      "WorkflowProSurfaceProps"
    ],
    "events": [
      "onApplyPlan",
      "onBrainProposalSourceNameChange",
      "onBrainProposalTextChange",
      "onChange",
      "onClearImportedContract",
      "onClick",
      "onExportContract",
      "onImportContractText",
      "onImportOptimizedWorkflow",
      "onOpenGraph",
      "onOpenPanels",
      "onValidateBrainProposal"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [
      "LLM Node"
    ],
    "largeComponent": true,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 52,
        "text": "export type WorkflowProSurfaceProps = {"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 94,
        "text": "export function WorkflowProSurface({"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 739,
        "text": "function WorkflowProActiveModeBay({"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 839,
        "text": "function WorkflowProActiveModeDetails({"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 1061,
        "text": "function WorkflowProDetailGrid({"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 1086,
        "text": "function WorkflowProEvidenceGateSummary({"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 1170,
        "text": "function WorkflowProDesignGate({"
      },
      {
        "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
        "line": 1228,
        "text": "function WorkflowProProposalReviewQueue({"
      }
    ]
  },
  {
    "file": "src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts",
    "lineCount": 133,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": false,
    "evidence": [
      {
        "file": "src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts",
        "line": 107,
        "text": "expect(importedPanelSource).not.toContain(\"fetch(\");"
      }
    ]
  },
  {
    "file": "src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts",
    "lineCount": 108,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": false,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts",
        "line": 63,
        "text": "/\\buseNexusStore\\b/,"
      }
    ]
  },
  {
    "file": "src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts",
    "lineCount": 325,
    "components": [],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": true,
    "renderedSurfaces": [],
    "largeComponent": false,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": []
  },
  {
    "file": "src/components/style-engine/nexus-style-lab.tsx",
    "lineCount": 5966,
    "components": [
      "Icon",
      "NexusStyleLab"
    ],
    "propsTypes": [],
    "events": [
      "onChange",
      "onClick"
    ],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": true,
    "shouldBeSplitLater": true,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/style-engine/nexus-style-lab.tsx",
        "line": 852,
        "text": "export function NexusStyleLab() {"
      },
      {
        "file": "src/components/style-engine/nexus-style-lab.tsx",
        "line": 4329,
        "text": "const Icon = action.Icon;"
      }
    ]
  },
  {
    "file": "src/components/style-engine/nexus-style-runtime-provider.tsx",
    "lineCount": 148,
    "components": [
      "NexusStyleRuntimeContext",
      "NexusStyleRuntimeProvider"
    ],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Workflow Orchestration"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/style-engine/nexus-style-runtime-provider.tsx",
        "line": 36,
        "text": "const NexusStyleRuntimeContext ="
      },
      {
        "file": "src/components/style-engine/nexus-style-runtime-provider.tsx",
        "line": 39,
        "text": "export function NexusStyleRuntimeProvider({"
      },
      {
        "file": "src/components/style-engine/nexus-style-runtime-provider.tsx",
        "line": 137,
        "text": "export function useNexusStyleRuntimeV1() {"
      }
    ]
  },
  {
    "file": "src/components/theme-provider.tsx",
    "lineCount": 19,
    "components": [
      "ThemeProvider"
    ],
    "propsTypes": [],
    "events": [],
    "storeHooks": [],
    "apiCalls": [],
    "supabaseCalls": false,
    "renderedSurfaces": [
      "Graph / Canvas"
    ],
    "largeComponent": false,
    "shouldBeSplitLater": false,
    "presentationOnlyLikely": true,
    "mixesDomainLogicLikely": true,
    "evidence": [
      {
        "file": "src/components/theme-provider.tsx",
        "line": 6,
        "text": "export function ThemeProvider({ children }: { children: ReactNode }) {"
      }
    ]
  }
]
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

# Extension Layer Map — NEXUS // AI OPS

## Overview

NEXUS has a well-structured extension layer centered around the **nexus-registry.ts** file. The registry pattern is used for providers, models, capabilities, tools, graph nodes, and handoff rules.

| Extension Point | Status | Location |
|---|---|---|
| Provider Registry | Active (8 providers) | `src/lib/nexus-registry.ts` |
| Model Catalog | Active (22 models) | `src/lib/nexus-registry.ts` |
| Capability Registry | Active (7 capabilities) | `src/lib/nexus-registry.ts` |
| Graph Node Registry | Active (8 node types) | `src/lib/nexus-registry.ts` |
| Tool Slot Registry | Active (6 tool slots) | `src/lib/nexus-registry.ts` |
| Tool Executor Registry | Active (3 executor types) | `src/lib/nexus-registry.ts` |
| Memory Compression Profiles | Active (1 profile) | `src/lib/nexus-registry.ts` |
| Handoff Rule Registry | Empty (planned) | `src/lib/nexus-registry.ts` |
| Feature Flags | Active | `src/lib/backend/deployment/feature-flag-service.ts` |
| Workflow Runtime Lite Registry | Active | `src/lib/workflow-runtime-lite/registry.ts` |
| Attachment Compiler Registry | Active | `src/lib/attachments/attachment-compiler-registry.ts` |
| Style Engine Recipe Registry | Active | `src/lib/style-engine/` (validators) |

---

## Provider Registry

**Source**: `src/lib/nexus-registry.ts` — `PROVIDER_REGISTRY`

8 registered providers:

| ID | Label | Adapter | Status |
|---|---|---|---|
| `deepseek` | DeepSeek | `openai-compatible` | untested |
| `claude` | Claude | `openai-compatible` | untested |
| `gemini` | Gemini | `openai-compatible` | untested |
| `openai` | OpenAI | `openai-compatible` | untested |
| `openai-compatible` | OpenAI Compatible | `openai-compatible` | untested |
| `custom-openai-compatible` | Custom Compatible | `openai-compatible` | untested |
| `local-preview` | Local Preview | `local-preview` | verified |
| `local-sandbox` | Local Sandbox | `local-preview` | verified |

**Extension point**: Add new provider by adding to `PROVIDER_REGISTRY` with adapter, base URL, and credential config.

---

## Model Catalog

**Source**: `src/lib/nexus-registry.ts` — `NEXUS_MODEL_CATALOG`

22 registered models across 6 capabilities (chat, image, video, sandbox). Each model can have:
- `capabilityProfile` — `ModelCapabilityProfile` with thinking, verbosity, reasoning detail configs
- `tier` — standard/advanced/pro/custom
- `provider` — maps to provider registry

**Extension point**: Add new model by appending to `NEXUS_MODEL_CATALOG` array. Models automatically get capability profiles via `getModelCapabilityProfile()`.

---

## Capability Registry

**Source**: `src/lib/nexus-registry.ts` — `CAPABILITY_REGISTRY`

7 agent capability types, each with implementation state:

| Capability | State | Layer | Provider Slots | Tool Slots |
|---|---|---|---|---|
| `chat` | implemented | L1 | openai-compatible-chat, deepseek-chat | mock-review-mesh |
| `image` | mock | L1 | openai-image-generation, dall-e-api | mock-image-gen, real-image-gen |
| `video` | mock | L1 | sora-api, runway-api | mock-video-gen, real-video-gen |
| `sandbox` | implemented | L3 | local-srcdoc-preview | preview-runtime |
| `audio` | not-implemented | L4 | tts-api, transcription-api | real-audio-gen, real-transcription |
| `search` | implemented | L4 | search-api, local-index | web-surfer, real-web-search, real-file-scanner |
| `data-analysis` | not-implemented | L4 | analysis-runtime, db-query | real-data-analysis, real-db-query |

**Extension point**: Add new capability by adding entry to `CAPABILITY_REGISTRY` and corresponding types to `AgentCapabilityType` in `nexus-types.ts`.

---

## Graph Node Registry

**Source**: `src/lib/nexus-registry.ts` — `GRAPH_NODE_REGISTRY`

8 graph node types for React Flow visual workflow:

| Node Type | State | Layer |
|---|---|---|
| `agent-node` | implemented | L3 |
| `input.text` | implemented | L3 |
| `model.llm` | implemented | L3 |
| `model.image` | implemented | L3 |
| `output.text` | implemented | L3 |
| `tool-node` | not-implemented | L4 |
| `memory-node` | not-implemented | L4 |
| `condition-node` | not-implemented | L4 |

---

## Tool Slot Registry

**Source**: `src/lib/nexus-registry.ts` — `TOOL_SLOT_REGISTRY`

6 tool slots:

| Slot ID | State | Capability | Executor |
|---|---|---|---|
| `real-image-gen` | implemented | image | rest-api |
| `mock-image-gen` | mock | image | rest-api |
| `real-video-gen` | not-implemented | video | rest-api |
| `real-file-scanner` | implemented | search | local-fs |
| `web-surfer` | implemented | search | rest-api |
| `real-db-query` | not-implemented | data-analysis | db-query |

**Extension point**: Add new tool by registering in `TOOL_SLOT_REGISTRY` and providing executor in `TOOL_EXECUTOR_REGISTRY`.

---

## Tool Executor Registry

**Source**: `src/lib/nexus-registry.ts` — `TOOL_EXECUTOR_REGISTRY`

3 executor types:

| Executor Type | Implementations |
|---|---|
| `local-fs` | `LocalFsScannerExecutor` |
| `rest-api` | `WebSurferExecutor` |
| `db-query` | (empty — planned) |

---

## Memory Compression Profiles

**Source**: `src/lib/nexus-registry.ts` — `MEMORY_COMPRESSION_PROFILE_REGISTRY`

1 profile:
- `default-context-compressor`: Fixed system prompt for LLM-based context compression, 30% default retention ratio

---

## Handoff Rule Registry

**Source**: `src/lib/nexus-registry.ts` — `HANDOFF_RULE_REGISTRY`

**Currently empty** (`[]`). This is an intentional future socket for L2 agent-to-agent routing rules via `IWorkflowEdge[]`.

---

## Feature Flags

**Source**: `src/lib/backend/deployment/feature-flag-service.ts` + database `feature_flags` table

Runtime feature flag system with:
- Flag key + scope key uniqueness
- Rollout percentage (0-100)
- Metadata JSON blob
- API: `GET /api/v1/feature-flags`, `POST /api/v1/feature-flags/[flagKey]/toggle`

---

## Workflow Runtime Lite Registry

**Source**: `src/lib/workflow-runtime-lite/registry.ts`

Separate registry for workflow runtime node types and executors (text input, LLM, image, output).

---

## Attachment Compiler Registry

**Source**: `src/lib/attachments/attachment-compiler-registry.ts`

Plugin-like registry for attachment compilers (file type → execution plan).

---

## Style Engine Extension Points

**Source**: `src/lib/style-engine/`

- `v2-page-shell-feature-registry.ts` — Page shell feature registration
- `v2-page-shell-prototype.ts` — Shell prototype definitions
- `v2-layout-boundary.ts` (1030 lines) — Layout slot registry, preset definitions, arrangement IDs
- `v2-validators.ts` (1863 lines) — Validation for skin packs, asset packs, recipes, layouts, performance budgets

---

## Registry Architecture Summary

```
NEXUS_REGISTRY_RULE: "SCAN FIRST before implementing new architecture"

nexus-registry.ts (single registry file)
├── PROVIDER_REGISTRY (8 entries)
├── NEXUS_MODEL_CATALOG (22 entries)
├── CAPABILITY_REGISTRY (7 entries)
├── GRAPH_NODE_REGISTRY (8 entries)
├── TOOL_SLOT_REGISTRY (6 entries)
├── TOOL_EXECUTOR_REGISTRY (3 types)
├── MEMORY_COMPRESSION_PROFILE_REGISTRY (1 entry)
└── HANDOFF_RULE_REGISTRY (empty)
```

---

## Extension Score

| Signal | Present? | Details |
|---|---|---|
| Plugin system | No | No dynamic plugin loading |
| Registry pattern | Yes | Central `nexus-registry.ts` |
| Feature flags | Yes | DB-backed with API, rollout percentages |
| Provider slots | Yes | 8 provider slots, adapter pattern |
| Tool slots | Yes | 6 tool slots, executor abstraction |
| Dynamic imports | Yes | `dynamic()` from Next.js used in components |
| Lazy loading | Partial | Some components use Next.js dynamic imports |
| Workflow node registry | Yes | Separate registry in workflow-runtime-lite |
| Handoff routing | Planned | Empty HANDOFF_RULE_REGISTRY |
| Attachment plugins | Yes | Attachment compiler registry |
| Style engine plugins | Yes | Recipe registry, page shell feature registry |

---

*Evidence: `src/lib/nexus-registry.ts` (881 lines) — all registry definitions; `src/lib/workflow-runtime-lite/registry.ts`; `src/lib/attachments/attachment-compiler-registry.ts`; style-engine files*
*Status of each entry verified against registry `state` field*

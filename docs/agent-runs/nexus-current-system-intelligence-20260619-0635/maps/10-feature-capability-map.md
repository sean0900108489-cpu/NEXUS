# Feature Capability Map — NEXUS // AI OPS

## Overview

NEXUS features are organized by capability domain, aligned with the L1-L4 layering system and the capability registry.

---

## Capability Domain: Chat (L1, `implemented`)

The primary capability. Text streaming agent with multi-model support.

| Feature | Status | Evidence |
|---|---|---|
| Multi-model chat | implemented | Agent model selector in settings sidebar |
| Streaming responses | implemented | AgentStreamService, SSE in chat route |
| Reasoning mode | implemented | ReasoningEffort controls (none→xhigh) |
| Verbosity control | implemented | Verbosity slider (low/medium/high) |
| Reasoning detail | implemented | ReasoningDetail control |
| Temperature tuning | implemented | Temperature slider (0-2) in settings |
| Multi-agent workspace | implemented | Spawn/duplicate/remove agents |
| Agent branching/forking | implemented | AgentBranchModal, memory compression |
| Context compression | implemented | MemoryCompressService, LLM-based |
| Mock fallback | implemented | StreamMode "mock" for keyless operation |
| Historical message paging | implemented | HistoricalDataFetcher, messages table |
| Agent memory blocks | implemented | Memory block CRUD per agent |
| Agent profiles/templates | implemented | Agent templates, profile locking |

---

## Capability Domain: Image (L1, `mock`)

Image generation workstation with mock and real adapters.

| Feature | Status | Evidence |
|---|---|---|
| Image generation API | implemented | `POST /api/image-gen` route |
| DALL-E adapter | implemented | `real-image-gen` tool slot |
| Mock image fallback | implemented | `mock-image-gen` tool slot |
| Generated asset storage | implemented | Supabase storage bucket, image cache |
| Asset retrieval | implemented | `GET /api/image-gen/assets/[assetId]` |
| Multiple image models | implemented | DALL-E 3, gpt-image-1, Imagen 4 in catalog |

---

## Capability Domain: Video (L1, `mock`)

Video generation workstation with mock storyboard preview.

| Feature | Status | Evidence |
|---|---|---|
| Video model catalog | implemented | Sora, Runway Gen-3, Veo 3 in NEXUS_MODEL_CATALOG |
| Mock video adapter | implemented | `mock-video-gen` tool slot |
| Real video adapter | not-implemented | `real-video-gen` slot exists but empty |

---

## Capability Domain: Sandbox (L3, `implemented`)

Live UI sandbox with persisted srcDoc preview.

| Feature | Status | Evidence |
|---|---|---|
| HTML/CSS/JS sandbox | implemented | Sandbox agent type, srcDoc preview |
| Sandbox code editing | implemented | `updateSandboxCode` store action |
| Sandbox URL loading | implemented | `updateSandboxUrl` store action |
| Local preview rendering | implemented | `local-preview` provider, no external API needed |

---

## Capability Domain: Search (L4, `implemented`)

Web and local search capabilities.

| Feature | Status | Evidence |
|---|---|---|
| File system scanner | implemented | LocalFsScannerExecutor, `POST /api/tools/fs-scanner` |
| Web surfer | implemented | WebSurferExecutor, r.jina.ai markdown conversion |
| Web search API | implemented | `GET /api/tools/web-surfer` route |

---

## Capability Domain: Audio (L4, `not-implemented`)

Reserved for speech, transcription, and audio generation. No implementation exists yet.

---

## Capability Domain: Data Analysis (L4, `not-implemented`)

Reserved for tabular analysis, charting, and notebook-style agents. No implementation exists yet.

---

## Cross-Cutting Features

### Workspace Management
| Feature | Status |
|---|---|
| Multi-workspace support | implemented |
| Workspace CRUD | implemented |
| Workspace snapshots (export/import) | implemented |
| Cloud workspace recovery | implemented |
| Workspace session binding | implemented |
| Workspace renaming | implemented |

### View Modes
| Feature | Status |
|---|---|
| Panel view (free-form windows) | implemented |
| Graph view (React Flow nodes) | implemented |
| Workflow Pro (advanced builder) | implemented |
| Style Lab (theme editor) | implemented |

### State Management
| Feature | Status |
|---|---|
| Undo/redo (zundo) | implemented |
| Local persistence (IndexedDB) | implemented |
| Cloud sync (Supabase) | implemented |
| Conflict resolution | implemented |
| Checkpoint system | implemented |
| Transaction log | implemented |

### Security & Auth
| Feature | Status |
|---|---|
| Supabase authentication | implemented |
| Auth vault (credential encryption) | implemented |
| Provider credential management | implemented |
| RLS policies | implemented |
| Permission service | implemented |
| API idempotency | implemented |
| Secret boundary | implemented |
| Route spoof protection | implemented |

### Deployment & Operations
| Feature | Status |
|---|---|
| Feature flags (with rollout %) | implemented |
| Deployment checks | implemented |
| Schema drift detection | implemented |
| Registry consistency checking | implemented |
| Environment validation | implemented |
| System health check | implemented |

### Observability
| Feature | Status |
|---|---|
| System events | implemented |
| Usage metrics | implemented |
| Trace context propagation | implemented |
| PII/secret redaction | implemented |
| Event retention | implemented |
| Workflow runtime traces | implemented |
| Workflow group records | implemented |

### Notebooks & Content
| Feature | Status |
|---|---|
| Datapad/Notebook CRUD | implemented |
| Soft deletes (tombstones) | implemented |
| Notebook drafts | implemented |
| Prompt vault | implemented |
| Prompt revisions history | implemented |
| Prompt search | implemented |

### Workflow Engine
| Feature | Status |
|---|---|
| Workflow Runtime Lite | implemented |
| Workflow Pro surface | implemented |
| Node types (text, LLM, image, output) | implemented |
| Linear topology inference | implemented |
| Workflow groups | implemented |
| Runtime trace publishing | implemented |
| Workflow templates | implemented |
| Canvas macros | implemented |

### Model & AI Gateway
| Feature | Status |
|---|---|
| Multi-provider support (8 providers) | implemented |
| Model catalog (22 models) | implemented |
| Capability profiles | implemented |
| Provider adapter pattern | implemented |
| Model usage ledger | implemented |
| Quota gating | implemented |
| Plan configuration | implemented |
| New API token management | implemented |
| Token drift detection | implemented |

### Style Engine
| Feature | Status |
|---|---|
| CSS variable injection | implemented |
| Token bridge | implemented |
| Theme controls | implemented |
| Production preview mode | implemented |
| Style import/export | implemented |
| Skin packs | implemented |
| Asset packs | implemented |
| Recipe registry | implemented |
| Layout presets | implemented |
| Performance budgets | implemented |
| Style validation | implemented |

---

## Feature Summary

| Domain | Implemented | Mock | Not Implemented |
|---|---|---|---|
| Chat | 13 | 0 | 0 |
| Image | 6 | 1 | 0 |
| Video | 1 | 1 | 1 |
| Sandbox | 3 | 0 | 0 |
| Search | 3 | 0 | 0 |
| Audio | 0 | 0 | 2 |
| Data Analysis | 0 | 0 | 2 |
| Cross-cutting | 55+ | 0 | 0 |
| **Total** | **81+** | **2** | **5** |

---

*Evidence: Capability registry states from `src/lib/nexus-registry.ts`; feature evidence from source file analysis; API routes; store actions*
*Mock/not-implemented status from registry `state` field and tool slot registration*

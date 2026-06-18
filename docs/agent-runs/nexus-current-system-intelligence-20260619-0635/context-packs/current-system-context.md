# NEXUS Current System Context Pack
## For agent initialization & future analysis
## Generated: 2026-06-19 06:35 AEST

---

## Project Identity
- **Name**: NEXUS // AI OPS
- **Stack**: Next.js App Router + Supabase + Zustand
- **Language**: TypeScript
- **Package Manager**: (detected from project root)
- **Repository**: github.com/sean0900108489-cpu/NEXUS

---

## Architecture Quick Reference

### Layering
```
L1 — Agent Capabilities (chat, image, video, sandbox, audio, search, data-analysis)
L2 — Agent Handoff & Routing (planned, registry empty)
L3 — Workspace Graph & Workflow Runtime
L4 — System Operations (observability, deployment, sync, admin)
```

### Key Files (load order for understanding)
1. `src/lib/nexus-types.ts` (1854 lines) — All type definitions
2. `src/lib/nexus-registry.ts` (881 lines) — Provider, model, capability registries
3. `src/store/nexus-store.ts` (4679 lines) — Single Zustand store
4. `src/app/page.tsx` — Entry point
5. `src/components/nexus/nexus-ops.tsx` (3684 lines) — Main workspace UI
6. `src/lib/supabase/database.types.ts` (874 lines) — 26 table interfaces
7. `supabase/migrations/` — 28 migration files

### Route Pattern
- Pages: 2 (`/`, `/style-lab`)
- API routes: 57 (under `/api/` and `/api/v1/`)
- All routes in `src/app/api/**/route.ts`

### Store Pattern
- Single Zustand store with zundo temporal middleware
- IndexedDB persistence via idb-keyval
- Cloud sync via supabaseStateSyncManager
- ~40 state fields, ~100 actions

### Registry Pattern
- Single `nexus-registry.ts` with explicit `SCAN FIRST` rule
- Providers, models, capabilities, tool slots, graph nodes all registered here
- Extension: add to registry, not ad-hoc structures

### Supabase Pattern
- 26 database tables
- 1 storage bucket (`nexus-generated-assets`)
- 3 SECURITY DEFINER RPCs
- RLS policies on all client-facing tables
- Server-only tables protected from anon/authenticated

---

## Critical Paths (for debugging)

### Chat Flow
`WorkspaceChatComposerShell → store.addMessage → nexusApiClient → /api/chat → NewApiChatService → AiGatewayService → Provider API`

### Streaming Flow
`NexusOps → agent-stream → AgentStreamService → SSE → store.appendToMessage`

### Sync Flow
`store.saveWorkspaceSnapshot → supabaseStateSyncManager → /api/v1/sync/operations → SyncQueueService → workspace_snapshots`

### Auth Flow
`AuthScreen → Supabase Auth → store.login → auth-session validation → RLS policies`

---

## Largest Files (risk indicators)
| File | Lines | Risk |
|---|---|---|
| `nexus-style-lab.tsx` | 5965 | Monolithic style lab |
| `nexus-store.ts` | 4679 | Monolithic store |
| `nexus-ops.tsx` | 3684 | Monolithic workspace UI |
| `nexus-graph.tsx` | 2409 | Large graph component |
| `nexus-agent-settings-sidebar.tsx` | 1987 | Large settings panel |

---

## Registry States
| Entry | State |
|---|---|
| chat capability | implemented |
| image capability | mock |
| video capability | mock |
| sandbox capability | implemented |
| audio capability | not-implemented |
| search capability | implemented |
| data-analysis capability | not-implemented |
| agent-node | implemented |
| tool-node | not-implemented |
| memory-node | not-implemented |
| condition-node | not-implemented |

---

## Extension Points
- Provider Registry (8 slots, 2 verified)
- Model Catalog (22 models)
- Tool Slot Registry (6 slots)
- Tool Executor Registry (3 types)
- Graph Node Registry (8 node types)
- Feature Flags (DB-backed with API)
- Style Engine Recipe Registry
- Attachment Compiler Registry

---

## For Agents: Key Rules
1. **SCAN FIRST**: Check `nexus-registry.ts` before adding new architecture
2. **Types sync**: Changes to database.types.ts must update nexus-types.ts
3. **Additive migrations**: All migrations are additive-only (no destructive DDL)
4. **RLS boundaries**: Server-only tables must not get anon/authenticated grants
5. **Store pattern**: Use zustand slice pattern when adding new state domains

---

*This context pack is designed for initializing agents that need to understand or modify NEXUS*
*All paths are relative to `/Users/sean/Documents/FreeChat`*
*Evidence: static source analysis on 2026-06-19, no runtime data*

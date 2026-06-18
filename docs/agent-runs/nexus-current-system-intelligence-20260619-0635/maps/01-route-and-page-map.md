# Route & Page Map — NEXUS // AI OPS

## Overview

| Category | Count |
|---|---|
| Total App Router files | 60 |
| API `route.ts` files | 57 |
| `page.tsx` files | 2 |
| `layout.tsx` files | 1 |
| `loading.tsx` files | 0 |
| `error.tsx` files | 0 |
| `not-found.tsx` files | 0 |
| `template.tsx` files | 0 |

---

## Page Routes

| Path | File | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Main NEXUS workspace shell — renders `NexusOps` inside `NexusProductionPageShellBoundary` |
| `/style-lab` | `src/app/style-lab/page.tsx` | Style laboratory for workspace theme/style experimentation |

**Source**: `find src/app -name 'page.tsx'` (2 files)

---

## Root Layout

| Path | File | Description |
|---|---|---|
| `/` | `src/app/layout.tsx` | Root layout — Geist fonts, ThemeProvider, xyflow CSS import. Sets `title: "NEXUS // AI OPS"` |

---

## API Routes — Full Inventory

### Top-Level API

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/agent-stream` | POST | `src/app/api/agent-stream/route.ts` | Agent streaming endpoint |
| `POST /api/chat` | POST | `src/app/api/chat/route.ts` | General chat endpoint (with test) |
| `POST /api/image-gen` | POST | `src/app/api/image-gen/route.ts` | Image generation (with test) |
| `GET /api/image-gen/assets/[assetId]` | GET | `src/app/api/image-gen/assets/[assetId]/route.ts` | Retrieve generated image asset |
| `POST /api/memory-compress` | POST | `src/app/api/memory-compress/route.ts` | Memory compression |
| `GET /api/model-gateway/provision` | GET | `src/app/api/model-gateway/provision/route.ts` | Model gateway provisioning |
| `GET /api/models` | GET | `src/app/api/models/route.ts` | Model listing |
| `GET /api/predictive-intel` | GET | `src/app/api/predictive-intel/route.ts` | Predictive intelligence |
| `GET /api/system-status` | GET | `src/app/api/system-status/route.ts` | System health check |
| `POST /api/tools/fs-scanner` | POST | `src/app/api/tools/fs-scanner/route.ts` | File system scanner tool |
| `GET /api/tools/web-surfer` | GET | `src/app/api/tools/web-surfer/route.ts` | Web surfer tool |
| `POST /api/workflow-pro/brain-draft` | POST | `src/app/api/workflow-pro/brain-draft/route.ts` | Workflow Pro brain draft (with test) |

### Admin API

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/admin/new-api-token-drift` | POST | `src/app/api/admin/new-api-token-drift/route.ts` | Admin token drift check (with test) |
| `POST /api/admin/new-api-token-group-sync` | POST | `src/app/api/admin/new-api-token-group-sync/route.ts` | Admin token group sync (with test) |

### V1 API — Agents

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/agents/[agentId]/memory` | GET | `.../agents/[agentId]/memory/route.ts` | Agent memory retrieval |
| `POST /api/v1/agents/[agentId]/messages/archive` | POST | `.../agents/[agentId]/messages/archive/route.ts` | Archive agent messages |
| `GET /api/v1/agents/[agentId]/messages` | GET | `.../agents/[agentId]/messages/route.ts` | Get agent messages |
| `POST /api/v1/agents/[agentId]/stream` | POST | `.../agents/[agentId]/stream/route.ts` | Agent streaming |
| `POST /api/v1/agents/[agentId]/tasks/[taskId]/cancel` | POST | `.../agents/[agentId]/tasks/[taskId]/cancel/route.ts` | Cancel agent task |
| `GET /api/v1/agents/[agentId]/tasks/[taskId]` | GET | `.../agents/[agentId]/tasks/[taskId]/route.ts` | Get agent task |
| `GET /api/v1/agents/[agentId]/tasks` | GET | `.../agents/[agentId]/tasks/route.ts` | List agent tasks |
| `POST /api/v1/agents/memory-compress` | POST | `.../agents/memory-compress/route.ts` | Agent memory compression |

### V1 API — Artifacts

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/v1/artifacts/[artifactId]/archive` | POST | `.../artifacts/[artifactId]/archive/route.ts` | Archive artifact |
| `GET /api/v1/artifacts/[artifactId]/asset` | GET | `.../artifacts/[artifactId]/asset/route.ts` | Get artifact asset |
| `GET /api/v1/artifacts/[artifactId]/references` | GET | `.../artifacts/[artifactId]/references/route.ts` | Get artifact references |
| `GET /api/v1/artifacts/[artifactId]` | GET | `.../artifacts/[artifactId]/route.ts` | Get artifact |
| `GET /api/v1/artifacts/[artifactId]/versions` | GET | `.../artifacts/[artifactId]/versions/route.ts` | Get artifact versions |
| `GET /api/v1/artifacts` | GET | `.../artifacts/route.ts` | List artifacts |

### V1 API — Deployment

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/deployment/checks/latest` | GET | `.../deployment/checks/latest/route.ts` | Latest deployment check |
| `POST /api/v1/deployment/checks/run` | POST | `.../deployment/checks/run/route.ts` | Run deployment check |

### V1 API — Feature Flags

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/v1/feature-flags/[flagKey]/toggle` | POST | `.../feature-flags/[flagKey]/toggle/route.ts` | Toggle feature flag |
| `GET /api/v1/feature-flags` | GET | `.../feature-flags/route.ts` | List feature flags |

### V1 API — Health / Config

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/health` | GET | `.../health/route.ts` | Health check |
| `GET /api/v1/public-config` | GET | `.../public-config/route.ts` | Public config (used for runtime Supabase config) |

### V1 API — Notebooks

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/notebooks` | GET | `.../notebooks/route.ts` | List/upsert notebooks |

### V1 API — Observability

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/v1/observability/events` | POST | `.../observability/events/route.ts` | Submit events |
| `GET /api/v1/observability/metrics` | GET | `.../observability/metrics/route.ts` | Get metrics |
| `GET /api/v1/observability/traces/[traceId]` | GET | `.../observability/traces/[traceId]/route.ts` | Get trace |

### V1 API — Prompts

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/prompts` | GET | `.../prompts/route.ts` | List/upsert prompts |

### V1 API — Providers

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/providers/status` | GET | `.../providers/status/route.ts` | Provider status (with test) |
| `POST /api/v1/providers/verify` | POST | `.../providers/verify/route.ts` | Verify provider |

### V1 API — Sync

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/v1/sync/operations/[operationId]/cancel` | POST | `.../sync/operations/[operationId]/cancel/route.ts` | Cancel sync operation |
| `POST /api/v1/sync/operations/[operationId]/retry` | POST | `.../sync/operations/[operationId]/retry/route.ts` | Retry sync operation |
| `GET /api/v1/sync/operations` | GET | `.../sync/operations/route.ts` | List sync operations |
| `GET /api/v1/sync/status` | GET | `.../sync/status/route.ts` | Sync status |

### V1 API — Tool Runs

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/v1/tool-runs/[toolRunId]/cancel` | POST | `.../tool-runs/[toolRunId]/cancel/route.ts` | Cancel tool run |
| `POST /api/v1/tool-runs/[toolRunId]/confirm` | POST | `.../tool-runs/[toolRunId]/confirm/route.ts` | Confirm high-risk tool run |
| `GET /api/v1/tool-runs/[toolRunId]` | GET | `.../tool-runs/[toolRunId]/route.ts` | Get tool run |
| `GET /api/v1/tool-runs` | GET | `.../tool-runs/route.ts` | List tool runs |

### V1 API — Tools

| Route | Method | File | Purpose |
|---|---|---|---|
| `POST /api/v1/tools/[toolId]/run` | POST | `.../tools/[toolId]/run/route.ts` | Execute tool |

### V1 API — Workflows

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/workflows/groups` | GET | `.../workflows/groups/route.ts` | Workflow groups (with test) |
| `POST /api/v1/workflows/runtime-trace` | POST | `.../workflows/runtime-trace/route.ts` | Submit runtime trace (with test) |

### V1 API — Workspaces

| Route | Method | File | Purpose |
|---|---|---|---|
| `GET /api/v1/workspaces/[workspaceId]/state` | GET | `.../workspaces/[workspaceId]/state/route.ts` | Get workspace state |
| `GET /api/v1/workspaces/recovery/[workspaceId]` | GET | `.../workspaces/recovery/[workspaceId]/route.ts` | Workspace recovery by ID |
| `GET /api/v1/workspaces/recovery/latest` | GET | `.../workspaces/recovery/latest/route.ts` | Latest workspace recovery |
| `POST /api/v1/workspaces/recovery` | POST | `.../workspaces/recovery/route.ts` | Submit workspace recovery |
| `POST /api/v1/workspaces/session` | POST | `.../workspaces/session/route.ts` | Workspace session (auth + workspace binding) |

---

## Route Structure Summary

```
src/app/
├── layout.tsx                    (root layout)
├── page.tsx                      (main workspace page)
├── globals.css
├── favicon.ico
├── style-lab/
│   └── page.tsx                  (style lab page)
└── api/
    ├── agent-stream/
    │   └── route.ts
    ├── chat/
    │   ├── route.ts
    │   └── route.test.ts
    ├── image-gen/
    │   ├── route.ts
    │   ├── route.test.ts
    │   └── assets/[assetId]/
    │       └── route.ts
    ├── memory-compress/
    │   └── route.ts
    ├── model-gateway/
    │   └── provision/
    │       └── route.ts
    ├── models/
    │   └── route.ts
    ├── predictive-intel/
    │   └── route.ts
    ├── system-status/
    │   └── route.ts
    ├── tools/
    │   ├── fs-scanner/
    │   │   └── route.ts
    │   └── web-surfer/
    │       └── route.ts
    ├── workflow-pro/
    │   └── brain-draft/
    │       ├── route.ts
    │       └── route.test.ts
    ├── admin/
    │   ├── new-api-token-drift/
    │   │   ├── route.ts
    │   │   └── route.test.ts
    │   └── new-api-token-group-sync/
    │       ├── route.ts
    │       └── route.test.ts
    └── v1/
        ├── agents/...
        ├── artifacts/...
        ├── deployment/checks/...
        ├── feature-flags/...
        ├── health/...
        ├── notebooks/...
        ├── observability/...
        ├── prompts/...
        ├── providers/...
        ├── public-config/...
        ├── sync/operations/...
        ├── tool-runs/...
        ├── tools/...
        ├── workflows/...
        └── workspaces/...
```

---

*Evidence: `find src/app -type f | sort` on 2026-06-19*
*All file paths cited from filesystem scan of `/Users/sean/Documents/FreeChat`*

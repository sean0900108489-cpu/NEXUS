# NEXUS Current System Intelligence Map

Run: `nexus-current-system-intelligence-20260605-1347`  
Branch: `agent/nexus-current-system-intelligence`  
HEAD: `05593c9`

This round understands the current system. It does not refactor, pre-architect, move source files, or touch production Supabase.

## Executive Summary

| Signal | Value |
| --- | --- |
| Branch | agent/nexus-current-system-intelligence |
| HEAD | 05593c9 |
| Routes/pages/layout/handlers | 55 |
| Interactions | 619 |
| Components cataloged | 41 |
| State/store entries | 260 |
| Frontend/backend coupling files | 138 |
| Supabase source touchpoints | 80 |
| Migration files | 25 |
| Runtime trace | Skipped safely: localhost not confirmed |

NEXUS currently behaves like a production operator cockpit with a wide API control plane and a durable Supabase spine. The clearest current boundary is not file size; it is responsibility pressure: UI operation, workflow graph, state sync, API envelope, registry, and persistence all meet in a small set of dense files.

## Feature Capability Map

| Capability | Current abilities | Coupling risk |
| --- | --- | --- |
| Input / Ingestion | Prompt/chat composer inputs; Attachment compiler registry; Local file scanner tool route; Web surfer tool route; Notebook/prompt inventory routes | medium: composer/store/tool routes cross several layers |
| LLM Node | Agent stream service; Memory compression; Predictive intel; Workflow Brain draft; Provider status/verify; Image model access | high where UI settings, env, provider registry, and route handlers meet |
| Workflow Orchestration | Workflow Pro surface; Runtime Lite runner/state; Runtime trace API; Workflow group records; Brain proposal review/apply | high: graph UI, store, runtime, traces, and artifacts are interwoven |
| Graph / Canvas | Graph canvas; Workflow node/edge manipulation; Runtime node definitions; Graph Brain planner | high in canvas + workflow + store convergence |
| Output / Report | Artifacts and versions; Artifact references; Generated image assets; Post-processing/storage; Reports in docs | medium-high: storage/service role boundary must stay server-only |
| Agent Context | Agent messages; Memory records; Branch modal/context compression; Historical paging | medium: history/auth/RLS must align |
| Supabase Persistence | Workspace snapshots; State entities; Sync operations; Artifacts; Observability; Prompts/notebooks/messages; RLS migrations | high: direct sync bridge and server repositories need boundary discipline |
| Visual / UI Layer | Production shell style runtime; Style lab; Style validators; Page shell feature registry; Preview/preflight | medium-high due to style lab file size and production preview boundary |
| Extension / Plugin Layer | Nexus registry; Tool slot registry; Provider adapters; Workflow node registry; Attachment compiler registry; Feature flags | medium: some registry checks are server-side, some UI references remain direct |
| Settings / Configuration | Provider vault/status; Model tuning; Feature flags; Deployment checks; Public config | medium-high: config surfaces can accidentally expose provider/security state |
| Debug / Diagnostics | Health route; System status; Observability events/metrics/traces; Deployment safety checks; Auth boundary scans | medium: diagnostics must stay sanitized |

## Route And Page Map

See `maps/01-route-and-page-map.md`. App route files scanned: `55`. Main entries: `/` and `/style-lab`.

## UI Surface Map

See `maps/02-ui-surface-map.md`. High-density surfaces: `nexus-ops`, `nexus-graph`, Workflow Pro surface, style lab, store, and state-sync.

## Button And Interaction Map

See `maps/03-button-and-interaction-map.md` and `reports/ui-runtime/interaction-inventory.json`. Static signals found: `619`.

## Component Inventory

See `maps/04-component-inventory.md` and `reports/component-inventory/component-catalog.json`. Large file risks are in `reports/component-inventory/large-component-risk.md`.

## State And Store Map

See `maps/05-state-and-store-map.md`. Store entries mapped: `260`. `state-sync.ts` remains the major local/cloud bridge.

## Frontend Backend Coupling Map

See `maps/06-frontend-backend-coupling-map.md`. Coupling files mapped: `138`.

## Supabase Touchpoint Map

See `maps/07-supabase-touchpoint-map.md`. Source touchpoint files: `80`. Production Supabase was not queried.

## Extension Layer Map

See `maps/08-extension-layer-map.md`. Registry/adapter/provider/tool/workflow-node signals are present; this round does not convert them into plugins.

## Runtime Trace Map

See `maps/09-runtime-trace-map.md`. Runtime trace skipped safely: no localhost listener confirmed and no isolated non-production env confirmed.

## Unknowns And Questions

| Area | Question |
| --- | --- |
| Runtime visibility | Which static UI controls are actually visible for a given auth/workspace/session state? |
| Daily logs/history | Do observability/system_events/usage_metrics/message history tables contain records for every day? |
| LINE Keep loop | Should codebase reports be sent to an external LINE Keep service? |
| Interaction semantics | Which icon-only controls have accessible names at runtime? |
| Store symbol precision | Exact read/write ownership for every store action needs AST symbol graph. |
| Supabase live behavior | Do local migration expectations match the live project exactly? |

## Pre-Architecture Inputs

- Oversized files require responsibility inventory before any refactor: nexus-ops, style lab, nexus-store, nexus-graph, workflow-pro-surface, state-sync.
- Preserve server-only service-role boundaries around generated image storage and backend repositories.
- Keep apiHandler as the durable API envelope/security/idempotency boundary unless source-level proof says otherwise.
- Treat state-sync as a cross-boundary hotspot between UI/store and Supabase/session behavior.
- Use registry-first behavior already present in nexus-registry, workflow runtime registry, tool registry validator, and attachment compiler registry.
- Do not move old files wholesale into a new architecture; extract capabilities and contracts first.

## Next Round Gates

| Gate | Status |
| --- | --- |
| Safe localhost runtime trace | remaining |
| Accessibility snapshot/axe audit | remaining |
| Read-only daily log/Supabase audit | remaining, requires explicit approval |
| Symbol-level state/action AST map | remaining |
| Pre-Architecture Steel Beam | after above or with accepted static limits |

## Estimated Distance To Quality Ceiling

Current static intelligence quality is about `78%` of the desired ceiling. Estimated rounds to quality ceiling: `3` more rounds: safe runtime trace, symbol-level/AST map, and optional read-only Supabase daily-data audit.


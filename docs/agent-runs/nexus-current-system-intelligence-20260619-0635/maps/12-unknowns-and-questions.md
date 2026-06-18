# Unknowns & Questions — NEXUS Current System Intelligence

## Architecture Unknowns

### 1. L2 Handoff Behavior
- **What**: `HANDOFF_RULE_REGISTRY` in `nexus-registry.ts` is empty (`[]`)
- **Impact**: Agent-to-agent routing/handoff behavior is emergent rather than rule-defined
- **Question**: How do agents currently discover and route to other agents? Is there implicit handoff logic in `nexus-ops.tsx` or `nexus-store.ts`?

### 2. Missing Capability Implementations
- **Audio** (L4): Registry says `not-implemented` — are there any UI placeholders or is it entirely invisible?
- **Data Analysis** (L4): `not-implemented` — same question
- **Tool Node** (L4): `not-implemented` in graph node registry — are tools accessible from graph view?
- **Memory Node** (L4): `not-implemented` — how are memory blocks visualized in graph view?
- **Condition Node** (L4): `not-implemented` — no conditional routing in workflows

### 3. Database Types Synchronization
- **What**: `src/lib/supabase/database.types.ts` has manually defined TypeScript interfaces, not auto-generated from Supabase CLI
- **Risk**: Manual type definitions may drift from actual database schema
- **Note**: A migration comment explicitly references "SYNC-EXPANSION" rule requiring simultaneous updates to `nexus-types.ts`
- **Question**: Is there a process to keep database.types.ts in sync with migrations?

### 4. Undo/Redo Depth
- **What**: zundo temporal middleware is used but no depth limit was found in the scan
- **Question**: What is the undo history depth? Is it bounded to prevent memory issues?

### 5. IndexedDB vs Supabase Priority
- **What**: Store uses IndexedDB (idb-keyval) for local persistence AND Supabase for cloud sync
- **Question**: What is the conflict resolution strategy when local and cloud state diverge? Is local always the source of truth?

### 6. Mock Mode Coverage
- **What**: `streamMode: "mock"` exists in the store. Image generation has mock fallback.
- **Question**: How many features work without any external API keys? Which features are mock-only?

### 7. Provider Verification
- **What**: All remote providers have `verificationStatus: "untested"` in the registry. Only `local-preview` and `local-sandbox` are verified.
- **Question**: Is there a provider health check that runs on app startup? Does verification happen lazily on first use?

### 8. New API Token Architecture
- **What**: `user_new_api_tokens` table stores encrypted API tokens per user. A `new-api-admin/token-drift-service.ts` exists for drift detection.
- **Question**: What is the "New API" referenced here? Is this an internal API gateway or a third-party service?

### 9. Workflow Pro vs Workflow Runtime Lite
- **What**: Two workflow systems exist: `workflow-pro/` (17 files) and `workflow-runtime-lite/` (11 files)
- **Question**: What is the relationship? Is Runtime Lite a simplified version of Workflow Pro, or are they for different use cases?

### 10. Database Client-Side vs Server-Side
- **What**: `src/lib/supabase/client.ts` creates a browser-side Supabase client. `src/lib/supabase/admin.ts` and `request.ts` exist for server-side.
- **Question**: How much data access goes through the browser client vs server routes? Is there direct browser-to-Supabase access?

### 11. Style Engine Completeness
- **What**: The style engine has extensive infrastructure (skin packs, asset packs, recipe registry, layout presets, performance budgets, token bridge, preview mode) but `NexusStyleLab` at 5965 lines is monolithic.
- **Question**: Is the style engine fully functional or partially implemented? What percentage of the style engine's planned features are complete?

### 12. Macros vs Templates
- **What**: The store has both `saveCurrentCanvasAsMacro` and `instantiateMacro` + `spawnMacro`. The database has `workflow_templates`.
- **Question**: Are macros and templates the same concept? How do canvas macros relate to workflow templates?

### 13. Real-time Collaboration
- **What**: No WebSocket or real-time subscription infrastructure was found
- **Question**: Is multi-user collaboration planned? Does the sync infrastructure support it?

### 14. Offline-First Completeness
- **What**: IndexedDB persistence + sync queue suggest offline-first. But streaming and AI model calls require network.
- **Question**: What is the offline experience? Can users compose messages offline?

### 15. Security Model Depth
- **What**: RLS policies, permission service, secret boundary, route spoof protection, API idempotency — extensive security infrastructure
- **Question**: Has the security model been penetration tested? What is the threat model?

---

## Metrics Unknowns

| Metric | Reason Unknown |
|---|---|
| Test coverage percentage | No coverage tool configuration found in scan |
| Bundle size | Not analyzed (requires build) |
| API latency (p50/p95/p99) | Requires runtime monitoring |
| Active user count | Requires Supabase connection |
| Database row counts | Requires Supabase connection |
| Error rate | Requires observability data |
| Token usage trends | Requires usage_metrics data |

---

## File-Level Unknowns

| File | Question |
|---|---|
| `src/lib/nexus-defaults.ts` | Was not read in detail — what default values are configured? |
| `src/lib/workspace-kernel.ts` | Was not read — what is the kernel's responsibility scope? |
| `src/lib/workflow-engine.ts` | Was not read — how does this differ from workflow-pro and workflow-runtime-lite? |
| `src/lib/public-config.ts` | Was not read — what public config is exposed? |
| `src/lib/composer/image-generation-settings.ts` | Referenced by nexus-types — what image generation settings exist? |
| `src/lib/tool-executors.ts` | Referenced by nexus-store — what is the tool executor interface? |
| `src/middleware.ts` | Not scanned — is there Next.js middleware? |

---

*Evidence: These unknowns are derived from gaps in the static analysis scan — files not fully read, runtime data not available, and architecture decisions not documented in source*
*No production Supabase was connected — operational metrics are intentionally unknown*

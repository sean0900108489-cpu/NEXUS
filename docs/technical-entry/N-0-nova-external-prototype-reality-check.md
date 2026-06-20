# N-0: NOVA External Prototype Reality Check

**Date:** 2026-06-21
**Status:** Read-only classification. No code changes. No Supabase changes. No migration. No RLS changes. No NOVA ingestion expansion.
**Sources inspected:** `/Users/sean/Documents/NOVA/` — full directory tree, 12 server source files, 7 design docs, package.json
**Supabase project:** `xjuglddxwnikvcwxfbzg` (Same as NEXUS production — LOCKED)

---

## Classification Summary

| Category | Count | Items |
|----------|-------|-------|
| **Reusable as-is** | 5 | Architectural concepts, data model, chunking/parsing, evidence framework, RAG eval framework |
| **Partially reusable** (adaptation needed) | 3 | Gemini embedding pipeline, LLM answer pipeline, Express API routes |
| **Must rebuild in NEXUS** | 5 | React frontend, auth/user model, tenancy model, RLS policies, Express server runtime |

---

## 1. Reusable As-Is (Architectural & Design Assets)

### 1.1 Knowledge Tree Architecture — REUSE

**What it is:** The `00_system_map` through `09_ops_eval` directory structure defining a 10-stage data lifecycle: ingestion → parsing → normalization → indexing → retrieval → evidence → reasoning → output → ops/eval.

**Code location:** `/Users/sean/Documents/NOVA/00_system_map/` through `09_ops_eval/` — all README.md files.

**Why reusable:** This is a documentation-only architecture. It defines module boundaries, dependency direction, truth layer rules, and forbidden reverse flows — all of which map directly to NEXUS's planned NOVA Workspace Notebook (S-9). The lifecycle concept is technology-agnostic. No code to port — pure design.

**How it maps to NEXUS:**
| NOVA Module | NEXUS Equivalent |
|------------|-----------------|
| 00_system_map | NEXUS architecture docs |
| 01_ingestion | NOVA Workspace Notebook ingestion (S-9) |
| 02_parsing | NOVA's `text.ts` + future chunking |
| 03_normalization | NOVA's `chunkText()` |
| 04_indexing | Supabase pgvector HNSW (already exists) |
| 05_retrieval | `match_nova_chunks` RPC (already exists) |
| 06_evidence | Evidence framework (1.3 below) |
| 07_reasoning | NEXUS agent runtime / LLM gateway |
| 08_output | NEXUS chat / UI |
| 09_ops_eval | NEXUS observability / RAG eval |

**Verdict:** ✅ Import the entire knowledge tree concept as design documentation. Zero code migration needed.

---

### 1.2 Data Model Design — REUSE

**What it is:** The `nova_documents`, `nova_chunks`, `nova_ingest_runs` table design and the `match_nova_chunks` RPC contract — already live in the NEXUS Supabase project.

**Code location:** `/Users/sean/Documents/NOVA/README.md` (Supabase section), `/Users/sean/Documents/NOVA/server/supabase.ts`, `/Users/sean/Documents/NOVA/server/index.ts` (ingest + chat routes).

**Why reusable:** These tables already exist in the NEXUS production Supabase project (`xjuglddxwnikvcwxfbzg`). NOVA's Express API writes to the SAME database. The table design works — ingestion creates documents + chunks with embeddings, retrieval queries via `match_nova_chunks` RPC. The schema is sound; only RLS policies need fixing (S-9).

**Current table structure (confirmed in code):**

```
nova_documents:
  id, title, source_type, mime_type, file_name, metadata (jsonb), created_at

nova_chunks:
  id, document_id, chunk_index, kind, content, embedding (vector(1536)),
  metadata (jsonb), created_at

nova_ingest_runs:
  id, source_label, status, item_count, message, completed_at, metadata (jsonb), created_at

match_nova_chunks(query_embedding, match_count, match_threshold, filter_kind):
  Returns: id, title, kind, content, similarity, document_id, chunk_index, source_type
```

**Verdict:** ✅ Table design is proven. RLS policies need fixing (must add `workspace_id` per FINAL-LOCK-3) — but that's S-9's concern, not a rebuild.

---

### 1.3 Evidence Framework — REUSE

**What it is:** The `buildEvidencePack()` function that transforms retrieval candidates into structured evidence records with claim, support level, confidence, source truth metadata, contradictions, sufficiency assessment, and data gap reporting.

**Code location:** `/Users/sean/Documents/NOVA/server/evidence/buildEvidencePack.ts`, `/Users/sean/Documents/NOVA/server/evidence/types.ts`

**Why reusable:** This is a standalone pure function. It takes `RetrievedCandidate[]` as input, produces `EvidencePack` as output. No side effects. No database access. No auth. It defines the evidence vocabulary that NEXUS needs.

**Key concepts preserved:**
- `EvidenceItem`: claim, quoteOrExcerpt, source, chunk, supportLevel, confidence
- `EvidencePack`: question, trace, candidates, evidence, contradictions, sufficiency, dataGaps, futureFuel, notNow
- Source truth hierarchy: raw_source → parsed_source → derived_view → generated_material
- Labels: `RETRIEVED_CANDIDATE`, `NOT_SOURCE_TRUTH`

**How to bring into NEXUS:** Copy `buildEvidencePack.ts` as a server-side utility. Call it from the NOVA retrieval endpoint inside NEXUS. The evidence vocabulary is a design asset — no implementation change needed.

**Verdict:** ✅ Pure function. Import directly into NEXUS `src/lib/backend/` as a knowledge service utility.

---

### 1.4 Text Chunking & Parsing — REUSE

**What it is:** `chunkText()` — paragraph-aware text chunker with max length, overflow splitting, and cleaning. `extractText()` — PDF parser with PDFParse library + UTF-8 fallback.

**Code location:** `/Users/sean/Documents/NOVA/server/text.ts`

**Why reusable:** Both are standalone pure functions. No auth. No DB. No external service dependencies beyond `pdf-parse` (already in NOVA's package.json). The chunking logic is production-proven — it powers the entire ingestion pipeline.

**Chunking algorithm (verified):**
1. Clean text (remove excessive whitespace/newlines)
2. Split by paragraph boundaries (`\n\n+`)
3. Accumulate paragraphs until `maxLength` (1600 chars)
4. Overflow: split long paragraphs into `maxLength` pieces
5. Return array of clean chunks

**How to bring into NEXUS:** Copy `text.ts` into NEXUS backend. Already TypeScript. Already tested via RAG eval. No adaptation needed for Phase 1.

**Verdict:** ✅ Pure utility. Import directly.

---

### 1.5 RAG Evaluation Framework — REUSE

**What it is:** Automated RAG evaluation with fixture-based test cases, traceable quality gates, CI workflow, manual eval records, and result indexing/trending.

**Code location:** `/Users/sean/Documents/NOVA/scripts/eval-rag.mjs`, `/Users/sean/Documents/NOVA/09_ops_eval/` directory (8 eval artifacts, 10+ result files)

**Why reusable:** This is an ops tool, not a product feature. It evaluates retrieval quality independently of the application runtime. The eval fixtures (`rag_eval_cases.json`, `rag_fixture_expectations.json`) are reusable test assets. The eval runner (`eval-rag.mjs`) can work against any Supabase project with `match_nova_chunks`.

**Eval dimensions (from fixture files):**
- Identity gate (correct document returned)
- Latency budget (retrieval under threshold)
- Groundedness (answer cites retrieved sources)
- Markdown report generation
- Regression detection (compare run-to-run)
- Static-only mode (no model call, retrieval-only eval)

**How to bring into NEXUS:** Keep as a separate ops tool. Point it at the NEXUS Supabase project. Add to CI pipeline. No integration needed — it's an external evaluation harness.

**Verdict:** ✅ Keep as-is. External tool. Point at NEXUS Supabase.

---

## 2. Partially Reusable (Adaptation Required)

### 2.1 Gemini Embedding Pipeline — PARTIAL

**What it is:** `embedText()` function using `@google/genai` SDK, Gemini Embedding 2, 1536 dimensions, with task type support (`RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`).

**Code location:** `/Users/sean/Documents/NOVA/server/gemini.ts`

**What's reusable:**

| Component | Reusable? | Notes |
|-----------|:---:|-------|
| Embedding contract definition | ✅ YES | `embeddingContract()` — model, dimensions, task types, input version |
| Task type pattern (DOCUMENT vs QUERY) | ✅ YES | Proven to improve retrieval quality |
| 1536-dimensional vectors | ✅ YES | Already in Supabase pgvector HNSW |
| Input truncation (28K chars) | ✅ YES | Prevents oversized embedding requests |
| `@google/genai` SDK usage | ⚠️ ADAPT | NEXUS must decide: keep direct SDK or route through New API |
| `describeImage()` vision | ⚠️ ADAPT | NEXUS has its own image pipeline (img2, riverflow) |
| Readiness probe (`geminiReadiness`) | ✅ YES | Health check pattern to keep |

**What must change for NEXUS:**
1. **Provider routing:** NEXUS uses New API gateway for model calls. Gemini embedding may need to go through New API or keep direct SDK — owner decision.
2. **Server-side only:** NEXUS already keeps embeddings server-side. This aligns. The Express API's `embedText` call path becomes a NEXUS API route or backend service.
3. **Per FINAL-LOCK-3:** All ingestion must attach `workspace_id`. The embedding call itself is unchanged — the metadata around it changes.

**Verdict:** ⚠️ Keep embedding logic. Adapt provider routing and add workspace scoping. Do not change the embedding model or dimensions.

---

### 2.2 LLM Answer Pipeline — PARTIAL

**What it is:** Multi-provider fallback chain: OpenAI → Gemini → DeepSeek → OpenRouter. Source-grounded answering with inline citations `[1], [2]`.

**Code location:** `/Users/sean/Documents/NOVA/server/llm.ts`

**What's reusable:**

| Component | Reusable? | Notes |
|-----------|:---:|-------|
| Multi-provider fallback chain | ⚠️ ADAPT | NEXUS already has this via New API gateway + `ai-gateway-service.ts` |
| Source-grounded prompt template | ✅ YES | `systemPrompt` + context injection pattern |
| Inline citation format `[1], [2]` | ✅ YES | Proven UX pattern |
| Provider SDK usage (OpenAI, DeepSeek, OpenRouter) | ❌ NO | NEXUS routes everything through New API — no direct SDK calls |
| Fallback error handling | ✅ YES | Pattern to keep, but route through NEXUS error envelope |

**What must change for NEXUS:**
1. **Route through New API:** No direct OpenAI/DeepSeek/OpenRouter SDK calls. All model calls go through `ai-gateway-service.ts` → New API → channel routing.
2. **Wallet gate:** Every answer call must pass `assertSufficientCredits` (S-3).
3. **Usage recording:** Every answer call must record to `model_usage_ledger` (existing pattern).
4. **Response envelope:** Use NEXUS API error envelope (`{ error: { code, message, retryable }, requestId }`), not bare error strings.

**Verdict:** ⚠️ Keep the answer orchestration pattern (source grounding, citations, fallback chain concept). Rebuild the provider layer to use NEXUS New API gateway + wallet gate.

---

### 2.3 Express API Routes — PARTIAL

**What it is:** 7 Express routes: `/api/status`, `/api/gemini-check`, `/api/ingest`, `/api/chat`, `/api/visual-search`, `/api/library` (GET + DELETE).

**Code location:** `/Users/sean/Documents/NOVA/server/index.ts`

**What's reusable:**

| Route | Reusable? | Notes |
|-------|:---:|-------|
| `/api/status` | ✅ PATTERN | Health check pattern — but NEXUS already has `/api/system-status` |
| `/api/gemini-check` | ✅ PATTERN | Readiness probe — keep as ops endpoint |
| `/api/ingest` (POST) | ⚠️ ADAPT | Core logic reusable: parse → chunk → embed → store. Must add workspace_id, auth, RLS. Must go through NEXUS API handler. |
| `/api/chat` (RAG Q&A) | ⚠️ ADAPT | Retrieval + answer pattern reusable. Must add workspace scope, wallet gate, usage recording. |
| `/api/visual-search` | ⚠️ ADAPT | Same as chat but with image input. NEXUS has image-gen route already. |
| `/api/library` (GET) | ⚠️ ADAPT | Document list query. Must scope to workspace. |
| `/api/library` (DELETE) | ❌ REBUILD | Bulk delete with `neq('id', '0000...')` is a prototype shortcut. Must be per-document, per-workspace, with audit. |

**What must change for NEXUS:**
1. **Auth:** Every route must go through `resolveApiActor()` → workspace membership check (FINAL-LOCK-3)
2. **API handler:** Must use NEXUS `apiHandler` envelope, not bare Express
3. **Route paths:** Must be under `/api/workspaces/{workspaceId}/nova/...` not bare `/api/...`
4. **Wallet gate:** RAG Q&A must pass `assertSufficientCredits`
5. **Express runtime:** NEXUS does not use Express. All API routes are Next.js App Router route handlers.

**Verdict:** ⚠️ Route logic is sound. Route infrastructure (Express, auth, paths, error envelope) must be rebuilt in NEXUS Next.js API routes.

---

## 3. Must Rebuild in NEXUS

### 3.1 React Frontend — REBUILD

**What it is:** Vite + React SPA with dark cybernetic console UI. Hero image, composer, source rail, runtime panel.

**Code location:** `/Users/sean/Documents/NOVA/src/` (App.tsx, main.tsx, styles)

**Why rebuild:**
- NEXUS is Next.js App Router, not Vite SPA. Different framework.
- NOVA's UI is a standalone console. NEXUS needs NOVA as an embedded workspace panel (S-9).
- NEXUS has its own design system (`NexusStyleRuntimeProvider`, `nexus-style-engine`), theming, and component library.
- The NOVA hero image, red accent, and console feel are design INSPIRATION to carry over — not code to port.
- 23 unwired controls exist that would need wiring in any case.

**What to carry over as design inspiration:**
- Visual thesis: dark graphite, red accents (`#ff2d2d`), compressed typography
- Layout rules: center priority, side rails, sticky source rail, proportional constraints
- Token values: backgrounds, panel surfaces, borders, text colors, radius values

**Verdict:** ❌ Design inspiration only. Code is framework-incompatible. Rebuild as NEXUS workspace panel component.

---

### 3.2 Auth & User Model — REBUILD

**What NOVA has:** NOVA has NO user model. It uses `SUPABASE_SERVICE_ROLE_KEY` for writes and `SUPABASE_PUBLISHABLE_KEY` for reads. No auth middleware. No user sessions. No workspace concept. No tenant isolation. Every request is anonymous at the application layer.

**What NEXUS needs:**
- Supabase Auth sessions (`resolveApiActor`)
- Per-user wallet (S-2/S-3/S-5)
- Workspace membership checks (FINAL-LOCK-3)
- RLS policies scoped to workspace (S-9)
- API idempotency keys
- Permission audit logs

**Verdict:** ❌ Complete rebuild. NOVA has zero auth infrastructure. NEXUS has a full auth stack. NOVA's routes must be rewritten behind NEXUS auth.

---

### 3.3 Tenancy Model — REBUILD

**What NOVA has:** All documents, chunks, and ingest runs are GLOBAL. No `user_id`. No `workspace_id`. The `/api/library` DELETE route deletes ALL documents for ALL users. This is the personal-tool residue documented in the Technical Entry Report.

**What NEXUS needs:**
- `workspace_id` on all NOVA tables (FINAL-LOCK-3)
- RLS policies scoped to workspace membership
- Retrieval scoped to workspace (`match_nova_chunks` with workspace filter)
- Per-workspace library queries
- Per-document deletion (not bulk)

**Verdict:** ❌ Complete rebuild of the tenancy layer. Table structures survive. Ownership columns and RLS are new.

---

### 3.4 RLS Policies — REBUILD

**What NOVA has:** Broad `nova_` write policies allowing `anon`/`authenticated` to insert/update/delete. This is the documented P0 security gap.

**What NEXUS needs:**
- Workspace-scoped RLS on all NOVA tables
- `SELECT` policies via workspace membership
- `INSERT` policies via workspace membership
- `UPDATE`/`DELETE` policies via workspace membership
- `match_nova_chunks` scoped to workspace
- Service role for server-side operations only

**Verdict:** ❌ Must rebuild all RLS policies. Current policies are a documented P0 gap. This is S-9's primary task.

---

### 3.5 Express Server Runtime — REBUILD

**What NOVA has:** Standalone Express server on port 8787. `tsx watch` for hot reload. Direct Supabase client with service role key. No API versioning. No request tracing. No idempotency. No rate limiting. No feature flags.

**What NEXUS has:** Next.js App Router API routes. `apiHandler` envelope. Request ID + trace ID. Idempotency keys. Feature flags. `resolveApiActor` auth. Rate limiting via Vercel + iptables on VPS.

**Verdict:** ❌ Express server is incompatible with NEXUS architecture. All route logic must be ported to Next.js API route handlers. The Express server itself is not reusable — only the business logic inside the route handlers.

---

## 4. Dependency Map: What NOVA Uses

### 4.1 NPM Dependencies

| Package | NOVA Usage | NEXUS Already Has? | Action |
|---------|-----------|:---:|--------|
| `@google/genai` | Gemini embedding + vision | ❌ | Add if Gemini direct SDK kept |
| `@supabase/supabase-js` | DB client | ✅ | Already in NEXUS |
| `express` | API server | ❌ | NOT needed — NEXUS uses Next.js |
| `cors` | CORS middleware | ❌ | NOT needed — NEXUS uses Next.js |
| `multer` | File upload handling | ❌ | Check if NEXUS has file upload |
| `openai` | OpenAI/DeepSeek SDK | ❌ | NOT needed — NEXUS uses New API |
| `pdf-parse` | PDF text extraction | ❌ | Add for NOVA ingestion |
| `react`, `react-dom` | Frontend | ✅ | Already in NEXUS |
| `lucide-react` | Icons | ❌ | Already in NEXUS (via different path) |
| `dotenv` | Env loading | ❌ | NOT needed — Next.js handles env |
| `vite` | Build tool | ❌ | NOT needed — NEXUS uses Next.js |
| `tsx` | TypeScript runner | ❌ | NOT needed — NEXUS uses `next dev` |
| `concurrently` | Dev process runner | ❌ | NOT needed |

### 4.2 External Services

| Service | NOVA Usage | NEXUS Equivalent |
|---------|-----------|-----------------|
| **Gemini Embedding 2** | All embeddings (1536d) | Same — keep |
| **OpenAI Responses API** | Primary answer model | New API → OpenAI-General channel |
| **DeepSeek API** | Fallback answer | New API → DeepSeek channel |
| **OpenRouter** | Last-resort answer | New API → OpenRouter channel |
| **Supabase** | Vector DB + document store | Same project (`xjuglddxwnikvcwxfbzg`) |
| **Gemini Vision** | Image description for ingest | Keep or replace with New API vision model |

---

## 5. Migration Path Recommendation

### Phase 1: Design Assets (Zero Code Migration)

1. Import knowledge tree architecture as NEXUS NOVA docs
2. Import evidence vocabulary (`EvidenceItem`, `EvidencePack`, truth hierarchy)
3. Import RAG eval framework as external ops tool
4. Document NOVA design tokens for future UI work

### Phase 2: Backend Logic (S-9 Authorized)

5. Copy `text.ts` (chunking + parsing) into NEXUS backend
6. Copy `buildEvidencePack.ts` into NEXUS backend
7. Adapt `gemini.ts` embedding pipeline behind NEXUS API routes
8. Adapt `server/index.ts` route logic into Next.js API route handlers:
   - `POST /api/workspaces/{id}/nova/ingest`
   - `POST /api/workspaces/{id}/nova/chat`
   - `GET /api/workspaces/{id}/nova/library`
9. Rebuild all RLS policies (S-9 primary task)
10. Add `workspace_id` to all NOVA tables (S-9 primary task)

### Phase 3: Frontend (S-9 / Future)

11. Build NOVA workspace panel as NEXUS React component
12. Carry over design tokens (dark theme, red accent, console feel)
13. Wire composer, source rail, evidence panel to NEXUS API routes

### What NOT to Migrate

- Express server (use Next.js API routes)
- Direct OpenAI/DeepSeek/OpenRouter SDK calls (use New API gateway)
- Bulk delete endpoint (rebuild with per-document, per-workspace semantics)
- Vite build configuration (use Next.js)
- NOVA's `package.json` (NEXUS has its own)
- NOVA's `.env` files (use Vercel env)
- Broad RLS policies (rebuild with workspace scope)

---

## 6. Classification Verdict

| Asset | Classification | Action |
|-------|:---:|--------|
| Knowledge Tree Architecture | ✅ REUSE AS-IS | Import as docs |
| Data Model (tables + RPC) | ✅ REUSE AS-IS | Already in NEXUS Supabase |
| Evidence Framework | ✅ REUSE AS-IS | Copy `buildEvidencePack.ts` |
| Chunking & Parsing | ✅ REUSE AS-IS | Copy `text.ts` |
| RAG Eval Framework | ✅ REUSE AS-IS | Keep as external ops tool |
| Gemini Embedding Pipeline | ⚠️ PARTIAL | Keep logic, adapt provider routing |
| LLM Answer Pipeline | ⚠️ PARTIAL | Keep orchestration pattern, route through New API |
| Express API Routes | ⚠️ PARTIAL | Keep route logic, rebuild in Next.js |
| React Frontend | ❌ REBUILD | Design inspiration only |
| Auth & User Model | ❌ REBUILD | No auth exists in NOVA |
| Tenancy Model | ❌ REBUILD | No workspace scoping exists |
| RLS Policies | ❌ REBUILD | Current policies are P0 gap |
| Express Runtime | ❌ REBUILD | Incompatible with NEXUS arch |

**Overall: NOVA is a proven prototype with reusable backend logic and design assets. It was NEVER an independent product and should NOT be resurrected as one. Its business logic (ingestion, chunking, embedding, evidence, RAG eval) should be absorbed into NEXUS as the NOVA Workspace Notebook Knowledge Service. Its frontend and infrastructure must be rebuilt within NEXUS.**

---

## No Implementation Performed

Read-only prototype inspection. No code copied. No dependencies installed. No Supabase changes. No RLS changes. No NOVA ingestion expansion.

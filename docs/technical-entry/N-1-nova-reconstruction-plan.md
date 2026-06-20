# N-1: NOVA Workspace Knowledge Service v1 Reconstruction Plan

**Date:** 2026-06-21
**Status:** Design-only reconstruction plan. No code changes. No Supabase changes. No migration. No route implementation.
**Authority:** N-0 (NOVA External Prototype Reality Check)
**Owner Lock:** FINAL-LOCK-3 (NOVA workspace-scoped from Phase 1)
**Supabase Identity:** `xjuglddxwnikvcwxfbzg` (LOCKED)

---

## Purpose

This plan absorbs reusable NOVA prototype assets into NEXUS-native services and redefines the old S-9 (NOVA Workspace Notebook P0 Fix) as a narrower schema/RLS/RPC subsection under the new N-series. The old S-9 is retained but scoped down. New N-2 through N-5 slices are defined for the actual reconstruction work.

---

## 1. Architecture: NOVA as NEXUS Knowledge Service

### 1.1 Service Boundary

```
NEXUS Platform
  ├─ Home Shell (platform-first entry)
  ├─ Workspace OS (NexusOps, panels, graph, workflow)
  ├─ Wallet System (balances, transactions, gate)
  ├─ AI Gateway (model routing, usage ledger)
  │
  └─ NOVA Workspace Knowledge Service ← THIS PLAN
       ├─ Ingestion Service (upload → parse → chunk → embed → store)
       ├─ Retrieval Service (search → rank → retrieve)
       ├─ Evidence Service (transform candidates → evidence records)
       ├─ Library Service (CRUD for documents/chunks per workspace)
       └─ RAG Chat Service (retrieve + answer with citations)
```

### 1.2 What NOVA Is NOT

- NOT a separate product or runtime (no Express, no standalone Vite app)
- NOT an independent MCP server
- NOT directly accessible by external clients (no CORS, no public endpoints)
- NOT a user-facing UI (UI is a NEXUS workspace panel, designed later)
- NOT an auth boundary (auth is NEXUS-wide via `resolveApiActor`)

### 1.3 What NOVA Owns Within NEXUS

| Responsibility | Location |
|---------------|----------|
| Document ingestion + chunking + embedding | `src/lib/backend/nova/ingestion/` |
| Vector retrieval via `match_nova_chunks` | `src/lib/backend/nova/retrieval/` |
| Evidence pack construction | `src/lib/backend/nova/evidence/` |
| Document library CRUD | `src/lib/backend/nova/library/` |
| RAG chat (retrieve + grounded answer) | `src/lib/backend/nova/chat/` |
| API routes for all above | `src/app/api/workspaces/[id]/nova/` |
| Types for all above | `src/lib/nova-types.ts` (with nexus-types.ts reference) |

---

## 2. Asset Absorption Map (N-0 → N-1)

### 2.1 Reusable As-Is Assets — Direct Copy When Authorized

| N-0 Asset | N-1 Destination | Copy/Rebuild |
|-----------|----------------|:---:|
| Knowledge Tree Architecture (00–09) | `docs/nova/` in NEXUS repo — pure docs | Copy docs |
| `text.ts` (chunkText + extractText) | `src/lib/backend/nova/ingestion/chunking.ts` | Copy code + add JSDoc |
| `buildEvidencePack.ts` | `src/lib/backend/nova/evidence/build-evidence-pack.ts` | Copy code + add NEXUS error types |
| `evidence/types.ts` | `src/lib/nova-types.ts` (EvidenceItem, EvidencePack, etc.) | Copy types |
| RAG eval framework | Keep at `/Users/sean/Documents/NOVA/scripts/` — external tool | Keep where it is |

### 2.2 Partially Reusable Assets — Adapt When Authorized

| N-0 Asset | Adaptation Required | N-1 Destination |
|-----------|-------------------|----------------|
| `gemini.ts` (embedText, embeddingContract) | Keep logic. Remove direct `@google/genai` SDK if routing through New API. Add workspace_id context. | `src/lib/backend/nova/ingestion/embedding.ts` |
| `llm.ts` (answerQuestion, multi-provider fallback) | Keep source grounding + citation pattern. Replace direct SDK calls with NEXUS `ai-gateway-service.ts`. Add wallet gate. | `src/lib/backend/nova/chat/answer-service.ts` |
| `server/index.ts` route handlers | Keep route logic. Rebuild in Next.js App Router with `apiHandler` envelope, `resolveApiActor` auth, workspace membership check, wallet gate. | `src/app/api/workspaces/[id]/nova/` |

### 2.3 Must Rebuild — Design From Scratch With N-0 As Reference

| N-0 Asset | Why Rebuild | N-1 Approach |
|-----------|------------|-------------|
| React frontend (Vite SPA) | Framework incompatible | Design as NEXUS workspace panel component (future N-6) |
| Auth (none exists) | Zero auth in NOVA | Use NEXUS `resolveApiActor` + workspace membership check |
| Tenancy (global only) | No workspace scoping | Add `workspace_id` to all NOVA tables + RLS |
| RLS policies (broad) | P0 security gap | Design workspace-scoped RLS (old S-9, now N-2) |
| Express server | Incompatible with Next.js | Rebuild as Next.js API route handlers |

---

## 3. Slice Restructuring

### 3.1 Old Plan vs New Plan

| Old Slice | Phase | New Designation | Status |
|-----------|-------|----------------|--------|
| S-9 (NOVA P0 Fix) | G | **N-2: Schema, RLS, and RPC Hardening** | Old S-9 scoped down to schema/RLS/RPC only |
| (not in old plan) | — | **N-3: NOVA Ingestion Service Design** | NEW |
| (not in old plan) | — | **N-4: NOVA Retrieval + Evidence Service Design** | NEW |
| (not in old plan) | — | **N-5: NOVA RAG Chat + Library API Design** | NEW |
| (not in old plan) | — | **N-6: NOVA Workspace Panel UI Design** | NEW (future, not in this plan) |
| S-10 | H | Unchanged — Workspace OS Navigation Simplification | Same |
| S-11 | I | Unchanged — CLI/MCP Resource Model | Same |
| S-12 | Closure | Unchanged — Handoff Update | Same |

### 3.2 Dependency Order

```
N-0 (Reality Check) ← DONE
  └─ N-1 (THIS PLAN — Reconstruction Design)
       ├─ N-2 (Schema, RLS, RPC Hardening) ← was old S-9
       │    └─ Adds workspace_id, fixes RLS, scopes match_nova_chunks
       │
       ├─ N-3 (Ingestion Service Design)
       │    └─ upload → parse → chunk → embed → store
       │
       ├─ N-4 (Retrieval + Evidence Service Design)
       │    └─ search → rank → retrieve → build evidence pack
       │
       └─ N-5 (RAG Chat + Library API Design)
            └─ retrieve → grounded answer → library CRUD

N-3, N-4, N-5 can proceed in parallel after N-2.
All are design-only. No implementation until authorized.
```

---

## 4. N-2: Schema, RLS, and RPC Hardening (Old S-9, Scoped Down)

### 4.1 Objective

Harden the existing NOVA Supabase tables with workspace scoping and proper RLS policies. This is the MINIMUM viable slice — no new services, no ingestion redesign, no API routes. Pure schema security.

### 4.2 What N-2 Covers

| Task | Description |
|------|------------|
| Add `workspace_id` to `nova_documents` | NOT NULL, FK to `workspaces(id)` |
| Add `workspace_id` to `nova_chunks` | NOT NULL, FK to `workspaces(id)` |
| Add `workspace_id` to `nova_ingest_runs` | NOT NULL, FK to `workspaces(id)` |
| Replace broad RLS on `nova_documents` | SELECT/INSERT/UPDATE/DELETE via workspace membership |
| Replace broad RLS on `nova_chunks` | SELECT via workspace membership (chunks inherit document scope) |
| Replace broad RLS on `nova_ingest_runs` | SELECT/INSERT via workspace membership |
| Scope `match_nova_chunks` RPC | Add `workspace_id` parameter, filter chunks by workspace |
| Audit SECURITY DEFINER functions | Verify grants, restrict to authenticated |
| Verify service role access | Ensure server-side ingestion still works via service role |

### 4.3 What N-2 Does NOT Cover

- No ingestion pipeline changes (that's N-3)
- No retrieval logic changes (that's N-4)
- No new API routes (that's N-5)
- No data migration for existing rows (prototype data is disposable)

### 4.4 Old S-9 vs New N-2

| Old S-9 Scope | New N-2 Scope |
|--------------|---------------|
| NOVA source map (which workspace sources to index) | **Remove** — covered by N-3/N-4 |
| Ingestion contract | **Remove** — N-3 |
| Retrieval contract | **Remove** — N-4 |
| Schema changes (workspace_id) | **KEEP** |
| RLS policy redesign | **KEEP** |
| match_nova_chunks scoping | **KEEP** |

---

## 5. N-3: NOVA Ingestion Service Design

### 5.1 Objective

Design the ingestion pipeline as a NEXUS-native backend service. Absorb NOVA's `text.ts` chunking and `gemini.ts` embedding logic. Design the API route contract.

### 5.2 Service Architecture

```
POST /api/workspaces/{workspaceId}/nova/ingest
  │
  ├─ Auth: resolveApiActor → workspace membership check (editor+)
  ├─ Wallet gate: NO deduction for ingestion in Phase 1 (platform cost)
  │
  ├─ Step 1: Receive file(s) via multipart upload
  ├─ Step 2: extractText(file) → raw text
  ├─ Step 3: chunkText(rawText, maxLength=1600) → chunks[]
  ├─ Step 4: FOR each chunk:
  │     embedText(chunk, 'RETRIEVAL_DOCUMENT') → vector(1536)
  │     INSERT nova_chunks (document_id, workspace_id, chunk_index, kind, content, embedding, metadata)
  ├─ Step 5: INSERT nova_documents (workspace_id, title, source_type, ...)
  ├─ Step 6: INSERT nova_ingest_runs (workspace_id, source_label, status='completed', item_count)
  └─ Step 7: Return { documentId, chunkCount, ingestRunId }
```

### 5.3 Files to Design (Not Implement)

| File | Absorbed From | Content |
|------|--------------|---------|
| `src/lib/backend/nova/ingestion/chunking.ts` | NOVA `text.ts` | `chunkText()`, `extractText()` |
| `src/lib/backend/nova/ingestion/embedding.ts` | NOVA `gemini.ts` | `embedText()`, `embeddingContract()` |
| `src/lib/backend/nova/ingestion/ingestion-service.ts` | NEW | Orchestrates: parse → chunk → embed → store |
| `src/app/api/workspaces/[id]/nova/ingest/route.ts` | NEW | API route handler |

### 5.4 Source Types for Phase 1

| Source Type | Supported? | Handler |
|------------|:---:|---------|
| PDF | ✅ | `extractText()` → pdf-parse |
| Plain text (.txt, .md) | ✅ | `extractText()` → UTF-8 |
| Image (via Gemini Vision) | ⚠️ Deferred | NOVA's `describeImage()` logic exists but deferred to Phase 2 |
| URL | ❌ Deferred | Future connector |
| Google Drive | ❌ Deferred | Future connector |
| GitHub repo | ❌ Deferred | Future connector |

---

## 6. N-4: NOVA Retrieval + Evidence Service Design

### 6.1 Objective

Design the retrieval pipeline (vector search via `match_nova_chunks`) and the evidence transformation layer (`buildEvidencePack`). Both absorb NOVA logic directly.

### 6.2 Retrieval Service

```
Function: retrieveChunks(workspaceId, query, topK, threshold)
  │
  ├─ Step 1: embedText(query, 'RETRIEVAL_QUERY') → vector
  ├─ Step 2: supabase.rpc('match_nova_chunks', {
  │     query_embedding, match_count: topK, match_threshold: threshold,
  │     filter_kind: null, workspace_id  ← NEW parameter from N-2
  │   })
  ├─ Step 3: Map rows → RetrievedCandidate[]
  └─ Step 4: Return { candidates, trace }

Output: RetrievedCandidate[] with:
  candidateId, source (SourceRef), chunk (ChunkRef),
  retriever: 'vector', stage: 'selected',
  score/similarity, rank, text, reason
```

### 6.3 Evidence Service

```
Function: buildEvidencePack(question, candidates, trace)
  │
  ├─ Step 1: For each candidate → EvidenceItem {
  │     evidenceId, claim, quoteOrExcerpt, source, chunk,
  │     supportLevel, confidence, sourceTruth, labels
  │   }
  ├─ Step 2: Assess sufficiency
  ├─ Step 3: Report data gaps
  └─ Step 4: Return EvidencePack

Pure function. No DB access. No auth.
Absorbed directly from NOVA's buildEvidencePack.ts.
```

### 6.4 Files to Design (Not Implement)

| File | Absorbed From | Content |
|------|--------------|---------|
| `src/lib/backend/nova/retrieval/retrieval-service.ts` | NEW | `retrieveChunks()` |
| `src/lib/backend/nova/evidence/build-evidence-pack.ts` | NOVA `evidence/buildEvidencePack.ts` | `buildEvidencePack()` — direct copy |
| `src/lib/nova-types.ts` | NOVA `evidence/types.ts`, `retrieval/types.ts` | EvidenceItem, EvidencePack, RetrievedCandidate, RetrievalTrace, SourceRef, ChunkRef |

---

## 7. N-5: NOVA RAG Chat + Library API Design

### 7.1 Objective

Design the RAG chat endpoint (retrieve → grounded answer) and the library CRUD endpoints. Absorb NOVA's answer orchestration pattern behind NEXUS auth, wallet gate, and API envelope.

### 7.2 RAG Chat Service

```
POST /api/workspaces/{workspaceId}/nova/chat
  │
  ├─ Auth: resolveApiActor → workspace membership
  ├─ Wallet gate: assertSufficientCredits (credit cost TBD)
  │
  ├─ Step 1: retrieveChunks(workspaceId, question, topK=8, threshold=0.1)
  ├─ Step 2: Build context string from sources
  ├─ Step 3: Call NEXUS ai-gateway-service with system prompt + context
  │     System: "You are NOVA, a precise multimodal RAG operator..."
  │     User: "Question: {question}\n\nRetrieved sources:\n{context}"
  ├─ Step 4: Record model_usage_ledger (existing pattern)
  ├─ Step 5: Deduct wallet credits (S-5 deduction flow)
  ├─ Step 6: Optionally build evidence pack (if includeEvidence=true)
  └─ Step 7: Return { answer, sources, evidencePack?, trace? }

NOTES:
  - Uses NEXUS New API gateway, NOT direct OpenAI/DeepSeek SDK calls
  - Model routing through existing SERVER_MODEL_CATALOG
  - Inline citations [1], [2] preserved from NOVA
  - Multi-provider fallback handled by New API channel routing
```

### 7.3 Library API

```
GET /api/workspaces/{workspaceId}/nova/library
  └─ SELECT nova_documents WHERE workspace_id = :id ORDER BY created_at DESC LIMIT 80
  └─ Includes chunk count per document

GET /api/workspaces/{workspaceId}/nova/library/{documentId}
  └─ SELECT document + chunks

DELETE /api/workspaces/{workspaceId}/nova/library/{documentId}
  └─ Per-document deletion (NOT bulk — NOVA's bulk delete is a prototype shortcut)
  └─ Auth: workspace membership (editor+)
  └─ CASCADE: deletes chunks via FK

AUTH: All library routes require workspace membership.
       Viewer role: GET only. Editor/Admin/Owner: GET + DELETE + ingest.
```

### 7.4 Files to Design (Not Implement)

| File | Absorbed From | Content |
|------|--------------|---------|
| `src/lib/backend/nova/chat/answer-service.ts` | NOVA `llm.ts` (pattern) | `answerQuestion()` — rewritten for NEXUS gateway |
| `src/lib/backend/nova/library/library-service.ts` | NEW | `listDocuments()`, `getDocument()`, `deleteDocument()` |
| `src/app/api/workspaces/[id]/nova/chat/route.ts` | NEW | RAG chat route |
| `src/app/api/workspaces/[id]/nova/library/route.ts` | NEW | Library CRUD routes |

---

## 8. Type System Design

### 8.1 Nova Types File (`src/lib/nova-types.ts` — Design Only)

```typescript
// DESIGN ONLY — not to be written to code

// === Ingestion Types ===
export type NovaSourceType = 'pdf' | 'text' | 'image';
export type NovaIngestStatus = 'running' | 'completed' | 'failed';

export interface NovaIngestRun {
  id: string;
  workspaceId: string;
  sourceLabel: string;
  status: NovaIngestStatus;
  itemCount?: number;
  message?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// === Retrieval Types ===
export type RetrieverKind = 'vector';

export interface SourceRef {
  sourceId: string;
  title: string;
  sourceType: string;
  truthStatus: 'raw_source' | 'parsed_source' | 'derived_view' | 'generated_material';
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ChunkRef {
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  kind: string;
  metadata?: Record<string, unknown>;
  location?: Record<string, unknown>;
}

export interface RetrievedCandidate {
  candidateId: string;
  source: SourceRef;
  chunk: ChunkRef;
  retriever: RetrieverKind;
  stage: 'selected' | 'rejected';
  score: number;
  similarity: number;
  rank: number;
  text: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalTrace {
  traceId: string;
  userInput: string;
  normalizedQuery: string;
  subqueries: string[];
  retrieversCalled: RetrieverKind[];
  candidates: RetrievedCandidate[];
  fusedCandidates: RetrievedCandidate[];
  rerankedCandidates: RetrievedCandidate[];
  selectedCandidateIds: string[];
  selectedEvidenceIds: string[];
  rejectedCandidates: RetrievedCandidate[];
  createdAt: string;
  runtime: {
    endpoint: string;
    durationMs: number;
    embeddingModel: string;
    embeddingDimensions: number;
    topK: number;
    threshold: number;
  };
  metadata?: Record<string, unknown>;
}

// === Evidence Types ===
export type SupportLevel = 'strong' | 'moderate' | 'weak';
export type SourceTruth = 'raw_source' | 'parsed_source' | 'derived_view' | 'generated_material';

export interface EvidenceItem {
  evidenceId: string;
  claim: string;
  quoteOrExcerpt: string;
  source: SourceRef;
  chunk: ChunkRef;
  location?: Record<string, unknown>;
  supportLevel: SupportLevel;
  confidence: number;
  generatedBy: string;
  sourceTruth: SourceTruth;
  candidateId: string;
  labels: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface EvidencePack {
  packId: string;
  question: string;
  trace?: RetrievalTrace;
  retrievedCandidates: RetrievedCandidate[];
  evidence: EvidenceItem[];
  contradictions: Array<{ claimA: string; claimB: string; reason: string }>;
  sufficiency: {
    sufficient: boolean;
    missing: string[];
    note?: string;
  };
  dataGaps: string[];
  futureFuel: string[];
  notNow: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// === Chat Types ===
export interface NovaChatRequest {
  question: string;
  topK?: number;
  threshold?: number;
  includeTrace?: boolean;
  includeEvidencePack?: boolean;
  modelId?: string;
}

export interface NovaChatResponse {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    kind: string;
    content: string;
    similarity: number;
  }>;
  trace?: RetrievalTrace;
  evidencePack?: EvidencePack;
  usage: {
    credits: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// === Library Types ===
export interface NovaDocumentSummary {
  id: string;
  workspaceId: string;
  title: string;
  sourceType: NovaSourceType;
  mimeType?: string;
  fileName?: string;
  chunkCount: number;
  createdAt: string;
}

export interface NovaDocumentDetail extends NovaDocumentSummary {
  chunks: Array<{
    id: string;
    chunkIndex: number;
    kind: string;
    content: string;
    createdAt: string;
  }>;
}
```

### 8.2 Integration with nexus-types.ts

The NOVA types live in `src/lib/nova-types.ts` and reference shared types from `nexus-types.ts`:
- `DatabaseTimestamp` (already in `database.types.ts`)
- `ApiError` error patterns (from `api-errors.ts`)
- `UsageLedgerRepository` (from `usage-ledger.ts` — wallet deduction linkage)
- `UserPlan` (from `model-catalog.ts` — model capability check)

No circular dependencies. NOVA types depend ON nexus types, not the reverse.

---

## 9. API Route Map (Design, Not Implementation)

### 9.1 Complete Route Table

```
Workspace-scoped NOVA routes:

POST   /api/workspaces/{workspaceId}/nova/ingest
  └─ Multipart file upload → parse → chunk → embed → store
  └─ Auth: workspace membership (editor+)
  └─ Wallet: no deduction (Phase 1 platform cost)

POST   /api/workspaces/{workspaceId}/nova/chat
  └─ RAG Q&A: retrieve → grounded answer with citations
  └─ Auth: workspace membership
  └─ Wallet: credit deduction via S-5 flow

GET    /api/workspaces/{workspaceId}/nova/library
  └─ List documents in workspace
  └─ Auth: workspace membership

GET    /api/workspaces/{workspaceId}/nova/library/{documentId}
  └─ Get document + chunks
  └─ Auth: workspace membership

DELETE /api/workspaces/{workspaceId}/nova/library/{documentId}
  └─ Delete document + chunks (CASCADE)
  └─ Auth: workspace membership (editor+)

GET    /api/workspaces/{workspaceId}/nova/status
  └─ Health check: document count, chunk count, recent ingest runs
  └─ Auth: workspace membership

POST   /api/workspaces/{workspaceId}/nova/visual-search
  └─ Image upload → describe → embed → retrieve similar content
  └─ Deferred to Phase 2
```

### 9.2 Route Handler Pattern

All routes follow the NEXUS API handler pattern:

```typescript
// DESIGN ONLY — handler skeleton
export async function POST(request: Request, { params }: { params: { workspaceId: string } }) {
  // 1. Auth
  const actor = await resolveApiActor(request, { required: true });
  
  // 2. Workspace membership
  const permission = await permissionService.check({
    action: 'workspace.update',  // or 'workspace.read' for GET
    resourceType: 'workspace',
    userId: actor.actorUserId,
    workspaceId: params.workspaceId,
  });
  if (permission.decision !== 'allow') return error(403, 'Forbidden');
  
  // 3. Wallet gate (if billable)
  if (isBillable) {
    await assertSufficientCredits({ ... });
  }
  
  // 4. Business logic
  const result = await novaService.doSomething({ ... });
  
  // 5. Usage recording (if model call)
  await ledger.insert({ ... });
  
  // 6. Wallet deduction (if billable + success)
  await walletRepo.createTransaction({ ... });
  
  // 7. Response
  return Response.json({ ... });
}
```

---

## 10. Wallet Integration for NOVA Operations

### 10.1 Which NOVA Operations Cost Credits

| Operation | Phase 1 Cost | Phase 2+ |
|-----------|:---:|----------|
| **RAG Chat** (retrieve + LLM answer) | ✅ Deduct credits | Same |
| **Document Ingestion** (embedding cost) | ❌ Platform absorbs | Deferred |
| **Document Retrieval** (vector search) | ❌ Platform absorbs | Deferred |
| **Visual Search** | ❌ Not implemented | Deferred |

### 10.2 RAG Chat Wallet Flow

```
1. Pre-call: estimateChatCredits(modelId, estimatedTokens) → CreditEstimate
2. Gate: assertSufficientCredits(estimatedCredits) → pass/fail 402
3. Retrieve: retrieveChunks(workspaceId, question) → sources
4. Model call: ai-gateway-service → New API → answer
5. Post-call: 
   a. model_usage_ledger.insert({ credits, ... })  [audit]
   b. walletRepo.createTransaction({ type: 'deduction', source: 'nova_retrieval', amount: -credits })
6. Return: answer + sources + usage
```

The `source` for wallet transactions from NOVA is `'nova_retrieval'` (distinct from `'chat_completion'` and `'image_generation'`).

---

## 11. Blocked Assumptions

| # | Assumption | Severity | Resolution |
|---|-----------|----------|-----------|
| N1 | `match_nova_chunks` RPC can be modified to accept `workspace_id` | LOW | RPC is editable via Supabase SQL editor or migration |
| N2 | NOVA tables are empty or contain disposable prototype data | MEDIUM | If live data exists, migration script needed. Confirm before N-2. |
| N3 | Gemini Embedding 2 remains the embedding provider | DESIGN CHOICE | Per owner directive: keep. Not replaced. |
| N4 | Ingestion is free (platform cost) in Phase 1 | DESIGN CHOICE | Embedding cost is modest. Revisit when usage scales. |
| N5 | `workspace_id` FK to `workspaces(id)` with CASCADE on delete | MEDIUM | Deleting a workspace deletes ALL its NOVA data. Owner must confirm. |
| N6 | File upload limit of 32MB is acceptable | LOW | Same as NOVA prototype. Configurable. |
| N7 | `pdf-parse` is acceptable as a dependency | LOW | Already proven in NOVA. NPM package. |
| N8 | `@google/genai` or New API channel for Gemini embedding | MEDIUM | Owner decision: direct SDK vs route through New API. |

---

## 12. Old S-9 Reduction

### 12.1 What Old S-9 Covered

The original S-9 (`S-9-nova-workspace-p0-fix.md`) was designed as a single catch-all slice covering:
- NOVA source map (which workspace sources to index)
- Schema changes (workspace_id)
- RLS policy redesign
- match_nova_chunks scoping
- Ingestion contract design
- Retrieval contract design
- SECURITY DEFINER audit

### 12.2 What Old S-9 Now Covers (Reduced)

Old S-9 is now demoted to N-2. It covers ONLY:

| Task | Status |
|------|--------|
| Add workspace_id to nova_documents, nova_chunks, nova_ingest_runs | ✅ KEPT |
| Replace broad RLS with workspace-scoped policies | ✅ KEPT |
| Scope match_nova_chunks with workspace_id parameter | ✅ KEPT |
| Audit SECURITY DEFINER functions | ✅ KEPT |

### 12.3 What Moved Out of Old S-9

| Task | Moved To |
|------|----------|
| NOVA source map (what to index) | N-3 (Ingestion Service) |
| Ingestion contract | N-3 |
| Retrieval contract | N-4 |
| Evidence contract | N-4 |
| RAG chat API contract | N-5 |
| Library API contract | N-5 |
| Workspace panel UI | N-6 (future) |

---

## 13. Next Slice Authorization

| Slice | Status | Prerequisite |
|-------|--------|-------------|
| N-0 | ✅ DONE | — |
| N-1 | ✅ DONE (this document) | N-0 |
| N-2 | ⛔ NOT AUTHORIZED | N-1 |
| N-3 | ⛔ NOT AUTHORIZED | N-2 |
| N-4 | ⛔ NOT AUTHORIZED | N-2 |
| N-5 | ⛔ NOT AUTHORIZED | N-2, N-3, N-4 |
| N-6 | ⛔ NOT AUTHORIZED | N-5 |
| S-10 | ⛔ NOT AUTHORIZED | (unchanged) |
| S-11 | ⛔ NOT AUTHORIZED | (unchanged) |
| S-12 | ⛔ NOT AUTHORIZED | (unchanged) |

---

## No Implementation Performed

Design-only reconstruction plan. No code copied from NOVA. No TypeScript interfaces written to files. No Supabase changes. No RLS changes. No migrations. No route implementations. No dependency additions.

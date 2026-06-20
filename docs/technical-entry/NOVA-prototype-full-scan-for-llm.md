# NOVA Prototype Full Scan Report for LLM

**Date:** 2026-06-21
**Source:** `/Users/sean/Documents/NOVA/` — full directory tree, all source files, all docs
**Purpose:** Complete inventory of the NOVA prototype for LLM consumption. No analysis — raw facts only.

---

## 1. Project Identity

- **Name:** NOVA
- **Type:** React + Vite multimodal RAG console
- **Runtime:** Express API server (port 8787) + Vite dev server (port 5174)
- **Database:** Supabase Postgres + pgvector HNSW
- **Embedding:** Gemini Embedding 2, 1536 dimensions
- **Answer models:** OpenAI GPT-5.5 (primary) → Gemini 3.1 Pro → DeepSeek V4 Pro → OpenRouter (fallback chain)
- **Supabase project:** `xjuglddxwnikvcwxfbzg` (NEXUS) — SAME project as NEXUS production

---

## 2. File Tree (Every Directory)

```
NOVA/
├── 00_system_map/README.md          — architecture docs
├── 01_ingestion/README.md           — ingestion contracts
├── 02_parsing/README.md             — parsing contracts
├── 03_normalization/README.md       — normalization contracts
├── 04_indexing/README.md            — indexing contracts
├── 05_retrieval/README.md           — retrieval contracts
├── 06_evidence/README.md            — evidence contracts
├── 07_reasoning/README.md           — reasoning contracts
│   └── action_briefs/README.md
├── 08_output/README.md              — output contracts
│   ├── agent_brief_contract.md
│   └── agent_brief_v6_action_readiness.md
├── 09_ops_eval/README.md            — ops/eval contracts
│   ├── AUTOMATED_RAG_EVAL_PLAN.md
│   ├── RAG_EVAL_FAILURE_DIAGNOSTICS.md
│   ├── RAG_EVAL_RUNBOOK.md
│   ├── agent_brief_eval.md
│   ├── rag_eval_cases.json
│   ├── rag_fixture_expectations.json
│   ├── traceable_rag_eval_seed.md
│   ├── traceable_rag_fixture_result_2026-06-05.md
│   ├── traceable_rag_fixture_result_2026-06-06.md
│   ├── traceable_rag_manual_eval_2026-06-05.md
│   ├── traceable_rag_manual_eval_2026-06-06.md
│   ├── traceable_rag_quality_gate.md
│   └── results/ (20 eval run files: .json + .md pairs)
├── src/
│   ├── App.tsx                       — Single-file React app (~2000+ lines)
│   ├── App.css                       — All styling
│   ├── main.tsx                      — React entry point
│   ├── index.css                     — Base styles
│   ├── styles/tokens.css             — Design tokens
│   └── assets/ (hero.png, react.svg, vite.svg)
├── server/
│   ├── index.ts                      — Express server (7 routes)
│   ├── env.ts                        — Environment config (20+ vars, multi-source .env loading)
│   ├── supabase.ts                   — Supabase client (service_role or publishable key)
│   ├── llm.ts                        — Multi-provider answer pipeline (OpenAI→Gemini→DeepSeek→OpenRouter)
│   ├── gemini.ts                     — Gemini embedding + vision + answer + readiness probe
│   ├── text.ts                       — PDF extraction + paragraph chunking
│   ├── evidence/
│   │   ├── buildEvidencePack.ts      — Evidence pack constructor (pure function)
│   │   └── types.ts                  — Evidence types
│   ├── retrieval/
│   │   └── types.ts                  — Retrieval types (SourceRef, ChunkRef, RetrievedCandidate, RetrievalTrace)
│   └── actionBrief/
│       └── types.ts                  — Action brief types
├── scripts/
│   ├── dev-logged.mjs                — Dev with log capture
│   ├── doctor.mjs                    — Health check (git, secrets, lint, build)
│   ├── snapshot.mjs                  — Recovery snapshot (excludes secrets)
│   ├── eval-rag.mjs                  — Automated RAG evaluation runner
│   ├── check-embedding-contract.mjs  — Embedding contract checker
│   ├── historylog/ (7 scripts)       — Development blackbox (checkpoint, codex-run, daily, errors, manifest, watch-files, lib)
│   └── research/ (3 scripts)         — Perplexity search, NBLM research, pack synthesizer
├── public/assets/nova-hero.png       — Hero image
├── dist/                             — Build output (Vite)
├── research/                         — Research framework
│   ├── cards/_schema.json
│   ├── prompts/ (6 research prompts)
│   ├── packs/ (2 NBLM packs: 10-round RAG + Codex Research OS)
│   └── requests/_template.yaml
├── samples/nova-test.md              — Test document
├── historylog/                       — Development history
│   ├── checkpoints/ (48 files)
│   ├── codex-runs/ (34 files)
│   ├── daily-reports/ (2 files)
│   ├── error-digests/ (1 file)
│   ├── file-events/ (1 ndjson)
│   ├── manifests/ (1 json)
│   ├── llm-briefs/ (20+ directories of loop reports)
│   └── templates/ (6 templates)
├── docs/                             — Extensive documentation
│   ├── api/ (README, ROUTE_CONTRACTS, SMOKE_TEST_PLAN)
│   ├── architecture/ (ADR template, DATA_FLOW, MODULE_MAP, REQUEST_LIFECYCLE, RUNTIME_CONTRACTS, SOURCE_TRUTH_LAYERS, SYSTEM_OVERVIEW)
│   ├── checklists/ (10 checklists: agent completion, API change, post-change, pre-change, release readiness, retrieval change, schema change, security, UI change)
│   ├── decisions/ (2 ADRs: embedding model contract, NBLM parity)
│   ├── enforcement/ (automated gates, branch protection, CODEOWNERS, ESLint boundary, NX eval, Turborepo eval)
│   ├── extension-slots/ (BACKEND_API_SLOTS, FRONTEND_SLOTS, OPS_EVAL_SLOTS, RETRIEVAL_EVIDENCE_SLOTS, SLOT_REGISTRY, SUPABASE_DATA_SLOTS)
│   ├── modules/README
│   ├── parallel-dev/ (AGENT_HANDOFF_PACKET, BRANCH_NAMING, CONFLICT_RESOLUTION, GIT_WORKTREE_PROTOCOL, MERGE_PROTOCOL)
│   ├── recovery/ (ARCHIVE_HYGIENE, CHECKPOINT_PROTOCOL, DISASTER_RECOVERY, HANDOFF_TEMPLATE, ROLLBACK_PLAYBOOK, SNAPSHOT_POLICY)
│   ├── roadmap/ (EVIDENCE_ENGINE_PLAN, EVIDENCE_TO_ACTION, HYBRID_RETRIEVAL_PLAN, INDEX_METADATA_UPGRADE, LATENCY_BUDGET, MONOREPO_MIGRATION, MULTI_AGENT_PLAN, PHASE_PLAN, REFACTOR_PLAYBOOK, RISK_REGISTER, SUPABASE_SECURITY_PLAN, V5_TRACEABLE_RAG_ENTRY, V6_BACKGROUND_LOOP_ARTIFACT_MAP)
│   ├── supabase/ (NOVA_SCHEMA_INVENTORY, V6_RLS_GRANTS_HARDENING_PLAN)
│   ├── ui/ (BACKEND_COUPLING_MATRIX, COMPUTER_USE_ACCEPTANCE, CONTROL_EXAMPLES, CONTROL_REGISTRY, DOCUMENT_TRANSFORM_SLOT, REACT_UI_SHELL_PLAN, READ_ONLY_EVIDENCE_PREVIEW_PLAN, UI_AUDIT_2026-06-05)
│   └── release/READINESS_SUMMARY
├── garden-gpt-image-2/               — Hero image generation prompts
├── logs/dev-2026-06-05T04-48-30-237Z.log
├── README.md
├── DESIGN.md
├── AGENTS.md
├── AGENT_LANES.md
├── MODULE_BOUNDARIES.md
├── PATH_OWNERSHIP.md
├── CHANGE_PROTOCOL.md
├── GENERATED_ARTIFACTS.md
├── HANDOFF.md
├── RECOVERY.md
├── UNWIRED_CONTROLS.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
└── .env / .env.example / .env.local / .gitignore
```

---

## 3. API Routes (Server index.ts — 7 routes)

| Method | Route | Status | Description |
|--------|-------|--------|-------------|
| GET | `/api/status` | Working | Doc/chunk counts, recent ingest runs, runtime config |
| GET | `/api/gemini-check` | Working | Embedding readiness probe |
| POST | `/api/ingest` | Working | Multipart file upload → extract → chunk → embed → store |
| POST | `/api/chat` | Working | Embed question → RPC match_nova_chunks → answer via LLM |
| POST | `/api/visual-search` | Working | Image upload → Gemini describe → embed → retrieve similar |
| GET | `/api/library` | Working | List all documents with chunk counts |
| DELETE | `/api/library` | Working | **BULK DELETE** all documents (`neq('id', '0000...')`) |

---

## 4. Server Source Files (Every File Content Summary)

### 4.1 `server/env.ts`
- Loads `.env` from 4 sources: `~/.config/nova/shared.env`, `.env.local`, `~/.config/nova/research.env`, default `.env`
- Exports `env` object with 24 config fields
- Includes `missingRuntimeKeys()` returning required keys that are missing
- Model defaults: Gemini Embedding 2 (1536d), Gemini 3.1 Pro (answer), GPT-5.5 (OpenAI answer with x-high reasoning), DeepSeek V4 Pro (max reasoning), OpenRouter auto

### 4.2 `server/supabase.ts`
- Creates Supabase client using service role key or publishable key
- `toVectorLiteral(values)` — converts number[] to pgvector literal string `[1.0,2.0,...]`

### 4.3 `server/gemini.ts`
- `embedText(text, taskType)` — calls Gemini Embedding 2, returns 1536-dim vector
- `describeImage(buffer, mimeType, fileName)` — Gemini Vision: describes image for RAG index
- `generateGeminiAnswer(systemPrompt, userPrompt)` — Gemini answer generation
- `embeddingContract()` — returns provider/model/dimensions/inputVersion metadata
- `geminiReadiness()` — health check probe with embedding checksum
- Uses `@google/genai` SDK
- Embedding input limit: 28,000 characters
- Task types: `RETRIEVAL_DOCUMENT`, `RETRIEVAL_QUERY`

### 4.4 `server/llm.ts`
- `answerQuestion(question, sources)` — multi-provider fallback chain
- Provider order: OpenAI (GPT-5.5 with Responses API + reasoning effort) → Gemini (generateGeminiAnswer) → DeepSeek (chat.completions) → OpenRouter (chat.completions)
- System prompt: "You are NOVA, a precise multimodal RAG operator. Answer in the user language. Use only retrieved sources for factual claims. Cite inline as [1], [2]."
- Context injection: `[N] title / kind / similarity\ncontent (truncated to 2400 chars)`
- Returns Chinese fallback message if all providers fail
- Uses direct SDK calls (`new OpenAI()`) — NOT through New API

### 4.5 `server/text.ts`
- `extractText(file)` — PDF extraction via `pdf-parse` library, UTF-8 fallback for non-PDF
- `chunkText(text, maxLength=1600)` — paragraph-aware chunking: clean → split by `\n\n+` → accumulate until maxLength → overflow splits
- Returns string[] of chunks

### 4.6 `server/evidence/buildEvidencePack.ts`
- `buildEvidencePack({ question, trace, candidates, createdAt })` — pure function
- Transforms RetrievedCandidate[] → EvidencePack
- EvidencePack contains: packId, question, trace, retrievedCandidates, evidence[], contradictions[], sufficiency, dataGaps[], futureFuel[], notNow[], createdAt, metadata
- EvidenceItem contains: evidenceId, claim, quoteOrExcerpt, source, chunk, location, supportLevel, confidence, generatedBy, sourceTruth, candidateId, labels[], createdAt
- Confidence derived from candidate.similarity (clamped 0-1)
- All evidence labeled `RETRIEVED_CANDIDATE` and `NOT_SOURCE_TRUTH`
- Data gap reporting: "No runtime claim extraction exists yet", "No contradiction checker exists yet", "No persistent evidence ledger exists yet"

### 4.7 `server/evidence/types.ts`
- `EvidenceSupportLevel`: direct | indirect | weak | contradictory | insufficient
- `EvidenceSourceTruth`: raw_source | parsed_source | derived_view | generated_candidate
- `EvidenceGeneratedBy`: parser | retriever | llm | system | human
- `EvidenceItem`, `EvidenceContradiction`, `EvidenceSufficiency`, `EvidencePack` — full type definitions

### 4.8 `server/retrieval/types.ts`
- `SourceType`: pdf | text | markdown | image | code | meeting | task | comment | unknown
- `SourceTruthStatus`: raw_source | parsed_source | derived_index | generated_candidate
- `SourceRef`, `ChunkRef`, `SourceLocation`
- `RetrieverKind`: sql | bm25 | vector | graph | recent | attachment | manual | unknown
- `RetrievalStage`: candidate | fused | reranked | selected | rejected
- `RetrievedCandidate`, `RejectedCandidate`, `RetrievalTrace` — full type definitions

### 4.9 `server/index.ts` (Route Handlers)
- Express app with CORS, JSON body parser (2MB limit), multer file upload (32MB limit)
- All routes use `async (request, response)` pattern — no middleware auth
- `/api/status`: queries Supabase for doc count, chunk count, recent ingest runs
- `/api/ingest`: iterates uploaded files, creates ingest run, extracts/chunks/embeds/stores each file
- `/api/chat`: embeds question, calls `match_nova_chunks` RPC, maps results to sources, calls `answerQuestion`, optionally builds trace + evidencePack
- `/api/visual-search`: describes image via Gemini Vision, embeds description, retrieves similar
- `/api/library GET`: selects all documents with nested chunks, ordered by created_at DESC, limit 80
- `/api/library DELETE`: bulk deletes all documents where `id != '00000000-0000-0000-0000-000000000000'`

---

## 5. Frontend (src/App.tsx)

- Single-file React component (~2000+ lines)
- States: activeView (chat/visual/library), messages[], sources[], documents[], runtimeStatus, isStreaming, isUploading, selectedFiles[]
- Key functions: `refreshStatus()`, `loadLibrary()`, `ingestFiles()`, `ask()`, `visualSearch()`, `clearIndex()`
- Components: RuntimeRail (doc/chunk counts, gemini status, recent runs), Composer (chat input, model selector, upload), SourceRail (retrieved source cards), LibraryView (document list), ChatView (messages + answer)
- Hero image: `public/assets/nova-hero.png`
- 11 reserved/unwired controls with toast notifications
- Dark theme: red accent `#ff2d2d`, dark backgrounds, console aesthetic
- `StrictMode` enabled, hooks at top level, stable list keys, aria-labels on icon buttons

---

## 6. Design Documentation (Key Files)

### 6.1 `DESIGN.md`
- Visual thesis: dark cybernetic console, red accents, compressed typography
- Layout rules: center priority, side rails, sticky source rail, proportional constraints
- Tokens: `#ff2d2d` accent, `#05080b`/`#070b10`/`#030508` backgrounds, `#d6dde3` text, `14px`/`20px` radii, `8px` spacing
- Guardrails: don't replace hero, don't add gradients/blobs/marketing sections, don't make empty buttons look real

### 6.2 `MODULE_BOUNDARIES.md`
- 10-stage data lifecycle: ingestion → parsing → normalization → indexing → retrieval → evidence → reasoning → output
- Forbidden reverse flows: reasoning → ingestion, output → vector DB, retrieval → final answers, evidence → unsupported LLM conclusions
- Truth layer rules: raw source + parsed source = truth. Generated material must never become source truth.

### 6.3 `AGENTS.md`
- Agent-facing project rules
- Component/file rules, styling rules, Figma translation rules
- Research/memory/checkpoint rules: NBLM remembers, Codex verifies, repo proves, user directs

### 6.4 `AGENT_LANES.md`
- 7 agent lanes: ui-agent, api-agent, ops-agent, docs-agent, ingestion-agent, retrieval-agent, evidence-agent
- Each lane has: can-edit paths, can-read paths, do-not-edit paths, required checks

### 6.5 `PATH_OWNERSHIP.md`
- Full path ownership table: 48 paths mapped to lanes with risk levels (Low/Medium/High) and required checks
- High-risk paths: server/, 04_indexing, 05_retrieval, 06_evidence, 07_reasoning, 09_ops_eval, .github/workflows, package.json, dist/

### 6.6 `CHANGE_PROTOCOL.md`
- Before/during/after change workflow
- Required checks: lint, build, doctor
- Commit rhythm: meaningful milestones, focused commits, separate concerns

### 6.7 `HANDOFF.md`
- Frontend-to-API map: 7 UI surfaces → 7 API routes
- Working data flows: Ingest (3 steps), Chat (5 steps), Visual Search (5 steps)
- 11 reserved controls documented
- Known product gaps: no auth, no streaming, no queued ingestion, no source inspector, bulk delete, prototype RLS

### 6.8 `RECOVERY.md`
- 4 protection layers: Git, dev logs, recovery snapshots, runtime handoff
- Commands: `snapshot`, `doctor`, `dev:logged`
- Snapshots stored at `/Users/sean/Documents/NOVA_snapshots`

### 6.9 `UNWIRED_CONTROLS.md`
- 23 reserved controls: Voice Mode, 6 tool orbs, Add source menu, Web retrieval mode, Connector picker, Generate action router, 3 info cards
- Each control has a concrete integration path with suggested API routes and database tables

---

## 7. Supabase Schema (from docs/supabase/NOVA_SCHEMA_INVENTORY.md)

### 7.1 Tables in `xjuglddxwnikvcwxfbzg`

**nova_documents:**
- Columns: id (PK), title, source_type, mime_type, file_name, storage_path, metadata (jsonb), created_at, updated_at
- RLS: enabled
- FK: referenced by nova_chunks.document_id
- Observed rows: 1

**nova_chunks:**
- Columns: id (PK), document_id (FK→nova_documents), chunk_index, kind, content, embedding (vector), asset_url, metadata (jsonb), created_at
- RLS: enabled
- Observed rows: 1

**nova_ingest_runs:**
- Columns: id (PK), source_label, status, item_count, message, metadata (jsonb), created_at, completed_at
- RLS: enabled
- Observed rows: 1

### 7.2 RPC

**match_nova_chunks:**
- Arguments: query_embedding (vector), match_count (int, default 8), match_threshold (float, default 0.12), filter_kind (text, default NULL)
- Returns: id, document_id, title, source_type, kind, content, asset_url, metadata, similarity, created_at
- security_definer: false
- Volatility: stable

**set_nova_updated_at:**
- Trigger function
- security_definer: false

### 7.3 RLS Status (from inventory)
- All three nova_ tables have RLS enabled
- Current policies: broad (allow anon/authenticated) — documented as prototype shortcut
- No workspace_id column on any table
- No user_id column on any table

---

## 8. RAG Evaluation

### 8.1 Eval Runner (`scripts/eval-rag.mjs`)
- Automated RAG evaluation
- Modes: full (--rebuild-index), static-only, index
- Reads fixture expectations from `rag_fixture_expectations.json`
- Reads eval cases from `rag_eval_cases.json`
- Produces JSON + Markdown result pairs
- Results in `09_ops_eval/results/` — 10+ eval runs on 2026-06-06 and 2026-06-08

### 8.2 Quality Gate (`traceable_rag_quality_gate.md`)
- 7 gate checks: route compatibility, trace visibility, evidence boundary, data gaps, eval seeds, destructive safety, generated output
- Exit criteria for V5 Traceable RAG MVP: 8 items
- 4 stop conditions

### 8.3 Eval Results
- 20 result files in `09_ops_eval/results/`
- Timestamps from 2026-06-06T03:59 to 2026-06-08T06:38
- Each run has .json (structured) + .md (human-readable) pair

---

## 9. Dependencies (package.json)

### Runtime (12 packages)
- `@google/genai` ^2.8.0 — Gemini embedding + vision
- `@supabase/supabase-js` ^2.107.0 — Database client
- `cors` ^2.8.6 — CORS middleware
- `dotenv` ^17.4.2 — Environment loading
- `express` ^5.2.1 — API server
- `lucide-react` ^1.17.0 — Icons
- `multer` ^2.1.1 — File upload handling
- `openai` ^6.42.0 — OpenAI/DeepSeek/OpenRouter SDK
- `pdf-parse` ^2.4.5 — PDF text extraction
- `react` ^19.2.6 — Frontend
- `react-dom` ^19.2.6 — Frontend

### Dev Dependencies (14 packages)
- `@eslint/js`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
- `@types/cors`, `@types/express`, `@types/multer`, `@types/node`, `@types/react`, `@types/react-dom`
- `@vitejs/plugin-react`, `chokidar`, `concurrently`, `tsx`, `typescript`, `vite`, `globals`

### Scripts (19 commands)
- `dev`, `dev:logged`, `client`, `server`, `start`, `build`, `lint`, `doctor`, `snapshot`
- `historylog:watch`, `historylog:checkpoint`, `historylog:daily`, `historylog:codex`, `historylog:errors`, `historylog:manifest`
- `embedding:check`, `eval:rag`, `eval:rag:static`, `eval:rag:index`, `preview`

---

## 10. Environment Variables (from server/env.ts)

### Required for core runtime:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

### Optional answer/fallback:
- `OPENAI_API_KEY`, `OPENAI_ANSWER_MODEL` (default: gpt-5.5), `OPENAI_REASONING_EFFORT` (default: x-high)
- `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` (default: deepseek-v4-pro), `DEEPSEEK_REASONING_EFFORT` (default: max)
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default: openrouter/auto)
- `GEMINI_ANSWER_MODEL` (default: gemini-3.1-pro-preview)

### Embedding:
- `GEMINI_EMBEDDING_MODEL` (default: gemini-embedding-2)
- `GEMINI_EMBEDDING_DIMENSIONS` (default: 1536)

### Perplexity Research:
- `PERPLEXITY_API_KEY`, `PERPLEXITY_SEARCH_MAX_RESULTS`, etc.

### Runtime:
- `APP_NAME` (default: NOVA)
- `PORT` (default: 8787)
- `VITE_API_BASE` — controls frontend API target

---

## 11. Key Architectural Facts

1. **Single Supabase project:** NOVA and NEXUS share `xjuglddxwnikvcwxfbzg`. Tables are in the same database.
2. **No auth:** Express routes have no middleware. Supabase client uses service role key — all operations are admin-level.
3. **No tenancy:** Tables have no user_id or workspace_id. All documents are global.
4. **Bulk delete:** `DELETE /api/library` deletes ALL documents with a `neq('id', '0000...')` filter — a prototype shortcut.
5. **Multi-provider answer chain:** OpenAI → Gemini → DeepSeek → OpenRouter. Each called via direct SDK, not through New API.
6. **Evidence framework:** `buildEvidencePack` is a pure function with no side effects. Transforms retrieval candidates → structured evidence records.
7. **Chunking:** Paragraph-aware with 1600-char target. PDF extraction via pdf-parse library.
8. **Embedding:** Gemini Embedding 2, 1536 dimensions, with task type support (DOCUMENT/QUERY).
9. **RAG Eval:** Automated eval runner with fixture-based test cases, quality gates, and 20 historical result files.
10. **Documentation:** Extensive — 80+ markdown files across architecture, checklists, decisions, enforcement, extension slots, parallel dev, recovery, roadmap, supabase, UI, handoff, release.
11. **Reserved controls:** 23 UI elements intentionally visible but non-functional, each with documented future integration path.
12. **Recovery:** Snapshot tool creates no-secrets archives outside project. Doctor tool checks git, secrets, lint, build. HistoryLog for development blackbox.

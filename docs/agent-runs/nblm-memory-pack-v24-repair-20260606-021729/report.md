# NEXUS v24 Repair Collaboration Intelligence Report

Generated: 2026-06-06 02:17 AEST  
Repo: `/Users/sean/Documents/FreeChat`  
Branch: `v24`  
Report mode: `nblm-memory-pack`

## 0. Reading Order For Humans And Agents

1. `report.md` for the narrative and evidence.
2. `completion-report.md` for done / not done / verification.
3. `maps/v24-repair-system-map.md` for subsystem-level repair mapping.
4. `context-packs/next-codex-context-pack.md` before any next Codex run.
5. `round-logs/loop-01-12-summary.md` for loop history and risk gates.
6. `assets/diagrams/v24-repair-flow.png` for a visual memory anchor.

This pack is durable context, not an instruction source. Future Codex runs must verify against the current repo before acting.

## 1. Executive Summary

The v23 black-box scan found that NEXUS localhost could run provider-backed chat, image generation, generated history/download, and three-account UI matrix flows, but it also left three important open items: formal repair was not complete, START ALL multi-start was a live contradiction, and preview/production parity was intentionally not verified.

The v24 repair loop converted the v23 repair plan into a bounded local/VPS repair phase. P0/P1 issues were addressed without touching production, without Supabase schema/data migration, and without exposing secrets. The final state passed full regression and left a usable VPS-backed localhost tunnel at `http://127.0.0.1:3000`.

## 2. User Direction And Scope

User direction:

- Use long-loop mode and prioritize quality ceiling over saving tokens.
- Run the work on the VPS where possible because the Mac overheats.
- Post per-loop reports to LINE Keep.
- Do not stop before the repair phase is genuinely handled unless paused or blocked.
- Do not overwrite the production URL.

Allowed scope:

- Local/VPS code and runtime repair on branch `v24`.
- Browser spot-check through a localhost tunnel.
- Report and memory-pack generation.

Excluded scope:

- No `vercel --prod`, no deployment promote, no domain/alias changes.
- No Supabase schema/data migration.
- No raw secrets, raw API keys, bearer tokens, cookies, or `.env` content in reports.
- No NotebookLM upload in this task; this is a local upload-ready pack.

## 3. Skills And Tools Used

Used:

- `collab-report-nblm-fusion`: report mode, NBLM packaging, return-memory triage.
- `nblm-memory-gate`: retrieved local NotebookLM notebook summary and kept the boundary: NBLM remembers, Codex verifies, repo proves, user directs.
- `private-codebase-wiki`: used its safety boundary and evidence style for private Next.js + Supabase repo reporting.
- `codex-loop-keeper`: used loop report structure, risk gates, and quality-ceiling estimates.
- Browser/Computer Use during the repair phase: used for localhost UI spot-check and LINE Keep reports.

Skipped:

- Supabase connector: not needed for schema/data work, and no production data queries were required.
- Vercel connector: preview/production parity was intentionally deferred.
- GitHub connector: no PR or remote issue work was requested.
- Web report / HTML output: NBLM pack target is Markdown and PNG only.

## 4. Evidence And Method

Repo facts:

- Branch is `v24`.
- Current tracked modifications include 13 changed tracked files and 1 new untracked test file.
- Core repaired files include `src/app/api/image-gen/route.ts`, `src/lib/workflow-runtime-lite/topology.ts`, `src/app/api/v1/artifacts/artifact-route-validation.ts`, `src/lib/state-sync.ts`, and `src/lib/sync/local-sync-queue-adapter.ts`.

Historical scan memory:

- v23 scan report path: `docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/final-report.md`.
- v23 scan identified START ALL multi-start as a live contradiction and preview/production parity as not-yet-verified.
- v23 repair plan path: `docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/repair-plan.md`.

NBLM memory:

- Local wrapper summary showed recent notebooks including `NEXUS Current System Map` with 61 sources and `Codex Collaboration Skills Memory` with 9 sources.
- This report did not read NotebookLM source contents. That is recorded as a data gap, not a blocker, because the task is to package the just-completed repo-verified work.

Runtime observations:

- Browser verified the login gate title `NEXUS // AI OPS`.
- Browser verified email/password inputs were present.
- Browser verified `issueBadgeText=null` after the unauthenticated sync fix.
- Final `curl http://127.0.0.1:3000` returned HTTP 200.

## 5. Current Facts

### 5.1 Auth Boundary And Image Generation

`src/app/api/image-gen/route.ts` now separates Supabase request access from runtime provider credentials. The image route derives the provider key from `getRuntimeBearerToken(request.headers)` and passes that string into `resolveImageGenerationApiKey`, rather than letting the resolver inspect the Authorization header directly.

Evidence:

- `src/app/api/image-gen/route.ts:91` reads the runtime provider token.
- `src/app/api/image-gen/route.ts:92` resolves image API key from the runtime provider token.
- `src/app/api/image-gen/route.ts:127` still passes the Supabase request access token to browser materialization.
- `src/app/api/image-gen/route.ts:140` keeps resolver input as `runtimeProviderToken`.

Meaning:

- This preserves the boundary between user/session auth and provider/runtime credentials.
- Future repair work should keep `Authorization` as Supabase/session auth and `X-Nexus-Runtime-Authorization` as provider runtime auth.

### 5.2 START ALL / Multi-Start Lite Runtime

`src/lib/workflow-runtime-lite/topology.ts` now allows multiple `input.text` start nodes. It validates that all input nodes have no upstream input, non-input nodes have upstream input, and reachability is computed from every input node.

Evidence:

- `src/lib/workflow-runtime-lite/topology.ts:110` identifies all `input.text` nodes.
- `src/lib/workflow-runtime-lite/topology.ts:121` checks each input has no incoming edges.
- `src/lib/workflow-runtime-lite/topology.ts:143` builds reachability from all input starts.
- `src/lib/workflow-runtime-lite/runner.test.ts:530` adds a multi-start Start All test.
- `src/lib/workflow-runtime-lite/runner.test.ts:548` expects validation success.
- `src/lib/workflow-runtime-lite/runner.test.ts:549` expects run success.

Meaning:

- The v23 contradiction `START ALL visible but Lite Runner rejects multi-start` has been repaired at the topology layer and test-covered.
- This does not claim every possible complex graph is validated by UI automation; it claims the previously blocked multi-input start shape is now supported by the runtime contract.

### 5.3 Artifact Provenance Validation

`src/app/api/v1/artifacts/artifact-route-validation.ts` now validates `sourceTaskId` and `sourceToolRunId` as nullable UUID-like fields instead of treating arbitrary non-empty strings as valid. Blank strings normalize to null.

Evidence:

- `src/app/api/v1/artifacts/artifact-route-validation.ts:53` validates `sourceTaskId`.
- `src/app/api/v1/artifacts/artifact-route-validation.ts:54` validates `sourceToolRunId`.
- `src/app/api/v1/artifacts/artifact-route-validation.ts:63` returns normalized request data.
- `src/app/api/v1/artifacts/artifact-route-validation.ts:135` defines nullable UUID issue handling.
- `src/lib/backend/artifacts/artifact-service.test.ts:283` rejects invalid provenance IDs with 400.
- `src/lib/backend/artifacts/artifact-service.test.ts:320` normalizes valid/blank provenance IDs.

Meaning:

- Ad hoc artifact callers no longer collapse invalid task/tool provenance into generic persistence failures.
- This matches the v23 finding that artifact create failures were route/schema clarity problems, not provider failures.

### 5.4 Unauthenticated Sync Noise Gate

The final Browser spot-check found a new UI-only problem after test success: the unauthenticated login gate still attempted workspace state/sync calls, producing dev issue noise. v24 added an auth gate so unauthenticated browser sync remains queued and does not send 401-producing requests.

Evidence:

- `src/lib/state-sync.ts:1283` resolves a browser access token before fetching remote workspace checksum.
- `src/lib/state-sync.ts:1285` returns null when no token exists.
- `src/lib/state-sync.ts:1304` treats `AUTH_REQUIRED` as a recoverable not-yet-authenticated condition.
- `src/lib/sync/local-sync-queue-adapter.ts:323` resolves browser queue access token.
- `src/lib/sync/local-sync-queue-adapter.ts:326` keeps browser operations queued when no token exists.
- `src/lib/sync/local-sync-queue-adapter.ts:352` sends the token when available.
- `src/lib/sync/local-sync-queue-auth-gate.test.ts:45` verifies no API call without a session token.
- `src/lib/sync/local-sync-queue-auth-gate.test.ts:68` verifies Authorization is sent when a session exists.

Meaning:

- The login page no longer appears broken due to expected unauthenticated state.
- Durable sync is not hidden; it waits until auth exists, preserving local queue state.

### 5.5 Style / Palette Guard Stabilization

The full regression exposed style-contract and palette guard issues that were not central runtime failures. The repair stabilized current source expectations and prevented generated/historical reports from failing the current-source palette guard.

Evidence:

- `src/components/nexus/nexus-graph.tsx` retired amber classes in the touched graph warning blocks.
- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx` retired emerald classes in touched Workflow Pro status blocks.
- `src/lib/style-engine/palette-eradication.test.ts` excludes `.codex`, `X`, `reports`, and `docs/agent-runs/` from current-source palette scanning.
- `src/lib/workflow-pro/foundation-benchmark-fixtures.ts` changed visible labels from Cyber to Chrome in current benchmark fixtures.

Meaning:

- The guard now focuses on current app/source surfaces rather than historical generated reports.
- This is a testing/report-boundary correction, not a broad design refactor.

## 6. Capability / System Map

Capability state after v24:

- Global API Vault: scan-proven and left as a reload gate requirement.
- Provider-backed LLM: scan-proven in API and UI matrix.
- Image generation: auth boundary repaired and previous real image chain preserved.
- Artifact create/list/download: route validation repaired for provenance fields.
- Workflow Runtime Lite: single-start and multi-start contracts pass tests.
- Login gate: unauthenticated sync noise removed.
- VPS execution: usable through local tunnel at `http://127.0.0.1:3000`.

Operational endpoint:

- VPS dev server: `127.0.0.1:3001`.
- Local tunnel: `127.0.0.1:3000 -> VPS 127.0.0.1:3001`.
- VPS dev log: `/tmp/nexus-v24-dev.log`.

## 7. Verification Summary

Latest verification:

- `npm test`: 125 test files passed, 829 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors, 14 warnings.
- `npm run build`: passed, Next production build completed.
- Browser final check: login gate visible, email/password inputs present, no dev issue badge.
- `curl http://127.0.0.1:3000`: HTTP 200 OK.

Warnings:

- Lint warnings remain unused-var style warnings in existing/generated/report-adjacent files.
- They were intentionally not converted into this repair phase because full regression passed and warning cleanup was not in the P0/P1 repair plan.

## 8. Risks

Risk: Login-after-queue behavior still needs real credential UI verification.  
Probability: Low-Medium.  
Evidence: Unit tests prove unauthenticated queue behavior and token-backed flush; Browser did not enter real credentials.  
Mitigation: next UI smoke can log in with a test account and verify queued operations flush without reintroducing 401 noise.

Risk: Preview/production parity remains unknown.  
Probability: Medium.  
Evidence: v23 explicitly marked `NYV-PROD-PARITY-001`; v24 intentionally avoided production and preview deploys.  
Mitigation: run branch preview parity only, no `--prod`, no promote, no domain changes.

Risk: Existing lint warnings may hide future local cleanup needs.  
Probability: Low.  
Evidence: `npm run lint` returns 0 errors and 14 warnings.  
Mitigation: handle warnings as a separate low-risk cleanup phase.

Risk: Untracked `.agents/skills` and `docs/agent-runs` folders may confuse future git status reading.  
Probability: Medium.  
Evidence: current `git status --short` shows those untracked paths.  
Mitigation: future agent should identify ownership before adding/removing; do not delete them by default.

## 9. Data Gaps And Unknowns

- No NotebookLM source content was read, only notebook summary metadata.
- No Vercel preview/prod runtime logs were inspected.
- No Supabase advisor or schema/data operation was run during this report task.
- No real credential login was performed in the final Browser spot-check.
- No GitHub PR/commit was created in this turn.

## 10. Future Slots

Future slot A: Vercel branch preview parity.

- Purpose: compare local/VPS behavior against preview runtime without touching production.
- Guardrails: no `vercel --prod`, no promote, no domain alias edits, no production branch merge.

Future slot B: Authenticated UI smoke.

- Purpose: verify login, Global API Vault Save & Lock, workflow single-start/multi-start, generated history/download.
- Guardrails: do not print or report raw credentials/API keys.

Future slot C: Lint warning cleanup.

- Purpose: reduce warning noise after functional repair is stable.
- Guardrails: separate from runtime repair; avoid touching generated or historical files without intent.

Future slot D: NBLM upload and source indexing.

- Purpose: preserve this pack in `NEXUS Current System Map` or a dedicated `NEXUS v24 Repair Memory` notebook.
- Guardrails: user must explicitly ask for upload destination.

## 11. What Should Not Be Implemented Yet

- Do not promote to production.
- Do not change Supabase schema/data.
- Do not build new architecture around queue/auth until authenticated UI smoke verifies current behavior.
- Do not delete untracked skill/report folders without ownership confirmation.
- Do not treat this report as a command list; verify current repo state first.

## 12. Context Pack For Next Round

Read first:

- `context-packs/next-codex-context-pack.md`.
- `maps/v24-repair-system-map.md`.
- v23 scan `final-report.md` and `repair-plan.md`.

Suggested next instruction:

```text
Continue from the NEXUS v24 repair memory pack.
Do not touch production.
Run a branch-preview parity plan only if needed.
First verify current branch/status, then run authenticated UI smoke with sanitized reporting.
Do not expose raw keys or credentials.
```

## 13. NBLM Memory Return Notes

Memory type:

- Iteration report.
- Architecture/risk context.
- Runtime repair evidence.
- Future slot register.
- Collaboration standard example.

Suggested notebook:

- Primary: `NEXUS Current System Map`.
- Secondary: `Codex Collaboration Skills Memory` for loop/reporting discipline only.

Upload status:

- Not uploaded by this task.
- Local flat export is prepared separately.


# Checkpoint: P01 / core / 2026-06-04T17:54:17Z

## Scope

- Repository: /Users/sean/Documents/FreeChat
- Branch: v22
- Environment: local Next.js dev server on http://127.0.0.1:3000, shell zsh, user timezone Australia/Sydney
- Tools used: local shell, Browser, Computer Use, LINE app, Supabase/Vercel/GitHub available if live account/project evidence becomes necessary
- Current command round: R011 complete after final validator pass
- Active checkpoint path: docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/00-active-checkpoint.md
- Branch checkpoint path: docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/branch-C-P02-001.md; docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/branch-P05-suspicion-hypotheses.md; docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/branch-P03-suspicion-list.md; docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/branch-P06-suspicion-hypotheses.md
- Last checkpoint read at: 2026-06-04T19:18:00Z
- Next checkpoint update trigger: before the next repair or UI-verification phase

## Router Decision

```json
{
  "schema": "nexus.workflowPro.blackbox.router.v1",
  "taskSummary": "Run Workflow Pro / NEXUS black-box exploration and repair preflight from first principles on localhost, with checkpointed live evidence, provider evidence where configured, and sanitized reporting.",
  "primaryProtocol": "01",
  "secondaryProtocols": ["02", "03", "05", "06"],
  "mandatoryLiveEvidence": true,
  "mandatoryComputerUseEvidence": true,
  "mandatoryRealProviderEvidence": true,
  "reason": "The task starts from unknown system state and also names workspace/account/artifact/storage authority, long workflow/runtime/durable output, provider-backed LLM/image behavior, and local versus deployed parity. UI usability claims require Computer Use evidence. Provider-backed claims require real provider/API tests when credentials are configured.",
  "blockedProtocols": [],
  "checkpointRunId": "v23-blackbox-20260604T175417Z"
}
```

## Initial Operating Assumptions

- Assumption: The local dev server from the previous setup is still available at http://127.0.0.1:3000.
- Why it is unproven: A browser title was observed before this checkpoint existed; this run must not use that as final evidence.
- First falsification probe: Re-open or inspect localhost during P01 and record supporting browser evidence, then use Computer Use for final UI evidence.

- Assumption: Provider credentials may be configured through .env.local, .env, ~/.gateway.env, shell environment, or explicit user authorization.
- Why it is unproven: The run has not yet inspected allowed credential sources in a redacted way.
- First falsification probe: Check only key presence and model names without printing raw secret values.

- Assumption: Existing repository modifications may belong to the user or prior generated work.
- Why it is unproven: Git status shows many modified and untracked files, but ownership is not established.
- First falsification probe: Treat the worktree as shared and limit this run's writes to the checkpoint/report directory unless a repair is explicitly selected.

## Evidence Collected

| Evidence ID | Source | Method | Confidence | Notes |
|---|---|---|---:|---|
| E-R000-001 | AGENTS.md | static_read | 0.95 | Next.js APIs/conventions may differ; read relevant `node_modules/next/dist/docs/` guide before code changes. |
| E-R000-002 | README.md, protocol-router.md, live-evidence-gate.md, checkpoint-template.md, events.schema.json | static_read | 0.95 | Required protocol system demands checkpoint-first phases, separate evidence/inference, Computer Use for visible Workflow Pro verdicts, and real provider evidence when configured credentials exist. |
| E-P01-001 | src/app/page.tsx; src/components/nexus/nexus-ops.tsx; src/components/nexus/workflow-pro/workflow-pro-surface.tsx | static_read | 0.90 | Home renders NexusOps; WorkflowProSurface is an in-app workspace view with Open Graph, Open Panels, Export Contract, Import Contract, and Apply Preview controls. |
| E-P01-002 | src/app routes and rg scan | script_scan | 0.88 | Relevant routes include agent stream, image-gen, artifacts, workflow groups/runtime trace, workspace session/state, sync, and observability endpoints. |
| E-P01-003 | workflow-runtime-lite runner/executors/llm-client/image-client | static_read | 0.90 | Runner emits node status updates; LLM nodes call `/api/v1/agents/:id/stream`; image nodes call `/api/image-gen` and then `/api/v1/artifacts`. |
| E-P01-004 | api-handler, artifacts route, workspace session route, workspace permission, image-gen route | static_read | 0.88 | Permission/auth gates exist on API handler routes; artifact routes require workspace permission; workspace session requires auth; image-gen enforces auth/permission only in production runtime. |
| E-P01-005 | .env.local/.env/~/.gateway.env/shell env sanitized probe | script_scan | 0.95 | `.env.local` has OpenAI API key, `OPENAI_IMAGE_MODEL=gpt-image-2`, Supabase public URL, and Supabase anon key; `.env` and `~/.gateway.env` absent; checked shell vars absent. Raw secrets not printed or persisted. |
| LE-P01-001 | Browser http://127.0.0.1:3000/ | browser_live | 0.86 | Post-checkpoint localhost first state is an auth gate with email/password/login/need account; Workflow Pro text not visible in first state. |
| LE-P02-001 | Computer Use Chrome http://localhost:3000/ | computer_use_live | 0.88 | Opened a new Chrome tab, typed localhost:3000, pressed Return, and observed NEXUS auth gate with email field, password field, Login, and Need Account controls. No login submission was performed because Chrome displayed autofilled values that were not part of this run. |
| LE-LINE-001 | Computer Use LINE Keep筆記 | computer_use_live | 0.90 | Posted sanitized progress report to LINE Keep notes and confirmed a sent green message bubble. No raw secrets were included. |
| E-P02-001 | localhost unauthenticated route probes | local_api_probe | 0.90 | `/health` and `/public-config` returned 200. Unauthenticated workspace session, workspace state, artifacts GET/POST, and sync status returned 401 AUTH_REQUIRED. Empty image-gen prompt returned 400 before provider work. |
| E-P02-002 | localhost workflow group/runtime-trace probes | local_api_probe | 0.90 | Workflow groups and runtime-trace are POST-oriented: GET returned 405; minimal unauthenticated POST returned 401 AUTH_REQUIRED. |
| E-P02-003 | live Supabase sign-up plus authenticated localhost API probes | local_api_probe | 0.92 | Throwaway Supabase sign-up returned hasUser=true and hasSession=true. Authenticated `/api/v1/workspaces/session` returned 200 role=owner, workspaceId=workspace_df5a977812ea4d508b, created=true. Authenticated state and artifacts reads for that same workspace returned 403 PERMISSION_DENIED. Password/access token were not printed or persisted. |
| E-P02-004 | workspace session/permission source map | static_read | 0.88 | In non-production without service role, workspace session uses a local in-memory repository; state/artifact permission checks with bearer token use request-scoped Supabase membership reads, so local in-memory memberships are not shared with those downstream routes. |
| E-P02-005 | RPC migration, session route, session/permission services, focused tests | static_read | 0.92 | The RPC writes both `workspaces` and `workspace_memberships` and is granted to authenticated users. Code sends preview/production-without-service-role to authenticated RPC, but local runtime selects the local in-memory workspace session service. Existing tests cover preview RPC fallback and local repository fallback separately, not live localhost plus real Supabase bearer-token authority. |
| E-P02-006 | workspace session/permission focused tests | unit_test | 0.90 | `npm test -- src/lib/backend/workspace/workspace-session-service.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts` passed: 2 files, 11 tests. |
| E-P02-007 | direct Supabase RPC plus localhost downstream permission probe | local_api_probe | 0.94 | Throwaway Supabase account called `nexus_ensure_workspace_session` directly with a live session; RPC returned owner workspace `workspace_b4c67653181d4999ae54e41a95682d55`, created=true. Localhost state GET for that workspace returned 404 `WORKSPACE_STATE_NOT_FOUND` rather than 403; artifacts GET returned 200. |
| E-P05-001 | image-gen route, image adapter, generated asset cache/storage, artifact routes, Workflow Pro fixtures | static_read | 0.90 | Image route uses configured OpenAI key or runtime authorization, then materializes image output into a local asset route and optionally Supabase storage. Artifact routes can save generated-image records and download durable stored bytes. Vision/audio/file nodes currently use ContextPacket/file-node/no-op compiler boundaries rather than native media analysis/transcription. |
| E-P05-002 | `/api/image-gen` no workspace | local_api_probe, real provider | 0.93 | Real image provider returned 200 in 15375 ms, mode=dall-e, local asset route, generatedAsset provider=memory, durable=false, image/png 757152 bytes. Asset route fetch returned 200 image/png. No raw data URL in response content. |
| E-P05-003 | Supabase sign-up/RPC plus `/api/image-gen` with workspace | local_api_probe, real provider | 0.94 | Real image provider with live Supabase session/workspace returned 200 in 15618 ms, generatedAsset durable=true, provider=supabase-storage, image/png 816689 bytes, bucket/path present. Asset route fetch returned 200 image/png. |
| E-P05-004 | Real image provider + storage + artifact create/list/download | local_api_probe, real provider | 0.95 | Real image provider with live workspace created durable storage bytes, then `POST /api/v1/artifacts` returned 200 saved generated-image with requestId=req_7785c67d-427e-4734-953c-2209f3ce8022 and traceId=trace_0404ad78-ff05-436b-bc2c-ed4df9847286. Artifact list returned 200 count=1. Artifact asset download returned 200 image/png with matching 729590 byte length. |
| E-P05-005 | `/api/v1/providers/verify` | local_api_probe, real provider | 0.92 | Live LLM provider verify used `.env.local` OpenAI key in memory only and returned 200 in 1428 ms, verified=true, provider=openai-compatible, model=gpt-4o-mini. Key hash recorded, raw key not printed or persisted. |
| E-P05-006 | branch-P05-suspicion-hypotheses.md | static_read | 0.88 | Created capability classification and 12 stable suspicion hypotheses: 3 vision, 3 image generation, 3 storage, and 3 branch-count load risks. |
| E-P03-001 | Runtime Lite, group/trace routes, runtime evidence, durability scan | static_read | 0.90 | Runtime Lite produces runId/group/node execution status; group and runtime-trace routes write sanitized observability events and forbid raw prompt/snapshot/secret/dataUrl keys; durability scan checks output id shape, outputMessageId, runtime marker header, and persistence-before-completion authority. |
| E-P03-002 | `npm run check:output-durability` | unit_test | 0.92 | Durability scan had no blocking findings; memory output authority, regression coverage, stream completion authority, and workflow runtime producer checks were true. `agent-runtime.test.ts` passed 12 tests. |
| E-P03-003 | Focused runtime/group/trace/correlation tests | unit_test | 0.90 | Focused Vitest run passed: 9 files, 44 tests. Coverage includes route sanitization/permission, Runtime Lite state, trace client, durable group records, trace correlation, runtime evidence warnings, run group inspector, and group record client payloads. |
| E-P03-004 | Live Supabase session/RPC plus workflow group/runtime-trace API probe | local_api_probe | 0.94 | Artifact marker create returned 200 saved; group record returned 200 `workflow.group_record.upserted`; runtime trace returned 200 `workflow.runtime_lite.run.succeeded`; both used workflowGroupId `wf_group_p03_8263e8281708` and traceId `trace_p03_21e0dfbddd27`. |
| E-P03-005 | branch-P03-suspicion-list.md | static_read | 0.88 | Created 12 falsifiable P03 suspicions: 4 long-running workflow, 4 durable output, 4 generated media, plus 6 runtime collision classes. |
| E-P06-001 | deployment/config find plus parity/recovery rg scan | script_scan | 0.88 | Project-level deployment/config surfaces include `.vercel/project.json`, `.vercelignore`, `next.config.ts`, `package.json`, `.env.example`, and `.env.local`; source/scripts branch on `NODE_ENV`, `VERCEL_ENV`, preview/protection, request/trace ids, workspace session/membership, and recovery diagnostics. |
| E-P06-002 | 待連往後加強-部署實測.md plus live probe scripts | static_read | 0.86 | Created future deployed live-probe note for Vercel protection, app auth, new account workspace authority, storage/RLS parity, production image-gen boundary, role matrix, generated history, and recovery diagnostics. |
| E-P06-003 | branch-P06-suspicion-hypotheses.md | static_read | 0.88 | Created 15 falsifiable P06 suspicions: 5 environment parity, 5 account/workspace parity, and 5 recovery diagnostics hypotheses. |
| E-FINAL-001 | final matrix, summaries, blocked list, repair plan, final report | static_read | 0.90 | Required final artifacts created and linked: matrix, live evidence summary, provider evidence summary, blocked/not-yet-verified list, repair plan, future deploy note, and final report. |

## Inferences

| Inference ID | Based On | Claim | Confidence | Can Be Falsified By |
|---|---|---|---:|---|
| I-R000-001 | E-R000-002 | Protocol chain should begin with P01 and branch into P02/P03/P05/P06 as evidence surfaces. | 0.90 | Router rules or task scope excluding those surfaces. |
| I-R000-002 | E-R000-002 | Any final claim that Workflow Pro UI works must remain not-yet-verified until Computer Use evidence is recorded. | 0.95 | A documented protocol exception or blocked verdict. |
| I-P01-001 | E-P01-001,LE-P01-001 | Workflow Pro exists in source but the post-checkpoint localhost first state is an auth gate, so UI usability remains not-yet-verified. | 0.84 | Computer Use login/sign-up followed by visible Workflow Pro mode operation. |
| I-P01-002 | E-P01-003,E-P01-005 | Provider-backed Workflow Pro image/LLM verdicts require real provider/API evidence or a blocked reason. | 0.92 | Credential probe showing no usable provider credentials or provider route returning sanitized blocking errors. |
| I-P02-001 | LE-P02-001,E-P02-003 | Account creation is live at Supabase/API level, but the visible localhost UI account flow remains not-yet-verified because Computer Use did not submit the auth form. | 0.82 | Computer Use creates or logs into an account through the UI and visibly reaches the NEXUS workspace without exposing secrets. |
| I-P02-002 | E-P02-003,E-P02-004 | Most likely local failure mode: `/workspaces/session` creates local in-memory workspace membership while downstream state/artifact permission checks read Supabase memberships through the authenticated request client. | 0.86 | A migration/RPC or repository path that persists membership to the same store used by downstream permission checks, or a successful authenticated state/artifact read for the created workspace. |
| I-P02-003 | E-P02-003,E-P02-005,E-P02-007 | Direct authenticated RPC creates workspace membership in the same store used by downstream permission checks; therefore the local session route's local in-memory fallback is the likely cause of the 200-owner then 403 downstream split. | 0.92 | A local route implementation that also calls the RPC in this runtime yet still produces downstream 403, or a Supabase/RLS audit showing the direct RPC path did not create comparable membership. |
| I-P05-001 | E-P05-002,E-P05-003,E-P05-004,LE-P02-001 | Real image provider, storage upload, artifact record creation, artifact listing, artifact asset download, and LLM verification work through localhost API when workspace membership is created through the authenticated RPC path; this does not prove visible Workflow Pro UI flow works. | 0.90 | Computer Use evidence showing a logged-in operator runs Workflow Pro image flow end to end with generated history and download visible. |
| I-P05-002 | E-P05-006,C-P02-001,C-P02-002,I-P05-001 | Further provider spending has lower ROI until the visible UI/account path is repaired or bypassed with Computer Use evidence; next useful multimodal proof is a UI-run benchmark tying provider output to runtime trace, generated history, and download. | 0.84 | Additional API-level provider probes find a new storage/runtime failure, or protocol requires more provider calls before UI repair. |
| I-P03-001 | E-P03-002,E-P03-003,E-P03-004,LE-P02-001 | Runtime durability is supported at scan/test/API-route level, but visible UI liveness, active-node progress, and reload recovery remain not-yet-verified because the UI auth/workspace gate is still blocked. | 0.88 | Computer Use UI run evidence showing node state transitions, generated output ID, durable read path, and reload recovery, or a route read showing written events cannot be recovered. |
| I-P06-001 | E-P06-001,E-P06-002,C-P02-001,C-P02-002,I-P05-001 | Localhost API success and local UI auth-gate evidence do not prove preview/production parity where runtime env, Vercel protection, service-role availability, production image-gen auth, or Supabase RLS/storage may differ. | 0.86 | A current deployed live route/account/action matrix with Computer Use evidence for UI claims. |

## Branch State

- Core exploration status: P01-core, P02-core, P02-suspicion, P05-core, P05-suspicion, P03-core, P03-suspicion, P06-core, P06-suspicion, and P06-final completed with static, API, Browser, Computer Use, unit-test, live Supabase/RPC, real OpenAI provider, and final synthesis evidence.
- Detail branch status: `branch-C-P02-001.md` created for workspace authority split; `branch-P05-suspicion-hypotheses.md` created for provider/storage/vision/load hypotheses; `branch-P03-suspicion-list.md` created for runtime/durable/generated-media hypotheses; `branch-P06-suspicion-hypotheses.md` created for environment/account/recovery parity hypotheses.
- Collision branch status: none.
- Suspicion branch status: none.
- Remaining unknowns: UI sign-up/login viability, Workflow Pro UI operation after repair, UI active-node progress/reload recovery, deployment parity, native vision/audio support, and branch-count load behavior.
- Last completed command: final validator passed after LINE Keep evidence and final report update.
- Next command: if continuing, start P0 workspace authority repair after reading relevant Next.js docs, then rerun live API and Computer Use UI verification.

## Event Log Mirror

- events.ndjson path: docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/events.ndjson
- Last event id: E0089
- Last checkpoint.created event: E0001
- Last checkpoint.read event: E0086
- Last phase.started event: E0087
- Last evidence.added event: E0083
- Last live_evidence.added event: E0088
- Last verdict.added event: E0074
- Last validator result: ok=true, failures=0, warnings=0, events=89, liveEvidence=8, computerUseEvidence=2, verdicts=5, phases=11
- Mandatory live evidence: true
- Mandatory Computer Use evidence: true

## Contradictions

| Contradiction | Evidence A | Evidence B | Current Interpretation | Next Probe |
|---|---|---|---|---|
| C-P01-001 | E-P01-001 source Workflow Pro surface exists | LE-P01-001 localhost first state is auth gate | Inconclusive: surface may be reachable only after auth; cannot claim UI works yet. | Use Computer Use to authenticate/sign up and switch to Workflow Pro. |
| C-P02-001 | E-P02-003 authenticated `/workspaces/session` returned 200 role=owner, created=true | E-P02-003 same session workspace state/artifact reads returned 403 PERMISSION_DENIED | Product-risk: a new live account can receive an owner workspace session but fail downstream workspace authority checks on localhost. | Inspect workspace-session RPC/migrations and align local authenticated session writes with the permission store used by state/artifact routes. |
| C-P02-002 | E-P02-003 local session route returned owner workspace then downstream 403 | E-P02-007 direct authenticated RPC returned owner workspace then state 404 and artifacts 200 | Product-risk: local route authority selection, not the RPC itself, is the blocker. | Repair/test session route so local runtime with a real bearer token prefers authenticated RPC, then rerun live local route matrix. |

## Suspicions And Next Probes

| ID | Type | Description | Next Probe |
|---|---|---|---|
| S-R000-001 | suspicion | Local UI may emit unauthorized sync errors because earlier non-checkpoint observation saw 401 logs; not evidence for this run yet. | Reproduce under P01/P02 and record sanitized evidence. |
| NP-R000-001 | next_probe | Establish terrain map from repo files and localhost surface. | Read checkpoint, start P01-core, inspect routes/scripts/tests without assuming prior failures. |
| NP-R001-001 | next_probe | Identify Workflow Pro surface, route/API map, and validation scripts from first principles. | Read P01 protocol and scan files with `rg --files`/focused static reads. |
| S-P01-001 | suspicion | Local image-gen can use server provider key in development without proving production account authorization parity. | P05 real provider test plus P06 deploy/parity note. |
| NP-P01-002 | next_probe | Cross the auth gate or record why it blocks Workflow Pro UI evidence. | Read checkpoint, start P02-core, operate localhost with Computer Use. |
| S-P02-001 | suspicion | Local fallback repository selection splits workspace ownership from permission checks when Supabase auth is present but service role is absent. | Read migrations/RPC and targeted tests around workspace session and membership persistence. |
| NP-P02-001 | next_probe | Determine whether workspace session should persist membership via Supabase RPC/request-scoped client or whether downstream permission should share the same local repository in dev. | Inspect workspace migrations, database types, and permission/session service tests before proposing a repair. |
| NP-P02-002 | next_probe | Real provider evidence remains mandatory because `.env.local` has an OpenAI key and image model. | Run `/api/image-gen` with a tiny real prompt and sanitize output to status, request id, artifact id/kind, mime/size, and durability flags only. |
| NP-P02-003 | next_probe | Repair candidate needs a regression test for local runtime plus real bearer token plus public Supabase config. | Add/fix only after reading relevant Next.js docs if implementation is selected. |
| S-P05-VISION-001 | suspicion | Image reverse-planning may reason from URL/metadata instead of actual pixels. | Inspect a sanitized downstream LLM request for native image input after UI/runtime repair. |
| S-P05-IMAGE-002 | suspicion | Provider success without workspaceId creates memory-only assets. | Repeat via UI and verify durable flag/generated history after auth repair. |
| S-P05-STORAGE-001 | suspicion | Supabase storage bucket/policy may differ on preview/production. | P06 deployed parity probe or future hardening file. |
| S-P05-LOAD-002 | suspicion | Generated history hydration may load too much preview data under branch-heavy runs. | Controlled load probe with Browser/Computer Use after auth repair. |
| S-P03-RUNTIME-001 | suspicion | API trace can be written while UI active-node progress remains opaque. | Computer Use run of a real Workflow Pro group after auth repair. |
| S-P03-DURABLE-001 | suspicion | Runtime trace event can reference an artifact that later cannot be read through generated history. | UI/history reload probe and artifact route read. |
| S-P03-MEDIA-001 | suspicion | Provider image success can precede artifact DB creation, leaving durable bytes but no history row. | Simulate artifact POST failure after storage upload. |
| S-P03-LONG-002 | suspicion | Heartbeat exists for agent streams but not necessarily Runtime Lite graph node execution. | Run multi-node graph and inspect progress events/logs. |
| S-P06-ENV-001 | suspicion | Preview protection may block before app auth and be misclassified as app 401/403. | Run protected preview probe with sanitized platform/app classification. |
| S-P06-ACCT-002 | suspicion | New-account workspace session parity may fail on deployed targets if authority stores diverge. | Run owner/new-account session/state/artifacts matrix after P0 repair and on preview. |
| S-P06-REC-005 | suspicion | Reload recovery may not reconnect runtime trace, artifact, and generated history. | Computer Use run/reload/history/download probe. |
| NP-P06-001 | next_probe | Deployed parity requires a fresh target URL and current account matrix; this run only wrote a future hardening note. | Use `待連往後加強-部署實測.md` after push/preview access. |

## Risk Register

| Risk | Severity | Likelihood | Blast Radius | Evidence | Next Action |
|---|---:|---:|---|---|---|
| UI claims without Computer Use evidence | 5 | 4 | Final report invalidates Workflow Pro usability claims | E-R000-002 | Schedule Computer Use screen operation before verdicts. |
| Provider-backed behavior accidentally downgraded to mock | 5 | 3 | False confidence in LLM/image workflows | E-R000-002 | Check credential presence and mark real-provider tests or blocked. |
| Existing dirty worktree obscures this run's changes | 3 | 5 | Harder review and attribution | local git status observed before P01, not yet phase evidence | Limit writes to run checkpoint/report files. |
| Auth gate blocks Workflow Pro live verification | 4 | 4 | UI, graph, import/export, workflow-run claims remain not-yet-verified | LE-P01-001 | Use Computer Use to sign up/login or mark blocked. |
| Provider success may not imply artifact durability | 5 | 4 | Generated output can appear successful but fail retrieval/history persistence | E-P01-003,E-P01-004 | Test image/provider route and artifact retrieval separately. |
| New account workspace authority split | 5 | 4 | New users cannot access workspace state/artifacts after session creation, blocking Workflow Pro persistence and artifact flows | E-P02-003,E-P02-004,C-P02-001 | Verify migrations/RPC and choose P0 repair path. |
| Test gap around local Supabase bearer authority | 4 | 4 | Existing tests pass while live local route/API fails, so future regressions can survive CI | E-P02-006,E-P02-007 | Add route-level regression for local bearer-token RPC preference. |
| Native vision/audio overclaim | 4 | 3 | Workflow templates may imply image/audio understanding while current file node is a no-op compiler/reference boundary | E-P05-001 | Mark native vision/audio as not-yet-verified or unsupported until a true media-to-model bridge exists and is provider-tested. |
| Branch/load preview pressure | 3 | 4 | Many generated image branches may stress local asset cache, preview list, and artifact history pagination | E-P05-001 | Build P05 suspicion/load map and later controlled UI load probe after auth repair. |
| Preview/production parity overclaim | 5 | 3 | Localhost success could hide deployed auth, storage, provider, or protection failures | E-P06-001,E-P06-002,I-P06-001 | Keep deployed parity not-yet-verified until fresh preview/production probes. |
| LINE Keep reporting loop drift | 2 | 2 | Future rounds could forget the user-requested external progress loop | LE-LINE-001 | Continue short sanitized LINE Keep updates after future high-ROI phases. |

## Open Questions

1. Can a new or existing Supabase account cross the localhost auth gate without email confirmation blocking the run?
2. Should the P0 workspace authority repair be implemented in the next round, or should this run remain a repair preflight with a ranked plan?
3. Can Workflow Pro import/export/apply and runtime controls be operated through Computer Use after auth repair?
4. How much branch-count and generated-history load can the UI safely handle with image artifacts?
5. Which preview/production URL should be used for the future deployed parity matrix?
6. Should the next round implement the P0 workspace authority repair immediately, then run the Computer Use UI flow?

## Next Command

```txt
Continue from this checkpoint. Do not assume any unproven prior conclusion.
If continuing this run, read this checkpoint first, then begin P0 workspace authority repair and UI verification.
```

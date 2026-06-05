# Branch P05: Provider, Storage, Vision, And Load Suspicion Hypotheses

## Status

- Branch ID: P05-suspicion
- Protocol: P05
- Secret handling: checked; no raw provider key, bearer token, cookie, password, image payload, or provider response body is stored.
- Basis: E-P05-001 through E-P05-005 plus P02 authority evidence.

## Capability Classification

| Capability | Current Classification | Evidence |
|---|---|---|
| LLM provider verify | implemented at localhost API level | E-P05-005 |
| Image generation | implemented at localhost API level with real provider | E-P05-002,E-P05-003,E-P05-004 |
| Durable generated image bytes | implemented when Supabase session and workspaceId are present | E-P05-003,E-P05-004 |
| Generated-image artifact record/list/download | implemented at localhost API level when workspace membership comes from RPC | E-P05-004 |
| Workflow Pro visible UI image flow | not-yet-verified | LE-P02-001,I-P05-001 |
| Native vision input to LLM | not-yet-verified / likely unsupported in current runtime bridge | E-P05-001 |
| Audio transcription or audio-to-image native media bridge | not-yet-verified / likely unsupported in current runtime bridge | E-P05-001 |
| High branch-count generated preview load | not-yet-verified | E-P05-001 |

## 12 Suspicion Hypotheses

| ID | Capability | Suspicion | Evidence Needed | Probe | Load Impact | User Impact |
|---|---|---|---|---|---|---|
| S-P05-VISION-001 | vision | Image reverse-planning nodes may reason from URL/metadata text rather than actual pixels. | Runtime LLM payload showing `input_image` or equivalent provider media part. | Instrument/inspect LLM request payload with a generated image upstream, redacting prompt and URL. | Medium | Users may believe vision occurred when only text metadata was used. |
| S-P05-VISION-002 | vision | File/image attachments may remain no-op compiler references and never become model-readable image bytes. | Attachment compiler execution report with transformed media payload. | Upload a tiny image through UI/API after auth repair and inspect ContextPacket attachment shape. | Low | Image-backed workflows produce generic answers. |
| S-P05-VISION-003 | vision | Generated image artifact may be downloadable but not reusable as native vision input in later LLM nodes. | Downstream LLM request contains generated image bytes or provider-readable URL with permissions. | Run image -> LLM reverse workflow and inspect sanitized runtime trace. | Medium | Image-to-prompt workflows appear complete but lack visual grounding. |
| S-P05-IMAGE-001 | image | Dev route can generate with server key while UI account path is blocked by C-P02-001. | Computer Use screen proof after session fix. | Repair session route, login with UI, run image mode. | Low | API proof does not guarantee user workflow. |
| S-P05-IMAGE-002 | image | Provider success without workspaceId creates only memory assets. | GeneratedAsset durability flag for unauth/no-workspace run. | Already observed E-P05-002; repeat via Workflow Pro UI. | Medium | Users can lose images after cache expiry. |
| S-P05-IMAGE-003 | image | Parallel image branches can exceed transient asset cache count/byte limits before artifacts are saved. | Cache eviction behavior under 40+ assets or 160 MB. | Controlled load probe after auth repair; avoid excessive provider cost by using stored fixture bytes first. | High | Generated previews disappear during large workflows. |
| S-P05-STORAGE-001 | storage | Supabase storage bucket/policy may differ between local project and preview/production. | Preview/production storage upload/download evidence. | P06 deployed parity probe with bypass/access. | High | Local durable success fails after push. |
| S-P05-STORAGE-002 | storage | Artifact record can save while stored bytes are missing or inaccessible. | Artifact asset route 404/403 for saved generated-image record. | Create artifact with deliberately missing path in non-destructive test workspace. | Medium | History entry exists but download fails. |
| S-P05-STORAGE-003 | storage | Artifact list pagination may hide recent generated outputs under high volume. | Pagination cursor behavior with >50 generated artifacts. | Seed metadata-only artifacts or use low-cost fixture records, then list pages. | Medium | Users think generation vanished. |
| S-P05-LOAD-001 | branch-load | Three or more image branches may serialize provider calls and produce long UI uncertainty. | Runtime node timing per branch and visible progress states. | Run benchmark C after UI access; record runtime-trace statuses. | Medium | User cancels or reruns, increasing cost. |
| S-P05-LOAD-002 | branch-load | Generated history hydration may pull too many thumbnails/full previews into the UI. | Browser memory/DOM count and network payload sizes. | Browser/Computer Use load probe with generated history open. | High | Slow UI or tab pressure. |
| S-P05-LOAD-003 | branch-load | Runtime trace and group records may omit artifact IDs for failed persistence branches. | Runtime trace entries with success/failure artifact fields. | Run mixed success/failure branch scenario and inspect sanitized trace. | Medium | Hard to debug which branch produced which asset. |

## Next Probes

1. P0: fix or patch around C-P02-001, then perform Computer Use UI account and Workflow Pro run.
2. P1: run benchmark C or equivalent image-reverse-fanout through UI and compare runtime trace, artifact history, and download.
3. P1: add a non-provider fixture load probe for generated history pagination and preview memory before spending more provider budget.
4. P2: run P06 preview/production parity for storage bucket, auth, and provider boundaries.

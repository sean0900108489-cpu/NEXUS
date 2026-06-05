# Repair Plan

Run ID: `v23-blackbox-20260604T175417Z`

## P0

| Item | Why | Evidence | Repair direction | Verification |
|---|---|---|---|---|
| Fix localhost workspace authority split | New live account can get owner workspace from `/api/v1/workspaces/session` but downstream state/artifact routes deny it. | `C-P02-001`, `C-P02-002` | When a real Supabase bearer token and public Supabase config exist, prefer the authenticated RPC/session authority used by downstream permission checks. Keep pure local fallback only for no Supabase/public config/local-only users. | Add route/service regression test, rerun focused tests, rerun live localhost session/state/artifact matrix, then Computer Use UI login. |
| Get Computer Use Workflow Pro proof after auth repair | Protocol forbids UI usability claims without Computer Use. | `LE-P02-001`, `NYV-UI-*` | Use a throwaway account, open localhost, login/sign up, reach Workflow Pro, import/apply/run minimal graph, observe output/download. | `computer_use_live` events and screenshots/steps in checkpoint. |

## P1

| Item | Why | Evidence | Repair/hardening direction | Verification |
|---|---|---|---|---|
| Preview/production parity drill | Local branches on runtime/env and may not match deployed behavior. | `E-P06-001`, `I-P06-001` | Run the deployed probe plan in `待連往後加強-部署實測.md` after push/preview. | deployment-live route/account/provider matrix. |
| Runtime UI liveness and reload recovery | API group/trace persistence works but visible progress/recovery is unproven. | `E-P03-004`, `I-P03-001` | After auth repair, run multi-node graph, reload, inspect generated history and runtime evidence. | Computer Use plus API trace readback. |
| Generated image history/download UI | API image/storage/artifact chain works; user-facing history is unverified. | `E-P05-004`, `NYV-UI-004` | Add a UI probe that creates one image, verifies generated history row, previews/downloads the artifact. | Computer Use + artifact route read. |

## P2

| Item | Why | Evidence | Direction | Verification |
|---|---|---|---|---|
| Native vision/audio capability classification | Current scan cannot prove actual vision/audio model-backed behavior. | `E-P05-001`, `branch-P05-suspicion-hypotheses.md` | Either implement real media-to-provider bridge or mark templates as reference-only. | Real provider vision/audio probes or explicit unsupported UI copy. |
| Branch-count/load resilience | High branch count and generated media lists can stress UI/cache/history. | `S-P05-LOAD-*`, `S-P03-*` | Controlled load test after auth and deployed parity are stable. | Browser/Computer Use performance and artifact pagination evidence. |

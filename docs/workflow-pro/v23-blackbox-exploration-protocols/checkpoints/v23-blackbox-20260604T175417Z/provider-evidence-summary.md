# Provider Evidence Summary

Run ID: `v23-blackbox-20260604T175417Z`

## Real Provider/API Evidence

| Evidence | Provider/API | Result | Notes |
|---|---|---|---|
| `E-P02-003` | Supabase Auth + localhost APIs | throwaway account had live session; localhost session route returned owner workspace, then downstream state/artifacts returned 403 | Raw credentials were not printed or persisted. |
| `E-P02-007` | Supabase Auth + direct RPC + localhost APIs | RPC-created workspace passed downstream permission checks; state returned 404 and artifacts returned 200 | Supports authority-split contradiction. |
| `E-P05-002` | OpenAI image provider through `/api/image-gen` | 200 image/png, memory asset, durable=false | Real provider call without workspace. |
| `E-P05-003` | OpenAI image provider + Supabase storage | 200 image/png, durable=true, provider=supabase-storage | Real provider call with live workspace. |
| `E-P05-004` | OpenAI image provider + Supabase storage + artifact API | image generated, artifact saved/listed/downloaded with matching byte count | End-to-end API-level durable generated image chain. |
| `E-P05-005` | OpenAI-compatible LLM verify route | 200 verified=true for `gpt-4o-mini` | Key hash only; raw key was not printed or persisted. |
| `E-P03-004` | Supabase Auth/RPC + localhost workflow APIs | artifact marker, group record, and runtime trace all returned 200 | Runtime ledger API-level proof. |

## Static/Unit/Script Evidence Only

| Evidence | Type | What it proves | What it does not prove |
|---|---|---|---|
| `E-P01-001` to `E-P01-004` | source/static scan | Route and Workflow Pro terrain exists. | No live UI success. |
| `E-P02-004` to `E-P02-006` | source scan and unit tests | Likely workspace authority split and test coverage gap. | No repair success. |
| `E-P03-001` to `E-P03-003` | source scan and tests | Runtime ledger/durability contracts are covered by tests. | No visible UI liveness or reload recovery. |
| `E-P05-001`, `E-P05-006` | source scan and hypothesis branch | Capability map and suspicion list. | No native vision/audio proof. |
| `E-P06-001`, `E-P06-002` | static/script scan and plan file | Deployment parity surfaces and future plan. | No current deployed parity. |

No provider-backed success in this report relies on mock, dry-run, or static-only evidence.

# Source 020 - maps__00-executive-summary.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 93a85bdb-5b0d-4b41-9644-7a9d4799f333
- title: maps__00-executive-summary.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 176
- token_count: 353
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/93a85bdb-5b0d-4b41-9644-7a9d4799f333
- source_added_timestamp: 2026-06-05T05:51:03.621008Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/maps/00-executive-summary.md
- local_mirror_estimated_word_count: 245

## Local Mirror Content

```md
# 00 Executive Summary

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

**Current truth:** NEXUS is a dense operator cockpit centered on `/`, a style workbench at `/style-lab`, a broad `/api/v1` backend control plane, and a local Supabase migration spine for workspace, runtime, artifacts, sync, observability, prompts, notebooks, messages, feature flags, and storage.

**Evidence:** [src/app/page.tsx](/Users/sean/Documents/FreeChat/src/app/page.tsx), [src/app/style-lab/page.tsx](/Users/sean/Documents/FreeChat/src/app/style-lab/page.tsx), [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx), [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts), [src/lib/backend/api/api-handler.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-handler.ts), [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts), [src/lib/supabase/admin.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/admin.ts).

**Narrative intelligence pass:** the system is not missing structure; it has several structures that grew around production pressure. The next round should not invent a new skeleton first. It should read these existing control planes and separate cockpit UI, graph/workflow behavior, state sync, backend envelope, and Supabase persistence as current capabilities.
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

# Source 058 - skills__nexus-frontend-backend-coupling-map__SKILL.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 9b02149e-0978-4c9a-8cb0-55e55840ebe7
- title: skills__nexus-frontend-backend-coupling-map__SKILL.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 181
- token_count: 397
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/9b02149e-0978-4c9a-8cb0-55e55840ebe7
- source_added_timestamp: 2026-06-05T05:50:57.521572Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/.agents/skills/nexus-frontend-backend-coupling-map/SKILL.md
- local_mirror_estimated_word_count: 181

## Local Mirror Content

```md
---
name: nexus-frontend-backend-coupling-map
description: Use when mapping current NEXUS frontend-to-backend and Supabase coupling: UI feature to handler to store/action to API/Supabase/data result/UI update. Static-first, no production database access.
---

# Nexus Frontend Backend Coupling Map

## Purpose

Connect current UI features and state changes to API routes, backend services, Supabase clients, tables, RPCs, storage, auth, realtime, migrations, and RLS evidence.

## Hard Boundaries

- Do not connect to production Supabase.
- Do not modify database schemas or migrations.
- Do not output secrets.
- Do not expose service role values.

## Required Search Targets

- Supabase client initialization.
- `createClient` usage.
- Queries and mutations.
- RPC.
- Storage.
- Auth.
- Realtime.
- Env var names only, never values.
- API routes and route handlers.
- Fetch calls.
- Edge functions if present.
- Database types.
- Migrations and RLS SQL.

## Coupling Record Format

- Feature.
- Surface.
- Trigger.
- Frontend handler.
- State change.
- Backend/Supabase touchpoint.
- Table/RPC/storage/auth/realtime.
- Success path.
- Failure path.
- Risk.

## Required Outputs

- `maps/06-frontend-backend-coupling-map.md`
- `maps/07-supabase-touchpoint-map.md`
- `reports/supabase/frontend-backend-coupling.json`
- `context-packs/frontend-backend-coupling-context.md`
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

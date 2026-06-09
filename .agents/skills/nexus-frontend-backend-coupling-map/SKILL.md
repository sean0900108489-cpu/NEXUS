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


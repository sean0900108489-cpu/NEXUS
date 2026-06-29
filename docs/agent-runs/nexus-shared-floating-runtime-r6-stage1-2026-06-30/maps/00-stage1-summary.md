# R6 Stage 1 - Community Board External Web App

## Summary

R6 starts the first shared user-to-user posting surface as a standalone external
web app, not as an expansion of the existing local Forum or Feed primitives.

The new app is `Community Board` and is intended as the first small proof that
NEXUS users can publish content that other authenticated NEXUS users can read.

## Product Boundary

- External app folder: `/Users/sean/Documents/NEXUS-community-board`
- External app repo: `https://github.com/sean0900108489-cpu/NEXUS-community-board`
- NEXUS floating app kind: `community-board-web-app`
- Manifest id: `nexus-community-board`
- Local entry: `http://localhost:5175`
- Host: NEXUS Workspace Floating Web App Host iframe/sandbox boundary

## Security Boundary

The iframe receives only safe context:

- `workspaceId`
- `floatingWindowId` / `appInstanceId`
- `manifestId`
- `appKind`
- viewport/theme metadata
- `user.id` and optional `user.email`

It does not receive auth tokens, refresh tokens, Supabase keys, service role
keys, direct DB handles, storage bridge, API bridge, or command execution.

The external app asks the NEXUS parent host to call the Community Board API
through a narrow postMessage API bridge. The iframe does not receive auth
credentials. The parent calls NEXUS API routes with the authenticated NEXUS
session and the API does not trust a `userId` sent in the request body.

## Backend Boundary

New route:

- `GET /api/community/posts`
- `POST /api/community/posts`
- `OPTIONS /api/community/posts`

New repository:

- `src/lib/backend/community/community-board-repository.ts`

New Supabase migration:

- `supabase/migrations/20260629160001_create_community_board_tables.sql`

New tables:

- `community_posts`
- `community_replies`

RLS intent:

- authenticated users can read published posts/replies
- authenticated users can insert their own posts/replies
- authors can update their own posts/replies

Local verification used the repository's missing-table fallback because
`supabase migration list` could not connect without `SUPABASE_DB_PASSWORD`.
After the migration is applied to the live Supabase project, the same API route
will use `community_posts` / `community_replies` for durable cross-user reads.

Follow the activation runbook before claiming durable cross-user persistence:

- `docs/agent-runs/nexus-shared-floating-runtime-r6-stage1-2026-06-30/context-packs/r6-community-board-supabase-activation.md`

## Non-Goals

- No payments
- No marketplace backend
- No full Reddit/Forum clone
- No realtime
- No recommendations/ranking
- No follow graph
- No likes/reactions
- No direct Supabase access from the external app

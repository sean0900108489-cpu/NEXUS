# R6 Stage 1 Context Pack

Continue from branch `v41ui`.

R6 Stage 1 introduces a standalone external `Community Board` web app for the
first shared posting spine. This is intentionally separate from existing
`Forum` and `Feed` primitives, which remain local/demo surfaces.

Important files:

- `src/runtime/floating/registry/default-floating-apps.tsx`
- `src/runtime/floating/registry/floating-app-types.ts`
- `src/runtime/floating/web-app-host/FloatingWebAppContainer.tsx`
- `src/runtime/floating/web-app-host/floating-web-app-context-bridge.ts`
- `src/app/api/community/posts/route.ts`
- `src/lib/backend/community/community-board-repository.ts`
- `src/lib/supabase/database.types.ts`
- `supabase/migrations/20260629160001_create_community_board_tables.sql`
- external app: `/Users/sean/Documents/NEXUS-community-board/index.html`

Verification run:

- `npm test -- src/runtime/floating/web-app-host/floating-web-app-context-bridge.test.ts src/runtime/floating/registry/default-floating-apps.test.tsx`
- `npm test -- src/app/api/community/posts/route.test.ts`
- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
- `npm run typecheck`

The external app listens for `nexus:floating-web-app-context:v1`, displays safe
NEXUS user/workspace context, and sends `nexus:floating-web-app-api-request:v1`
messages to the parent host for the narrow Community Board API bridge.

# R6 Community Board Supabase Activation

## Current State

`Community Board` is wired as a standalone external Web App Host app at
`http://localhost:5175` and can post through the NEXUS parent API bridge.

The localhost smoke path is working, but durable cross-user persistence is not
active yet because the live Supabase project has not received the R6 migration.

Confirmed live table check:

- project ref: `xjuglddxwnikvcwxfbzg`
- REST table probe: `GET /rest/v1/community_posts?select=id&limit=1`
- result: `PGRST205`, table `public.community_posts` is not in the schema cache

The repository intentionally falls back to process memory when the table is
missing so the local floating app can be verified before production schema
activation. This fallback is not durable across server restarts.

## Migration To Apply

Apply this migration to the linked Supabase project:

- `supabase/migrations/20260629160001_create_community_board_tables.sql`

It creates:

- `public.community_posts`
- `public.community_replies`

It also enables RLS and grants authenticated access for the intended read/write
surface.

## CLI Activation Path

The Supabase CLI currently stops with:

```text
Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD
```

Once the database password is available in the shell, run:

```bash
export SUPABASE_DB_PASSWORD='...'
supabase migration list --linked
supabase db push --linked
supabase migration list --linked
```

Then restart the NEXUS dev server and verify:

```bash
npm run typecheck
npm test -- src/lib/backend/community/community-board-repository.test.ts src/app/api/community/posts/route.test.ts
```

## Dashboard SQL Editor Fallback

If CLI access is not available, apply the contents of
`supabase/migrations/20260629160001_create_community_board_tables.sql` in the
Supabase Dashboard SQL editor for project `xjuglddxwnikvcwxfbzg`.

After applying it, check the REST probe again. A successful activation returns
HTTP `200` with an array response instead of `PGRST205`.

## Security Boundary

Do not expose the database password, service role key, access token, refresh
token, or Supabase client handle to the external iframe.

The iframe should keep using the narrow parent-mediated API bridge:

- `community-posts:list`
- `community-posts:create`

The NEXUS server route resolves the authenticated user and writes
`author_user_id` from the NEXUS session, not from iframe-provided user data.

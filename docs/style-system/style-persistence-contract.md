# NEXUS Style Persistence Contract

Phase: V13 - Persistence Contract
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: documentation-only persistence contract. No schema, code, Supabase project, or deployment change implemented.

## 0. Purpose

This document defines when a NEXUS style asset may become durable data.

It exists to keep four state layers separate:

```text
Preview -> Apply -> Save -> Persist
```

V13 does not authorize database work. It defines the gate that must pass before
future database work can begin.

## 1. Source Facts

Current repo facts from this branch:

- `WorkspaceThemeConfig` is a small legacy micro-control object.
- `workspace.themeConfig` is part of `NexusWorkspace`.
- `serializeActiveUiStateSnapshot()` writes `themeConfig` into
  `WorkspaceCloudSnapshotPayload`.
- `workspace_snapshots.payload.workspace.themeConfig` is durable cloud state.
- `workspace_state_entities` has an entity type `theme`.
- `WorkspaceStateEntityRepository` rebuilds the `theme` projection from the
  latest snapshot when `snapshot.workspace.themeConfig` exists.
- `WorkspaceSnapshotValidator` scans snapshots for secrets, rejects binary-like
  payloads, and enforces snapshot size.
- `/api/v1/workspaces/[workspaceId]/state` uses route handler -> service ->
  repository flow with auth, permission, idempotency, and validation.
- Server-side Supabase admin access is isolated in `src/lib/supabase/admin.ts`
  behind `SUPABASE_SERVICE_ROLE_KEY`.
- Browser/client Supabase access uses public config and the anon key path in
  `src/lib/supabase/client.ts`.
- Frontend bundle safety tests block service-role references in browser-facing
  code.

Implication:

```text
workspace.themeConfig is already durable active UI state.
A generated style pack must not be stored there.
```

## 2. Supabase Boundary Facts

Official Supabase documentation checked for V13:

- API keys identify the application component; Auth identifies the user.
- Publishable keys and legacy anon keys may be exposed only with RLS-backed data
  access.
- Secret keys and legacy service role keys are backend-only and bypass RLS.
- Tables in exposed schemas such as `public` must have RLS enabled.
- `auth.uid()` is `null` for unauthenticated requests; policies should make the
  authenticated requirement explicit.
- UPDATE policies need a corresponding SELECT policy to work as expected.
- Views bypass RLS by default unless created with `security_invoker = true` on
  supported Postgres versions or otherwise protected outside exposed schemas.
- Next.js server-side Auth must validate the user token with `getClaims()` or
  `getUser()` rather than trusting cookies/session shape alone.
- Supabase MCP/branching work can create cost, production, or mutation risk and
  must stay read-only unless explicitly authorized.

V13 rule:

```text
No style persistence table, policy, migration, or repository may be added until
the RLS/key/Auth boundary is represented in the implementation plan and tests.
```

## 3. Persistence Model

Future persistence should use separate tables instead of snapshot payloads.

Recommended conceptual model:

```text
style_packs
- id
- owner_user_id
- workspace_id or team_id
- slug
- name
- manifest_version
- manifest_jsonb
- manifest_checksum
- compiler_version
- validation_status
- validation_report_jsonb
- created_by
- created_at
- updated_at
- retired_at

workspace_style_preferences
- workspace_id
- style_pack_id
- override_patch_jsonb
- applied_by
- applied_at
- fallback_style_pack_id
- updated_at
```

The exact migration can change later, but the separation is mandatory:

- style pack asset: durable named manifest plus validation metadata
- workspace preference: pointer to selected pack plus tiny override patch
- runtime preview: never persisted
- legacy micro-controls: kept in `WorkspaceThemeConfig` until migrated safely

## 4. What Must Not Persist

Never persist:

- raw CSS from a prompt
- JavaScript or executable content
- dynamic Tailwind class strings
- arbitrary selectors
- unvalidated imported style documents
- prompt text that contains instructions
- secrets, tokens, Authorization headers, service-role keys, provider keys
- production database data
- workspace snapshots copied into a style pack
- full chat transcripts
- artifact binaries or data URLs
- graph behavior configuration
- React Flow interaction props

Style persistence stores validated style intent, not execution instructions.

## 5. Ownership And Access Model

Future ownership must be explicit.

Allowed ownership shapes:

- user-owned private pack
- workspace-owned pack
- team/library-owned pack after governance exists
- built-in read-only pack bundled with the app

Not allowed:

- anonymous writeable global pack
- public mutable pack without owner
- style pack inferred from a workspace snapshot owner
- pack ownership guessed from local-only state

Workspace application requires:

- authenticated user
- workspace membership
- editor/admin/owner role for applying preferences
- read access for viewing applied pack metadata
- audit trail for apply/save/retire actions

## 6. RLS Shape For Future Tables

If future tables are in `public`, RLS must be enabled before use.

Minimum policy shape:

| Table | SELECT | INSERT | UPDATE | DELETE/retire |
| --- | --- | --- | --- | --- |
| `style_packs` | owner or workspace member | owner or workspace editor | owner or workspace editor | owner/admin or soft-retire only |
| `workspace_style_preferences` | workspace member | workspace editor | workspace editor | workspace admin/owner |

Policy guidance:

- Use explicit `auth.uid() IS NOT NULL` style checks where ownership depends on
  the user.
- Use existing workspace role helpers only after confirming they are safe for
  the table shape.
- Include SELECT policies for rows that UPDATE must target.
- Prefer soft retirement for shared packs.
- Keep marketplace/public publishing out of V13.
- Avoid views until `security_invoker` or unexposed-schema protection is
  explicitly documented.

## 7. Route And Repository Boundary

Future implementation must follow current local patterns:

```text
/api/v1/style-packs route
-> apiHandler auth/permission/idempotency/validator
-> style service
-> style repository
-> Supabase admin client server-side only or in-memory fallback for tests
```

Browser-facing code may call an API route. It must not import:

- `@/lib/supabase/admin`
- backend security services
- service role environment variables
- direct Supabase admin repositories

Server-side code must:

- validate authenticated user
- check workspace role before mutation
- validate manifest before persistence
- store validation status/report
- compute manifest checksum server-side
- redact errors and reports
- never log raw manifest text when it may contain secrets

## 8. Manifest Persistence Lifecycle

Future lifecycle:

```text
draft/import
-> manifest validator
-> pure compiler smoke
-> validation report
-> save candidate
-> server re-validation
-> persist style_pack
-> apply workspace preference pointer
```

Rejected lifecycle:

```text
draft/import -> persist
preview -> persist
compiled CSS -> persist
workspace.themeConfig -> style_pack
style_pack -> workspace snapshot payload
```

Server re-validation is required even if the client already validated the
manifest.

## 9. Interaction With Current Snapshots

Current snapshots remain the durable restore anchor for workspace UI state.

Future style persistence must not:

- add full style manifests to `WorkspaceCloudSnapshotPayload`
- add generated CSS to `WorkspaceThemeConfig`
- widen `workspace_state_entities.payload` for style packs
- use `theme` projection as the style library
- use snapshot restore as style pack rollback

Allowed future bridge:

- `workspace.themeConfig` can continue to support legacy micro-controls.
- a future preference pointer can be resolved during hydration after the
  persistence schema is approved.
- snapshot may eventually store a compact preference reference only after a
  separate migration gate.

## 10. Migration Gate

Before any future migration:

1. Create a dedicated implementation branch.
2. Confirm git status clean.
3. Read current Supabase docs again.
4. Do not connect MCP to production data unless it is read-only and explicitly
   authorized.
5. Prefer local Supabase or an authorized disposable branch.
6. Draft additive migrations only.
7. Enable RLS on exposed tables.
8. Add policies before any frontend or Data API path can reach the table.
9. Generate and review TypeScript database types.
10. Run security/performance advisors where available and authorized.
11. Add tests for RLS migration text, frontend bundle safety, validator
    rejection, server re-validation, and permission failures.
12. Document rollback as soft quarantine or additive forward migration.

Blocked without explicit authorization:

- paid Supabase branch creation
- production migration
- remote push
- deployment
- branch merge
- destructive database reset
- secret/key inspection

## 11. Verification For Future Code

Focused checks for future persistence code:

- `git diff --check`
- targeted unit tests for style validator/compiler/persistence service
- route tests for auth, permission, idempotency, invalid manifest, and conflict
- frontend bundle secret safety tests
- generated database type consistency check
- migration text check for `ENABLE ROW LEVEL SECURITY`
- migration text check for policy coverage
- Browser smoke only after UI uses the API safely

Phase gate checks:

- no service role string in browser-facing source
- no style pack writes through `workspace.themeConfig`
- no preview state in sync queue
- no raw CSS/JS persisted
- no deployment or remote push
- no `exports/**` changes

## 12. Acceptance Gate

V13 persistence contract passes when:

- Existing durable `themeConfig` flow is acknowledged.
- Full style packs are separated from workspace snapshots.
- Supabase key/RLS/Auth boundaries are documented from official docs.
- Future schema shape is additive and RLS-first.
- Route/service/repository boundary follows current `/api/v1` patterns.
- Migration gate blocks production, paid branch, deploy, push, and destructive
  operations.
- No schema, runtime code, component code, Supabase project, deploy, package, or
  `exports/**` files are changed.

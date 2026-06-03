# Workflow Pro Backend And Persistence Plan

## Current Reality

The project already has:

- workspace cloud state
- artifact service
- artifact references
- sync queue
- observability
- Supabase migrations
- RLS hardening history
- deployment checks

This means Workflow Pro should not start with a new database schema unless there is a clear persistence gap.

## First Persistence Rule

Use existing persistence first:

```text
workflow design preview -> local workspace state
generated output -> artifact service
workspace recovery -> workspace snapshot
runtime evidence -> runtimeLite run state
```

Only introduce `workflow_contracts` later if the contract needs independent versioning, sharing, publishing, or server-side validation.

## Artifact Policy

Generated image/video/audio should remain artifact-backed.

Minimum metadata:

- workspaceId
- source node id
- source run id
- model id
- quality/aspect ratio or media-specific settings
- prompt
- revised prompt if present
- media URL kind
- downloadable flag
- history scope

## File Node Policy

File nodes should create raw artifacts first. Compiler output should create a second artifact linked to the raw artifact.

```text
raw file artifact
-> compiler metadata
-> compiled artifact
-> ContextPacket attachment reference
```

No-op compiler is valid and should still write compiler metadata.

## Supabase Boundary

If a future migration is needed:

- enable RLS
- design policies around workspace ownership
- do not use `user_metadata` for authorization
- keep service role server-side only
- review storage insert/select/update requirements before supporting upsert
- run advisors or equivalent checks before landing

## Vercel Boundary

Preview deployment is the first deployment target. Production promotion is only considered after:

- local typecheck/lint/tests pass
- browser smoke passes
- preview smoke passes
- no env leak appears in responses or bundled frontend


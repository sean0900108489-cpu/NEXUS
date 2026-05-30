# NEXUS V2 Style Pack Implementation Gates

Status: contract preparation only
Scope: executable gates for future V2 Skin Pack, Asset Pack, Recipe Registry,
Layout Preset, and Performance Budget work
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

This document converts the V2 contract-prep documents into implementation gates.
It is a stop sign against broad runtime work and a checklist for the first safe
implementation units.

Contract inputs:

- `skin-pack-v2-contract.md`
- `asset-pack-v1-contract.md`
- `recipe-registry-v1-contract.md`
- `layout-preset-boundary-v1.md`
- `performance-budget-validator-v1.md`
- `manifest-v1-spec.md`
- `manifest-validator-rules.md`
- `style-pack-governance.md`
- `style-engine-protected-behavior-ledger.md`

## 1. Implementation Order

First allowed implementation batch:

```text
pure types
-> pure validators
-> fixtures
-> tests
-> documentation checkpoint
```

This first batch may touch only a future explicitly authorized subset of:

- `src/lib/style-engine/**`
- style-engine test files
- `docs/style-system/**`

It must not touch:

- production Nexus UI
- `src/components/nexus/**`
- workspace store/sync
- backend routes
- Supabase/database
- deployment config
- package or lockfiles
- `exports/**`

## 2. Gate A: Skin Pack Envelope

Goal:

Create a pure `NexusSkinPackV2` envelope around one `NexusStyleManifestV1`
payload without changing runtime behavior.

Allowed implementation:

- type definitions
- pack identity and metadata validation
- V1 manifest binding validation
- compatibility report shape
- fallback report shape
- fixture data for accepted, warning, rejected, unsupported, and quarantined
  cases

Required tests:

- accepts a valid pack wrapping a valid V1 manifest
- rejects pack without V1 manifest payload
- rejects unsupported manifest version
- rejects metadata with secret/path/env/workspace leakage
- rejects pack metadata attempting to override V1 constraints
- rejects workspace/sync/backend/Supabase/deploy keys
- emits compatibility result
- emits fallback chain

Go condition:

- pure tests pass
- no imports from components, store, backend, Supabase, or deployment modules
- `git diff --check` passes

No-Go condition:

- implementation requires production UI changes
- implementation persists or applies a skin pack
- implementation bypasses the V1 validator

## 3. Gate B: Recipe Registry

Goal:

Centralize recipe group and slot ownership before expanding recipes.

Allowed implementation:

- registry constants for panel/button/input/window/modal/toolbar/agent-card/
  graph-node/graph-edge
- slot definitions and defaults
- forbidden key lists
- compatibility report
- validator fixtures

Required tests:

- accepts initial registry groups
- rejects unknown groups by default
- rejects duplicate slots
- rejects non-visual slots
- rejects behavior keys
- rejects graph behavior fields
- rejects window/modal behavior fields
- reports adapter coverage
- preserves current V1 recipe compatibility

Go condition:

- registry is the source of truth for slot metadata
- compiler/validator tests use registry fixtures
- no production components parse manifests

No-Go condition:

- recipe logic is added directly to production components
- recipe slots control behavior/layout/persistence
- registry expansion changes React Flow semantics

## 4. Gate C: Asset Pack Contract Validator

Goal:

Validate asset metadata without loading, fetching, decoding, storing, or
rendering assets.

Allowed implementation:

- asset descriptor types
- static MIME/type/role validation
- ID/hash/byte/dimension validation
- loading classification validation
- fallback metadata validation
- safe/unsafe fixtures

Required tests:

- accepts texture/icon/avatar/frame/background/font-reference descriptors
- rejects remote URLs, data URLs, blob URLs, file URLs, and signed URLs
- rejects executable or unknown MIME types
- rejects huge image dimensions
- rejects oversized critical assets
- rejects path, secret, env, workspace, or user ID leakage
- requires Protocol 96 when generated/recoverable durability is claimed
- emits redacted reports

Go condition:

- no runtime asset loading
- no remote fetch
- no storage or database work
- no `url(...)` channel added to V1 manifest tokens

No-Go condition:

- implementation embeds raw URLs in manifests
- implementation creates asset storage/persistence
- implementation claims generated asset recovery without Protocol 96

## 5. Gate D: Layout Preset Boundary

Goal:

Allow safe visual layout intent while rejecting behavior, geometry, React Flow,
store, sync, backend, and persistence authority.

Allowed implementation:

- layout preset type definitions
- static validator
- protected field rejection fixtures
- compatibility report
- Style Lab-only specimen planning

Required tests:

- accepts density, slot ordering, surface treatment, visibility hints, and
  workspace decoration
- rejects `position`, `inset`, `zIndex`, `overflow`, `pointerEvents`, and
  geometry fields
- rejects drag/resize/focus/keyboard/ARIA fields
- rejects React Flow pan/zoom/connect/delete fields
- rejects store/sync/backend/Supabase/deploy fields
- fails closed for unsupported versions

Go condition:

- preset remains a visual hint
- protected behavior ledger remains satisfied
- no production layout mutation occurs

No-Go condition:

- preset changes window manager behavior
- preset changes React Flow behavior
- preset writes durable state

## 6. Gate E: Static Performance Budget

Goal:

Add static, deterministic budget checks before full asset/render performance
validation.

Allowed implementation:

- CSS variable count enforcement
- normalized manifest byte count
- pack metadata byte count
- recipe group and slot count
- adapter output count
- descriptor-only asset count/byte/dimension checks
- blur/shadow/glow/animation string budget checks
- deterministic report shape

Required tests:

- rejects excessive CSS variables
- rejects oversized manifest metadata
- rejects excessive recipe groups/slots
- rejects excessive adapter output
- rejects oversized critical asset metadata
- rejects over-budget image dimensions
- rejects unsafe visual effect strings
- degrades preview-only effects by report code where allowed
- fails closed for static budget errors

Go condition:

- all checks are pure and local
- no browser performance instrumentation is introduced
- no production apply path is introduced

No-Go condition:

- implementation fetches assets to measure them
- implementation adds runtime performance instrumentation
- implementation changes production shell render behavior

## 7. Protocol Trigger Matrix

Protocol 96 is required before:

- generated style assets
- recoverable user-visible asset output
- asset storage/blob/artifact integration
- external asset URL policy
- asset hash/provenance/retention claims
- asset pack durability or replay guarantees
- browser asset decode/transfer performance claims

Protocol 98 is required before:

- `/api/v1/style-packs`
- workspace style preference routes
- apply/save/persist routes
- auth-gated style pack reads/writes
- permission policies
- backend service/repository implementation
- style pack audit events that persist server-side

Protocol 95 is required before:

- `style_packs` table
- `workspace_style_preferences` table
- storage bucket or artifact schema migration
- generated database types
- RLS policies
- Supabase branch/live schema parity checks
- Supabase advisor/security review for style data

No additional protocol is required for:

- pure local types
- pure validators
- fixtures
- unit tests
- docs
- Style Lab-only planning that does not alter production UI

## 8. Global Go Conditions

V2 implementation may begin only when all are true:

- current branch and worktree pass preflight
- scope is limited to the approved file set for the phase
- contracts are read before code
- V1 manifest validation remains mandatory
- pack/asset/recipe/layout/budget validators are pure
- tests cover accepted, warning, rejected, and unsupported cases
- reports are deterministic and display-safe
- no source imports cross into store, backend, Supabase, deploy, or production UI
- `git diff --check` passes
- final diff contains no unauthorized files

## 9. Global No-Go Conditions

Stop immediately if a proposed change requires:

- production Nexus UI changes
- React Flow behavior changes
- drag/resize/focus/z-index authority changes
- workspace store or sync changes
- backend route changes
- Supabase schema/storage/RLS changes
- package or lockfile changes
- deploy config changes
- remote mutations
- runtime asset loading
- persistence or apply/save semantics
- `exports/**` changes

Stop and run the relevant protocol if:

- asset generation/recovery/durability enters scope: Protocol 96
- backend/auth/routes/permissions enter scope: Protocol 98
- database/schema/RLS/storage enter scope: Protocol 95

## 10. Required Verification For First Implementation Batch

Minimum local verification:

```bash
npm run lint
npm run typecheck
npm run test -- --testPathPattern=style-engine
git diff --check
git status --short
```

If test runner flags differ at implementation time, use the repo's current
style-engine focused test command and document the exact command.

Additional scans:

```bash
rg "workspace.themeConfig|queueThemeConfigCloudSync|workspace_state_entities" src/lib/style-engine
rg "Supabase|supabase|/api/v1|vercel|deployment" src/lib/style-engine
rg "onNodeDrag|onConnect|panOn|zoomOn|deleteKeyCode|interactionWidth" src/lib/style-engine
```

Expected result: no unauthorized runtime, persistence, backend, or React Flow
behavior coupling in new V2 local modules.

## 11. Completion Criteria

A future implementation unit is complete only when it reports:

- changed files
- contracts used
- validators added
- fixtures added
- tests run
- protected files intentionally untouched
- import/pollution scan result
- compatibility/fallback behavior
- remaining No-Go boundaries
- rollback path

The rollback path must be the current implementation unit only. It must not
revert unrelated user changes.

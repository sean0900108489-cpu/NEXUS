# Protocol 94 V2 Skin Pack Audit

Audit date: 2026-05-30  
Workspace: `/Users/sean/Documents/FreeChat`  
Branch observed: `codex/v17-large-iteration`  
Audit mode: read-only architecture audit  
Target: NEXUS V2 Skin Pack / Asset Pack / Recipe System / Layout Preset / Performance Budget Validator

## 1. Executive Summary

Protocol 94 finds the CP-350 Style Engine V1 boundary in good condition for pure, local extension work, but not ready for broad V2 implementation that includes assets, layout presets, persistence, or production shell migration.

The correct V2 attachment point is the pure Style Engine contract layer:

`style pack candidate -> style pack / manifest registry -> validator -> compiler -> preview patch -> scoped runtime preview -> Style Lab specimens`

V2 Skin Pack should not attach directly to `workspace.themeConfig`, production `NexusOps`, React Flow props, backend routes, Supabase, or deployment config. The V1 path already has a useful validator/compiler/runtime-preview shape, and CP-350 intentionally kept it local, data-only, and non-persistent.

Primary verdict:

- Skin Pack: attach at the Style Engine pack/manifest/governance layer, above `NexusStyleManifestV1` and before validation/compilation.
- Asset Pack: needs an independent contract before implementation.
- Recipe System: needs a registry before broad V2 expansion.
- Layout Preset: only visual/density-safe preset data is allowed; behavior, geometry, z-index, scroll, drag, resize, React Flow interaction, and persistence remain protected.
- Performance Budget Validator: full validator belongs after the asset contract, preferably V3; V2 may only extend the existing static variable-count budget if kept pure and local.
- Broad V2 implementation: No-Go until the listed gates are added.

## 2. Scope And Preflight

Required documents were read in order:

1. `docs/style-system/execution-runs/20260529-163524+1000/FINAL_SUMMARY.md`
2. `docs/audit-protocols/NEXUS_EXTENSIBILITY_AGILITY_COMPATIBILITY_LAYER_SCAN_PROTOCOL_94.md`
3. `docs/audit-protocols/README.md`
4. `docs/style-system/style-engine-total-upgrade-master-plan.md`
5. `docs/style-system/style-engine-technical-doc-pack-index.md`

Additional source and documentation scanned:

- `AGENTS.md`
- `package.json`
- `src/lib/style-engine/**`
- `src/components/style-engine/**`
- `src/app/style-lab/page.tsx`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/components/theme-provider.tsx`
- `src/app/globals.css`
- `src/store/nexus-store.ts`
- `src/lib/backend/**`
- `src/lib/nexus-registry.ts`
- `src/lib/workflow-runtime-lite/registry.ts`
- relevant docs in `docs/style-system/technical-docs/**`
- relevant audit protocols 95, 96, and 98

Read-only commands and checks used:

- `git status --short --branch`
- `rg --files`
- `rg` import, adapter, route, registry, asset, and protected-boundary scans
- `find src -maxdepth 4 -type d`
- package script/version inspection
- local dev-server detection
- Browser read-only smoke for `http://localhost:3000/style-lab` because an existing dev server was already listening

No source, Supabase, package, config, route, migration, deployment, or GitHub/Vercel/Supabase mutation was performed.

## 3. Scorecard

| Area | Score | Notes |
| --- | ---: | --- |
| Project logic blueprint | 12 / 12 | Major frontend, style, store, backend, persistence, and deployment layers are identifiable. |
| Module boundary map | 12 / 12 | Style Engine V1 remains cleanly separated from store, backend, Supabase, and deployment paths. |
| Extension point inventory | 11 / 12 | Existing style extension points are clear; pack/asset/recipe registries are incomplete. |
| Coupling and blast-radius map | 11 / 12 | Protected behavior areas are well documented; global CSS asset URLs remain a risk. |
| Compatibility matrix | 10 / 12 | V1 manifest/export compatibility is clear; V2/future version fixtures are missing. |
| Contract and adapter readiness | 8 / 10 | Strong validator/compiler/adapters; missing asset and recipe registries. |
| Change placement decision tree | 8 / 8 | Placement decision is clear enough for next gates. |
| Test gate review | 9 / 10 | CP-350 had strong tests; V2-specific fixtures and asset/layout gates are not present. |
| Live parity checks | 3 / 5 | Browser read-only parity checked; live Supabase/Vercel/GitHub intentionally not queried for this local-only decision. |
| Report completeness | 7 / 7 | Required Protocol 94 sections plus requested V2 sections included. |

Total audit confidence: 91 / 100  
Implementation readiness for broad V2: 78 / 100

## 4. Project Logic Blueprint

| Layer | Current authority | V2 relevance |
| --- | --- | --- |
| App shell | `src/app/layout.tsx`, `src/app/page.tsx` | Runtime provider is already mounted around `NexusOps`, but V2 should not migrate production surfaces yet. |
| Style Lab | `src/app/style-lab/page.tsx`, `src/components/style-engine/nexus-style-lab.tsx` | Correct local proving ground for V2 pack, asset, recipe, layout, and budget fixtures. |
| Style runtime provider | `src/components/style-engine/nexus-style-runtime-provider.tsx` | Correct scoped preview/apply target for compiled variables only. |
| Style engine core | `src/lib/style-engine/**` | Correct authority for data contracts, validation, compilation, exchange, governance, and adapters. |
| Legacy theme surface | `src/components/theme-provider.tsx`, `src/app/globals.css` | Existing data-theme and CSS variables are useful compatibility references but not the V2 pack source of truth. |
| Store and sync | `src/store/nexus-store.ts`, workspace snapshot/sync paths | Out of scope for V2 Skin Pack unless Protocol 98 and 95 are triggered. |
| Backend routes | `src/app/api/v1/**`, `src/lib/backend/**` | Future persistence route pattern only; not part of local V2 pack entry. |
| Supabase schema | `supabase/migrations/**`, `src/lib/supabase/database.types.ts` | Future persisted packs/preferences only; requires Protocol 95. |
| Artifact layer | `src/lib/backend/artifacts/**`, artifact migrations | Potential future generated/recoverable asset authority; not a style asset contract today. |
| Deployment/config | package scripts, Vercel/Next config | No V2 entry should require deployment mutation. |

The current durable legacy theme flow is separate from V1 Style Engine:

`LegoThemeEngineControls -> updateTransientThemeConfig -> DOM variables -> commitThemeConfig -> useNexusStore.updateThemeConfig -> workspace.themeConfig -> queueThemeConfigCloudSync -> state sync -> workspace snapshots/state entities`

Protocol 94 confirms this path must stay separate from V2 Skin Pack. A full style pack must not enter `workspace.themeConfig`.

## 5. Module Boundary Map

| Boundary | Current evidence | Audit decision |
| --- | --- | --- |
| Manifest boundary | `manifest.ts` defines `NexusStyleManifestV1`, token groups, recipes, adapters, constraints, versions. | Extend by adding pack/registry contracts around manifests, not by injecting UI/store behavior. |
| Validation boundary | `validator.ts` forbids raw CSS, URLs, scripts, backend terms, workspace sync terms, behavior classes, React Flow interaction props, and unsafe recipe keys. | Keep as mandatory entry gate for V2; add asset, recipe-registry, layout-preset, and budget fixtures before broad implementation. |
| Compiler boundary | `compiler.ts` emits CSS variables, recipe variables, adapter configs, checksums, and reports with no DOM/store/backend dependency. | Correct V2 output authority for visual variables only. |
| Adapter boundary | `react-flow-adapter.ts`, `window-modal-recipe-adapter.ts` are visual-only and tested. | New adapters must register explicit visual domains and cannot inherit behavior authority. |
| Runtime preview boundary | `preview.ts`, `runtime-target.ts`, `runtime-controller.ts`, provider component. | Correct local preview boundary. Do not expand into persistence/app state without later protocols. |
| Style Lab boundary | `nexus-style-lab.tsx` imports pure style engine and provider, with local state and specimens. | Correct V2 proving ground. |
| Production shell boundary | `page.tsx` wraps `NexusOps`; production components still own behavior/layout. | Do not use V2 to mutate production React Flow/window behavior. |
| Backend/persistence boundary | Style Engine does not import backend, Supabase, store, or routes. | Preserve this until Protocol 95/98. |

## 6. Extension Point Inventory

| Extension point | Existing readiness | V2 action |
| --- | --- | --- |
| Built-in style presets | `presets.ts` plus Style Lab local preset list | Convert to a pack/preset registry before adding many V2 packs. |
| Manifest versions | `NEXUS_STYLE_MANIFEST_VERSION = 1` | Add compatibility fixtures before introducing V2 pack envelope or manifest version changes. |
| Style exchange package | `exchange.ts` with `kind: "nexus-style-pack"` and `formatVersion: 1` | Good base for pack import/export, but not enough for asset packs or registry metadata. |
| Governance review | `governance.ts` lifecycle/compatibility review | Extend for pack registry metadata and asset/recipe capabilities. |
| Recipe groups | Manifest type and recipe group constants | Needs registry with slots, allowed value kinds, defaults, owners, and test fixtures. |
| React Flow visuals | Dedicated adapter and tests | Extend only through adapter-owned visual variables. |
| Window/modal visuals | Dedicated recipe adapter and tests | Extend only through adapter-owned visual variables. |
| Asset references | No style asset contract; globals contain external background URLs | Add independent asset contract before V2 Asset Pack. |
| Layout presets | Protected behavior ledger exists, no layout preset contract | Add layout-preset contract or defer. |
| Performance budgets | `maxCssVariableCount` constraint exists | Full budget validator should follow asset contract, likely V3. |

## 7. Coupling And Blast-Radius Map

High-risk zones:

- `src/app/globals.css`: contains global theme variables, global React Flow selectors, behavior-adjacent cursor/pointer styles, and external background image URLs.
- `src/components/nexus/nexus-graph.tsx`: production React Flow behavior must remain protected from style packs.
- `src/components/nexus/nexus-ops.tsx`: production orchestration surface with layout and behavior coupling.
- `src/store/nexus-store.ts`: durable workspace/theme/sync authority. V2 packs must not write here in this phase.
- `src/app/api/v1/**` and `src/lib/backend/**`: future persistence only.
- `supabase/migrations/**`: future schema only.

Low-risk V2 proving zones:

- `src/lib/style-engine/**`
- `src/components/style-engine/**`
- `src/app/style-lab/page.tsx`
- style-engine test files
- style-system technical docs and fixtures

The blast-radius rule for V2 is:

`Skin/recipe visual extension -> style-engine contract/registry/validator/compiler/specimens only`

`Assets/persistence/auth/schema/live parity -> stop and run the relevant protocol first`

## 8. Compatibility Matrix

| Candidate change | V1 compatible? | Required guard | Protocol trigger |
| --- | --- | --- | --- |
| Add named V2 Skin Pack metadata around existing V1 manifests | Yes, if manifest payload remains V1-compatible | Pack registry and exchange compatibility tests | Protocol 94 enough for planning; implementation gate still required. |
| Add more built-in visual presets | Yes, if they compile through V1 validator/compiler | Preset registry, checksum fixtures, Style Lab smoke | No extra protocol if local-only. |
| Add recipe values to existing recipe groups | Conditional | Recipe registry, allowed slots, validator fixtures | Protocol 94 gate before implementation. |
| Add new recipe groups | Conditional to No | Registry versioning, adapter coverage, fallback behavior | Protocol 94 plus possibly 98 if persisted. |
| Add external image/font/video assets | No | Independent asset contract, origin/size/mime/hash/fallback policy | Protocol 96 required if generated/recoverable/user-visible output; Protocol 95/98 if persisted/protected. |
| Allow raw `url(...)`, `data:`, `blob:`, or remote URLs in manifest tokens | No | Do not allow in `NexusStyleManifestV1` tokens | Protocol 96 before any asset authority. |
| Add layout preset changing density/visual spacing through approved variables | Conditional | Layout preset contract and protected behavior tests | Protocol 94 gate. |
| Add layout preset changing DOM position, z-index, overflow, drag, resize, React Flow behavior | No | Must remain protected | Not allowed as Skin Pack V2. |
| Add performance variable-count checks | Yes | Existing `maxCssVariableCount` may be extended | Protocol 94 enough if static/local. |
| Add asset byte/render performance budgets | Not yet | Asset contract plus browser/perf fixtures | Protocol 96 first; likely V3. |
| Persist style packs or workspace style preferences | Not in V2 local scope | API/service/repository/RLS/schema gates | Protocol 98 and 95. |

## 9. Contract And Adapter Readiness

| Area | Readiness | Evidence | Gap |
| --- | --- | --- | --- |
| Style manifest V1 | High | Strong type, validator, compiler, checksums, tests | No V2 compatibility fixture set yet. |
| Skin pack envelope | Medium | `exchange.ts` already uses `nexus-style-pack`; governance exists | Needs registry, pack metadata contract, compatibility/fallback fixtures. |
| Built-in preset registry | Medium-low | `presets.ts` exists; Style Lab has local preset array | Needs central registry and compatibility metadata. |
| Asset pack | Low | Asset policy is explicitly missing; validator forbids URLs | Needs independent contract before implementation. |
| Recipe system | Medium | Recipe types, recipe group constants, validator, window/modal adapter | Needs recipe registry and adapter coverage ownership. |
| React Flow adapter | High for visuals | Dedicated adapter and tests; protected behavior forbidden | Production graph migration not authorized by this audit. |
| Window/modal adapter | High for visuals | Dedicated adapter and tests; protected behavior forbidden | Production shell migration not authorized by this audit. |
| Layout preset | Low | Protected behavior ledger exists | Needs explicit contract separating visual density from layout behavior. |
| Performance budget validator | Low-medium | Variable-count budget exists | No asset/render/perf budget contract yet. |
| Persistence | Low by design | Persistence contract docs exist | No route/schema/RLS implementation; requires 95/98. |

## 10. Change Placement Decision Tree

Use this placement rule for the next phase:

1. Is the change a visual token, recipe value, adapter variable, pack metadata field, or Style Lab specimen?
   - Place it in `src/lib/style-engine/**`, `src/components/style-engine/**`, or style-engine fixtures/tests.
2. Does it reference an image, font, video, blob, URL, data URI, generated media, asset hash, or asset recovery?
   - Do not place it in the manifest token map yet. Add an independent Asset Pack contract first. Run Protocol 96 if output durability/recoverability is involved.
3. Does it change React Flow pan/zoom/drag/select/connect behavior, node/edge IDs, handle IDs, hit width, z-index, pointer events, or graph event handlers?
   - Not allowed in Skin Pack V2. Keep inside production component ownership or a future non-style behavior project.
4. Does it change window/modal drag, resize, bounds, focus trap, close behavior, z-index, scroll ownership, ARIA role, or keyboard shortcuts?
   - Not allowed in Skin Pack V2.
5. Does it write to `workspace.themeConfig`, snapshots, state entities, backend routes, Supabase, storage, deployment config, or external services?
   - Stop. Run Protocol 98 and/or Protocol 95 first.
6. Does it need live generated/recoverable assets or artifact integration?
   - Stop. Run Protocol 96 first.

## 11. Live Parity Checks

Local read-only parity:

- Existing dev server was detected on port 3000.
- Browser read-only check opened `http://localhost:3000/style-lab`.
- Page title observed: `NEXUS // AI OPS`.
- Expected Style Lab content was present: `NEXUS Style Lab`, built-in presets, preview/baseline/revert controls, compatibility review, token map, preview surface, specimens, and governance rows.
- Browser console warnings/errors from the check: none observed.

Supabase/Vercel/GitHub live parity:

- No live mutation was performed.
- No live Supabase/Vercel/GitHub read was required for this local-only V2 placement decision.
- If V2 expands into persistence, routes, RLS, deployment, or schema parity, Protocol 95 and Protocol 98 become mandatory before implementation.

## 12. Test Gate Review

Existing CP-350 gate evidence:

- Lint passed.
- Typecheck passed.
- Full Vitest suite passed: 41 files / 353 tests.
- Build passed.
- Side-effect scans passed.
- Behavior scans passed.
- `git diff --check` passed.
- Status was clean at CP-350 final summary time.

Existing style-engine test coverage includes:

- accessibility
- checksum
- compiler
- exchange
- governance
- import text
- intent manifest
- intent normalizer
- presets
- preview
- React Flow adapter
- runtime controller
- runtime target
- validator
- window/modal recipe adapter

V2 gates that must be added before broad implementation:

- pack registry fixture tests
- V1 export package backward-compatibility fixtures
- unsupported future-version fixtures
- asset contract rejection/acceptance fixtures
- recipe registry slot/default/fallback fixtures
- layout preset protected-boundary fixtures
- performance budget fixture tests
- Style Lab browser smoke after fixture additions
- no-store/no-backend/no-supabase import scan for V2 local modules

## 13. Red-Flag Findings

1. Asset policy is not yet a contract.

   V1 validator intentionally rejects URL-like inputs, raw CSS, `data:`, `blob:`, remote URLs, and `url(...)`. However, `globals.css` currently has external placeholder background URLs in legacy theme variables. That is acceptable legacy context but unsafe as a V2 Asset Pack precedent.

2. Built-in preset ownership is scattered.

   Style presets live in `presets.ts`, Style Lab has a local built-in preset list, `theme-provider.tsx` has data-theme names, and `globals.css` has data-theme variables. V2 Skin Pack should add a registry before adding many packs.

3. Recipe values are typed and validated, but not registry-owned.

   `NexusStyleRecipesV1` and constants define current groups. The validator knows recommended slots and forbidden keys. Adapters consume specific recipe domains. This is good for V1, but broad V2 recipe expansion needs a registry to avoid scattered one-off conditions.

4. Layout presets are behavior-adjacent.

   Layout preset sounds visual, but can easily mutate positioning, z-index, scroll containment, drag/resize, React Flow interactions, and accessibility roles. These areas are protected by existing docs and validator checks.

5. Compiler adapter coverage must not become a false signal.

   V1 compiler can report adapter coverage for current adapters. New V2 recipe/asset/layout domains need explicit coverage accounting instead of inheriting "complete" by default.

6. Persistence remains intentionally absent.

   This is a strength of CP-350, not a missing quick fix. V2 must not shortcut into `workspace.themeConfig`, snapshots, Supabase, or backend routes.

## 14. Recommended Extension Architecture

Recommended local-only V2 shape:

```text
NexusStylePackRegistryV1
  -> pack metadata
  -> one or more NexusStyleManifestV1 payloads
  -> optional recipe registry references
  -> optional asset pack reference only after Asset Pack contract exists
  -> compatibility and fallback metadata

NexusStyleManifestV1
  -> validator
  -> compiler
  -> CSS variables / recipe variables / adapter configs / checksums
  -> preview patch
  -> Style Lab specimens
  -> scoped runtime preview
```

Recommended new contracts before broad V2:

- `NexusStylePackRegistryV1`: owns pack ID, display name, manifest ID, version, compatibility, default preset, fallback pack, governance status, and fixture references.
- `NexusStyleAssetPackV1`: owns asset IDs, asset kind, origin policy, mime/size limits, checksum, fallback, allowed render target, and whether Protocol 96 authority is required.
- `NexusRecipeRegistryV1`: owns recipe group, slot names, allowed value kinds, defaults, fallback, adapter owner, specimen owner, and protected-key rejection.
- `NexusLayoutPresetV1`: owns only visual/density-safe preset fields and explicitly rejects behavior/geometry.
- `NexusPerformanceBudgetV1`: starts with static local budgets, such as CSS variable count; asset byte and render budgets wait for Asset Pack contract.

## 15. Big-Change Release Gates

Before broad V2 implementation:

1. Add a style pack registry contract and compatibility fixture plan.
2. Add an independent asset pack contract if assets are part of V2.
3. Add a recipe registry before adding or widening recipe domains.
4. Add a layout preset contract before any layout preset implementation.
5. Decide whether performance budget validation is static V2 or full V3.
6. Add V1/V2 import/export compatibility fixtures.
7. Add rejection fixtures for unsafe asset, layout, recipe, backend, and persistence attempts.
8. Add Style Lab browser smoke for new pack/recipe/layout fixtures.
9. Re-run lint, typecheck, style-engine tests, build, `git diff --check`, and status.

Before persistence or production apply:

- Run Protocol 98 for auth, workspace permission, route, API handler, and RLS boundaries.
- Run Protocol 95 for Supabase schema, generated types, migration parity, and live runtime parity.

Before generated/recoverable asset packs:

- Run Protocol 96 for generated output durability, artifact authority, storage/blob/recovery semantics, provenance, hash, and retention.

## 16. Untested Or Blocked Boundaries

Untested in this read-only pass:

- Live Supabase schema parity.
- Vercel deployment parity.
- GitHub workflow/check parity.
- Style pack persistence routes.
- Style pack RLS/policies.
- Asset storage, CDN, blob, or artifact recovery behavior.
- Production React Flow migration under V2 styles.
- Production window/modal migration under V2 recipes.
- Actual V2 pack import/export fixture round trips.
- Asset byte/render performance budgets.

These are intentionally blocked from this audit because the requested scope is Protocol 94 placement and readiness only.

## 17. Final Verdict

Broad V2 implementation is No-Go.

The project is ready for a narrow V2 contract-prep phase, not for direct V2 feature implementation. The next safe unit is to add contracts, registries, compatibility fixtures, validator fixtures, and Style Lab-only smoke coverage. The implementation should remain local to the Style Engine and Style Lab until Protocol 96, 98, and 95 decisions are made.

## V1 Style Engine Baseline From CP-350

CP-350 delivered a strong local V1 baseline:

- data-only `NexusStyleManifestV1`
- validator with forbidden CSS/script/backend/workspace/sync/behavior checks
- pure compiler outputting CSS variables, recipe variables, adapters, checksums, and reports
- React Flow visual adapter
- window/modal recipe adapter
- runtime preview controller and target abstraction
- Style Lab with built-in presets, import/export, validation, preview/revert, specimens, and governance review
- intent normalizer and draft manifest flow
- exchange package and governance review
- full local gate pass at the end of CP-350

CP-350 also intentionally did not implement:

- production workspace persistence
- backend style-pack routes
- Supabase schema
- deployment changes
- production React Flow migration
- production shell migration
- asset policy/external asset handling
- save/persist/apply-to-workspace flow

That boundary is correct and should be preserved.

## V2 Skin Pack Attachment Decision

V2 Skin Pack should attach at the Style Engine pack/manifest/governance layer.

Allowed attachment:

```text
Style Pack Registry / Exchange Package
  -> one or more validated manifests
  -> governance review
  -> compiler
  -> preview patch
  -> Style Lab/runtime preview
```

Not allowed attachment:

- `workspace.themeConfig`
- `queueThemeConfigCloudSync`
- workspace snapshots
- `workspace_state_entities`
- production `NexusOps` behavior
- React Flow behavior props
- `react-rnd` behavior props
- backend routes
- Supabase migrations
- Vercel/deploy config

The skin pack should be a declarative package envelope around validated style manifests and registry metadata. It should not become an app-state or backend feature in V2.

## Asset Pack Boundary

Asset Pack needs an independent contract before implementation.

Reason:

- V1 validator rejects URLs, `url(...)`, `data:`, `blob:`, raw CSS, and unsafe external references.
- Global CSS still contains legacy external background image URLs, which are not a safe V2 asset model.
- The backend artifact layer is a generated/user artifact authority, not a style asset policy.
- Assets require size, mime, origin, fallback, checksum, CSP, recovery, and retention decisions that are not present in `NexusStyleManifestV1`.

Decision:

- Do not embed raw asset URLs in manifest tokens.
- Define `NexusStyleAssetPackV1` separately.
- Link assets by stable asset IDs only after validation.
- Use fallbacks when assets are missing, blocked, oversized, or unsupported.
- Trigger Protocol 96 before generated/recoverable/user-visible asset output is implemented.

## Recipe Registry Boundary

Recipe needs a registry before broad V2 Recipe System work.

V1 has:

- recipe group types
- recipe group constants
- validator checks
- window/modal recipe adapter
- compiler output
- Style Lab specimens

V1 does not yet have:

- central recipe registry ownership
- slot metadata
- allowed value kind metadata
- defaults and fallback chain
- adapter owner mapping
- specimen owner mapping
- version and compatibility metadata per recipe group
- coverage accounting for new recipe domains

Decision:

`NexusRecipeRegistryV1` should become a required V2 gate before adding recipe domains or widening recipe power.

## Layout Preset Boundary

Layout presets may change:

- manifest-selected density intent
- visual spacing tokens if represented through approved token/recipe slots
- specimen-only arrangement in Style Lab
- visual grouping and surface hierarchy inside approved recipe variables
- pack metadata indicating a compact, calm, dense, or presentation-oriented visual mode

Layout presets may not change:

- `position`, `top`, `left`, `right`, `bottom`, `inset`
- z-index ladder
- width/height/min/max geometry authority
- overflow and scroll ownership
- pointer events
- drag/resize behavior
- `react-rnd` bounds, handles, drag handles, or callbacks
- React Flow pan/zoom/drag/select/connect behavior
- React Flow node/edge/handle IDs or interaction hit widths
- ARIA roles, focus trap, tab index, keyboard shortcuts
- store, sync, backend, route, Supabase, or deployment state

Decision:

Layout Preset is not a free-form V2 Skin Pack capability. It needs an explicit contract with allowed visual/density fields and protected behavior rejection tests.

## Performance Budget Validator Boundary

The current V1 compiler already has a static `maxCssVariableCount` guard. That can remain part of V2 if it stays local, deterministic, and manifest-scoped.

Full Performance Budget Validator should be V3 or later unless V2 Asset Pack is reduced to a contract-only/static-budget feature.

V2 may validate:

- CSS variable count
- recipe group count
- adapter output count
- static manifest size
- static pack metadata size

V2 should not yet validate as a complete performance budget:

- asset byte budgets
- remote image/font/video transfer budgets
- decode/render budgets
- browser performance timing
- production shell render cost
- storage/CDN/object retrieval behavior

Decision:

Keep a small static budget gate in V2 if needed. Defer full Performance Budget Validator until after Asset Pack contract and Protocol 96 decisions, preferably V3.

## Protocol 96 / 98 / 95 Follow-up Decision

Protocol 96 is required before:

- generated style assets
- recoverable user-visible asset output
- asset storage/blob/artifact integration
- external asset URL policy
- asset hash/provenance/retention claims
- asset pack durability or replay guarantees

Protocol 98 is required before:

- `/api/v1/style-packs`
- workspace style preference routes
- apply/save/persist routes
- auth-gated style pack reads/writes
- permission policies
- RLS-protected style data

Protocol 95 is required before:

- `style_packs` table
- `workspace_style_preferences` table
- storage bucket or artifact schema migration
- generated database types
- live schema parity checks
- Supabase production/staging parity

No additional protocol is required for a pure local V2 contract/registry/fixture planning pass, as long as it stays inside Style Engine and Style Lab and does not introduce persistence or real assets.

## Go / No-Go Verdict For V2 Implementation

Go:

- narrow contract-prep work
- registry design
- compatibility fixture planning
- validator fixture planning
- Style Lab-only specimens
- local pure unit tests

No-Go:

- broad V2 Skin Pack implementation
- Asset Pack implementation without an independent contract
- Recipe System expansion without a registry
- Layout Preset implementation without protected-boundary contract/tests
- full Performance Budget Validator before asset/perf scope is settled
- persistence, backend routes, Supabase schema, deployment, or production apply

Required gates before direct V2 implementation:

1. Style Pack Registry contract.
2. Asset Pack contract or explicit decision to defer assets.
3. Recipe Registry contract.
4. Layout Preset protected-boundary contract.
5. Static performance budget scope decision.
6. V1/V2 compatibility fixtures.
7. Unsafe asset/layout/recipe/backend/persistence rejection fixtures.
8. Style Lab browser smoke plan.
9. Protocol 96 if assets are generated/recoverable.
10. Protocol 98 and 95 if persistence, routes, auth, RLS, or schema enter scope.

Final answer to the seven required questions:

1. V2 Skin Pack should attach at the pure Style Engine pack/manifest/governance layer.
2. Asset Pack needs an independent contract.
3. Recipe needs a registry before broad V2 expansion.
4. Layout preset may change approved visual/density fields only; it cannot change geometry, z-index, scroll, drag, resize, React Flow behavior, accessibility behavior, store, backend, or persistence.
5. Full Performance Budget Validator should be V3 or post-Asset-Pack; V2 may only keep small static local budgets.
6. The project should not go directly into broad V2 implementation.
7. The first gates are pack registry, asset contract/defer decision, recipe registry, layout preset contract, static budget scope, compatibility fixtures, rejection fixtures, Style Lab smoke, and Protocol 96/98/95 when their domains enter scope.

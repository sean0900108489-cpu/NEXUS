# NEXUS Style Engine Technical Doc Pack Index

This index defines the reading order, ownership, expected outputs, and acceptance gates for the Style Engine documentation system. It is designed to prevent context-window overload: future Codex runs should read only the minimum slice needed for the phase, then follow the gates here.

## 0. Reading Order

Always read in this order:

1. `docs/style-system/style-engine-total-upgrade-master-plan.md`
2. `docs/style-system/style-engine-preview-apply-persist-boundary.md`
3. `docs/style-system/style-engine-protected-behavior-ledger.md`
4. The phase-specific doc listed below
5. The relevant source files for that phase

Only read `/Users/sean/Downloads/nexusstyle總升級.md` for long-term ambition. It must not override the boundary docs.

## 1. Current Pack

| File | Purpose | Owner | Inputs | Outputs | Acceptance gate |
| --- | --- | --- | --- | --- | --- |
| `style-engine-total-upgrade-master-plan.md` | Master architecture, risk, version ladder, gates | Architecture owner | Four source docs, repo scan, local Next docs, connector docs | V0-V15 plan and boundary map | Future requests can point to one master plan. |
| `style-engine-technical-doc-pack-index.md` | Context management and doc map | Process owner | Master plan and user requirements | Reading order, doc backlog, ownership | Future Codex runs know what to read and what not to read. |
| `style-engine-protected-behavior-ledger.md` | Behavior and class safety ledger | Frontend safety owner | `nexus-ops`, graph, modals, windows, auth, store/sync scan | Protected behavior tables and tests | No UI migration starts without checking this ledger. |
| `style-engine-preview-apply-persist-boundary.md` | State boundary contract | Data-flow owner | `WorkspaceThemeConfig`, store, serializer, Supabase projection | Preview/apply/save/persist rules | Preview cannot be confused with durable style preference. |
| `style-engine-corrected-implementation-prompt.md` | Reusable future prompt | Execution owner | Corrected source prompt plus repo facts | Copyable future implementation prompt | Future prompts contain scope, scans, gates, final expectations. |
| `style-surface-audit.md` | Phase V1 source-aligned style surface inventory | Frontend safety owner | Current V17 branch read-only source scan | Style entry point map, theme data-flow map, source risk taxonomy | V2 can begin with explicit allowed/forbidden surface boundaries. |
| `hardcoded-visual-token-inventory.md` | Phase V1 hardcoded visual value inventory | Token contract owner | Focused `rg` scans over app/components/CSS | Token families, first low-risk token candidates, no-touch migration list | Pure visual candidates are separated from layout/behavior and persistence-linked paths. |
| `react-flow-style-boundary.md` | Phase V1/V10 React Flow adapter boundary | Graph safety owner | `nexus-graph.tsx` and React Flow global CSS scan | Visual slots, behavior anchors, future adapter shape | Graph visual migration has an adapter-only boundary before any code change. |
| `style-contract-v1.md` | Phase V2 semantic token and recipe contract | Token contract owner | V1 audit docs, preview/apply/persist boundary, protected ledger | Semantic token groups, recipe groups, Tailwind bridge rules, adapter token rules | Manifest and compiler docs can target one stable style vocabulary. |
| `manifest-v1-spec.md` | Phase V3 manifest data spec | Manifest owner | V2 style contract and safety boundaries | Data-only manifest shape, valid/invalid examples, lifecycle rules | Style candidates have one safe input shape before validator/compiler work. |
| `manifest-validator-rules.md` | Phase V3 validator rulebook | Safety owner | Manifest spec, protected ledger, preview/apply/persist boundary | Validation stages, reject rules, severity model, report shape | Unsafe manifests fail before compile, preview, apply, save, or persist. |
| `compiler-v1-contract.md` | Phase V4 pure compiler contract | Compiler owner | Manifest spec, validator rules, style contract, React Flow boundary | Deterministic output shape, CSS variable rules, recipe rules, adapter output rules | Compiler implementation can stay pure and side-effect-free. |
| `style-runtime-preview-v1.md` | Phase V5 local-only runtime preview design | Runtime owner | Compiler contract, preview/apply/persist boundary, App Router scan | Preview controller contract, placement decision, injection/revert rules, smoke checklist | Preview can be implemented later without sync/backend pollution. |
| `legacy-bridge-v0-v1.md` | Phase V6 legacy bridge map | Compatibility owner | Current CSS variables, Tailwind bridge, theme provider, preset scan | Legacy-to-contract map, preset notes, additive migration strategy | Current presets can remain stable while V1 variables are introduced later. |
| `primitive-specimens-v1.md` | Phase V7 primitive specimen contract | Primitive owner | Style contract, compiler contract, protected ledger, hardcoded token inventory | Primitive list, state matrix, accessibility gates, smoke checklist | First primitive implementation can start in an isolated specimen surface. |
| `nexus-ops-style-map.md` | Phase V8 app shell semantic map | App shell owner | `nexus-ops.tsx` read-only function and style scan | Shell/dock/sidebar/window/modal slots, migration backlog, protected behavior list | Future code work avoids broad `nexus-ops.tsx` rewrites. |
| `window-modal-recipe-system.md` | Phase V9 window/modal recipe boundary | Window/modal owner | Protected ledger, app shell map, modal/window source anchors | Visual recipe slots, z-index/scroll/focus protections, smoke checklist | Window/modal styling can migrate without touching behavior ownership. |
| `react-flow-adapter-v1.md` | Phase V10 React Flow adapter contract | Graph adapter owner | React Flow boundary, compiler contract, graph source scan | Adapter output shape, forbidden fields, delivery strategy, smoke checklist | Future graph styling goes through visual adapter, not behavior props. |
| `style-lab-v1.md` | Phase V11 local Style Lab design | Lab owner | Runtime preview design, validator rules, compiler contract, primitive and graph docs | Local lab panels, preview flow, export boundary, smoke checklist | Lab can be built later without workspace/sync/backend pollution. |
| `style-interpreter-boundary.md` | Phase V12 style interpreter boundary | Interpreter owner | Manifest spec, validator rules, corrected prompt, ambition doc | Draft-only normalizer rules, prompt-injection boundary, safety report expectations | AI/human briefs cannot bypass validation, preview, or persistence gates. |
| `style-persistence-contract.md` | Phase V13 persistence contract | Persistence owner | Supabase docs, workspace snapshot flow, API/backend/security scan | Durable style pack model, RLS/Auth/key boundary, migration gate | Style packs are separated from workspace snapshots before any DB work. |
| `style-pack-governance.md` | Phase V14 style pack governance | Governance owner | Persistence contract, manifest spec, validator rules, master plan | Lifecycle states, version axes, compatibility matrix, safety reports, fallback rules | Packs can be rejected, upgraded, downgraded, retired, or quarantined without breaking workspaces. |
| `personal-ui-factory.md` | Phase V15 personal UI factory | Product safety owner | Interpreter boundary, governance, accessibility gates, master plan | Product pipeline, approval boundary, privacy scope, fail-closed rules | Personalized generation creates governed assets, not executable UI. |
| `skin-pack-v2-contract.md` | V2 Skin Pack contract prep | Pack contract owner | V1 manifest, validator rules, governance, Protocol 94 audit | Skin pack envelope, metadata, V1 manifest binding, compatibility, fallback | V2 pack work starts as pure types/validators/fixtures/tests only. |
| `asset-pack-v1-contract.md` | V2 Asset Pack boundary prep | Asset safety owner | Protocol 94 audit, validator URL rejection rules, performance boundaries | Asset descriptor shape, type/role/mime/hash/loading policy, fallback | Assets remain ID-based and cannot introduce remote executable or unbounded URL channels. |
| `recipe-registry-v1-contract.md` | V2 Recipe Registry prep | Recipe owner | Manifest recipes, validator rules, adapter docs, protected ledger | Central visual slot registry and compatibility tests | Recipe expansion goes through registry slots, not scattered runtime conditions. |
| `layout-preset-boundary-v1.md` | V2 Layout Preset boundary prep | Layout safety owner | Protected behavior ledger, Protocol 94 audit | Allowed density/slot/surface/visibility/decor hints and forbidden behavior authority | Layout presets preserve the unified functional skeleton. |
| `performance-budget-validator-v1.md` | V2/V3 Performance Budget prep | Performance owner | Compiler variable budget, asset contract, Protocol 94 audit | Static V2 gates and deferred V3 runtime/asset gates | V2 can enforce pure static budgets without loading assets or changing runtime UI. |
| `v2-style-pack-implementation-gates.md` | V2 implementation gate map | Execution owner | All V2 contract-prep docs and governance docs | Go/No-Go gates, first implementation batch rules, protocol trigger matrix | Broad implementation is blocked until pure contract validators and fixtures exist. |
| `skin-pack-render-optimization-pipeline-v1.md` | V2/V3 Skin Pack render optimization pipeline | Performance owner | V2 contracts, token-only preview checkpoint, Style Lab review source | Receive-to-RenderPlan pipeline, scheduler design, diagnostics, dependency policy | Next implementation gate is pure Render Plan IR types/tests, not asset preview. |
| `style-pack-authoring-guide-v1.md` | V2 Style Pack authoring guide | Authoring owner | V2 contracts, validators, fixtures, token preview checkpoint | User/designer/LLM guide, examples, image-to-style workflow, prompts, troubleshooting | Authored packs can target review-only import and token-only preview without runtime or persistence work. |
| `style-pack-authoring-reference-v1.md` | Current V2 authoring capability reference | Authoring owner | V2 authoring guide, V2 fixtures, V2 token preview source, Style Lab source | Capability map, visible token list, valid skeleton, fixture-based Pixel/Minecraft rewrite, repair guide | External authors know which fields change Style Lab today and which fields remain review-only. |

## 2. Phase Docs To Create Later

No additional phase docs are queued from the 2026-05-30 V2 contract-prep run.
The next work should implement only the first pure local gate from
`v2-style-pack-implementation-gates.md`, or add a new cleanly scoped doc if the
requested phase changes.

## 3. Context Sharding Protocol

For each future Codex run:

1. Read the master plan.
2. Read only the boundary docs relevant to the phase.
3. Read only the source files named by the phase doc.
4. Record new facts into the phase doc or ledger.
5. Do not reread long ambition docs unless product direction is being reconsidered.

Recommended phase read sets:

| Task | Minimum docs | Minimum source scan |
| --- | --- | --- |
| V1 audit | master, boundary, ledger | `globals.css`, `tailwind.config.ts`, `theme-provider.tsx`, `layout.tsx`, `page.tsx`, `nexus-ops.tsx`, `nexus-graph.tsx`, modal/window/auth components |
| V2 contract | master, V1 audit, ledger | CSS variable inventory, class taxonomy, React Flow boundary |
| V3 manifest | contract, validator rules, ledger | no app components unless adding examples from audit |
| V4 compiler | manifest spec, compiler contract | pure style-engine files only after implementation starts |
| V5 preview | boundary, compiler contract, primitive specimens | provider candidate files and no store/sync/backend |
| V10 graph adapter | React Flow boundary, ledger | `nexus-graph.tsx`, `globals.css` React Flow selectors only |
| V13 persistence | boundary, persistence contract | `/api/v1` patterns, backend services, Supabase migrations, generated types |
| V2 Skin Pack contract prep | Protocol 94 audit, manifest spec, validator rules, governance, protected ledger, V2 contract-prep docs | no app source scan unless implementation begins |
| V2 pure implementation first batch | V2 implementation gates, skin pack contract, recipe registry, asset contract, layout boundary, performance budget | `src/lib/style-engine/**` only after a separate implementation authorization |

## 4. Dependency Decision Log

Current decision: install nothing.

Future dependency entries must use this format:

| Dependency | Phase | Type | Problem solved | Added complexity | Alternatives | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Example: `zod` | V3 | runtime/dev | Manifest validation | new dependency and runtime validation layer | hand-written validator, `valibot` | Not approved until V3 implementation. |

Rules:

- Do not add dependencies for documentation.
- Do not add Style Engine dependencies before the contract exists.
- Prefer existing libraries and plugin capabilities first.
- Add dependencies only when they reduce risk or create verification thickness, not when they merely make the plan feel larger.

## 5. Acceptance Words

Future docs are acceptable only when they are:

- Reviewable.
- Rollback-aware.
- Source-linked to current repo facts.
- Clear about allowed and forbidden files.
- Clear about Preview/Apply/Save/Persist.
- Clear about sync/backend pollution risk.
- Clear about what was intentionally not changed.

They are not acceptable if they:

- Turn product ambition into early schema work.
- Skip protected behavior classification.
- Treat `workspace.themeConfig` as a free style-pack container.
- Propose marketplace/personalization before contract, manifest, compiler, preview, adapter, primitive, and verification foundations.

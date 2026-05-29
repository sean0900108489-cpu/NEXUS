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

## 2. Phase Docs To Create Later

| Doc | Phase | Purpose | Inputs | Outputs | Acceptance gate |
| --- | --- | --- | --- | --- | --- |
| `style-surface-audit.md` | V1 | Inventory all style entry points | `globals.css`, `tailwind.config.ts`, `theme-provider.tsx`, `layout.tsx`, `page.tsx`, UI components | CSS variable inventory, hardcoded visual inventory, class taxonomy | Every high-risk component has a style map and no-touch list. |
| `hardcoded-visual-token-inventory.md` | V1 | Count and classify repeated visual values | TSX/CSS scans | Colors, shadows, borders, radii, opacity, blur, typography candidates | Pure visual candidates are separated from layout/behavior. |
| `react-flow-style-boundary.md` | V1/V10 | Define graph adapter boundary | `nexus-graph.tsx`, `globals.css`, React Flow selectors | Node/edge/handle/minimap/control visual slots | Pan/zoom/drag/select/handle behavior is excluded. |
| `style-contract-v1.md` | V2 | Semantic token and slot contract | V1 audit, current CSS variables | Token groups, slot names, recipe names, naming rules | Contract can represent current cyberpunk and one different style. |
| `manifest-v1-spec.md` | V3 | Data-only manifest specification | Style contract | Schema, valid examples, invalid examples | Manifest forbids JS, unrestricted CSS, workspace/sync/backend fields. |
| `manifest-validator-rules.md` | V3 | Safety validator rulebook | Manifest spec, protected ledger | Schema errors, safety warnings, reject/quarantine policy | Invalid manifest fails before compile/preview. |
| `compiler-v1-contract.md` | V4 | Pure compiler input/output contract | Manifest, token registry, recipe map | CSS variable map, recipe vars, adapter config, warnings | Compiler has no DOM/store/backend effects. |
| `legacy-bridge-v0-v1.md` | V6 | Bridge current CSS variables and presets | `globals.css`, `tailwind.config.ts`, `theme-provider.tsx` | Legacy-cyberpunk mapping and deprecation path | Existing UI remains stable; legacy CSS is not deleted. |
| `primitive-specimens-v1.md` | V7 | First primitives and states | Style contract, compiler output | Panel/Button/Input/Badge/Modal specimen contract | Focus/hover/disabled/loading/selected states are covered. |
| `nexus-ops-style-map.md` | V8 | App shell style slot map | `nexus-ops.tsx` | Topbar/dock/sidebar/window/modal slot inventory | No rewrite; only mapping and migration candidates. |
| `window-modal-recipe-system.md` | V9 | Window/modal/backdrop/focus recipe contract | Rnd windows, modals, z-index ledger | Recipe variables and state slots | Drag/resize/z-index/modal focus unchanged. |
| `style-lab-v1.md` | V11 | Local lab design | Compiler, primitives, preview boundary | Lab surface, reports, local-only preview model | Lab state cannot enter workspace/sync/backend. |
| `style-interpreter-boundary.md` | V12 | AI/human brief normalizer boundary | Manifest spec, safety rules | Draft-only normalizer flow | AI output cannot bypass validator/compiler. |
| `style-persistence-contract.md` | V13 | Persistence model | Supabase gate, data flow boundary | Style pack and workspace preference model | Branch/RLS/advisor/types gate complete before DB work. |
| `style-pack-governance.md` | V14 | Pack lifecycle and compatibility | Persistence contract, manifest versions | Versioning, safety report, fallback, rollback | Pack can be rejected/upgraded/retired. |
| `personal-ui-factory.md` | V15 | Product-level generation | Interpreter, governance, accessibility policy | Personalization pipeline | Accessibility and safety override aesthetics. |

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

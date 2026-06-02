# Surface Style Ops Typography Icon Button Polish Audit V1

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

## Reference Image Usage

Reference image:

- `/Users/sean/Downloads/ChatGPT Image 2026年5月31日 下午12_15_46.png`

Usage record:

- viewed read-only: yes
- copied into repository: no
- encoded as base64: no
- imported by source: no
- used as production/background asset: no
- used as remote URL: no
- hard-copied pixel layout: no

The image was used only to extract typography, icon, button, density, spacing,
and hierarchy requirements for the Surface Style Ops Style Lab preview.

## Polish Extraction

Reference typography direction:

- compact operational labels
- mostly uppercase labels for chrome, counters, and section headings
- small text sizes with clear hierarchy between label, value, and body
- medium or semibold active labels, restrained regular labels elsewhere
- generous but controlled tracking on labels
- low-contrast pearl text over surface style
- body text kept short and dense

Reference icon direction:

- restrained glyphs inside soft glass circular or rounded-square buttons
- icons act as quiet affordances, not decorative illustrations
- icon buttons are compact, evenly sized, and visually aligned
- status dots and tiny symbols carry state with low contrast

Reference button/control direction:

- rounded glass controls with soft borders
- active segment uses brighter raised glass and a gentle shadow
- inactive controls are visibly available but subdued
- counters are compact cards, not large dashboard tiles
- call-to-action chrome is tactile but not loud

Reference density direction:

- tight enterprise command-center spacing
- left agent bank, top segmented nav, central workspace, and right metrics panel
  share a consistent compact rhythm
- vertical sections are divided by subtle lines, small cards, and light glass
  stacking rather than heavy boxes

## Current Style Lab Audit

Current evidence:

- `/style-lab` Surface Style Scene Preview contains a warm scene/wash, segmented
  top navigation specimen, Agent Card Bank, central workspace/chrome specimen,
  Right Metrics Panel, and Production Chrome Smoke harness.
- Latest checkpoint estimates Style Lab visual similarity at about `67-70%`.
- Latest checkpoint estimates production skinning readiness at about `74-76%`.
- Current Style Lab implementation uses compact mono labels, surface style panels,
  active segmented nav treatment, compact counters, static agent cards, and
  right metrics blocks.
- Icon/action chrome is still represented mostly by text initials or short
  labels such as `Sun`, `Bell`, `Focus`, `Add`, `Plan`, `Dry Run`, and `Hold`.
- Button/input/badge production primitives are not yet adopted as a safe
  production selector family.

## Score Table

Scores are polish-fit scores against the reference image, not production
runtime confidence scores.

| Category | Current state | Evidence | Score | Gap | Risk | Next implementation type |
| --- | --- | --- | ---: | --- | --- | --- |
| Typography hierarchy | Good compact hierarchy exists in the Style Lab specimen | Surface Style sections use small uppercase labels, tiny counters, and short body text | 3/5 | No explicit type-density policy yet; some body and label sizes are ad hoc | Low if kept Style Lab-only; medium if promoted to production broadly | token policy |
| Label style / casing | Mostly aligned with reference | Segmented nav, agent cards, metrics blocks, counters, and capability groups use uppercase labels | 4/5 | Needs a clear policy for when labels are uppercase vs sentence/body text | Low | token policy |
| Icon treatment | Underdeveloped | Top action cluster uses letter placeholders; agent/status indicators are simple dots/initials | 2/5 | Missing restrained glyph treatment, icon sizing policy, and inactive/active icon affordance recipe | Medium if production controls are touched too early | Style Lab-only specimen polish |
| Button chrome | Underdeveloped | Inert `Add`, run controls, counters, and active segment exist, but chrome language is inconsistent | 2/5 | Missing reusable surface style button/input/badge recipe before production selectors | Medium to high if behavior-bearing buttons are edited | Style Lab-only specimen polish |
| Active/inert affordance clarity | Partial | Active segmented nav is visibly brighter; inert controls are static | 3/5 | Need clearer distinction among active, available, disabled/inert, and status affordances | Medium if implemented in production states | recipe |
| Card density | Strong in Style Lab | Agent cards and metrics blocks are compact, readable, and aligned with command-center density | 4/5 | Some card separators/buttons still feel locally invented rather than recipe-driven | Low | recipe |
| Metrics density | Strong in Style Lab | Right Metrics has selected agent, collaboration map, context stack, goal bars, run execution, memory/history | 4/5 | Needs tighter icon/action treatment and final text rhythm | Low | Style Lab-only specimen polish |
| Segmented nav polish | Strong specimen foundation | Active segment, separators, counters, and action cluster are present | 4/5 | Action cluster still uses letter placeholders rather than restrained icon controls | Low in Style Lab; medium in production TopBar | Style Lab-only specimen polish |
| Message/content readability | Adequate | Message/content specimens use low-contrast warm text and short line lengths | 3/5 | Needs consistent prose/body scale policy and better contrast checks before production typography changes | Medium if text colors are broadly tokenized | token policy |
| Overall enterprise product finish | Good direction, not final | Warm scene now contains top nav, left bank, center workspace, right metrics, and chrome specimens | 3/5 | Final 20-25% polish depends on icon/button recipe, type density policy, layout arrangement, assets, and auth smoke | Medium if production behavior is pulled in too soon | recipe |

Total polish score:

- `32 / 50`

Current estimate:

- Surface Style visual similarity in Style Lab: about `67-70%`
- Production skinning readiness: about `74-76%`

Interpretation:

- The Style Lab preview now has the right composition and surface style mood.
- The remaining visual delta is mostly product-detail polish: controls, icons,
  tactile buttons, typography policy, and density consistency.
- Production readiness is higher than visual similarity because many adopted
  alias families already bridge directly, while control primitives remain
  intentionally excluded.

## Top Polish Gaps

1. **Icon/action chrome recipe**
   - Reference relies on compact glass icon controls.
   - Current Style Lab actions often use letter placeholders or text-only chips.
   - Highest visual ROI without touching production behavior.

2. **Button/input/badge primitive language**
   - Current specimens have local button-like pieces but no explicit reusable
     surface style recipe.
   - Production selector-first work should wait until the visual recipe is
     clearer, because real buttons can own handlers, focus, keyboard, and state.

3. **Typography density policy**
   - Existing Style Lab text is close, but the policy is implicit.
   - A future token/policy pass should define label/body/value scale, casing,
     weight, tracking, and line-height constraints.

4. **Affordance-state clarity**
   - Active segment is strong, but available, inert, disabled, status, and
     destructive controls are not distinguished as a system.
   - This is a recipe problem before it is a production primitive problem.

5. **Authenticated production confidence**
   - The Style Lab path is strong, but production `/` still needs authenticated
     visual smoke once the user can provide a session.
   - This is confidence work, not the next visual-ROI implementation.

## Risk Analysis

Lowest-risk path:

- Style Lab-only icon/button chrome recipe specimen.
- No production component edits.
- No global CSS.
- No selector adoption.
- No store/backend/API.
- No persistence.

Medium-risk path:

- Typography token policy or fixture adjustment.
- It can improve consistency, but visible ROI may be smaller unless paired with
  concrete specimen updates.

Higher-risk path:

- Production button/input/badge primitive selector-first.
- This could improve production readiness toward 80%, but only after a scan
  proves selectors can be added to inert visual shells without touching
  handlers, focus, keyboard, validation, submit, hover/active behavior, or
  component state.

No-go path:

- Broad production styling.
- Directly editing production buttons/inputs/icons without selector ownership
  proof.
- Tokenizing hover/focus/active states before behavior boundaries are known.
- Adding raw CSS payload acceptance, runtime apply, persistence, or production
  layout behavior.

## Next Target Decision

Selected next target seed:

`V19 Surface Style Ops Icon Button Chrome Recipe Specimen`

Why this is highest ROI:

- It addresses the most visible remaining Style Lab polish gap.
- It directly improves the reference-image feel: compact glyph controls,
  tactile glass buttons, status dots, badges, and active/inert affordances.
- It keeps the work Style Lab-only and non-persistent.
- It creates a concrete recipe artifact that can later guide a safer production
  button/input/badge selector-first scan.
- It avoids pretending production control primitives are safe before ownership
  is proven.

Suggested next-loop goal:

- Add a Style Lab-only Surface Style icon/button chrome specimen near the existing
  scene preview.
- Include compact icon buttons, segmented active/inert controls, small badges,
  status chips, input-like shell, and run/action controls.
- Use local preview variables only.
- Report supported now, specimen-only, and missing production primitive
  capabilities.

Suggested allowed files:

- `src/components/style-engine/nexus-style-lab.tsx`
- focused Style Lab test files
- `docs/style-system/surface-style-ops-typography-icon-button-polish-audit-v1.md`
- `docs/style-system/production-shell-extraction-map-v1.md`
- one checkpoint under `docs/style-system/execution-runs/`

Suggested forbidden files:

- `src/components/nexus/**`
- `src/app/globals.css`
- package/config/deploy files
- store/sync/backend/Supabase/API
- Supabase/database/migrations
- `exports/**`
- reference image file
- production controls, production shell behavior, runtime token apply, and
  persistence

Stop conditions:

- if implementation requires production button/input/icon behavior edits
- if implementation requires handlers, keyboard/focus behavior, validation, or
  submit logic
- if implementation requires global CSS or production selectors
- if implementation requires store/backend/API or persistence
- if implementation becomes broad styling instead of a focused recipe specimen

## Explicit No-Go List

Do not do the following as part of the next polish step:

- broad production styling
- production TopBar control edits
- production button/input/badge behavior edits
- hover/focus/active state tokenization without ownership scan
- keyboard/focus/validation/submit behavior edits
- global CSS adoption for control primitives
- runtime token apply
- token persistence
- backend/store/Supabase/API integration
- asset/background production pipeline
- layout preset production apply
- copying, importing, encoding, or referencing the reference image in repo

## Audit Verdict

Surface Style Ops has moved from alias readiness into recognizable product
composition, but the next visual plateau depends on small control polish.

The highest ROI next step is a Style Lab-only icon/button chrome recipe
specimen. Production button/input/badge selector-first remains important for
the path to 80%, but it should follow the recipe artifact and a strict
ownership scan rather than replacing this polish step.

## Icon Button Chrome Recipe Specimen Follow-Up

Loop `20260531-v19-surface-style-ops-icon-button-chrome-recipe-specimen` added a
Style Lab-only control chrome recipe specimen to the Surface Style Scene Preview.

Added specimen evidence:

- compact lucide icon controls for theme, alert, focus, and new/add actions
- primary action chrome: `Run Execution`
- secondary action chrome: `Sync Analysis`
- input-like command field: `Transmit mission packet`
- status badges: `Live`, `Idle`, `Syncing`, and `Local`
- active/inert affordance examples
- local boundary rows for supported now, specimen-only, and missing production
  primitive path

The specimen remains isolated:

- no production controls imported or edited
- no production selector adoption
- no `src/components/nexus/**`
- no `src/app/globals.css`
- no store, sync, backend, Supabase, API, or persistence
- no runtime token apply
- no copied reference image, remote image URL, or public asset

Updated estimate after this specimen:

- Surface Style visual similarity in Style Lab: about `71-73%`
- production skinning readiness: about `76-78%`

The next highest ROI production-readiness step is a selector-first scan for
button/input/badge primitives using this recipe as the visual standard. That
scan should stop with a No-Go map if real controls own handlers, focus,
keyboard, validation, submit, hover/active behavior, or component state.

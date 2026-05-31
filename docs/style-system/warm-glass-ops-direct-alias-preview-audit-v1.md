# Warm Glass Ops Direct Alias Preview Audit V1

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Reference image:

- `/Users/sean/Downloads/ChatGPT Image 2026年5月31日 下午12_15_46.png`
- read-only visual north star
- not copied into the repository

## Summary

Warm Glass Ops now has strong alias readiness but only partial visual similarity
to the reference image.

The latest Bridge Plan proves that the accepted Warm Glass fixture can directly
emit the current adopted production alias families:

- `10/10` alias families directly driven
- `58/58` adopted aliases directly emitted
- `83` Bridge Plan variables

That is not the same as 80 percent visual similarity. The reference image is
heavily carried by background scene, composition, agent-card structure, right
metrics panel, segmented navigation, and warm spatial hierarchy. Those are not
created by direct alias coverage alone.

## Reference Visual Requirements

The image reads as:

- warm desert atelier command center
- soft architectural background scene with cliffs, clouds, alcoves, stairs, and
  warm shelf lighting
- translucent frosted glass shell over the scene
- low-contrast pearl borders and low-contrast warm shadows
- rounded macOS/VisionOS-like window chrome
- left agent bank with colored role cards
- central glass workspace board with stacked agent windows
- right metrics panel with hierarchy, small chart/graph content, and metric
  bars
- top segmented navigation and compact operational counters
- restrained icon buttons and professional density
- warm beige/clay/pearl palette, not cyberpunk cyan or purple

## Current Preview Evidence

Browser target:

- `http://127.0.0.1:3000/style-lab`

Observed:

- Style Lab loaded.
- Warm Glass Ops Coverage panel rendered.
- Warm Glass fixture review was accepted.
- Coverage panel showed:
  - `Bridge Vars` = `83`
  - `Direct %` = `100`
  - `Direct Aliases` = `58/58`
  - family modes = `DIRECT-BRIDGE`
- Token preview entered token-only previewing.
- Token preview reverted successfully.
- Production Chrome Smoke apply/revert still worked.
- Console errors: none observed.

Important visual finding:

- Warm Glass token preview did not change the Production Chrome Smoke specimen
  computed styles.
- Example command palette smoke specimen before and after Warm Glass token
  preview stayed:
  - background: `rgba(8, 16, 22, 0.78)`
  - border: `rgba(226, 232, 240, 0.12)`
  - radius: `4px`
  - blur: `8px`
- The separate Production Chrome Smoke controls did change/revert specimen
  styles, but those smoke variables are local harness stress colors rather than
  the Warm Glass north-star palette.

Interpretation:

- Direct alias bridge coverage is correct.
- Current Style Lab evidence is still stronger as a coverage report than as a
  faithful Warm Glass visual preview.
- No source display bug was found that requires changing code in this audit.

## Score Table

Scores are visual-similarity scores against the reference, not alias-readiness
scores.

| Category | Current support | Evidence | Score | Blocking gap | Next implementation type |
| --- | --- | --- | ---: | --- | --- |
| Warm neutral palette | Token fixture and bridge outputs contain sand, clay, pearl, bronze values | Warm Glass fixture accepted; direct bridge aliases report `58/58` | 3/5 | Production Chrome Smoke specimens are not visibly recolored by Warm Glass token preview | Style Lab preview |
| Frosted glass panels | Blur/radius/border/shadow aliases exist across adopted chrome | Direct bridge covers panel/glass/window/modal/datapad blur and surface aliases | 3/5 | No full-scene glass stack preview using Warm Glass variables | Style Lab preview |
| Low contrast borders | Border aliases are direct and derive from `border.subtle` | Direct bridge output covers border families | 3/5 | Current visible smoke specimen still reads cyan/cyber baseline unless local smoke vars are applied | Style Lab preview |
| Soft shadows | Shadow aliases are direct and derive from `shadow.panel` | Direct bridge output covers shell/content/chrome shadows | 3/5 | Reference has soft scene-integrated depth; current preview uses generic dark shadows | Style Lab preview |
| Rounded chrome | Radius aliases are direct across adopted chrome | Direct bridge output covers panel/glass/window/modal/datapad radius | 3/5 | Reference has broader VisionOS chrome and capsule controls not represented by adopted aliases | recipe |
| Workspace background/wash | Workspace background/grid/wash aliases are direct | Coverage family is `DIRECT-BRIDGE` | 2/5 | No desert atelier scene, depth plane, or warm spatial board preview | asset/background |
| Background scene/image | Not supported in accepted production payload | North-star doc and coverage gaps explicitly block remote/image/background runtime apply | 0/5 | No safe scene/background preview pipeline | asset/background |
| Agent cards/bank | Full AgentWindow chrome exists; no agent-card/bank recipe | Reference needs left bank role cards and shelf-like agent cards | 1/5 | No visual-only agent card/bank recipe/specimen | recipe |
| Right metrics panel | Right dock rail is tokenized; metrics panel content is not | Coverage map says right-dock active panels remain behavior-bearing | 1/5 | No static right metrics panel specimen or selector-safe recipe | recipe |
| Segmented top navigation | TopBar frame is tokenized; child controls are excluded | TopBar child controls remain behavior-bearing | 1/5 | No segmented nav primitive/specimen | recipe |
| Message/content surfaces | Message bubble role aliases are direct | Message family direct bridge coverage exists | 3/5 | Reference emphasizes agent windows/cards more than chat transcript bubbles | token/alias |
| Modal/command/datapad chrome | All three shell families are direct bridge outputs | CommandPalette/modal/Datapad families report `DIRECT-BRIDGE` | 3/5 | Preview does not show Warm Glass applied to these smoke specimens yet | Style Lab preview |
| Typography scale | V2 typography tokens exist but production text scale policy is not adopted | Coverage gap remains typography token adoption policy | 2/5 | No production typography scale cleanup or preview policy | production extraction |
| Icon/button chrome | Some controls appear in Style Lab/specimens; no adopted control primitive coverage | North-star image relies on restrained icon buttons and role chips | 1/5 | Button/icon/control primitive recipe is still absent | recipe |
| Layout arrangement | Current Style Lab specimens are isolated, not command-center composition | Coverage gaps include layout arrangement | 1/5 | No layout preview gate for left bank, central board, right metrics, top nav | layout preset |

Total visual score:

- `30 / 75`

Visual similarity estimate now:

- approximately `40%`

Readiness estimate now:

- approximately `66-70%`

Why the readiness estimate is higher than visual similarity:

- adopted alias families are directly bridgeable
- Style Lab can verify coverage and local smoke apply/revert
- but the current preview cannot yet reproduce reference-level scene,
  composition, card bank, metrics panel, or segmented navigation

## Missing Capability Ranking

Ranked by visual ROI, safety, and whether the work can stay non-production and
non-persistent.

1. **Warm Glass workspace scene/wash preview**
   - Largest visual gap.
   - The reference is mostly scene + translucent glass.
   - Should be Style Lab only, with no production asset apply and no remote
     image URL.
2. **Right metrics panel recipe/specimen**
   - High reference salience on the right side.
   - Should be static specimen/recipe first, not right-dock artifact/vault
     persistence work.
3. **Agent card/bank recipe/specimen**
   - High reference salience on the left bank and shelf/card region.
   - Should be visual-only recipe/specimen first.
4. **Segmented top navigation specimen**
   - Important for VisionOS command-center feel.
   - Must avoid command behavior, keyboard behavior, and active control logic.
5. **Typography density policy**
   - Important polish layer, but lower ROI before scene/composition gaps.
6. **Authenticated production smoke checklist**
   - Important confidence gate, but not the largest visual similarity blocker.

## Selected Next Highest ROI Target

Next task seed:

`V19 Warm Glass Ops Style Lab Scene Wash Preview`

Goal:

Create a Style Lab-only, non-persistent Warm Glass scene/wash preview that uses
the accepted Warm Glass fixture and direct Bridge Plan variables on a local
preview container. It should approximate the desert atelier background mood and
show existing production chrome specimens over it without applying anything to
production runtime.

Why this is highest ROI:

- It addresses the largest visible delta from the reference image.
- It uses the direct alias bridge work from the previous loop.
- It gives visual evidence rather than only coverage evidence.
- It remains low risk if scoped to Style Lab, local refs/state, and static
  preview data.

Suggested allowed files:

- `src/components/style-engine/nexus-style-lab.tsx`
- focused Style Lab source guard/test
- `src/lib/style-engine/**` only for pure helper/report data if needed
- `docs/style-system/production-shell-extraction-map-v1.md`
- one checkpoint under `docs/style-system/execution-runs/`

Suggested forbidden files:

- `src/components/nexus/**`
- `src/app/globals.css`
- store/sync/backend/Supabase/API
- package/config/deploy files
- `exports/**`
- production runtime token apply
- runtime token persistence
- asset pack production apply
- layout preset production apply

Stop conditions:

- if implementation requires production runtime apply
- if implementation requires a remote image URL in accepted payload
- if implementation requires copying the reference image into the repo
- if implementation requires store/backend/sync/API
- if implementation changes production shell behavior

## Audit Verdict

Direct alias coverage is successful.

Warm Glass visual similarity is not yet at the 80 percent phase target. The
next high-ROI work should improve Style Lab visual proof, starting with a
scene/wash preview, before adding more production aliases or touching
behavior-bearing production panels.

## Scene Wash Preview Follow-Up

Loop `20260531-v19-warm-glass-ops-style-lab-scene-wash-preview` added a
Style Lab-only scene preview for the highest ROI visual gap identified in this
audit.

Added preview evidence:

- warm desert/atelier gradient wash
- local direct-alias variables on the preview container
- frosted workspace board
- static agent bank/cards
- static right metrics panel
- segmented-navigation mood strip
- mini Command/Modal/Datapad chrome row
- supported / simulated-only / missing capability groups

The preview remains isolated:

- no production `/` apply
- no persistence
- no reference image copied into the repository
- no remote image URL
- no asset pipeline or layout preset production apply

Updated estimate after this scene preview:

- visual similarity in Style Lab: about `52-55%`
- production skinning readiness: about `68-72%`

The remaining path to 80 percent should prioritize real recipe/specimen
coverage for right metrics, agent cards, segmented navigation, and typography
density before adding more low-level aliases.

## Right Metrics Panel Specimen Follow-Up

Loop `20260531-v19-warm-glass-ops-right-metrics-panel-recipe-specimen`
expanded the Style Lab scene preview with a static right metrics panel recipe
specimen.

Added specimen evidence:

- selected agent summary
- collaboration map
- context stack
- goal metric bars
- run execution chrome
- memory/history block
- compact warm glass inspector hierarchy

The specimen remains isolated:

- no production right-dock panel import
- no store, sync, backend, Supabase, or API calls
- no persistence
- no event handlers or runtime apply
- no `globals.css` or production selector changes

Updated estimate after this specimen:

- visual similarity in Style Lab: about `58-62%`
- production skinning readiness: about `70-73%`

The next highest ROI visual gaps remain agent card/bank recipe, segmented top
navigation specimen, and then typography density policy before any production
layout or asset pipeline gate.

## Agent Card Bank Specimen Follow-Up

Loop `20260531-v19-warm-glass-ops-agent-card-bank-specimen` upgraded the
Style Lab scene preview with a static agent card bank recipe specimen.

Added specimen evidence:

- agent bank panel
- five compact agent cards
- Architect / Explorer / Sentinel / Auditor / Steward role identities
- soft initial avatar blocks
- role labels and status text
- status dots
- load and queue micro-metrics
- inert add affordance

The specimen remains isolated:

- no production AgentWindow or shell import
- no store, sync, backend, Supabase, or API calls
- no persistence
- no event handlers or runtime apply
- no `globals.css` or production selector changes

Updated estimate after this specimen:

- visual similarity in Style Lab: about `63-66%`
- production skinning readiness: about `72-75%`

The next highest ROI visual gaps are segmented top navigation specimen,
typography/icon/button polish, and then production confidence work such as
authenticated `/` smoke.

## Segmented Top Navigation Specimen Follow-Up

Loop `20260531-v19-warm-glass-ops-segmented-top-navigation-specimen` upgraded
the Style Lab scene preview with a static segmented top navigation specimen.

Reference image usage:

- viewed read-only as visual hierarchy guidance
- not copied into the repository
- not encoded as base64
- not referenced as a production or public asset

Added specimen evidence:

- central rounded glass segmented navigation shell
- View: Panels / View: Graph / Cyberpunk / Apple / Tesla / Terminal segments
- one active segment with brighter glass treatment
- soft separators
- compact Agents / Streams / Tokens / Tasks counters
- inert compact action cluster

The specimen remains isolated:

- no production TopBar import
- no TopBar control, keyboard, focus, or action behavior
- no store, sync, backend, Supabase, or API calls
- no persistence
- no event handlers or runtime apply
- no `globals.css` or production selector changes

Updated estimate after this specimen:

- visual similarity in Style Lab: about `67-70%`
- production skinning readiness: about `74-76%`

The next highest ROI visual gaps are typography/icon/button chrome polish and
then authenticated production smoke confidence.

# V19 Warm Glass Ops User Testing Guide

Date: 2026-05-31

Scope:

- Style Lab testing only.
- No production apply.
- No persistence.
- No login required for the Style Lab path.

## Purpose

Use this guide to evaluate the current Warm Glass Ops skinning work before V19
continues into riskier production landing work.

The expected result is a set of observations about visual quality, missing
capabilities, and production-smoke needs. The expected result is not a persisted
theme, production workspace mutation, or asset/layout apply.

## Before Testing

Confirm:

- the app is running locally
- `/style-lab` is accessible
- Chrome Translate is off if possible
- known `bg-cyberpunk.webp` placeholder failures are treated as baseline if
  they appear

Do not:

- log in unless you are running the separate authenticated production smoke
  checklist
- visit production `/` for applying a skin
- submit forms
- execute commands
- upload/download files
- save/delete workspace data

## Style Lab Flow

1. Open:

   `http://127.0.0.1:3000/style-lab`

2. Find `Warm Glass Ops Coverage`.

3. Click `Use Warm Glass`.

4. Review the V2 Skin Pack fixture.

5. Accept the fixture in the review flow.

6. Confirm the coverage panel shows:

   - direct bridge coverage for the current adopted production alias families
   - direct aliases covered
   - unsupported Warm Glass target gaps

7. Use token preview.

8. Revert token preview.

9. Find `Warm Glass Scene Preview`.

10. Inspect:

    - warm scene/wash
    - segmented top navigation
    - agent card bank
    - central workspace/chrome specimen
    - right metrics panel
    - icon/button/badge/input-like control chrome

11. Find `Production Chrome Smoke`.

12. Click `Apply Smoke Vars`.

13. Confirm static specimens visibly change.

14. Click `Revert Smoke Vars`.

15. Confirm baseline returns.

## What Should Change

In Style Lab:

- token preview should change token-preview surfaces
- Production Chrome Smoke should change only its local smoke target
- Warm Glass Scene Preview should show the north-star mood and recipe direction
- the coverage panel should report current direct alias coverage and gaps

## What Should Not Change

The test must not:

- persist a skin
- write localStorage or workspace state
- mutate backend/store/Supabase/API data
- change production `/`
- install a background asset
- apply a layout preset
- execute command palette actions
- submit modal forms
- save/delete Datapad content

## Supported, Simulated, Missing

Supported now:

- adopted production aliases can be emitted by the pure bridge plan
- Style Lab can locally preview Warm Glass variables and smoke chrome aliases
- existing production shell/chrome selectors are represented in the smoke
  harness

Simulated in Style Lab only:

- desert/atelier scene wash
- right metrics panel
- agent card bank
- segmented navigation
- icon/button/badge/input-like recipe language

Still missing:

- authenticated production `/` visual smoke
- real right metrics/agent card/segmented nav production recipe boundaries
- production button/input/badge selector and alias path beyond ToolbarIconButton
- asset/background pipeline
- layout preset/page arrangement
- runtime production apply and persistence gates

## Feedback Template

Use this structure for feedback:

```text
Surface:
Observed:
Expected Warm Glass behavior:
Score 0-5:
Gap:
Regression or design gap:
Needs production smoke: yes/no
Notes:
```

Suggested surfaces:

- coverage panel clarity
- scene/wash mood
- segmented top navigation
- agent card bank
- right metrics panel
- control chrome recipe
- production chrome smoke apply/revert
- message/window/modal/datapad chrome resemblance

## Stop Conditions

Stop testing and report a blocker if:

- Style Lab fails to load
- Warm Glass fixture cannot be reviewed or accepted
- token preview cannot revert
- Production Chrome Smoke cannot revert
- console shows a new error from the Warm Glass panels
- a test appears to mutate production or workspace data

## Next Evidence To Collect

After Style Lab testing, collect:

- visual similarity estimate
- top three design gaps
- confusing UI/report language
- which recipe specimens feel production-worthy
- whether authenticated `/` smoke should be run next
- whether V20 should open asset/layout/runtime apply gates

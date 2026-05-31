# V20 Production Preview First Cut Operating Guide

Date: 2026-05-31

## Purpose

This guide describes how to safely operate the first non-persistent production preview cut.

The first cut is intentionally narrow:

- URL gate: `/?nexusPreviewFirstCut=1`
- target scope: `main.nexus-shell.nexus-outer-shell-frame`
- variable source: Warm Glass direct production bridge variables
- persistence: none
- backend/store/API writes from preview: none
- document root/body/html mutation: blocked

This guide does not authorize a second target, persistence, production theme save, asset/layout apply, or broad shell-wide preview.

## Activation

Use an authenticated local workspace session.

Open:

```text
http://localhost:3000/?nexusPreviewFirstCut=1
```

Expected activation behavior:

- The authenticated workspace renders.
- A small temporary `Preview test` control appears.
- Normal `/` should not show the preview controls.
- The preview controls are only for the first-cut smoke path.

If normal `/` shows preview controls, stop. That is a regression.

## Pre-Check

Before clicking `Apply`, confirm the production route is in a safe observable state.

Required route-edge evidence:

| Check | Expected |
| --- | --- |
| `[data-nexus-production-page-shell-boundary="v1"]` | present |
| `[data-nexus-page-shell="workspace"]` | present |
| `[data-nexus-production-apply="blocked"]` | present |
| authenticated workspace | visible |

Required target evidence:

| Check | Expected |
| --- | --- |
| selector | `main.nexus-shell.nexus-outer-shell-frame` |
| count | exactly `1` |
| tag | `main` |
| visible | yes |
| root/body/html | no |

Required core surface evidence:

| Surface | Selector | Expected |
| --- | --- | --- |
| TopBar | `.nexus-top-bar-frame` | visible |
| Right dock | `.nexus-right-floating-dock-rail` | visible |
| Workspace | `.nexus-workspace` | visible |

Optional surfaces should not be forced open if doing so would submit, save, delete, upload, download, send a message, or execute a command.

Record baseline before apply:

- console errors and warnings
- hydration mismatch status
- route-load network baseline
- known baseline issues

## Apply Flow

Click:

```text
Apply
```

Expected result:

| Signal | Expected |
| --- | --- |
| status | `applied` |
| variable count | around `83` |
| apply duration | low, previously about `1.0-1.2ms` |
| target inline preview vars | present on `main.nexus-shell.nexus-outer-shell-frame` |
| document root preview vars | `0` |
| body preview vars | `0` |
| backend/store/API writes from preview | none |
| workspace behavior change | none |

The preview controller writes only scoped CSS variables to the declared target.

It must not:

- set variables on `document.documentElement`
- set variables on `body`
- set variables on `html`
- add/remove behavior classes
- submit forms
- execute commands
- send messages
- save/delete/upload/download
- persist style state
- call backend/store/API from the preview path

## Revert Flow

Click:

```text
Revert
```

Expected result:

| Signal | Expected |
| --- | --- |
| status | `reverted` |
| residue check | `pass` |
| remaining preview vars | `0` |
| target inline preview vars after revert | `0` unless prior inline values existed |
| previous inline values | restored exactly |
| document root preview vars | `0` |
| body preview vars | `0` |
| console errors caused by preview | `0` |

Revert behavior:

- restores previous inline values exactly
- removes preview-introduced variables that had no previous inline value
- leaves unrelated inline styles untouched
- leaves unrelated CSS variables untouched
- does not call backend/store/API
- should be safe to run after a successful apply

## Validation Checklist

Use this checklist for a first-cut smoke run.

| Item | Expected |
| --- | --- |
| Authenticated workspace visible | yes |
| Preview controls hidden on normal `/` | yes |
| Preview controls visible only with `?nexusPreviewFirstCut=1` | yes |
| Target selector count | `1` |
| Target is not root/body/html | yes |
| Core surfaces visible | TopBar, right dock, workspace |
| Apply works | status `applied` |
| Revert works | status `reverted` |
| Residue check | `pass` |
| Remaining preview vars | `0` |
| Document root/body mutation | none |
| localStorage/IndexedDB writes | none |
| Store/backend/API writes from preview | none |
| New console/hydration errors | none |
| Preview-caused network calls | none observed |
| Known baseline separated | yes |

## Known Baseline vs Regression

Known baseline signals:

- `bg-cyberpunk.webp` placeholder/load issue, if present.
- Normal route-load network activity, including `POST /api/v1/sync/operations 200`.
- Existing route data fetches for notebooks, prompts, recovery, workspace state, or sync.
- Edge runtime static-generation warning during build.
- Chrome Translate hydration mismatch only if Translate is active.

These should be recorded separately from preview-caused behavior.

Preview regression signals:

- new API call during apply or revert
- target missing
- target duplicated
- target resolves to root/body/html
- preview controls appear on normal `/`
- apply writes variables to document root/body/html
- revert residue check fails
- remaining preview vars after revert are not `0`
- console errors caused by preview
- hydration mismatch caused by preview
- workspace behavior changes after apply
- message send, command execution, save/delete/upload/download, or form submit during smoke

## Stop Conditions

Stop immediately if any of these occur:

- authenticated workspace is not visible
- target selector count is not exactly `1`
- target is root/body/html
- route-edge boundary markers are missing
- preview controls appear on normal `/`
- apply changes document root/body/html
- apply or revert causes API calls
- revert residue check fails
- remaining preview vars are not `0`
- preview causes console or hydration errors
- workspace data changes
- command/message/save/delete/upload/download occurs
- observing the target requires mutation

Do not continue by broadening the target or weakening the guard.

## Rollback

Primary rollback:

```text
git revert ed4d884
```

This removes the first-cut non-persistent preview implementation.

If the working tree also contains the later TopBar stacking fix, that fix is independent and was separately validated. It does not need to be audited as part of this operating guide.

No persisted state cleanup is expected because preview state is non-persistent.

If a browser still appears visually previewed after rollback or after a failed run:

1. click `Revert` if the control is still available
2. reload the browser tab
3. confirm target inline preview vars are `0`
4. confirm document root/body preview vars are `0`

## Next Target Policy

Do not start a second target automatically.

A second target may start only when:

- this operating guide exists
- first-cut smoke can be reproduced
- first-cut residue check remains `pass`
- user explicitly approves the next target
- target scope map is updated
- transaction/fail-closed contract is reused
- no-persistence and no-store/backend/API rules remain mandatory

Allowed next directions:

- keep the same target and harden diagnostics
- create a user-facing QA checklist around this first cut
- map a second scoped target only after guide validation

Not allowed as an automatic next step:

- broad shell-wide apply
- document root/body/html apply
- persistence
- asset/layout production apply
- backend/store/API integration
- multiple target scopes in one jump

## Current Readiness

Production preview readiness after first cut:

```text
about 90%
```

This means the first scoped non-persistent runtime contact succeeded. It does not mean permanent production theming, broad preview, asset/layout apply, or persistence is authorized.

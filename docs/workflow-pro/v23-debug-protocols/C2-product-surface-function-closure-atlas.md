# C2 Product Surface Function Closure Atlas

## Purpose

Map every visible product surface from UI affordance to handler, state change,
backend effect, storage, recovery, and test proof.

Score target: 89 / 100.

## Execution Phases

1. Inventory routes and major UI surfaces.
2. Scan buttons, links, menus, tabs, dialogs, CSS affordances, keyboard handlers,
   graph controls, and upload/download controls.
3. Classify each surface as command, status, navigation, display-only, disabled,
   planned, or unknown.
4. Trace commands to handlers and effects.
5. Trace backend/storage/recovery when expected.
6. Run browser smoke for sampled critical flows.
7. Produce a closure atlas.

## Closure Matrix

| Surface | File | Visible Condition | Handler | State Effect | Backend Effect | Recovery | Test | Verdict |
|---|---|---|---|---|---|---|---|---|

## Required Scans

```bash
rg -n "button|Button|onClick|onSubmit|onKeyDown|aria-label|title=|role=|href=|Dialog|Dropdown|Popover|Tabs|Select|input|textarea" src/components src/app
rg -n "cursor-pointer|hover:|active:|focus:|disabled:|aria-disabled|pointer-events-none|data-state|data-disabled" src/components
rg -n "TODO|FIXME|placeholder|coming soon|not implemented|noop|console\\.log" src/components src/app
```

## Tool Guidance

- Browser/Chrome: verify visible controls and console errors.
- Computer Use: use when the browser connector cannot reach the target.
- Supabase: only when a UI action claims durable backend behavior.

## API Key Policy

Real provider tests may run for surfaces that require generation. Do not include
secret values in screenshots, transcripts, or reports.

## Evidence Weighting

UI closure claims should not exceed W1 unless verified by test or browser.

## Contradiction Pass

Check:

- Any enabled button with no effect?
- Any success message before durable proof?
- Any disabled control incorrectly counted as broken?
- Any CSS affordance classified as function without handler proof?

## Output Format

```md
# Product Surface Function Closure Atlas
## Scope
## Surface Inventory
## Closure Matrix
## Exclusions
## Browser Evidence
## Backend Evidence
## False Affordances
## Repair Plan
```

## Completion Gate

Complete only when every sampled critical surface has a verdict and every
excluded item has evidence.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/C2-product-surface-function-closure-atlas.md first.
Audit product surface function closure. Build a closure matrix and report.
Use browser/Chrome/Computer Use when safe.
```


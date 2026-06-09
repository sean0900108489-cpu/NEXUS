---
name: nexus-interaction-button-mapper
description: Use when building a current inventory of NEXUS buttons, menus, commands, shortcuts, drag/drop, canvas operations, submits, saves, generates, runs, deletes, duplicates, connects, exports, and imports.
---

# Nexus Interaction Button Mapper

## Purpose

Map current UI interactions from visible control to source handler, store action, side effect, API/Supabase touchpoint, risk, and unknowns.

## Hard Boundaries

- Do not click destructive controls unless the action is proven read-only or mocked on localhost.
- Do not trigger production writes.
- Do not login to sensitive accounts.
- Do not treat static labels as proven runtime labels; mark static-only evidence clearly.

## Workflow

1. Static scan for `button`, `Button`, `onClick`, `onSubmit`, `onChange`, menu items, command handlers, keyboard handlers, drag/drop, graph/canvas events.
2. Source-map handlers to component, store, API client, route handler, and Supabase calls where evidence exists.
3. Runtime scan only on localhost and only for safe interactions.

## Interaction Record

- Label, icon, aria-label, or title.
- Surface and screen position if known.
- Source file and line.
- Handler function.
- Store read/write.
- Side effect.
- API/Supabase touchpoint.
- Success state.
- Failure state.
- Risk level and unknowns.

## Required Outputs

- `maps/03-button-and-interaction-map.md`
- `reports/ui-runtime/interaction-inventory.json`
- `context-packs/interaction-map-context.md`


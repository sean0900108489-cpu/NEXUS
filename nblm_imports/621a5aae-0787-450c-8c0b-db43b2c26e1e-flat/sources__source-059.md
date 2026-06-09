# Source 059 - skills__nexus-interaction-button-mapper__SKILL.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: cfe463e1-019c-41d3-aa27-fc9e53315cc4
- title: skills__nexus-interaction-button-mapper__SKILL.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 201
- token_count: 380
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/cfe463e1-019c-41d3-aa27-fc9e53315cc4
- source_added_timestamp: 2026-06-05T05:51:26.925699Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/.agents/skills/nexus-interaction-button-mapper/SKILL.md
- local_mirror_estimated_word_count: 206

## Local Mirror Content

```md
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
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

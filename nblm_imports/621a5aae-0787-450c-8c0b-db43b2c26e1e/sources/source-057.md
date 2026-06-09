# Source 057 - skills__nexus-component-prop-inventory__SKILL.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: f0355666-e362-41f7-b4cf-b322edd57b14
- title: skills__nexus-component-prop-inventory__SKILL.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 141
- token_count: 315
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/f0355666-e362-41f7-b4cf-b322edd57b14
- source_added_timestamp: 2026-06-05T05:51:29.894654Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/.agents/skills/nexus-component-prop-inventory/SKILL.md
- local_mirror_estimated_word_count: 171

## Local Mirror Content

```md
---
name: nexus-component-prop-inventory
description: Use when cataloging current NEXUS React components, props, events, children, imports, exports, store hooks, API calls, rendered surfaces, and large-component risks without changing component code.
---

# Nexus Component Prop Inventory

## Purpose

Create a source-cited component catalog that helps humans and agents understand current component responsibilities and risk.

## Hard Boundaries

- Do not refactor components.
- Do not generate replacement components.
- Do not execute unsafe code-generation against source.
- AST tools are reference-only unless explicitly approved.

## Workflow

1. Scan component exports, named functions, props interfaces/types, hooks, event props, imports, and JSX usage.
2. Mark large components, presentation-only components, and components with mixed domain logic.
3. Flag files that need symbol-level follow-up instead of guessing.

## Priority Files

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/store/nexus-store.ts`

## Required Outputs

- `maps/04-component-inventory.md`
- `reports/component-inventory/component-catalog.json`
- `reports/component-inventory/large-component-risk.md`
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

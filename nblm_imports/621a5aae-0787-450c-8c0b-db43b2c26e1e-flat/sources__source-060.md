# Source 060 - skills__nexus-state-store-current-map__SKILL.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 223592ac-84f1-456c-aac4-d328b9a15b8f
- title: skills__nexus-state-store-current-map__SKILL.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 116
- token_count: 245
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/223592ac-84f1-456c-aac4-d328b9a15b8f
- source_added_timestamp: 2026-06-05T05:51:27.884349Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/.agents/skills/nexus-state-store-current-map/SKILL.md
- local_mirror_estimated_word_count: 118

## Local Mirror Content

```md
---
name: nexus-state-store-current-map
description: Use when mapping current NEXUS state/store usage: state fields, selectors, actions, derived state, transient UI state, domain truth, server-derived state, workflow state, graph state, and Supabase-derived state.
---

# Nexus State Store Current Map

## Purpose

Explain how current state moves through UI, workflow, graph/canvas, backend APIs, and Supabase persistence.

## Hard Boundaries

- Do not rewrite store code.
- Do not normalize state.
- Do not invent architecture categories without evidence.

## State Record

- Name.
- Current location.
- Readers.
- Writers.
- UI transient or domain truth.
- Server-derived status.
- Supabase coupling.
- Workflow coupling.
- Graph/canvas coupling.
- Risk and unknowns.

## Required Outputs

- `maps/05-state-and-store-map.md`
- `reports/component-inventory/store-read-write-map.json`
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

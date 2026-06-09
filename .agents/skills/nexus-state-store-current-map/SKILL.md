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


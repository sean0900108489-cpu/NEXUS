---
name: nexus-ui-surface-mapper
description: Use when mapping current NEXUS UI surfaces: routes, pages, layouts, panels, sidebars, modals, toolbars, canvas, graph surfaces, workflow builder surfaces, and conditional UI. Outputs source-cited UI surface maps only.
---

# Nexus UI Surface Mapper

## Purpose

Identify every current UI surface a user or agent can encounter and connect it to source files, store dependencies, API dependencies, Supabase dependencies, risks, and unknowns.

## Hard Boundaries

- Do not change UI implementation.
- Do not create new components.
- Do not infer runtime visibility without marking it as inference.
- Only run browser checks against localhost when explicitly safe.

## Surface Record

For each surface, capture:

- Surface name.
- Route or entry point.
- Source files.
- Visible purpose.
- User-facing controls.
- Hidden dependencies.
- Store dependencies.
- Supabase/API dependencies.
- Risk.
- Unknowns.

## Required Outputs

- `maps/01-route-and-page-map.md`
- `maps/02-ui-surface-map.md`
- `assets/diagrams/ui-surface-map.svg`


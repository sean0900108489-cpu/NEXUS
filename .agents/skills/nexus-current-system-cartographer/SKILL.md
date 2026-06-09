---
name: nexus-current-system-cartographer
description: Use when mapping the current NEXUS system as it exists today: routes, pages, UI surfaces, features, buttons, data flow, frontend/backend/Supabase coupling, and extension seams. Produces current-system intelligence only, without refactoring, redesigning, moving files, or touching production Supabase.
---

# Nexus Current System Cartographer

## Purpose

Build an evidence-grounded current-system map for NEXUS. This skill explains what exists now, how it works, where behavior lives, and what remains unknown.

## Hard Boundaries

- Do not refactor.
- Do not move files.
- Do not design target architecture.
- Do not modify `src` business logic.
- Do not connect to production Supabase.
- Do not output secrets or raw environment values.
- Prefer local static evidence from source, docs, package/config, migrations, and generated reports.

## Workflow

1. Confirm the active run folder under `docs/agent-runs/nexus-current-system-intelligence-*/`.
2. Read App Router entry files, high-priority NEXUS components, store, backend API boundary, Supabase client boundaries, and local migrations.
3. Separate evidence from inference; cite file paths for every architectural claim.
4. For files over 1000 lines, create a responsibility inventory.
5. For files over 3000 lines, create a future migration-map input, but do not implement it.
6. Record unknowns instead of guessing.

## Required Outputs

- `maps/00-executive-summary.md`
- `maps/10-feature-capability-map.md`
- `maps/11-current-system-logic-map.md`
- `context-packs/current-system-context.md`


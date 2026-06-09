# Notebook Overview

## Identity

- Title: NEXUS Current System Map
- Notebook ID: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- Project: 1022174375734
- Sources: 61
- Source workflow: local `nblm sources` plus per-source `nblm source`, then local mirror fallback.

## What This Notebook Contains

This notebook preserves a NEXUS current-system intelligence run. Its main source report says the run was static-first and focused on understanding the system rather than refactoring or repairing it. It maps routes, UI surfaces, interactions, component inventory, state/store pressure, frontend/backend coupling, Supabase touchpoints, extension layers, runtime trace limits, accessibility findings, and local agent skills.

The notebook's core source report describes NEXUS as a production operator cockpit with a wide API control plane and a durable Supabase spine. It identifies responsibility pressure around UI operation, workflow graph, state sync, API envelope, registry, and persistence.

## What This Notebook Does Not Contain

This notebook does not contain the later v24 repair memory pack as Notebook sources. The local repo does contain that pack under:

- /Users/sean/Documents/FreeChat/docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729
- /Users/sean/Documents/FreeChat/docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729-flat

So any NotebookLM answer that still says START ALL multi-start, image auth boundary, artifact provenance validation, or unauthenticated sync noise are unresolved should be treated as stale until checked against branch `v24`.

## Source-Level Read Result

- NotebookLM source API returned metadata only for the 61 sources in this notebook.
- Local mirror recovered readable content for 50 text sources.
- Local mirror recovered 6 PNG binary sources and copied them into this pack.
- 5 local mirror source was found but empty.
- 0 sources had no exact readable local mirror and are preserved as metadata/data gaps.

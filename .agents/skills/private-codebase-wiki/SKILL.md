---
name: private-codebase-wiki
description: Use this when the user asks to understand, map, audit, or prepare modular refactors for this private Next.js + Supabase project. Generates a privacy-preserving codebase wiki, Supabase connection map, risk register, agent context packs, and premium HTML/Markdown/JSON reports without modifying source logic.
---

# Private Codebase Wiki

Use this skill for privacy-preserving codebase understanding, Supabase connection mapping, refactor risk mapping, and agent context pack generation for this private Next.js + Supabase project.

## Safety Boundary

1. Read only git-tracked source, config, package files, Supabase migrations/types, and docs.
2. Do not read or index `.next/`, `node_modules/`, `dist/`, `build/`, `coverage/`, `.turbo/`, `.vercel/`, `.env*`, secrets, keys, certificates, local databases, or cache output.
3. Do not upload repository contents to hosted analyzers, external LLM providers, third-party image hosts, or production Supabase.
4. Do not print, save, quote, or summarize raw secrets. Record only presence, source type, status code, request id, trace id, hash, sanitized error, artifact id, run id, group id, steps, and result.
5. Do not directly refactor business source. This skill produces maps, reports, risk registers, and context packs only.
6. Write outputs only to the active `docs/agent-runs/...` run folder unless the user explicitly authorizes another destination.

## Required Analysis Style

1. Every architectural conclusion must cite source file paths.
2. Do not copy long source blocks; summarize behavior and cite paths.
3. Files over 1,000 lines require a responsibility inventory.
4. Files over 3,000 lines require a migration map.
5. Separate evidence from inference. Mark assumptions and follow-up probes explicitly.
6. Every round must include ROI, completed items, remaining items, and next-round recommendations.
7. Do not merely list scan results. Add a Narrative Intelligence Pass that turns facts into meaning-dense understanding material.
8. Every major section must answer: what it appears to be, what role it plays in the system, why it likely grew that way, what responsibilities are mixed together, what future boundary it suggests, how a later agent should read it, what is inference, and what needs source or symbol-level verification.
9. Separate scanning, pre-architecture, and construction: scanning says what exists, pre-architecture says what boundary should emerge, and construction is only a candidate next move unless the user explicitly authorizes edits.
10. Do not increase word count for its own sake. Increase judgment density: every paragraph should make the next human or LLM better at deciding something.

## Meaning Quality Gate

Before a report section enters the final HTML, score it from 0 to 100 on:

- Human clarity.
- LLM usefulness.
- Agent actionability.
- Evidence grounding.
- Pre-architecture value.

If any score is below 75, keep it in drafts or revise it until it explains what the section lets the next human, LLM, or agent judge better. Record these scores in machine-readable output when useful.

## Highest-Priority Files

Analyze these files first when present:

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/store/nexus-store.ts`

## Supabase Focus

Map and cite:

- Supabase client initialization.
- Frontend Supabase queries and mutations.
- RPC calls.
- Storage usage.
- Auth usage.
- Realtime subscriptions.
- Environment variable usage.
- Generated database types.
- Migrations and RLS SQL.
- Which frontend features depend on which tables, functions, auth behavior, or storage buckets.

## Report Outputs

Produce privacy-safe outputs in Traditional Chinese unless the user asks otherwise:

- Markdown project wiki.
- Supabase connection manifest.
- Refactor risk register.
- Dependency and unknowns map.
- Agent context packs.
- Machine-readable JSON manifest.
- Premium local HTML report.
- Narrative intelligence pass.
- Meaning quality gate.
- Machine-readable agent usage map with read-first, do-not-read-whole, safe-to-touch-first, requires-symbol-level-read, requires-human-confirmation, and known-uncertainties lists.

If visual reporting is needed, use `web-design-engineer`. If image generation is needed and a provider key is configured, use `gpt-image-2` or an OpenAI-compatible image generation API without logging secrets.

# S-0: Pre-flight Authority Source Validation

**Phase:** Pre-flight
**Depends on:** Nothing
**Status:** Design only — no implementation authorized

## Objective
Confirm that all read-only authority sources are accessible and consistent before any design work begins.

## Code Domains Touched
None (read-only validation against live sources)

## Data Domains Touched
None (read-only metadata inspection only)

## What This Slice Designs
1. Verify GitHub `main` branch accessible (sean0900108489-cpu/NEXUS)
2. Verify Notion Command Center pages accessible (Handoff Pack + 8 sub-pages + iteration map + SOP + VPS state)
3. Verify New API VPS reachable (3 channels, model enumeration)
4. Verify Supabase project accessible (metadata only: schema, table list, migration count, RLS status)
5. Confirm model catalog drift list matches Technical Entry Report
6. Confirm P0 security gaps still present (NOVA broad policies, match_nova_chunks public, SECURITY DEFINER)
7. Confirm tool_runs = 0 (unchanged)
8. Confirm V33 main branch status (latest commit, no uncommitted drift)
9. Produce single-page "S-0 Authority Baseline" doc

## Validation Method
- GitHub API returns 200 for repo + directory listing + key files
- Notion API returns pages with expected content
- New API returns channel list matching 3 known channels
- Supabase returns schema metadata (tables, RLS status)
- All counts match Technical Entry Report (dated 2026-06-20)

## Forbidden Areas
- Do not read user content from any Supabase table
- Do not read secrets, tokens, or encrypted values
- Do not modify any source (GitHub, Notion, Supabase, VPS)
- Do not apply any migration
- Do not deploy anything

## Dependency Order
First slice. Blocked by nothing.

## Rollback / No-Op Validation
No state changed. Validation = re-run source checks and confirm same results.

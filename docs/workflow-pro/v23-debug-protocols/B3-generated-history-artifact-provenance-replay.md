# B3 Generated History And Artifact Provenance Replay Harness

## Purpose

Verify that generated history entries, workflow group evidence, artifacts,
asset downloads, and provenance links can be replayed from durable records.

Score target: 88 / 100.

## Execution Phases

1. Inventory generated history UI and hydration code.
2. Inventory artifact, message, runtime trace, workflow group, and generated
   image storage records.
3. Build provenance graph:
   user request -> workflow group -> run -> node -> output -> artifact/history.
4. Verify read paths for history and downloads.
5. Verify stale/local-only states are labeled.
6. Run targeted generated history, artifact, group-record, and browser tests.

## Provenance Matrix

| History Item | Source Request | Group | Run | Node | Output Record | Artifact | Download | Verdict |
|---|---|---|---|---|---|---|---|---|

## Required Scans

```bash
rg -n "generated history|history groups|run-history|group records|artifact|download|asset|provenance|source_task|source_run|source_node" src docs reports
npm test -- src/components/nexus/*history* src/lib/workflow-pro/*group* src/lib/backend/artifacts
```

## Tool Guidance

- Browser/Chrome: verify visible history and download controls.
- Supabase: verify counts, ids, hashes, and relationships.
- Computer Use: use for UI proof only if browser connector is blocked.

## API Key Policy

Provider tests may run when configured. History reports must not paste raw
secrets or raw private prompts.

## Evidence Weighting

W4 requires a history item to be read from durable storage and downloaded or
opened through the UI.

## Contradiction Pass

Check:

- Is any history item local-only but labeled durable?
- Does every download route have permission and storage proof?
- Can artifact provenance survive refresh/new session?
- Are generated media URLs backed by owned storage or external references?

## Output Format

```md
# Generated History And Artifact Provenance Replay Report
## Scope
## History Surface Inventory
## Provenance Matrix
## Durable Read Checks
## Download Checks
## Local-Only Labels
## Gaps
## Repair Plan
```

## Completion Gate

Complete only when every generated history class has a durable source or an
explicit local-only/non-durable label.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/B3-generated-history-artifact-provenance-replay.md first.
Audit generated history and artifact provenance replay. Use safe scans, tests,
browser checks, and backend read-only checks.
```


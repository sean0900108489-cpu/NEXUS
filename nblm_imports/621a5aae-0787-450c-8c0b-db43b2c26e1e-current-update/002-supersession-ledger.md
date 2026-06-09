# Notebook Source Supersession Ledger

## Purpose

This ledger prevents old NotebookLM sources from polluting future answers.

The previous notebook content represented a static current-system intelligence run. That run was useful for mapping NEXUS, but it predates the v24 repair loop. The old sources should not be used as current repair status.

## Superseded Notebook State

Superseded notebook title:

- `NEXUS Current System Map`

Superseded source count before cleanup:

- 61 sources

Reason for supersession:

- The notebook did not include the v24 repair memory pack.
- It therefore retained risks and unknowns from before the v24 repair loop.
- Those old risks could cause NotebookLM to answer as if already repaired items were still current defects.

## Replacement Memory

The replacement memory should consist of:

- `000-NEXUS-v24-current-truth-gate.md`
- `001-v24-repair-status.md`
- `002-supersession-ledger.md`
- `003-next-agent-brief.md`
- The v24 repair memory pack files from `docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729-flat/`

## Rule For Future Agents

Do not re-upload the entire old source-level import back into this notebook unless the files are clearly marked as historical archive sources. For normal operation, keep this notebook current-state oriented.

If historical maps are needed, read the local source-level import pack in the repo:

`/Users/sean/Documents/FreeChat/nblm_imports/621a5aae-0787-450c-8c0b-db43b2c26e1e/`

That import pack is for audit and migration, not for active NotebookLM answer grounding.

# V18 Low-Intensity Production Shell Long Run Phase Status

Date: 2026-05-31

## Current State

- Branch: `codex/v18-style-pack-contract-prep`
- Run start HEAD: `2f476dc feat: extract nexus ops top bar frame`
- Run start status: clean

## Phase Table

| Phase | Name | Status | Notes |
| --- | --- | --- | --- |
| Initial docs | Technical runbook bootstrap | Completed | Committed as `2d1405a docs: start v18 low intensity production shell long run`. |
| Phase 0 | Recovery / Preflight | Completed | Branch/status/history verified; required context read; no source edits. |
| Phase 1 | Static Shell Frame Extraction Batch | Completed | No new source extraction needed: BodyFrame already existed; LeftDock/Workspace skipped as unsafe behavior-bearing wrappers. |
| Phase 2 | Extraction Map Reconciliation | Completed | Map updated with extracted frames, skipped candidates, protected core, next assessment candidates, and No-Go zones. |
| Phase 3 | Second-Level Static Frame Assessment | Completed | Right floating dock outer frame is the only safe optional Phase 4 candidate; command palette/sidebar/collapsed rail/control micro-frames skipped. |
| Phase 4 | Optional Second Static Frame Extraction | Completed | `NexusOpsRightFloatingDockFrame` extracted and verified. |
| Phase 5 | Long-Run Integration Review Gate | Completed | Final review doc created; final diff/typecheck/build passed; browser smoke recorded with auth-gate limitation. |

## Latest Notes

- This run started after `NexusOpsOuterShellFrame`, `NexusOpsBodyFrame`, and
  `NexusOpsTopBarFrame` already existed.
- Phase 0 confirmed clean status on HEAD `2d1405a`.
- Relevant commits for isolated page shell prototype, inert production wrapper,
  page source guard, extraction map, and shell frame extractions are present.
- Phase 1 verified the current static frame state and browser smoke. The first
  `getByLabel("Workspace menu")` browser locator returned 0 despite the button
  existing; rerun used the exact `button[aria-label="Workspace menu"]` selector
  from DOM inspection and passed.
- Phase 2 reconciled the extraction map without source runtime edits.
- Phase 3 assessed second-level frame candidates. The only Phase 4 candidate is
  a right floating dock visual wrapper that preserves existing pointer-event and
  z-index class semantics exactly. Collapsed rail, command palette, settings
  sidebar, sync badge, and top menu actions remain No-Go for this run.
- Phase 4 extracted only `NexusOpsRightFloatingDockFrame`. Right dock buttons,
  active state, and handlers remain in `RightFloatingDock`.
- Phase 4 verification passed: focused frame test, existing guard tests,
  typecheck, targeted lint, build, and browser smoke against existing
  `localhost:3000/` server. Headless CDP could only verify the route-edge
  wrapper due missing auth session; existing Chrome session covered NexusOps UI
  smoke.
- Phase 5 started as docs-only integration review. No additional source
  extraction is planned in this run.
- Phase 5 final gate passed `git diff --check`, `npm run typecheck`, and
  `npm run build`. Final browser reload reached the local auth gate, so the
  Phase 4 NexusOps smoke remains the NexusOps UI coverage for the final source
  state. No login was performed.

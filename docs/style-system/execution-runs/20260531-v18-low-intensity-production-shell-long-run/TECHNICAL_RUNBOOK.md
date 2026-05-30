# V18 Low-Intensity Production Shell Long Run Technical Runbook

Date: 2026-05-31
Branch: `codex/v18-style-pack-contract-prep`
Run mode: low-intensity, phase-gated, local-only

## 1. Current System Status

Preflight verified at run start:

- Current branch: `codex/v18-style-pack-contract-prep`
- Current HEAD: `2f476dc feat: extract nexus ops top bar frame`
- `git status --short`: clean

Recent relevant commits verified in local history:

- `2f476dc feat: extract nexus ops top bar frame`
- `10b1598 feat: extract nexus ops body frame`
- `ecb94b7 feat: extract nexus ops outer shell frame`
- `467d646 docs: add production shell extraction map`
- `a66c534 test: guard production page shell wrapper`
- `f2f5ef7 feat: add inert production page shell wrapper`
- `d86e171 feat: add isolated page shell prototype`
- `afc86bd feat: add page shell feature registry boundary`
- `61a8f97 feat: add workspace layout slot boundary foundation`
- `7cb3ffb feat: add nexus workspace color bridge spike`
- `23c2cd8 feat: add nexus glass token bridge spike`
- `e10fc77 feat: add nexus panel token bridge spike`

Completed capabilities verified from commits and existing files:

- V2 Skin Pack, Render Plan, and Production Token Bridge foundation exist.
- `.nexus-panel`, `.nexus-glass`, and `.nexus-workspace` bridge spikes exist.
- Workspace Layout Slot Boundary exists.
- Page Shell Feature Registry boundary exists.
- Isolated Page Shell Prototype exists.
- Inert route-edge production page shell wrapper exists.
- Page source guard exists.
- Production shell extraction map exists.
- `NexusOpsOuterShellFrame` extraction exists.
- `NexusOpsBodyFrame` extraction exists.
- `NexusOpsTopBarFrame` extraction exists.

This runbook records verified local state. It must not rely on chat memory alone.

## 2. Execution Process

This long run uses phase-gated execution. Each phase follows the same process:

1. Preflight:
   - confirm branch
   - confirm clean `git status --short`
   - confirm relevant HEAD/history
   - read phase-specific source and docs
2. List allowed and forbidden files before edits.
3. Implement the smallest safe unit.
4. Run focused verification first.
5. Run heavier gates only when the phase requires them.
6. Run browser smoke only after non-browser gates pass.
7. Write a phase checkpoint.
8. Commit locally.
9. Confirm `git status --short` is clean before the next phase.

Low-load strategy:

- Do not run heavy commands in parallel.
- Run focused tests before broad checks.
- Run typecheck, lint, build, and browser smoke sequentially.
- Run `npm run build` only for production route/component extraction phases and
  final review gates.
- Wait for each heavy command to finish before starting another.
- If a command times out, rerun a narrower/decomposed command and record why.
- If the machine appears resource constrained, finish the current command,
  checkpoint, commit a clean state when possible, and record a pause reason.

## 3. Rules / Boundaries

Global forbidden boundary:

- no push
- no deploy
- no Supabase/database/migration changes
- no Vercel/GitHub remote mutation
- no package/config/deploy file changes
- no `exports/**` changes
- no `.env` or secret reads
- no Layout Preset, Feature Registry, Skin Pack, Render Plan writes into
  workspace store/sync/backend
- no React Flow behavior changes
- no drag/resize/focus/z-index/agent/window/modal behavior changes
- no store/sync/backend/Supabase/API changes
- no raw CSS/raw JS/DOM selector/behavior class/backend mutation acceptance
- no new registry/contract foundation
- no large `nexus-ops.tsx` refactor
- no business logic, agent logic, or workspace persistence changes

Phase stop conditions:

- stop the phase if implementation would require forbidden files
- stop the phase if a candidate requires moving hooks/state/effects/handlers
- stop the phase if a candidate changes child order or behavior ownership
- stop the phase if browser smoke shows missing UI, hydration failure, layout
  break, or broken core interaction

Skip-not-stop rules:

- Unsafe candidate: skip it, record the concrete reason, continue to the next
  safe candidate in the same phase.
- Unsafe phase: stop that phase, do not widen the fix, and move only if the next
  phase is safe without violating the boundary.
- Test timeout: rerun decomposed checks.
- Lint/typecheck issue: fix only inside allowed files.
- Browser non-core issue: record, narrow the smoke, and rerun if safe.

Recovery protocol:

- Each phase must have a checkpoint doc in this run folder.
- Each phase should end with one local commit if files changed.
- Never start a new phase on a dirty tree.
- After interruption, read in order:
  - `TECHNICAL_RUNBOOK.md`
  - `PHASE_STATUS.md`
  - `CHECKPOINTS.md`
  - latest phase checkpoint
  - `git log --oneline -n 12`
  - `git status --short`

## 4. Final Goal

The final goal of this run is not full theme application or full production
reskinning.

The final goal is:

- extract a small set of inert visual shell frame components from the outer
  production `NexusOps` shell
- keep all behavior core inside `NexusOps`
- keep the result smokeable, reversible, and easy to continue
- avoid feature placement
- avoid layout preset adoption
- avoid store/sync/backend integration

After this run, a later phase can evaluate:

- first production shell frame token adoption
- isolated feature placement prototype
- deeper shell extraction

Those later tracks are explicitly out of scope for this run.

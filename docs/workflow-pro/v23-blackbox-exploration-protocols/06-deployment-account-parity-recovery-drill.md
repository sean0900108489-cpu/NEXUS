# Protocol 06: Deployment Account Parity Recovery Drill

## Mission

Discover whether local, preview, production, and account-role behavior match
well enough for release confidence. This protocol must not assume any specific
account, deployment, or failure mode.

Target rigor: 88 / 100.

## Mandatory Protocol Controls

Before executing this protocol, read:

- `protocol-router.md`
- `events.schema.json`
- `live-evidence-gate.md`
- `checkpoint-template.md`

Every run must create `00-active-checkpoint.md` and `events.ndjson` before the
first scan. The first event must be `checkpoint.created`. Every phase must emit
`checkpoint.read` before `phase.started`, then emit evidence, inference,
contradiction, next-probe, and completion events as the work progresses. Any
claim that local, preview, production, account, or recovery behavior works must
satisfy the live evidence gate or be marked `blocked` / `not-yet-verified`.

Before completion, run:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Black-Box Start Command

```txt
Run a black-box deployment, account parity, and recovery drill for
/Users/sean/Documents/FreeChat.

Do not assume local behavior matches preview or production. Do not assume any
specific account class is broken. Discover environment rules, deployment
configuration, auth behavior, workspace membership behavior, route behavior, and
recovery messages from safe checks.

Use available tools when useful: Browser, Chrome, Computer Use, Supabase,
GitHub, and Vercel. Do not print, persist, or copy secret values.
Before the first scan, create an active checkpoint:
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md

Read the active checkpoint before every phase and branch. Live environment or
account observations must be appended immediately as sanitized evidence, not
reconstructed from memory later.
```

## Checkpoint Loop

Every phase uses this loop:

1. Read `00-active-checkpoint.md`.
2. Record the environment/account/recovery axis under inspection.
3. Run the smallest useful scan/probe.
4. Append sanitized environment/account evidence immediately.
5. Append inference separately from evidence.
6. Append parity collision or recovery gap classification.
7. Write the next command before moving to the next phase.

## Phase 1: Core Exploration

Inventory environment and deployment surfaces:
Read `00-active-checkpoint.md` first and record which environments are
available, unknown, or unsafe to probe.

```bash
find . -maxdepth 3 -name vercel.json -o -name .vercelignore -o -name next.config.* -o -name package.json -o -name '.env*'
rg -n "VERCEL_ENV|NODE_ENV|production|preview|localhost|public-config|Supabase|workspace session|membership|recovery|protection|bypass|deployment" src scripts docs .vercelignore package.json
```

Do not print `.env` values. Only report whether expected names exist.

Checkpoint: `P06-core-env-deployment`.

## Phase 2: Detail Exploration Branches

### Branch A: Local/Preview/Production Behavior Map

Questions:

- Which routes branch on environment?
- Which routes are blocked in production?
- Which routes require Vercel protection bypass?
- Which checks can be safely replayed?

Probe:

```bash
rg -n "isProduction|NODE_ENV|VERCEL_ENV|block.*Production|preview|protection|bypass|x-vercel-protection-bypass" src scripts docs
```

Checkpoint: `P06-environment-behavior-map`.

### Branch B: Account And Workspace Parity

Questions:

- What roles exist?
- How is membership created?
- What happens for owner/admin/editor/viewer/new account?
- Which UI actions require which backend authority?

Probe:

```bash
rg -n "owner|admin|editor|viewer|workspace_memberships|membership|role|permission|requireWorkspaceRole|workspace session|recovery" src supabase scripts
```

Checkpoint: `P06-account-workspace-parity`.

### Branch C: Recovery And User-Facing Diagnostics

Questions:

- Does a denied operation return useful reason codes?
- Can the UI show recovery action?
- Are route errors tied to requestId/traceId?
- Can a user tell auth failure from provider failure from storage failure?

Probe:

```bash
rg -n "reasonCode|requestId|traceId|error|Permission denied|Authentication is required|recovery|retry|resync|sync issue|status" src/components src/app src/lib
```

Checkpoint: `P06-recovery-diagnostics`.

## Phase 3: Collision Possibility Exploration

Required collisions:

- local fallback allows action that production denies
- preview protection blocks route before app auth
- service role behavior hides request-scoped RLS issue
- workspace membership exists but storage policy denies asset
- UI says retry but route has no recovery semantics
- account role label differs from backend action requirement

Checkpoint: `P06-parity-collision-map`.

## Phase 4: Suspicion Possibility Exploration

Generate at least 15 suspicion hypotheses:

| Suspicion | Environment | Account Class | Evidence Needed | Probe | Severity If True |
|---|---|---|---|---|---|

At least 5 must involve environment parity, 5 account parity, and 5 recovery
diagnostics.

Checkpoint: `P06-suspicion-hypotheses`.

## Phase 5: Safe Live Verification Plan

If live verification is safe, produce a step-by-step plan before running it:

- target URL
- account class
- route/action
- expected status
- allowed side effect
- rollback or cleanup
- evidence to capture

If not safe, produce the exact blockers and required prerequisites.

## Completion Gate

Complete only when the final report can explain:

- what differs between local, preview, and production
- what differs between account classes
- what recovery signal exists for each major failure class
- what still requires live verification

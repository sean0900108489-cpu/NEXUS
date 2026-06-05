# Protocol 02: Permission Artifact Authority Labyrinth

## Mission

Discover whether identity, workspace, resource, action, artifact, and storage
authority are consistently enforced across routes. This is a black-box audit:
the agent must not be told which route or account class is suspicious.

Target rigor: 92 / 100.

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
claim that an account, role, route, artifact, generated asset, or storage action
works must satisfy the live evidence gate or be marked `blocked` /
`not-yet-verified`.

Before completion, run:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Black-Box Start Command

```txt
Run a black-box permission and artifact authority audit for /Users/sean/Documents/FreeChat.

Do not use prior findings. Build the route matrix from source and safe probes.
Do not assume the issue is in any specific route. Do not print, persist, or copy
secret values. Real provider/API tests may run when credentials are configured,
but only report request ids, status codes, hashes, counts, and sanitized errors.

Before the first scan, create an active checkpoint:
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md

Read the active checkpoint before every phase and branch. Append route evidence,
identity evidence, contradictions, and next probes during the work, not only in
the final report.
```

## Checkpoint Loop

Every phase uses this loop:

1. Read `00-active-checkpoint.md`.
2. Record which authority axis is being explored: identity, workspace,
   resource, action, storage, or audit.
3. Run the smallest useful scan/probe.
4. Append route evidence immediately.
5. Append inference separately from evidence.
6. Append contradiction classification before assigning severity.
7. Write the next command before moving to the next phase.

## Phase 1: Core Exploration

Inventory every route and authority primitive.
Read `00-active-checkpoint.md` first and record the initial authority inventory
scope.

```bash
find src/app/api -name route.ts | sort
rg -n "Authorization|X-User-Id|X-Workspace-Id|X-Nexus-Runtime-Authorization|cookie|getUser|getSession|workspaceId|resourceId|permission|audit|RLS|service_role|anon|authenticated" src/app src/lib scripts supabase
```

Build the first matrix:

```json
{
  "route": "",
  "method": "",
  "identitySource": "unknown",
  "workspaceSource": "unknown",
  "resourceSource": "unknown",
  "action": "unknown",
  "permissionLayer": "unknown",
  "storageLayer": "unknown",
  "auditLayer": "unknown",
  "localBehavior": "unknown",
  "previewBehavior": "unknown",
  "productionBehavior": "unknown",
  "newAccountRiskHypothesis": "unknown",
  "evidence": []
}
```

Checkpoint: `P02-core-authority-inventory`.

## Phase 2: Detail Exploration Branches

### Branch A: Identity Proof Chain

Questions:

- Who proves the actor?
- Can caller-controlled headers override the actor?
- Are provider credentials separated from user identity?
- Does the route behave differently in local, preview, and production?

Probe:

```bash
rg -n "getBearerToken|getSupabaseRequestAccessToken|create.*AuthSessionVerifier|headers\\.get\\(|cookies|X-User-Id|X-Nexus-Runtime-Authorization" src/app src/lib scripts
```

Checkpoint: `P02-identity-proof-chain`.

### Branch B: Workspace Membership And Role Gate

Questions:

- Which routes require workspace role?
- What role is needed for read/write/generate/download/archive?
- Where can membership bootstrap occur?
- Which production paths disallow bootstrap?

Probe:

```bash
rg -n "workspace_memberships|WorkspaceRole|requireWorkspaceRole|workspace\\.read|workspace\\.update|workspace\\.delete|membership|bootstrap|owner|editor|viewer" src supabase scripts
```

Checkpoint: `P02-workspace-role-gate`.

### Branch C: Artifact And Storage Authority

Questions:

- Who can create generated assets?
- Who can download, archive, version, reference, or retrieve assets?
- Does artifact metadata prove ownership and workspace?
- Does storage policy match route policy?

Probe:

```bash
rg -n "artifact|generated.*image|asset|archive|versions|references|download|storage|bucket|signed|blob|base64|data:image|materialize" src/app src/lib supabase scripts
```

Checkpoint: `P02-artifact-storage-authority`.

## Phase 3: Collision Possibility Exploration

Required collision probes:

- Supabase Authorization vs provider runtime authorization
- route permission vs storage bucket permission
- workspaceId from path vs header vs body
- service role route vs request-scoped client route
- owner/admin/editor/viewer behavior divergence
- local bootstrap vs production membership rules

Write a collision table:

| Collision | Route/Layer A | Route/Layer B | Failure Mode | Evidence | Next Probe |
|---|---|---|---|---|---|

Checkpoint: `P02-collision-table`.

## Phase 4: Suspicion Possibility Exploration

Generate at least 15 suspicion hypotheses. Each must be falsifiable.

Examples of allowed style:

- "A route may accept a workspaceId but not prove membership."
- "A storage read path may rely on artifact id without workspace proof."
- "A local fallback may hide a production-only denial."

Do not phrase suspicions as confirmed findings unless supported by evidence.

Checkpoint: `P02-suspicion-hypotheses`.

## Phase 5: Scanner Contradiction Gate

If an automated scan reports a finding, the agent must classify it:

```json
{
  "findingCode": "",
  "scannerEvidence": "",
  "sourceEvidence": "",
  "classification": "product-risk | scanner-rule-risk | inconclusive",
  "reason": "",
  "minimalNextProbe": ""
}
```

No P0/P1 verdict is allowed without this contradiction gate.

## Completion Gate

Complete only when every high-risk route has:

- identity source
- workspace source
- resource source
- action
- permission layer
- storage layer
- audit layer
- failure codes
- recovery guidance
- evidence references

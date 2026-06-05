# V23 Enterprise Debug Document Candidate Scoreboard

## Purpose

This scoreboard ranks enterprise debugging document directions for the expanded
Workflow Pro / NEXUS surface.

Baseline:

- Previous Enterprise Debug Risk Command quality anchor: 75 / 100.
- Target for new documents: at least 75, with winners aiming for 88+.
- Constraint: documents must be black-box-test safe and must not depend on prior
  conversation history or external context.

Scoring rubric:

| Dimension | Points |
|---|---:|
| Discovery power | 20 |
| False-positive control | 15 |
| Replayability | 15 |
| Permission/account-specific failure detection | 15 |
| Generated-output / artifact durability detection | 15 |
| Modularity and state-owner guidance | 10 |
| Cost-to-ROI efficiency | 10 |

---

## Category A: Permission, Identity, Artifact Access, Route Authority

| Rank | Candidate | Score | Target Problem | Why It Advances Or Stops |
|---:|---|---:|---|---|
| A1 | Workflow Pro Permission And Artifact Access Matrix | 93 | Route auth, workspace role, artifact read/write, generated image access, new-account behavior | Advances. Highest ROI because it turns identity/workspace/resource/action/storage into a machine-readable matrix. |
| A2 | Request-Scoped Auth Boundary Replay Harness | 91 | Header/cookie/bearer mismatch, request-scoped Supabase clients, local-vs-production auth drift | Advances. Strong replay value and low ambiguity. |
| A3 | Artifact Storage Policy And Retrieval Contract | 89 | Inline content, blob/object storage, signed reads, generated media, hash retrieval | Advances. Best durability partner for A1. |
| A4 | Account Matrix Browser Smoke Protocol | 84 | Owner/editor/viewer/new-account UI and API differences | Useful but costlier because it needs real accounts and browser sessions. |
| A5 | Permission Audit Trail Completeness Spec | 82 | Allow/deny evidence, trace ids, audit RPCs, failure diagnostics | Strong as a follow-up, less complete alone. |
| A6 | Route Authority Diff Between Local Preview Production | 80 | Environment-specific behavior and preview protection | Useful but too narrow for first winner set. |
| A7 | Storage Bucket RLS And Signed URL Matrix | 79 | Bucket policies, asset download, media longevity | Good specialist doc, depends on A3. |
| A8 | Header Hygiene And Runtime Credential Boundary | 78 | Separation of provider credentials, Supabase auth, runtime auth | Important but too focused as a standalone top document. |
| A9 | New Account Bootstrap And Membership Protocol | 77 | Membership creation, role bootstrap, first workspace access | Useful, but covered inside A1/A2. |
| A10 | Permission UX Failure Message Contract | 73 | User-facing deny reasons and recovery guidance | Valuable UX layer, not enough backend reach. |

Winners: A1, A2, A3.

---

## Category B: Workflow Runtime, Generated Output, Heartbeat, Storage Durability

| Rank | Candidate | Score | Target Problem | Why It Advances Or Stops |
|---:|---|---:|---|---|
| B1 | Workflow Runtime Trace And Durable Output Ledger | 92 | Runtime groups, traces, generated outputs, output ids, message/artifact joins | Advances. Best bridge between runtime visibility and durable backend proof. |
| B2 | Long Task Heartbeat And Recovery Transparency Protocol | 90 | Long-running workflow progress, heartbeat, retry, stalled state, user-visible recovery | Advances. Directly addresses slow/long workflow transparency. |
| B3 | Generated History And Artifact Provenance Replay Harness | 88 | Generated history, assets, artifacts, group records, downloadable evidence | Advances. Strong replay layer for output history. |
| B4 | Server-Side Completion Invariant Protocol | 86 | Persist-before-complete, output join enforcement, task lifecycle | Strong but narrow; should be a section inside B1. |
| B5 | Runtime Group Correlation And Trace Resync Spec | 84 | Group-level run history, trace correlation, manual resync | Useful after B1, not first wave. |
| B6 | Workflow Snapshot Versus Archive Contract | 82 | Snapshot previews, compaction, recovery semantics | Important but now better as an appendix to B1/B3. |
| B7 | Media Generation Binary Durability Matrix | 81 | Image/video URL vs blob/hash authority | Good specialist doc, partly covered by A3/B3. |
| B8 | Workflow Failure State Taxonomy | 78 | failed/skipped/stalled/interrupted states and UI display | Useful but does not cover storage enough. |
| B9 | Provider Runtime Cost And Key Usage Test Policy | 76 | Real provider tests, budget limits, no-secret reporting | Needed as a policy section, not a standalone winner. |
| B10 | Event Retention And Observability Archive Spec | 74 | Retention, redaction, observability logs | Too observability-heavy for the next top three. |

Winners: B1, B2, B3.

---

## Category C: Surgical Modularization, Frontend State Ownership, UI Function Closure

| Rank | Candidate | Score | Target Problem | Why It Advances Or Stops |
|---:|---|---:|---|---|
| C1 | Surgical Modularization Boundary And State Owner Map | 91 | Oversized surfaces, render-only extraction, hook extraction, domain service boundary | Advances. Highest leverage for safe refactor without state-owner drift. |
| C2 | Product Surface Function Closure Atlas | 89 | Buttons, CSS affordances, menus, graph controls, handlers, backend effects | Advances. Best UI-to-backend closure map. |
| C3 | Workflow Pro Component Extraction Playbook | 87 | Graph Brain panel, history panel, toolbar, node cards, hooks | Advances. Most practical staged extraction guide. |
| C4 | Store Action Ownership And Mutation Risk Ledger | 84 | Store actions, sync triggers, local-only state, mutation authority | Strong but should be included in C1. |
| C5 | Graph Node Contract And Renderer Separation Spec | 82 | Node card rendering vs runtime contract ownership | Useful specialist doc, not broad enough. |
| C6 | Generated History Panel Extraction Protocol | 79 | History UI, hydration, retry, asset download | Good but dependent on B3. |
| C7 | UI Affordance False-Positive Scanner | 78 | No-op controls, disabled states, placeholder handlers | Useful scan appendix, covered by C2. |
| C8 | Workspace Shell Readonly And Account Mode Contract | 77 | readonly mode, auth gate, new-account UI differences | Important but better in A1/C2. |
| C9 | CSS State And Interaction Regression Matrix | 74 | hover/active/focus/disabled state regressions | Good polish doc, low backend reach. |
| C10 | Panel Z-Index And Focus Trap Audit | 70 | modal/panel overlap and accessibility | Too UI-specific for enterprise debugging first wave. |

Winners: C1, C2, C3.

---

## Final Winner Set For Round 3

Category A:

1. Workflow Pro Permission And Artifact Access Matrix
2. Request-Scoped Auth Boundary Replay Harness
3. Artifact Storage Policy And Retrieval Contract

Category B:

1. Workflow Runtime Trace And Durable Output Ledger
2. Long Task Heartbeat And Recovery Transparency Protocol
3. Generated History And Artifact Provenance Replay Harness

Category C:

1. Surgical Modularization Boundary And State Owner Map
2. Product Surface Function Closure Atlas
3. Workflow Pro Component Extraction Playbook

## Round 3 Design Requirements

Each winning document must include:

- 0-100 self-score target.
- Execution phases.
- Required static scans.
- Required live checks when tools are available.
- Browser/Chrome/Computer Use guidance where relevant.
- Supabase/GitHub/Vercel guidance where relevant.
- API key policy: real provider tests may run when credentials are configured,
  but secrets must not be copied into reports or persisted docs.
- Evidence weighting.
- Contradiction pass.
- Report output format.
- Completion gate.
- Copy-paste execution prompt.

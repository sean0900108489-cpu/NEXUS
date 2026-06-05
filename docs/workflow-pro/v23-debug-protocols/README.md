# V23 Debug Protocols Final Index

## Purpose

This index ranks the V23 enterprise debugging protocols and recommends the
highest-ROI execution order for black-box audits.

Baseline:

- Previous Enterprise Debug Risk Command anchor: 75 / 100.
- Current winner target: 91 to 93 / 100.
- Use this set when the project surface has grown enough that manual inspection
  alone is no longer reliable.

## Final Top 3

| Rank | Protocol | Score Target | Best At | Main Tradeoff |
|---:|---|---:|---|---|
| 1 | [A1 Permission And Artifact Access Matrix](A1-permission-artifact-access-matrix-protocol.md) | 93 | Route authority, workspace role, artifact access, account-specific failures | Broad matrix takes time to fill completely |
| 2 | [B1 Workflow Runtime Trace And Durable Output Ledger](B1-workflow-runtime-trace-durable-output-ledger.md) | 92 | Runtime trace, generated output authority, group/run/output correlation | Needs backend/test evidence for strongest verdicts |
| 3 | [C1 Surgical Modularization Boundary And State Owner Map](C1-surgical-modularization-state-owner-map.md) | 91 | Safe modularization, state ownership, extraction waves | Does not replace backend/auth audits |

## Recommended Execution Order

1. Run A1 first when account, permission, artifact, generated image, or storage
   access behavior may differ by user, workspace, or environment.
2. Run B1 second when generated outputs, workflow groups, runtime traces, or
   generated history must be proven durable.
3. Run C1 third before any large frontend/store refactor.

Optional specialist follow-ups:

- A2 for replaying request-scoped auth boundaries.
- A3 for deep artifact/blob retrieval verification.
- B2 for long-running task heartbeat and recovery UX.
- B3 for generated history and artifact provenance replay.
- C2 for full UI affordance closure.
- C3 for component extraction backlog design.

## Copy-Paste Prompts

### Rank 1 Prompt

```txt
Read /Users/sean/Documents/FreeChat/docs/workflow-pro/v23-debug-protocols/A1-permission-artifact-access-matrix-protocol.md first.

Run the permission and artifact access matrix audit for /Users/sean/Documents/FreeChat.
Use all available tools when useful, including Browser, Chrome, Computer Use,
Supabase, GitHub, and Vercel.

Execute safe scans and read-only live checks. Produce the JSON authority matrix
and markdown report required by the protocol.

Do not rely on prior chat context or external context. Do not print, persist, or
copy secret values into the report.
```

### Rank 2 Prompt

```txt
Read /Users/sean/Documents/FreeChat/docs/workflow-pro/v23-debug-protocols/B1-workflow-runtime-trace-durable-output-ledger.md first.

Audit workflow runtime trace and generated-output durability for /Users/sean/Documents/FreeChat.
Use all available tools when useful, including Browser, Chrome, Computer Use,
Supabase, GitHub, and Vercel.

Run safe scans, targeted tests, and read-only backend checks. Produce the ledger
matrix and markdown report required by the protocol.

Do not rely on prior chat context or external context. Real provider tests may
run when credentials are configured, but do not print or persist secret values.
```

### Rank 3 Prompt

```txt
Read /Users/sean/Documents/FreeChat/docs/workflow-pro/v23-debug-protocols/C1-surgical-modularization-state-owner-map.md first.

Create a surgical modularization and state-owner map for /Users/sean/Documents/FreeChat.
Use all available tools when useful, including Browser, Chrome, Computer Use,
Supabase, GitHub, and Vercel.

Do not edit code unless explicitly asked. Produce the staged extraction plan,
state owner matrix, risk scores, test gates, browser smoke gates, and rollback
signals required by the protocol.

Do not rely on prior chat context or external context. Do not print, persist, or
copy secret values into the report.
```

## Completion Standard

The upgrade target is met when:

- A1 produces a complete route/authority/storage/audit matrix.
- B1 produces a durable output ledger with clear backend evidence or explicit
  blocked verdicts.
- C1 produces a staged extraction plan that names state owners and test gates.
- No report depends on prior conversation memory.
- No report includes raw secrets.


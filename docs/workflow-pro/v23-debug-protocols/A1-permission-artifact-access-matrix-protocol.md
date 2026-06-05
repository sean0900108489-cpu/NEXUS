# A1 Permission And Artifact Access Matrix Protocol

## Purpose

Build a route-level authority matrix for Workflow Pro and NEXUS. The audit must
prove how every protected route resolves identity, workspace, membership,
resource, action, storage authority, audit evidence, and recovery guidance.

Score target: 93 / 100.

## Required Matrix

```json
{
  "route": "/api/example",
  "methods": ["GET", "POST"],
  "requiresAuth": true,
  "requiresWorkspaceId": true,
  "identitySource": "verified_session",
  "requiredRole": "editor",
  "resourceType": "artifact",
  "action": "workspace.update",
  "usesRequestScopedClient": true,
  "usesServiceRole": false,
  "auditRequired": true,
  "storageAuthority": "supabase_table_or_blob",
  "newAccountRisk": "membership_missing",
  "failureCodes": ["401", "403"],
  "traceFields": ["requestId", "traceId", "workspaceId", "userId", "resourceId"]
}
```

## Execution Phases

1. Read project instructions and package scripts.
2. Enumerate all `src/app/api/**/route.ts` routes.
3. Classify routes by auth, workspace, resource, action, and storage.
4. Trace identity source: cookie, bearer, request-scoped Supabase client, service
   role, or caller-supplied header.
5. Trace workspace permission service and role requirement.
6. Trace artifact/generated image read and write paths.
7. Run static boundary scans.
8. Run safe live read-only schema/count checks when Supabase is available.
9. Produce JSON matrix plus markdown risk report.

## Required Scans

```bash
find src/app/api -name route.ts | sort
rg -n "requireAuth|getUser|getSession|Authorization|X-User-Id|X-Workspace-Id|permission|workspace\\.read|workspace\\.update|service_role|requestScoped|audit" src/app src/lib scripts
npm run check:auth-boundary
```

## Tool Guidance

- Supabase: verify schema, policies, and read-only counts. Do not copy row
  content.
- Browser/Chrome: verify account-specific UI only when safe.
- GitHub/Vercel: verify deployed branch/check status when release readiness is
  in scope.
- Computer Use: use only for explicit UI confirmation.

## API Key Policy

Real provider tests may run when keys are already configured by the user or
environment. Do not print, persist, or copy secret values into reports.

## Evidence Weighting

- W0 search lead
- W1 line-level static proof
- W2 test proof
- W3 live schema/count proof
- W4 browser or end-to-end replay proof

P0/P1 findings require W1 plus W2, W3, or W4.

## Contradiction Pass

Check:

- Any protected route relying on caller-controlled identity?
- Any storage route lacking workspace/resource proof?
- Any new-account path requiring membership but lacking recovery guidance?
- Any route using different permission semantics for the same resource?

## Output Format

```md
# Permission And Artifact Access Matrix Report
## Scope
## Route Inventory
## Authority Matrix JSON
## Permission Findings
## Artifact And Storage Findings
## New Account Risk Table
## Evidence Matrix
## Repair Plan
## Tests To Add
## Untested Boundaries
## Final Verdict
```

## Completion Gate

Complete only when every protected route has identity, workspace, resource,
action, storage, audit, and recovery columns filled or explicitly marked
unknown.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/A1-permission-artifact-access-matrix-protocol.md first.
Run the permission and artifact access matrix audit. Use all available tools
when useful. Execute safe scans and read-only live checks. Produce JSON matrix
and markdown report. Do not rely on prior chat context or external context.
```

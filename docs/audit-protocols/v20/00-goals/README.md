# V20 Phase-One Goals

## Goal Statement

After the first repair phase, NEXUS should no longer have release-blocking
auth-boundary failures in the legacy tool routes or v1 stream runtime path.

The first phase is not a full security hardening pass. It is a high-ROI closure
pass for the audit findings that directly block release.

## Must Be True

- Public filesystem and network tool routes are not reachable in production.
- Any production-accessible tool route has a verified Supabase actor and a
  permission decision before execution.
- v1 agent stream creates no task, session, message, or runtime record before
  workspace permission is proven.
- `Authorization: Bearer <supabase-session>` is used only for actor
  verification, not as a provider/runtime key.
- Runtime provider keys use an explicit runtime header or server-only channel.
- Spoof-only `X-User-Id` and `X-Workspace-Id` probes keep returning `401` or
  `403` on protected paths.
- Production permission checks fail closed if service-role configuration needed
  for membership checks is absent.

## Non-Goals For Phase One

- Redesigning all provider verification UX.
- Completing every Supabase RLS hardening item.
- Removing every legacy route.
- Solving all workspace bootstrap design questions.
- Inspecting or exporting real browser storage, cookies, tokens, or provider
  keys.

## Closure Bar

Phase one can be considered ready for the follow-up scan when:

- Required regression tests exist.
- Required regression tests pass.
- Status-only local probes match the expected matrix.
- No `P0` remains in the phase-one scan report.
- Remaining risks are downgraded to documented `P1/P2` hardening work.

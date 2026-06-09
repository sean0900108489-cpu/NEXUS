---
name: nexus-runtime-trace-recorder
description: Use when recording safe localhost-only runtime traces for NEXUS routes, screenshots, console messages, network requests, DOM changes, visible results, source mapping, and risks.
---

# Nexus Runtime Trace Recorder

## Purpose

Capture read-only runtime observations for current NEXUS behavior when localhost can run safely.

## Hard Boundaries

- Only trace localhost.
- Do not scan production.
- Do not login to sensitive accounts.
- Do not trigger production writes.
- Prefer safe read-only interactions.
- Stop and mark skipped when runtime cannot be started safely.

## Trace Record

- Route.
- Action.
- Screenshot.
- Network requests.
- Console messages.
- DOM change.
- Visible result.
- State/API/Supabase guess.
- Source mapping.
- Risk.

## Required Outputs

- `maps/09-runtime-trace-map.md`
- `reports/browser-traces/route-traces.json`
- `reports/browser-traces/network-traces.json`
- `reports/browser-traces/console-traces.json`
- `reports/browser-traces/runtime-observations.md`
- `assets/screenshots/`


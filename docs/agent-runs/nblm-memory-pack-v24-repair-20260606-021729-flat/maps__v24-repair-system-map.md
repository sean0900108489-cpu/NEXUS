# v24 Repair System Map

## Repair Map

| Repair Area | Before v24 | v24 Change | Evidence | What It Lets Future Agents Decide |
| --- | --- | --- | --- | --- |
| Runtime auth boundary | Image route risked mixing provider runtime auth with Supabase request auth. | Provider token is resolved from runtime lane; Supabase access token remains for materialization. | `src/app/api/image-gen/route.ts:91`, `src/app/api/image-gen/route.ts:127`, `src/app/api/image-gen/route.ts:140` | Keep provider keys and user/session auth separated in any future route work. |
| START ALL multi-start | v23 scan saw visible START ALL but Lite Runner rejected multiple input starts. | Topology now allows multiple `input.text` starts and computes reachability from all starts. | `src/lib/workflow-runtime-lite/topology.ts:110`, `src/lib/workflow-runtime-lite/topology.ts:143`, `src/lib/workflow-runtime-lite/runner.test.ts:530` | Treat multi-start as locally repaired, then validate richer UI scenarios later. |
| Artifact provenance | Ad hoc invalid sourceTaskId/sourceToolRunId could fall into generic persistence failure. | Route validation rejects invalid UUIDs and normalizes blanks to null. | `src/app/api/v1/artifacts/artifact-route-validation.ts:53`, `src/lib/backend/artifacts/artifact-service.test.ts:283` | Future artifact work can rely on clearer route boundary failures. |
| Browser unauth sync | Login screen sent unauthenticated sync requests and produced dev issue noise. | No browser access token means checksum fetch returns null and queue stays queued. | `src/lib/state-sync.ts:1283`, `src/lib/sync/local-sync-queue-adapter.ts:326`, `src/lib/sync/local-sync-queue-auth-gate.test.ts:45` | Login gate can be tested without mistaking expected unauth state for app failure. |
| Style guard | Historical/generated reports and stale style expectations caused regression failures. | Current-source guard scope and visible class tokens were corrected. | `src/lib/style-engine/palette-eradication.test.ts`, `src/components/nexus/workflow-pro/workflow-pro-surface.tsx` | Separate current-source style rules from generated report history. |

## Coupling Notes

Frontend auth/session coupling:

- `nexus-ops.tsx` still owns the high-level auth session flow.
- `state-sync.ts` owns browser checksum fetch and workspace snapshot sync.
- `local-sync-queue-adapter.ts` owns local queue persistence and backend sync operation flushing.

Runtime workflow coupling:

- `topology.ts` determines whether a Lite graph is runnable.
- `runner.test.ts` now encodes a multi-start merge contract.
- UI START ALL behavior should be checked against this runtime contract, not guessed from button visibility.

Artifact coupling:

- Route validation now catches local provenance shape problems before backend persistence.
- Tests assert both rejection and normalization.

## Boundaries To Preserve

- Supabase auth/session token is not a provider API key.
- Runtime provider token should stay in runtime-specific headers.
- Local queue should not convert unauthenticated login state into failed sync noise.
- Preview parity should not imply production promote.
- Reports are memory, not command scripts.


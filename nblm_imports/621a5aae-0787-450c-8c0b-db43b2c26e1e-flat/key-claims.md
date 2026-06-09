# Key Claims

## Notebook Claims From Current-System Intelligence

- NEXUS is an operator cockpit with a broad API control plane and Supabase-backed persistence.
- The highest-pressure boundaries are UI operation, workflow graph, state sync, API envelope, registry, and persistence.
- Static scan found 55 route/page/layout/handler files, 619 interaction signals, 41 cataloged components, 260 state/store entries, 138 frontend/backend coupling files, 80 Supabase source touchpoints, and 25 migration files.
- The notebook's original round intentionally did not refactor, pre-architect, move source files, or touch production Supabase.
- Production Supabase was not queried by that current-system intelligence run.

## Later v24 Repo-Verified Corrections Not Present In This Notebook

These are from the local v24 repair pack and repo diff, not from this Notebook's sources:

- Image generation auth boundary was repaired so Supabase/session auth and provider runtime auth stay separated.
- START ALL / multi-start Lite Runtime support was implemented at the topology layer and test-covered.
- Artifact provenance fields `sourceTaskId` and `sourceToolRunId` were changed to UUID-like nullable validation/normalization.
- Unauthenticated browser sync noise was gated so login-page state does not send avoidable 401-producing sync calls.
- Style/palette guard expectations were stabilized around current source instead of generated historical report files.
- v24 final reported verification: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, browser login gate spot-check, and HTTP 200 on `http://127.0.0.1:3000`.

## Claims That Still Need Future Verification

- Authenticated UI smoke after login and queued sync flush.
- Vercel preview/production parity.
- Live Supabase data/RLS parity.
- Whether all v24 changes have been uploaded back into the target NotebookLM notebook.

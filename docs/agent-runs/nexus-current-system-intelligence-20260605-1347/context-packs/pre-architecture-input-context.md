# Pre-Architecture Input Context

Run: `nexus-current-system-intelligence-20260605-1347`

Current system truth summary: dense operator cockpit, large state store, graph/workflow runtime, API handler envelope, Supabase durable spine, registry-first extension signals.

Main capability table: see `maps/10-feature-capability-map.md`.

Main UI surfaces: see `maps/02-ui-surface-map.md`.

Main coupling risks: oversized cockpit/store/sync files; service-role/storage boundary; direct UI-to-API calls; Workflow Pro graph/runtime/artifact coupling; style lab/production style runtime coupling.

Supabase touchpoints: see `maps/07-supabase-touchpoint-map.md`.

Large file responsibilities: see `reports/component-inventory/large-component-risk.md`.

Cannot copy forward blindly: any behavior from `nexus-ops`, `nexus-store`, `state-sync`, style lab, and Workflow Pro must be extracted by responsibility, not moved wholesale.

Best material for Pre-Architecture Steel Beam: component inventory, state/store map, coupling map, Supabase map, feature capability map, unknowns.

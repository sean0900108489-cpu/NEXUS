# Frontend Backend Coupling Context

Run: `nexus-current-system-intelligence-20260605-1347`

The browser/API boundary is centered around `nexusApiClient` and direct `fetch` signals. Backend API normalization is centered around `apiHandler`. Durable data flows into repositories and Supabase clients. Read `maps/06-frontend-backend-coupling-map.md` before changing API or store behavior.

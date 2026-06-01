# Release Gates Workspace

Place final generated-output durability gate checklists and sign-off notes here.

Release gate must stay closed until:

- active unclassified `completed_missing_durable_message = 0`
- workflow output exact recovery is proven without browser state
- artifact/tool/media authority is exact or explicitly non-durable
- memory output authority is exact or explicitly non-durable
- required regression tests pass
- `npm run check` passes
- post-fix scan reports zero `P0`

Current V20 close-out files:

- `HISTORICAL_DURABILITY_REMEDIATION_DECISION.md`
- `MEMORY_OUTPUT_AUTHORITY_BOUNDARY_20260601.md`

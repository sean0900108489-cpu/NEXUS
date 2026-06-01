# Regression Tests Workspace

Track required and observed regression tests for this durability lane here.

Minimum test inventory:

- completed task cannot remain completed if output message persistence fails
- workflow colon-style `outputMessageId` persists and joins correctly
- workflow output recovery does not depend on local browser state
- workspace snapshot remains compacted/non-authoritative for exact output
- large artifacts are blob-backed or rejected as non-durable
- tool/media output cannot claim durability without materialized authority
- memory compression output has authority or explicit lifecycle-only downgrade
- live/read-only SQL gate reports zero completed missing durable messages

Observed V20 gate coverage:

- `npm run check:output-durability` validates stream output authority,
  workflow output ids, and memory lifecycle-only authority markers.

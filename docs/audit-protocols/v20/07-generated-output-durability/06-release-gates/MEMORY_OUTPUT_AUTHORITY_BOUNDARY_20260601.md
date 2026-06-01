# Memory Output Authority Boundary - 2026-06-01

This gate covers memory compression output and local agent memory blocks.

## Decision

Memory compression output is not currently exact durable generated-output
authority. It is allowed only as lifecycle/local state until a durable memory
write route or `agent_memory_records` authority table is present and verified.

## Required Boundary

- The memory compression route may create queued lifecycle task records.
- The synchronous compression response must not mark a task completed as durable
  output authority.
- Local persisted agent memory must keep the
  `needs_memory_write_route` durability marker.
- Type definitions must narrow the memory durability marker so code cannot
  silently claim durable authority.
- Tests must assert the memory local-persistence marker.

## Current Evidence

The output durability static gate checks:

- `runtimeCompletion: "not_completed_by_task"`
- `queuedOnly: true`
- `workerAvailable: false`
- memory compression route does not call `completeTask`
- `src/store/nexus-store.ts` emits `durability: "needs_memory_write_route"`
- `src/lib/nexus-types.ts` narrows the memory durability marker
- `src/store/nexus-store.test.ts` asserts the memory durability marker

Result: memory output is explicitly classified as non-authoritative lifecycle
state for this V20 lane.

## Future Upgrade Path

To promote memory output to durable authority, add and verify:

- a durable memory write API or repository path
- an authoritative `agent_memory_records` table or equivalent domain table
- content hashes and length/provenance fields
- RLS policies and recovery reads
- regression tests proving recovery without browser state

# S-11: CLI / MCP Resource Model Design

**Phase:** I (CLI / MCP / Tool Output)
**Depends on:** S-9 (NOVA workspace-scoped), S-10 (Workspace navigation simplified)
**Owner Locks:** Deferred D-11 (CLI owner/dev-only), D-12 (MCP read-only resources only)
**Status:** Design only — no implementation authorized

## Objective
Design the Resource Model that underpins CLI and MCP: define resource types, URI schemes, read-only access patterns, and the boundary between read-only resources and write tools.

## Code Domains Touched (Design Reference Only)
- `src/lib/nexus-registry.ts` — reference for plugin/tool registry pattern
- `src/lib/tool-executors.ts` — reference for tool execution pattern
- `src/lib/backend/tools/` — reference for ToolExecutionService pattern

## Data Domains Touched (Design Reference Only)
None. Resource Model is an abstraction layer over existing domains.

## What This Slice Designs

### 11.1 Resource URI Scheme

```
nexus://{domain}/{resource-type}/{resource-id}

Domains:
  nexus://workspace/{workspaceId}            — workspace metadata
  nexus://workspace/{workspaceId}/panels     — workspace panel list
  nexus://workspace/{workspaceId}/chats      — workspace chat list
  nexus://agent/{agentId}                    — agent metadata
  nexus://agent/{agentId}/tasks              — agent task list
  nexus://artifact/{artifactId}              — artifact metadata
  nexus://artifact/{artifactId}/content      — artifact content (if text)
  nexus://document/{documentId}              — NOVA document (workspace-scoped)
  nexus://chunk/{chunkId}                    — NOVA chunk (workspace-scoped)
  nexus://evidence/{evidenceId}              — NOVA evidence bundle
  nexus://knowledge-set/{workspaceId}        — workspace knowledge set
  nexus://wallet/{userId}/balance            — wallet balance (owner only)
  nexus://usage/{userId}/ledger              — usage ledger (owner only)
```

### 11.2 Resource Access Control

| Resource Domain | CLI Access | MCP Access | Auth Required |
|----------------|-----------|-----------|---------------|
| workspace:// | Read-only | Read-only | Workspace membership |
| agent:// | Read-only | — | Workspace membership |
| artifact:// | Read-only | Read-only | Workspace membership |
| document:// | Read-only | Read-only | Workspace membership |
| chunk:// | Read-only | Read-only | Workspace membership |
| evidence:// | Read-only | Read-only | Workspace membership |
| knowledge-set:// | Read-only | Read-only | Workspace membership |
| wallet:// | Read-only (owner) | — | Owner only |
| usage:// | Read-only (owner) | — | Owner only |

### 11.3 CLI v1 Scope (Design)

```
Owner/dev-only. Read-only resources only. No write tools.

Commands (design):
  nexus resource read <uri>          — read a resource
  nexus resource list <domain>       — list resources in a domain
  nexus workspace list               — list user's workspaces
  nexus workspace show <id>          — show workspace details
  nexus artifact show <id>           — show artifact metadata
  nexus wallet balance               — show wallet balance (owner only)
  nexus usage ledger <userId>        — show usage ledger (owner only)

NOT included:
  nexus chat send                    — write operation
  nexus workspace create             — write operation  
  nexus artifact upload              — write operation
  nexus agent run                    — write operation
```

### 11.4 MCP v1 Scope (Design)

```
Read-only resources only. No tools.

Resources exposed:
  document://{workspaceId}/{documentId}
  chunk://{workspaceId}/{chunkId}
  evidence://{workspaceId}/{evidenceId}
  knowledge-set://{workspaceId}
  workspace://{workspaceId}
  artifact://{workspaceId}/{artifactId}

NOT exposed:
  Write tools (create, update, delete)
  Agent execution tools
  Chat/streaming tools
  Wallet management tools
  Admin operations
```

### 11.5 Write Tool Boundary

```
When write tools are eventually needed (Phase I-later):
  - Must go through ToolExecutionService
  - Must pass permission gate (permission-service.ts)
  - Must pass confirmation boundary
  - Must record tool_runs row
  - Must record permission_audit_logs row
  - Must deduct wallet credits

These constraints exist because tool_runs = 0 today.
Write tools cannot be designed until tool_runs and 
permission_audit_logs are proven with non-zero data.
```

### 11.6 Resource Model Integration with NOVA and Wallet

```
NOVA resources (document://, chunk://, evidence://, knowledge-set://):
  - Scoped to workspace (per FINAL-LOCK-3)
  - RLS enforced at data layer (S-9)
  - CLI/MCP adds another access path — same security boundary

Wallet resources (wallet://, usage://):
  - Owner-only access
  - Read-only for CLI v1
  - No MCP exposure
  - Never exposes raw token or encryption keys
```

## Validation Method
- Resource URI scheme is complete (6 domains, 12+ resource types)
- Access control matrix defines CLI vs MCP vs auth for all domains
- CLI v1 command list has no write operations
- MCP v1 resource list has no tools
- Write tool boundary conditions are explicit (5 must-haves)

## Forbidden Areas
- Do not implement any CLI command
- Do not implement any MCP server
- Do not expose wallet:// resources to non-owner
- Do not include write tools in v1 design
- Do not create resource reader code

## Dependency Order
After S-9 and S-10. Last design slice (Phase I is the final phase).

## Rollback / No-Op Validation
Only a design document produced. No CLI built. No MCP server created. No resources exposed.

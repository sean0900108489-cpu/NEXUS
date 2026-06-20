# Ops MCP Upgrade Compliance Report

**Date:** 2026-06-21
**Server:** ops.supaseanexus.com v2.0.0
**Report:** Gap analysis against SupaseaNexus Ops Plugin Upgrade Requirements

---

## Compliance Summary

| Section | Requirement | Status |
|---------|------------|--------|
| 1 | Governance (read-only default, tool categories) | ⚠️ PARTIAL |
| 2 | Standard tool output schema | ❌ NOT IMPLEMENTED |
| 3 | Supabase upgrade (identity lock, introspection, NOVA baseline) | 🔧 PENDING O-1 |
| 4 | GitHub upgrade (repo coverage, multi-file, NOVA source map) | ⚠️ PARTIAL |
| 5 | Local file allowlist reader | ❌ NOT IMPLEMENTED |
| 6 | Notion upgrade (authority metadata, authority index) | ⚠️ PARTIAL |
| 7 | New API upgrade (snapshot, drift, embedding diagnostics) | ⚠️ PARTIAL |
| 8 | NOVA-specific tools (prototype scan, asset map, route map, DB risk) | ❌ NOT IMPLEMENTED |
| 9 | MLLM / image handling | ❌ NOT IMPLEMENTED |
| 10 | Audit and safety (audit log, secret scan, dangerous tool flags) | ⚠️ PARTIAL |
| 11 | Slice validator upgrade | ⚠️ PARTIAL |
| 12 | Startup authority verification upgrade | ⚠️ PARTIAL |
| 13 | Capability report upgrade | ⚠️ PARTIAL |
| 14 | Acceptance tests | ❌ NOT EXECUTED |
| 15 | Rollout plan (7 phases) | 📋 DEFINED |
| 16 | Non-goals | ✅ ALIGNED |
| 17 | Final requirement summary | 📋 MAPPED |

---

## Section 1: Governance Requirements

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Read-only default | ✅ All 53 tools default read-only. `execution.taskSupport: "forbidden"` on all. | None |
| No push/commit/merge/deploy/migrate/DDL/DML | ✅ No write-capable tools exist | None |
| Separate planning-write from production-write | ⚠️ Notion write tools exist (`notion_create_page`, `notion_append_blocks`, etc.) with no category label | Tools are functional but uncategorized |
| Tool categories (read_only, planning_write, production_write, dangerous_admin) | ❌ No categorization in tool metadata | Must add to every tool definition |
| Production-write tools blocked from planning agent | N/A — no production-write tools exist | Good — no exposure to block |

**Action:** Add `category` field to all tool definitions in `ops_capabilities` return.

---

## Section 2: Standard Tool Output Schema

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Standard envelope (`ok`, `tool`, `version`, `read_only`, `authority`, `timestamp`, `data`, `warnings`, `blocked_assumptions`, `errors`, `raw_redacted`) | ❌ Tools return raw JSON with no envelope. `supabase_project_snapshot` returns `{project_url, table_count, tables, auth_readable, timestamp}`. `newapi_snapshot` returns `{channels, options, user_count, timestamp}`. | No standardization across tools |
| Non-ambiguous error reporting | ❌ `supabase_list_tables` returns `{tables: [], count: 0}` when broken — indistinguishable from "no tables exist" | Must return error structure |
| Error code taxonomy (INTROSPECTION_RPC_MISSING, WRONG_SUPABASE_PROJECT, etc.) | ❌ No error code system | Must implement |
| Distinguishable error states | ❌ Cannot distinguish "empty", "inaccessible", "stale", "wrong project", "permission denied", "tool bug", "missing RPC" | Must implement |

**Action:** Wrap ALL tool outputs in standard envelope. Implement error code taxonomy.

---

## Section 3: Supabase Upgrade Requirements

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Production identity lock | ⚠️ `supabase_project_snapshot` returns `xjuglddxwnikvcwxfbzg` ✅. But `ops_capabilities` masks the URL: `https://***.supabase.co` | Unmask in capability report |
| WRONG_SUPABASE_PROJECT error | ❌ Not implemented | Must add check |
| Replace generic execute_sql | 🔧 PENDING O-1 deployment. Migration file created (`20260621000000_create_introspection_rpcs.sql`). 10 dedicated RPCs designed. NOT deployed. | Migration must be deployed |
| Required Supabase read-only tools (19 listed) | ❌ 12 tools exist but 8 are broken (depend on execute_sql). Working: `supabase_project_snapshot`, `supabase_gateway_audit`, `supabase_model_usage`. Broken: `supabase_list_tables`, `supabase_table_columns`, `supabase_list_policies`, `supabase_list_functions`, `supabase_list_indexes`, `supabase_list_migrations`, `supabase_rls_audit`, `supabase_generated_types_gap` | O-1 fixes 10. Remaining: list_schemas, policy_sql, list_grants, function_signature, function_security, vector_columns, extension_status, workspace_rows |
| NOVA baseline tool | ❌ Not implemented | Must create `supabase_nova_baseline` tool |
| Read-only SQL query guard | ⚠️ `supabase_query` tool exists but calls non-existent `execute_sql`. No guard logic. | If kept, must add SELECT-only guard. Consider removing in favor of dedicated RPCs. |
| Manual baseline import | ❌ Not implemented | Must create `supabase_manual_baseline_validator` |

**Blocked by:** O-1 deployment (migration file ready, not applied to Supabase).

---

## Section 4: GitHub Upgrade Requirements

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Repo coverage (NEXUS + NOVA) | ✅ `sean0900108489-cpu/NEXUS` (default). `sean0900108489-cpu/NOVA` accessible via `repo` param. | None |
| Required tools (9 listed) | ✅ All 9 present: `github_list_repos`, `github_repo_snapshot`, `github_get_head`, `github_list_branches`, `github_list_commits`, `github_compare`, `github_list_tree`, `github_read_file`, `github_search_code`, `github_commit_files` | None |
| Standard file read output (ok, repo, branch, commit_sha, path, size, encoding, content, content_truncated, warnings) | ❌ `github_read_file` returns raw GitHub API content format `{name, path, sha, size, content, encoding}` | Must wrap in standard envelope |
| Truncation handling | ❌ No truncation indicator | Must add |
| Multi-file read (`github_read_files`) | ❌ Not implemented | Must add |
| Repo source map (`github_repo_source_map`) | ❌ Not implemented | Must add |
| Secret guard | ❌ Not implemented | Must add |

---

## Section 5: Local File Allowlist Reader

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Allowed root: `docs/technical-entry/` | ❌ No local file tools exist | Must create |
| Disallowed: .env, .ssh, keys, etc. | ❌ N/A | Must enforce in allowlist |
| Required tools (5 listed) | ❌ None exist: `local_list_files`, `local_read_file`, `local_search`, `local_file_snapshot`, `local_compare_files` | Must create all 5 |
| Authority distinction (local vs Notion) | ❌ N/A | Must add `source: "local_file"` with hash |

---

## Section 6: Notion Upgrade Requirements

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Page authority metadata | ❌ Current `notion_read_page` returns raw block text | Must wrap in standard envelope with authority_level |
| Search quality | ⚠️ `notion_search` returns title, page_id, url. Missing: last_edited, parent, excerpt, match confidence, duplicate warning | Add fields |
| Authority index (`notion_authority_index`) | ⚠️ Tool exists but not tested against current handoff pack | Verify and enhance |
| Planning write safeguards | ⚠️ `notion_create_page`, `notion_append_blocks` exist with no category label | Add `planning_write` category |

---

## Section 7: New API Upgrade Requirements

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Snapshot structure | ⚠️ `newapi_snapshot` returns channels, options (ModelRatio, settings), user_count, timestamp. Good structure but no `ok` envelope. | Wrap in standard envelope |
| Drift tools | ✅ `nexus_newapi_diff`, `nexus_model_catalog_snapshot`, `nexus_model_catalog_drift_matrix`, `newapi_model_route_trace`, `diagnose_model_route` — all present | None |
| Distinguish enabled vs approved vs billable | ❌ Current tools show model lists but don't classify by product approval or wallet billing | Add classification |
| `newapi_embedding_model_diagnostics` | ❌ Not implemented | Must add |
| Rule: enabled ≠ product model | ⚠️ Not enforced — tools show enabled models without governance note | Add `warnings` field |

---

## Section 8: NOVA-Specific Tools

| Requirement | Current State | Gap |
|------------|--------------|-----|
| `nova_prototype_scan` | ❌ Not implemented | Must create |
| `nova_asset_map` | ❌ Not implemented | Must create |
| `nova_route_map` | ❌ Not implemented | Must create |
| `nova_db_risk_map` | ❌ Not implemented | Must create |

All 4 NOVA tools are new. They can combine existing GitHub + Supabase + Notion primitives.

---

## Section 9: MLLM / Image Handling

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Image evidence intake | ❌ No image tools | Must add |
| Image-to-facts schema | ❌ Not implemented | Must add |

This is a Phase 6 item per rollout plan. Not blocking current work.

---

## Section 10: Audit and Safety

| Requirement | Current State | Gap |
|------------|--------------|-----|
| Audit log | ⚠️ `ops_audit_log_recent` tool exists | Verify format |
| Secret scanning | ⚠️ `ops_secret_scan_text`, `ops_redact_secrets` tools exist | Integrate into file read pipeline |
| Dangerous capability warnings | ❌ `ops_capabilities` returns `tool_count` but no `dangerous_tools` flag | Add to capability report |

---

## Section 11-14: Validators, Startup, Capabilities, Tests

| Item | Status |
|------|--------|
| Slice validator upgrade | ⚠️ `slice_report_validator` exists. Must add 14 governance checks listed in §11 |
| Startup authority verification | ⚠️ `startup_authority_verification` exists. Must add unified report structure (§12) |
| Capability report upgrade | ⚠️ Must add categories, accessible_sources, warnings structure (§13) |
| Acceptance tests | ❌ Not executed |

---

## Implementation Priority Matrix

### P0 — Blocker for N-2 (must deploy first)

| # | Item | Effort |
|---|------|--------|
| 1 | **Deploy O-1 migration** (10 introspection RPCs to Supabase) | Deploy existing migration file |
| 2 | **Standard output envelope** on all Supabase tools | Server code change |
| 3 | **Supabase production identity lock** with WRONG_PROJECT error | Server code change |
| 4 | **Replace execute_sql** in Ops MCP code — use new introspection RPCs | Server code change |

### P1 — Unblocks N-2 verification

| # | Item | Effort |
|---|------|--------|
| 5 | `supabase_nova_baseline` tool | New tool |
| 6 | Standard envelope on all GitHub, Notion, New API tools | Server code change |
| 7 | Error code taxonomy | Server code change |

### P2 — Unblocks N-3/N-4/N-5 design

| # | Item | Effort |
|---|------|--------|
| 8 | NOVA-specific tools (4 tools) | New tools |
| 9 | Local file allowlist (5 tools) | New tools |
| 10 | Multi-file GitHub read | New tool |

### P3 — Governance polish

| # | Item | Effort |
|---|------|--------|
| 11 | Tool categories in capability report | Metadata update |
| 12 | Secret guard on file reads | Pipeline integration |
| 13 | Notion authority metadata | Response wrapping |
| 14 | New API embedding diagnostics | New tool |
| 15 | Slice validator governance checks | Validator update |
| 16 | Startup authority unified report | Tool update |

---

## Blocked By O-1

The following are blocked until the O-1 migration is deployed to Supabase:

- Schema introspection (all `supabase_list_*` tools broken)
- `supabase_nova_baseline` (depends on schema introspection)
- N-2 Step 0 baseline capture
- All Supabase acceptance tests (14.1)

**O-1 status:** Migration file created (`supabase/migrations/20260621000000_create_introspection_rpcs.sql`). NOT deployed to Supabase `xjuglddxwnikvcwxfbzg`.

---

## No Implementation Performed

Gap analysis only. No code written. No migrations applied. No Supabase changes. Ops MCP server unchanged (v2.0.0).

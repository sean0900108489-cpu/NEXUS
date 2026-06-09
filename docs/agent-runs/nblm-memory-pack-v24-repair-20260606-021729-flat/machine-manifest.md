# Machine Manifest

```json
{
  "pack_id": "nblm-memory-pack-v24-repair-20260606-021729",
  "project": "NEXUS / FreeChat",
  "repo_path": "/Users/sean/Documents/FreeChat",
  "branch": "v24",
  "generated_at_aest": "2026-06-06T02:17:29+10:00",
  "mode": "nblm-memory-pack",
  "allowed_formats": ["md", "png"],
  "source_run": {
    "scan_checkpoint": "docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z",
    "formal_repair_branch": "v24"
  },
  "verification": {
    "npm_test": "125 files / 829 tests passed",
    "typecheck": "passed",
    "lint": "0 errors / 14 warnings",
    "build": "passed",
    "browser_spot_check": "login gate visible, email/password inputs present, issueBadgeText null",
    "curl_localhost_3000": "HTTP 200 OK"
  },
  "runtime_state": {
    "vps_dev_server": "127.0.0.1:3001",
    "local_tunnel": "127.0.0.1:3000 -> VPS 127.0.0.1:3001",
    "vps_log": "/tmp/nexus-v24-dev.log"
  },
  "changed_tracked_files": [
    "scripts/auth-boundary-scan.mjs",
    "src/app/api/image-gen/route.ts",
    "src/app/api/v1/artifacts/artifact-route-validation.ts",
    "src/components/nexus/nexus-graph.tsx",
    "src/components/nexus/nexus-production-style-layer-contract.test.ts",
    "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
    "src/lib/backend/artifacts/artifact-service.test.ts",
    "src/lib/state-sync.ts",
    "src/lib/style-engine/palette-eradication.test.ts",
    "src/lib/sync/local-sync-queue-adapter.ts",
    "src/lib/workflow-pro/foundation-benchmark-fixtures.ts",
    "src/lib/workflow-runtime-lite/runner.test.ts",
    "src/lib/workflow-runtime-lite/topology.ts"
  ],
  "new_report_relevant_files": [
    "src/lib/sync/local-sync-queue-auth-gate.test.ts"
  ],
  "deferred": [
    "Vercel preview/production parity",
    "Supabase schema/data migration",
    "GitHub PR/commit",
    "NotebookLM upload",
    "authenticated real-credential UI smoke"
  ],
  "safety": {
    "secrets_exported": false,
    "production_touched": false,
    "supabase_schema_touched": false,
    "notebooklm_uploaded": false
  }
}
```


# Source 032 - reports__browser-traces__round-03-localhost-http-trace.json.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 2b1a64b5-3218-4004-8f28-338a35910526
- title: reports__browser-traces__round-03-localhost-http-trace.json.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 13
- token_count: 58
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/2b1a64b5-3218-4004-8f28-338a35910526
- source_added_timestamp: 2026-06-05T05:51:23.860874Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/browser-traces/round-03-localhost-http-trace.json
- local_mirror_estimated_word_count: 498

## Local Mirror Content

```json
{
  "round_id": "round-03-localhost-runtime-trace",
  "generated_at": "2026-06-05T04:16:55.272Z",
  "sandbox": {
    "path": "/tmp/freechat-nexus-runtime-20260605-141343",
    "envFilesInSandbox": 0,
    "nodeModulesMode": "symlink to original node_modules; Turbopack rejected it, webpack accepted it"
  },
  "runtime": {
    "server": "Next.js 16.2.6 dev --webpack",
    "host": "127.0.0.1",
    "port": 3137,
    "productionSupabaseTouched": false,
    "srcBusinessLogicModified": false,
    "envMode": "dummy local env, .env files excluded from sandbox"
  },
  "httpTrace": [
    {
      "path": "/",
      "status": "200",
      "bytes": 14840,
      "contentType": "",
      "bodyHead": "<!DOCTYPE html><html lang=\"en\" class=\"__variable_246ccd __variable_4c40f6 h-full antialiased\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><link rel=\"stylesheet\" href=\"/_next/static/css/app/layout.css?v=1780632918919\" data-precedence=\"next_static/"
    },
    {
      "path": "/style-lab",
      "status": "200",
      "bytes": 216015,
      "contentType": "",
      "bodyHead": "<!DOCTYPE html><html lang=\"en\" class=\"__variable_246ccd __variable_4c40f6 h-full antialiased\"><head><meta charSet=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/><link rel=\"stylesheet\" href=\"/_next/static/css/app/layout.css?v=1780632923883\" data-precedence=\"next_static/"
    },
    {
      "path": "/api/v1/health",
      "status": "200",
      "bytes": 265,
      "contentType": "application/json",
      "bodyHead": "{\"ok\":true,\"data\":{\"database\":true,\"deployment\":true,\"env\":true,\"mode\":\"local\",\"registry\":true,\"status\":\"warning\"},\"error\":null,\"meta\":{\"requestId\":\"req_efc4f8d2-b4f7-4040-91a6-7a294aab6c21\",\"schemaVersion\":1,\"traceId\":\"trace_7d9e9a85-c332-4b39-b53b-5f57ae5f4bb0\"}}"
    },
    {
      "path": "/api/system-status",
      "status": "200",
      "bytes": 63,
      "contentType": "application/json",
      "bodyHead": "{\"streamMode\":\"mock\",\"openAICompatible\":false,\"keySource\":\"ui\"}"
    },
    {
      "path": "/api/v1/public-config",
      "status": "200",
      "bytes": 279,
      "contentType": "application/json",
      "bodyHead": "{\"ok\":true,\"data\":{\"supabase\":{\"anonKey\":\"<dummy-anon-key>\",\"configured\":true,\"url\":\"http://127.0.0.1:54321\"}},\"error\":null,\"meta\":{\"requestId\":\"req_ece764c1-7346-45bc-b315-7bcd41affe1e\",\"schemaVersion\":1,\"traceId\":\"trace_f59b5094-399f-4ada-a4f4-bfa6dbc35a60\"}}"
    },
    {
      "path": "/api/v1/providers/status",
      "status": "200",
      "bytes": 174,
      "contentType": "application/json",
      "bodyHead": "{\"ok\":true,\"server\":{\"openai\":{\"apiKeyConfigured\":true,\"baseUrlConfigured\":true,\"defaultBaseUrl\":\"https://api.openai.com/v1\",\"imageModel\":null,\"imageModelConfigured\":false}}}"
    },
    {
      "path": "/api/v1/observability/events?workspaceId=local-runtime-trace",
      "status": "401",
      "bytes": 234,
      "contentType": "application/json",
      "bodyHead": "{\"ok\":false,\"data\":null,\"error\":{\"code\":\"AUTH_REQUIRED\",\"message\":\"Authentication is required.\",\"retryable\":false},\"meta\":{\"requestId\":\"req_049e0997-51d6-4515-b7c2-fe6347900217\",\"traceId\":\"trace_01ea56e0-d1d8-4b0c-a374-873c4b28e781\"}}"
    }
  ],
  "serverLogObservations": [
    "Turbopack attempt failed in sandbox because node_modules symlink pointed outside filesystem root; webpack fallback was used successfully.",
    "GET / compiled and returned 200 in about 15.9s on first request.",
    "GET /style-lab compiled and returned 200 in about 3.9s on first request.",
    "GET /api/v1/health returned 200 with warning status in local mode.",
    "GET /api/v1/observability/events without auth returned 401 AUTH_REQUIRED as expected.",
    "Observability event insertion attempted and was dropped with fetch failed because dummy localhost Supabase was not running; production Supabase was not contacted."
  ],
  "remainingRuntimeGaps": [
    "No browser screenshot captured in this round.",
    "No Chrome DevTools console/network protocol trace captured.",
    "No UI clicks or mutating actions executed.",
    "No accessibility snapshot executed."
  ],
  "qualityDistance": {
    "currentEstimate": "0.92",
    "estimatedRoundsToQualityCeiling": 1,
    "rationale": "Static maps + symbol map + isolated localhost HTTP trace are complete. Remaining quality ceiling is mainly browser visual/accessibility trace and optional read-only Supabase daily log audit if desired."
  }
}
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.

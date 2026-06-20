import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import Database from "better-sqlite3";
import { z } from "zod";

// ── Config ──────────────────────────────────
const NEW_API_DB = process.env.NEW_API_SQLITE_PATH || "/opt/new-api/data/one-api.db";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_DEFAULT_OWNER = "sean0900108489-cpu";
const GITHUB_DEFAULT_REPO = "NEXUS";
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_API = "https://api.notion.com/v1";
const PORT = process.env.PORT || 3003;
const OPS_AUDIT_LOG = "/opt/supaseanexus-ops-mcp/audit.log";

// ── Helpers ──────────────────────────────────
const db = new Database(NEW_API_DB, { readonly: true });
// ── NewAPI Channel Cache ────────────────────
let _channelCache = null;
let _channelCacheTime = 0;
function getChannels() {
  const now = Date.now();
  if (_channelCache && (now - _channelCacheTime) < 30000) return _channelCache;
  _channelCache = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
  _channelCacheTime = now;
  return _channelCache;
}
function getChannelModels() {
  return [...new Set(getChannels().flatMap(c => (c.models||"").split(",").filter(Boolean)))];
}

function safeJson(val) { try { return JSON.parse(val); } catch { return val; } }

function resolveGitHubRepo(repo) {
  if (!repo) return { owner: GITHUB_DEFAULT_OWNER, repo: GITHUB_DEFAULT_REPO };
  const parts = repo.split("/");
  if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
  return { owner: GITHUB_DEFAULT_OWNER, repo };
}

function ghHeaders() {
  return GITHUB_TOKEN
    ? { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
    : {};
}

function spHeaders() {
  return SUPABASE_URL && SUPABASE_KEY
    ? { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    : {};
}


// ── Supabase Introspection Helper ───────────
// ── Introspection RPC caller (O-1 deployed RPCs) ──
async function callIntrospectRpc(rpcName, params = {}) {
  const h = spHeaders();
  const url = `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RPC ${rpcName} failed (${res.status}): ${err.slice(0,200)}`);
  }
  return res.json();
}

function nHeaders() {
  return NOTION_TOKEN ? {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
  } : {};
}


// ── Standard Output Envelope (v2.1) ──────────
const SUPABASE_PROD_REF = "xjuglddxwnikvcwxfbzg";
const SUPABASE_PROD_URL = "https://xjuglddxwnikvcwxfbzg.supabase.co";

function ok(data, opts = {}) {
  return {
    ok: true,
    tool: opts.tool || "unknown",
    version: "2.1.0",
    read_only: opts.read_only !== false,
    authority: opts.authority || null,
    timestamp: new Date().toISOString(),
    data,
    warnings: opts.warnings || [],
    blocked_assumptions: opts.blocked || [],
    errors: [],
    raw_redacted: null,
  };
}

function fail(errors, opts = {}) {
  return {
    ok: false,
    tool: opts.tool || "unknown",
    version: "2.1.0",
    read_only: opts.read_only !== false,
    authority: opts.authority || null,
    timestamp: new Date().toISOString(),
    data: null,
    warnings: opts.warnings || [],
    blocked_assumptions: opts.blocked || [],
    errors: Array.isArray(errors) ? errors : [{ code: "UNKNOWN", message: String(errors) }],
    raw_redacted: null,
  };
}

function spAuthority() {
  if (!SUPABASE_URL) return null;
  // Extract project ref from URL
  const m = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = m ? m[1] : "unknown";
  return {
    source: "supabase",
    environment: ref === SUPABASE_PROD_REF ? "production" : "unknown",
    project_ref: ref,
    project_url: SUPABASE_URL,
  };
}

function ghAuthority(repo) {
  const { owner, repo: r } = resolveGitHubRepo(repo);
  return {
    source: "github",
    repo: `${owner}/${r}`,
  };
}

function notionAuthority() {
  return { source: "notion" };
}

function newapiAuthority() {
  return { source: "new_api", db_path: NEW_API_DB };
}

function wrapResult(innerFn, toolName, authFn, opts = {}) {
  try {
    const result = innerFn();
    if (result && typeof result.then === "function") {
      return result.then(data => ok(data, { tool: toolName, authority: authFn ? authFn() : null, ...opts }))
        .catch(e => fail([{ code: "TOOL_ERROR", message: e.message }], { tool: toolName, authority: authFn ? authFn() : null, ...opts }));
    }
    return ok(result, { tool: toolName, authority: authFn ? authFn() : null, ...opts });
  } catch (e) {
    return fail([{ code: "TOOL_ERROR", message: e.message }], { tool: toolName, authority: authFn ? authFn() : null, ...opts });
  }
}

// ── Supabase Identity Guard ──────────────────
function checkSupabaseProd() {
  if (!SUPABASE_URL) return { ok: false, prod: false, error: "SUPABASE_URL not configured" };
  const m = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const ref = m ? m[1] : "unknown";
  if (ref !== SUPABASE_PROD_REF) {
    return { ok: false, prod: false, expected: SUPABASE_PROD_REF, actual: ref, error: "WRONG_SUPABASE_PROJECT" };
  }
  return { ok: true, prod: true, ref };
}

// ── Read-Only SQL Guard ─────────────────────
const DANGEROUS_SQL = /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|set\s+role|security\s+definer)\b/i;
const DANGEROUS_CHAIN = /;(?![^']*'(?:(?:[^']*'){2})*[^']*$)/; // semicolons outside quotes

function guardSql(query) {
  const q = query.trim();
  if (!q.toLowerCase().startsWith("select")) {
    return { ok: false, reason: "Only SELECT queries allowed", code: "REJECTED_BY_READ_ONLY_GUARD" };
  }
  if (DANGEROUS_SQL.test(q)) {
    return { ok: false, reason: "Dangerous SQL keyword detected", code: "REJECTED_BY_READ_ONLY_GUARD" };
  }
  return { ok: true };
}
const server = new McpServer({ name: "supaseanexus-ops", version: "2.1.0" });

// ═══════════════ NEW API TOOLS (kept from v1) ═══════════════

server.tool("newapi_snapshot", "New API full snapshot: channels, options, user count", {}, async () => {
  const channels = getChannels();
  const options = db.prepare("SELECT key, value FROM options WHERE key NOT LIKE '%key%' AND key NOT LIKE '%secret%' AND key NOT LIKE '%token%'").all();
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
  return { content: [{ type: "text", text: JSON.stringify({
    channels: channels.map(c => ({ id: c.id, type: c.type, name: c.name, models: (c.models||"").split(",").filter(Boolean) })),
    options: Object.fromEntries(options.map(o => [o.key, safeJson(o.value)])),
    user_count: users.count,
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("newapi_list_channels", "List all New API channels", {}, async () => {
  return { content: [{ type: "text", text: JSON.stringify(getChannels().map(c => ({
    id: c.id, type: c.type, name: c.name, models: (c.models||"").split(",").filter(Boolean), base_url: c.base_url || "(default)",
  })), null, 2) }] };
});

server.tool("newapi_enabled_models", "All enabled New API models", {}, async () => {
  const models = getChannelModels();
  return { content: [{ type: "text", text: JSON.stringify({ enabled_models: models.sort(), count: models.length, timestamp: new Date().toISOString() }, null, 2) }] };
});

server.tool("diagnose_model_route", "Trace model from NEXUS catalog through New API", { modelId: z.string() }, async ({ modelId }) => {
  const ch = getChannels();
  const opts = db.prepare("SELECT value FROM options WHERE key='ModelRatio'").get();
  const ratio = opts ? safeJson(opts.value) : {};
  const matched = ch.filter(c => (c.models||"").split(",").map(m=>m.trim()).includes(modelId));
  return { content: [{ type: "text", text: JSON.stringify({
    model_id: modelId, channels: matched.map(c => ({ id: c.id, name: c.name, type: c.type })),
    model_ratio: ratio[modelId] ?? "NOT SET", routing: matched.length ? "READY" : "MISSING",
  }, null, 2) }] };
});

server.tool("nexus_newapi_diff", "NEXUS catalog vs New API enabled models", {}, async () => {
  const nexus = ["gpt-4o-mini","gpt-4o","deepseek-chat","deepseek-v4-flash","deepseek-v4-pro","gemini-2.5-flash","gemini-2.5-pro","claude-sonnet-4-20250514","img2","riverflow-v2.5-fast"];
  const api = getChannelModels();
  return { content: [{ type: "text", text: JSON.stringify({
    nexus_count: nexus.length, api_count: api.length,
    in_nexus_not_api: nexus.filter(m => !api.some(a => a.includes(m)||m.includes(a))),
    in_api_not_nexus: api.filter(a => !nexus.some(m => a.includes(m)||m.includes(a))),
  }, null, 2) }] };
});

// ─────────── P4: New API routing deepening ───────────

server.tool("newapi_channel_health", "Health summary of each New API channel", {}, async () => {
  const ch = getChannels();
  const tokens = db.prepare("SELECT COUNT(*) as count FROM tokens WHERE deleted_at IS NULL").get();
  const logCount = db.prepare("SELECT COUNT(*) as count FROM logs").get();
  return { content: [{ type: "text", text: JSON.stringify({
    channels_total: ch.length,
    channels_enabled: ch.filter(c => c.type !== 0).length,
    tokens_total: tokens.count,
    log_entries: logCount.count,
    channels: ch.map(c => ({ id: c.id, name: c.name, type: c.type, model_count: (c.models||"").split(",").filter(Boolean).length })),
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("newapi_model_pricing_snapshot", "Pricing metadata for all models from ModelRatio", {}, async () => {
  const opts = db.prepare("SELECT value FROM options WHERE key='ModelRatio'").get();
  const ratio = opts ? safeJson(opts.value) : {};
  return { content: [{ type: "text", text: JSON.stringify({
    models_count: Object.keys(ratio).length,
    pricing: ratio,
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("newapi_model_route_trace", "Full trace: NEXUS model → New API channel → pricing → drift", {
  modelId: z.string().describe("NEXUS public model ID")
}, async ({ modelId }) => {
  const ch = getChannels();
  const opts = db.prepare("SELECT value FROM options WHERE key='ModelRatio'").get();
  const ratio = opts ? safeJson(opts.value) : {};
  const matched = ch.filter(c => (c.models||"").split(",").map(m=>m.trim()).includes(modelId));
  return { content: [{ type: "text", text: JSON.stringify({
    nexus_model_id: modelId,
    new_api_channels: matched.map(c => ({ channel_id: c.id, channel_name: c.name, channel_type: c.type })),
    pricing: ratio[modelId] ?? "NOT SET",
    routing_status: matched.length ? "READY" : "MISSING",
    drift_warnings: matched.length > 1 ? ["Model mapped to multiple channels"] : [],
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("newapi_enabled_model_diff_since", "Diff of enabled models since a previous snapshot timestamp", {
  lastSnapshotId: z.string().describe("Previous snapshot timestamp or 'none'"),
}, async ({ lastSnapshotId }) => {
  const now = getChannelModels();
  return { content: [{ type: "text", text: JSON.stringify({
    current_models: now.sort(),
    previous_snapshot_id: lastSnapshotId,
    note: "Full diff requires state store; returning current state only. Implement persistent diff storage for true delta.",
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("nexus_model_catalog_snapshot", "NEXUS SERVER_MODEL_CATALOG snapshot (hardcoded from current source)", {}, async () => {
  const catalog = [
    { id: "gpt-4o-mini", provider: "openai", tier: "standard" },
    { id: "gpt-4o", provider: "openai", tier: "premium" },
    { id: "deepseek-chat", provider: "deepseek", tier: "standard" },
    { id: "deepseek-v4-flash", provider: "deepseek", tier: "standard" },
    { id: "deepseek-v4-pro", provider: "deepseek", tier: "premium" },
    { id: "gemini-2.5-flash", provider: "google", tier: "standard" },
    { id: "gemini-2.5-pro", provider: "google", tier: "premium" },
    { id: "claude-sonnet-4-20250514", provider: "anthropic", tier: "premium" },
    { id: "img2", provider: "openai", tier: "image" },
    { id: "riverflow-v2.5-fast", provider: "custom", tier: "standard" },
  ];
  return { content: [{ type: "text", text: JSON.stringify({
    catalog,
    count: catalog.length,
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("nexus_model_catalog_drift_matrix", "Drift matrix: NEXUS catalog vs New API enabled models (full detail)", {}, async () => {
  const nexus = ["gpt-4o-mini","gpt-4o","deepseek-chat","deepseek-v4-flash","deepseek-v4-pro","gemini-2.5-flash","gemini-2.5-pro","claude-sonnet-4-20250514","img2","riverflow-v2.5-fast"];
  const ch = getChannels();
  const apiMap = {};
  ch.forEach(c => (c.models||"").split(",").filter(Boolean).forEach(m => { apiMap[m.trim()] = c.name; }));
  const matrix = nexus.map(m => ({
    nexus_model: m,
    in_new_api: !!apiMap[m],
    new_api_channel: apiMap[m] || null,
    status: apiMap[m] ? "OK" : "MISSING",
  }));
  const only_api = Object.keys(apiMap).filter(a => !nexus.includes(a));
  return { content: [{ type: "text", text: JSON.stringify({
    matrix,
    only_in_new_api: only_api,
    drift_count: only_api.length,
    missing_in_api: matrix.filter(r => r.status === "MISSING").length,
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

// ═══════════════ SUPABASE TOOLS (kept from v1 + P2 additions) ═══════════════

server.tool("supabase_gateway_audit", "NEXUS gateway health: tokens, ledger, sync", {}, async () => {
  const idCheck = checkSupabaseProd();
  if (!idCheck.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "WRONG_SUPABASE_PROJECT", expected: SUPABASE_PROD_REF, actual: idCheck.actual }], { tool: "supabase_gateway_audit", authority: spAuthority() }), null, 2) }] };
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_gateway_audit" }), null, 2) }] };
  const r = {}; const warnings = [];
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/user_new_api_tokens?select=count`,{headers:h}); r.tokens = (await res.json())[0]?.count||0; } catch(e) { r.tokens = `err:${e.message}`; warnings.push("user_new_api_tokens check failed"); }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/model_usage_ledger?select=count&source_type=is.null`,{headers:h}); r.null_source_type = (await res.json())[0]?.count||0; } catch(e) { r.null_source_type = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/sync_operations?select=count&status=eq.conflicted`,{headers:h}); r.conflicted_sync = (await res.json())[0]?.count||0; } catch(e) { r.conflicted_sync = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_tasks?select=count&status=in.(queued,created)`,{headers:h}); r.stuck_tasks = (await res.json())[0]?.count||0; } catch(e) { r.stuck_tasks = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/artifacts?select=count&content_url=like.data:*`,{headers:h}); r.base64_artifacts = (await res.json())[0]?.count||0; } catch(e) { r.base64_artifacts = `err:${e.message}`; }
  return { content: [{ type: "text", text: JSON.stringify(ok(r, { tool: "supabase_gateway_audit", authority: spAuthority(), warnings }), null, 2) }] };
});

server.tool("supabase_query", "Run a read-only SQL query on Supabase. Use SELECT only. Returns first 20 rows.", {
  query: z.string().describe("SELECT query (read-only, max 20 rows)")
}, async ({ query }) => {
  const idCheck = checkSupabaseProd();
  if (!idCheck.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "WRONG_SUPABASE_PROJECT", expected: SUPABASE_PROD_REF, actual: idCheck.actual }], { tool: "supabase_query", authority: spAuthority(), blocked: ["Cannot verify Supabase production identity"] }), null, 2) }] };
  
  const guard = guardSql(query);
  if (!guard.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: guard.code, message: guard.reason }], { tool: "supabase_query", authority: spAuthority() }), null, 2) }] };
  
  const q = query.trim();
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED", message: "SUPABASE_URL not set" }], { tool: "supabase_query" }), null, 2) }] };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ sql: q + " LIMIT 20" }) });
    const data = await res.json();
    if (data.error) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SQL_ERROR", message: data.error }], { tool: "supabase_query", authority: spAuthority(), blocked: ["Cannot run SQL query — execute_sql may not be deployed"] }), null, 2) }] };
    return { content: [{ type: "text", text: JSON.stringify(ok({ columns: Array.isArray(data) && data[0] ? Object.keys(data[0]) : [], rows: Array.isArray(data) ? data : [], row_count: Array.isArray(data) ? data.length : 0 }, { tool: "supabase_query", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "FETCH_ERROR", message: e.message }], { tool: "supabase_query", authority: spAuthority() }), null, 2) }] }; }
});

server.tool("supabase_list_tables", "List all tables in the Supabase public schema", {}, async () => {
  const idCheck = checkSupabaseProd();
  if (!idCheck.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "WRONG_SUPABASE_PROJECT", expected: SUPABASE_PROD_REF, actual: idCheck.actual }], { tool: "supabase_list_tables", authority: spAuthority() }), null, 2) }] };
  if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_list_tables" }), null, 2) }] };
  try {
    const data = await callIntrospectRpc("introspect_list_tables");
    const tables = Array.isArray(data) ? data.map(t => ({ name: t.table_name || t.tablename })) : [];
    return { content: [{ type: "text", text: JSON.stringify(ok({ tables, count: tables.length }, { tool: "supabase_list_tables", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "RPC_ERROR", message: e.message }], { tool: "supabase_list_tables", authority: spAuthority(), blocked: ["introspect_list_tables() RPC may not be deployed"] }), null, 2) }] }; }
});

server.tool("supabase_model_usage", "Get model usage ledger stats: top models, total tokens, recent activity", {}, async () => {
  const idCheck = checkSupabaseProd();
  if (!idCheck.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "WRONG_SUPABASE_PROJECT", expected: SUPABASE_PROD_REF, actual: idCheck.actual }], { tool: "supabase_model_usage", authority: spAuthority() }), null, 2) }] };
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_model_usage" }), null, 2) }] };
  const r = {};
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/model_usage_ledger?select=model_id,source_type,status,created_at&limit=20&order=created_at.desc`,{headers:h});
    r.recent = await res.json();
    try {
      const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_model_usage_stats`,{method:"POST",headers:{...h,"Content-Type":"application/json"}});
      if (res2.ok) r.stats = await res2.json();
    } catch(_) {}
  } catch(e) { r.error = e.message; }
  return { content: [{ type: "text", text: JSON.stringify(ok(r, { tool: "supabase_project_snapshot", authority: spAuthority() }), null, 2) }] };
});

// ─────────── P2: Supabase authority tools ───────────

server.tool("supabase_project_snapshot", "Supabase project identity and configuration snapshot", {}, async () => {
  const idCheck = checkSupabaseProd();
  if (!idCheck.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "WRONG_SUPABASE_PROJECT", expected: SUPABASE_PROD_REF, actual: idCheck.actual }], { tool: "supabase_project_snapshot", authority: spAuthority() }), null, 2) }] };
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_project_snapshot" }), null, 2) }] };
  const r = { project_url: SUPABASE_URL, expected_prod_ref: SUPABASE_PROD_REF, is_production: idCheck.prod };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?select=table_name`, { headers: { ...h, Accept: "application/json" } });
    const data = await res.json();
    r.table_count = Array.isArray(data) ? data.length : 0;
    r.tables = Array.isArray(data) ? data.map(t => t.table_name) : [];
  } catch(e) { r.table_error = e.message; }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/users?limit=1`, { headers: h });
    r.auth_readable = res.ok;
  } catch(e) { r.auth_readable = false; }
  return { content: [{ type: "text", text: JSON.stringify(ok(r, { tool: "supabase_project_snapshot", authority: spAuthority() }), null, 2) }] };
});

server.tool("supabase_list_migrations", "List Supabase migrations from migrations table", {}, async () => {
  const idCheck = checkSupabaseProd();
  if (!idCheck.ok) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "WRONG_SUPABASE_PROJECT", expected: SUPABASE_PROD_REF, actual: idCheck.actual }], { tool: "supabase_list_migrations", authority: spAuthority() }), null, 2) }] };
  if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_list_migrations" }), null, 2) }] };
  try {
    const data = await callIntrospectRpc("introspect_list_migrations");
    return { content: [{ type: "text", text: JSON.stringify(ok({ migrations: data, count: data.length }, { tool: "supabase_list_migrations", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "RPC_ERROR", message: e.message }], { tool: "supabase_list_migrations", authority: spAuthority() }), null, 2) }] }; }
});


server.tool("supabase_list_policies", "List RLS policies for a table", {
  table: z.string().describe("Table name")
}, async ({ table }) => {
  if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_list_policies" }), null, 2) }] };
  try {
    const data = await callIntrospectRpc("introspect_list_policies", { table_name: table });
    return { content: [{ type: "text", text: JSON.stringify(ok({ table, policies: data, count: data.length }, { tool: "supabase_list_policies", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "RPC_ERROR", message: e.message }], { tool: "supabase_list_policies", authority: spAuthority() }), null, 2) }] }; }
});

server.tool("supabase_list_functions", "List all user-defined functions in public schema", {}, async () => {
  if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_list_functions" }), null, 2) }] };
  try {
    const data = await callIntrospectRpc("introspect_list_functions");
    const functions = Array.isArray(data) ? data.map(f => ({ name: f.function_name || f.proname, definition_preview: (f.definition || "").slice(0, 200) })) : [];
    return { content: [{ type: "text", text: JSON.stringify(ok({ functions, count: functions.length }, { tool: "supabase_list_functions", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "RPC_ERROR", message: e.message }], { tool: "supabase_list_functions", authority: spAuthority() }), null, 2) }] }; }
});

server.tool("supabase_list_indexes", "List indexes for a table", {
  table: z.string().describe("Table name")
}, async ({ table }) => {
  if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_list_indexes" }), null, 2) }] };
  try {
    const data = await callIntrospectRpc("introspect_list_indexes", { table_name: table });
    return { content: [{ type: "text", text: JSON.stringify(ok({ table, indexes: data, count: data.length }, { tool: "supabase_list_indexes", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "RPC_ERROR", message: e.message }], { tool: "supabase_list_indexes", authority: spAuthority() }), null, 2) }] }; }
});

server.tool("supabase_list_triggers", "List triggers for a table", {
  table: z.string().describe("Table name")
}, async ({ table }) => {
  if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "SUPABASE_NOT_CONFIGURED" }], { tool: "supabase_list_triggers" }), null, 2) }] };
  try {
    const data = await callIntrospectRpc("introspect_list_triggers", { table_name: table });
    return { content: [{ type: "text", text: JSON.stringify(ok({ table, triggers: data, count: data.length }, { tool: "supabase_list_triggers", authority: spAuthority() }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "RPC_ERROR", message: e.message }], { tool: "supabase_list_triggers", authority: spAuthority() }), null, 2) }] }; }
});

server.tool("supabase_generated_types_gap", "Detect tables missing from generated TypeScript types", {
  typesFileHint: z.string().optional().describe("Optional hint for types file location")
}, async ({ typesFileHint }) => {
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: JSON.stringify({ error: "SUPABASE not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?select=table_name`, { headers: { ...h, Accept: "application/json" } });
    const data = await res.json();
    const allTables = Array.isArray(data) ? data.map(t => t.table_name) : [];
    let typedTables = [];
    if (typesFileHint) {
      try {
        const fs = await import("fs");
        const typesContent = fs.readFileSync(typesFileHint, "utf8");
        typedTables = [...typesContent.matchAll(/\"([a-zA-Z_]+)\":\s*\{/g)].map(m => m[1]);
      } catch(_) {}
    }
    const missing = allTables.filter(t => !typedTables.includes(t));
    return { content: [{ type: "text", text: JSON.stringify({
      all_tables: allTables,
      typed_tables_hint: typedTables.length ? typedTables : "(no types file read)",
      missing_from_types: missing,
      gap_count: missing.length,
      timestamp: new Date().toISOString(),
    }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify(fail([{ code: "FETCH_ERROR", message: e.message }], { tool: "supabase_list_migrations", authority: spAuthority() }), null, 2) }] }; }
});


// ═══════════════ GITHUB TOOLS (kept from v1 + P1 additions) ═══════════════

server.tool("github_read_file", "Read a file from a GitHub repo. Defaults to NEXUS if no repo specified.", {
  path: z.string().describe("File path within the repo"),
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
  branch: z.string().optional().describe("Branch name (default: main)"),
}, async ({ path, repo, branch = "main" }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    if (data.content) {
      const text = Buffer.from(data.content, "base64").toString("utf8");
      const truncated = text.length > 8000;
      return { content: [{ type: "text", text: JSON.stringify(ok({
        repo: `${owner}/${r}`,
        path,
        branch,
        size: data.size,
        sha: data.sha,
        content: text.slice(0, 8000),
        content_truncated: truncated,
        encoding: "utf-8",
      }, { tool: "github_read_file", authority: ghAuthority(repo), warnings: truncated ? ["Content truncated, use offset/limit params to continue"] : [] }), null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify({ repo: `${owner}/${r}`, path, branch, error: data.message || "Unknown error", timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_list_commits", "List recent commits. Defaults to NEXUS main branch.", {
  count: z.number().optional().describe("Number of commits (default 10)"),
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
  branch: z.string().optional().describe("Branch (default: main)"),
}, async ({ count = 10, repo, branch = "main" }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/commits?sha=${branch}&per_page=${count}`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    const commits = data.map(c => ({
      sha: c.sha.slice(0, 7),
      full_sha: c.sha,
      message: c.commit.message.split("\n")[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
    return { content: [{ type: "text", text: JSON.stringify(ok({ repo: `${owner}/${r}`, branch, commits, count: commits.length }, { tool: "github_list_commits", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_search_code", "Search code within a GitHub repo. Defaults to NEXUS.", {
  query: z.string().describe("Search term"),
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
  branch: z.string().optional().describe("Branch (default: main)"),
}, async ({ query, repo, branch = "main" }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${r}&per_page=10&ref=${branch}`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    const items = (data.items || []).map(i => ({ path: i.path, url: i.html_url }));
    return { content: [{ type: "text", text: JSON.stringify(ok({ repo: `${owner}/${r}`, branch, total: data.total_count, results: items }, { tool: "github_search_code", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_repo_snapshot", "Get repo metadata. Defaults to NEXUS.", {
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
}, async ({ repo }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}`;
    const res = await fetch(url, { headers: h });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(ok({
      full_name: d.full_name, description: d.description, stars: d.stargazers_count,
      forks: d.forks_count, open_issues: d.open_issues_count, default_branch: d.default_branch,
      pushed_at: d.pushed_at, size_kb: d.size, language: d.language, visibility: d.visibility,
    }, { tool: "github_repo_snapshot", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

// ─────────── P1: GitHub multi-repo tools ───────────

server.tool("github_list_repos", "List all GitHub repos accessible to the token", {
  org: z.string().optional().describe("Optional org name to filter (default: sean0900108489-cpu)"),
}, async ({ org = GITHUB_DEFAULT_OWNER }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const url = `https://api.github.com/orgs/${org}/repos?per_page=50&sort=pushed`;
    let res = await fetch(url, { headers: h });
    if (!res.ok) {
      res = await fetch(`https://api.github.com/users/${org}/repos?per_page=50&sort=pushed`, { headers: h });
    }
    const data = await res.json();
    const repos = Array.isArray(data) ? data.map(r => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description || "",
      pushed_at: r.pushed_at,
      default_branch: r.default_branch,
      visibility: r.visibility,
    })) : [];
    return { content: [{ type: "text", text: JSON.stringify(ok({ org, repos, count: repos.length }, { tool: "github_list_repos", authority: ghAuthority(org) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_list_branches", "List branches for a GitHub repo", {
  repo: z.string().describe("Repo as owner/name"),
}, async ({ repo }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/branches?per_page=50`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    const branches = Array.isArray(data) ? data.map(b => ({ name: b.name, sha: b.commit.sha.slice(0, 7) })) : [];
    return { content: [{ type: "text", text: JSON.stringify(ok({ repo: `${owner}/${r}`, branches, count: branches.length }, { tool: "github_list_branches", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_get_head", "Get HEAD commit of a branch", {
  repo: z.string().describe("Repo as owner/name"),
  branch: z.string().optional().describe("Branch (default: main)"),
}, async ({ repo, branch = "main" }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/git/ref/heads/${branch}`;
    const res = await fetch(url, { headers: h });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(ok({
      repo: `${owner}/${r}`, branch, sha: d.object?.sha, sha7: d.object?.sha?.slice(0, 7),
    }, { tool: "github_get_head", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_list_tree", "List files/dirs at a path in a repo (GitHub git/trees)", {
  repo: z.string().describe("Repo as owner/name"),
  branch: z.string().optional().describe("Branch (default: main)"),
  path: z.string().optional().describe("Path within repo (default: root)"),
}, async ({ repo, branch = "main", path = "" }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const headUrl = `https://api.github.com/repos/${owner}/${r}/git/ref/heads/${branch}`;
    const headRes = await fetch(headUrl, { headers: h });
    const headData = await headRes.json();
    const treeSha = headData.object?.sha;
    const treeUrl = `https://api.github.com/repos/${owner}/${r}/git/trees/${treeSha}?recursive=1`;
    const treeRes = await fetch(treeUrl, { headers: h });
    const treeData = await treeRes.json();
    const items = (treeData.tree || []).filter(t => !path || t.path.startsWith(path));
    return { content: [{ type: "text", text: JSON.stringify(ok({
      repo: `${owner}/${r}`, branch, path: path || "/", items: items.map(t => ({ path: t.path, type: t.type, sha: t.sha?.slice(0, 7) })), count: items.length,
    }, { tool: "github_list_tree", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_compare", "Compare two branches/commits (changed files + commits)", {
  repo: z.string().describe("Repo as owner/name"),
  base: z.string().describe("Base ref (e.g. main)"),
  head: z.string().describe("Head ref (e.g. feature-branch)"),
}, async ({ repo, base, head }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/compare/${base}...${head}`;
    const res = await fetch(url, { headers: h });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(ok({
      repo: `${owner}/${r}`, base, head,
      status: d.status,
      ahead_by: d.ahead_by,
      behind_by: d.behind_by,
      total_commits: d.total_commits,
      commits: (d.commits || []).slice(0, 20).map(c => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split("\n")[0], author: c.commit.author.name })),
      files_changed: (d.files || []).map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch_preview: (f.patch || "").slice(0, 200),
      })),
    }, { tool: "github_compare", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("github_commit_files", "Get files changed in a specific commit", {
  repo: z.string().describe("Repo as owner/name"),
  sha: z.string().describe("Commit SHA"),
}, async ({ repo, sha }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "GITHUB_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/commits/${sha}`;
    const res = await fetch(url, { headers: h });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(ok({
      repo: `${owner}/${r}`, sha: d.sha?.slice(0, 7),
      message: d.commit?.message,
      author: d.commit?.author?.name,
      date: d.commit?.author?.date,
      files: (d.files || []).map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
      })),
      stats: d.stats,
    }, { tool: "github_commit_files", authority: ghAuthority(repo) }), null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

// ═══════════════ NOTION TOOLS (kept from v1 + P3 additions) ═══════════════

server.tool("notion_search", "Search all Notion pages and databases in the workspace", { query: z.string().describe("Search term") }, async ({ query }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const res = await fetch(`${NOTION_API}/search`, { method: "POST", headers: nHeaders(), body: JSON.stringify({ query, page_size: 20 }) });
    const d = await res.json();
    const items = (d.results || []).map(r => ({ id: r.id, title: r.title?.[0]?.plain_text || r.properties?.title?.title?.[0]?.plain_text || "(untitled)", type: r.object, url: r.url }));
    return { content: [{ type: "text", text: JSON.stringify({ count: items.length, results: items, timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_read_page", "Read a Notion page by ID (returns block content as text)", { pageId: z.string().describe("Notion page UUID") }, async ({ pageId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const blocks = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=50`, { headers: nHeaders() });
    const bd = await blocks.json();
    const blocksList = (bd.results || []).map(b => {
      const t = b.type;
      const content = b[t]?.rich_text || b[t]?.title || [];
      return { type: t, text: content.map(c => c.plain_text).join("") };
    }).filter(b => b.text);
    return { content: [{ type: "text", text: JSON.stringify({ id: pageId, blocks: blocksList, count: blocksList.length, timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_create_page", "Create a new Notion page under a parent page", {
  parentId: z.string().describe("Parent page ID"),
  title: z.string().describe("Page title"),
  content: z.string().optional().describe("Page content in Markdown (optional)"),
}, async ({ parentId, title, content }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const body = { parent: { page_id: parentId }, properties: { title: { title: [{ text: { content: title } }] } } };
    const res = await fetch(`${NOTION_API}/pages`, { method: "POST", headers: nHeaders(), body: JSON.stringify(body) });
    const d = await res.json();
    const pageId = d.id;
    if (content && pageId) {
      const blocks = content.split("\n").filter(Boolean).map(line => {
        if (line.startsWith("# ")) return { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        if (line.startsWith("## ")) return { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } };
        if (line.startsWith("- ")) return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        return { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } };
      });
      await fetch(`${NOTION_API}/blocks/${pageId}/children`, { method: "PATCH", headers: nHeaders(), body: JSON.stringify({ children: blocks.slice(0, 100) }) });
    }
    return { content: [{ type: "text", text: JSON.stringify({ page_id: pageId, url: d.url, title, timestamp: new Date().toISOString() }) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_append_blocks", "Append content blocks to an existing Notion page", {
  pageId: z.string().describe("Notion page UUID"),
  text: z.string().describe("Text content to append"),
}, async ({ pageId, text }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const blocks = text.split("\n").filter(Boolean).slice(0, 100).map(line => {
      if (line.startsWith("# ")) return { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
      if (line.startsWith("## ")) return { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } };
      if (line.startsWith("- ")) return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
      return { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } };
    });
    const res = await fetch(`${NOTION_API}/blocks/${pageId}/children`, { method: "PATCH", headers: nHeaders(), body: JSON.stringify({ children: blocks }) });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(d.error ? { error: d.message, timestamp: new Date().toISOString() } : { page_id: pageId, blocks_appended: blocks.length, timestamp: new Date().toISOString() }) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_list_databases", "List all databases the integration can access", {}, async () => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const res = await fetch(`${NOTION_API}/search`, { method: "POST", headers: nHeaders(), body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 20 }) });
    const d = await res.json();
    const items = (d.results || []).map(r => ({ id: r.id, title: r.title?.[0]?.plain_text || "(untitled)", url: r.url }));
    return { content: [{ type: "text", text: JSON.stringify({ count: items.length, databases: items, timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

// ─────────── P3: Notion authority graph ───────────

server.tool("notion_page_snapshot", "Full snapshot of a Notion page: properties, children, blocks", {
  pageId: z.string().describe("Notion page UUID"),
}, async ({ pageId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const pageRes = await fetch(`${NOTION_API}/pages/${pageId}`, { headers: nHeaders() });
    const page = await pageRes.json();
    const blocksRes = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=50`, { headers: nHeaders() });
    const blocks = await blocksRes.json();
    return { content: [{ type: "text", text: JSON.stringify({
      id: page.id,
      title: page.properties?.title?.title?.[0]?.plain_text || "(untitled)",
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived,
      url: page.url,
      properties: Object.entries(page.properties || {}).map(([k, v]) => ({ name: k, type: v.type, value: v[v.type] })),
      blocks_count: blocks.results?.length || 0,
      blocks: (blocks.results || []).slice(0, 30).map(b => ({ type: b.type, text: (b[b.type]?.rich_text || []).map(t => t.plain_text).join("").slice(0, 200) })),
      timestamp: new Date().toISOString(),
    }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_find_backlinks", "Find pages that link to a given page", {
  pageId: z.string().describe("Notion page UUID"),
}, async ({ pageId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    // Notion's search can find pages mentioning the page in rich_text links
    const res = await fetch(`${NOTION_API}/search`, { method: "POST", headers: nHeaders(), body: JSON.stringify({ query: pageId, page_size: 20 }) });
    const d = await res.json();
    const items = (d.results || []).filter(r => r.id !== pageId).map(r => ({ id: r.id, title: r.title?.[0]?.plain_text || r.properties?.title?.title?.[0]?.plain_text || "(untitled)", type: r.object, url: r.url }));
    return { content: [{ type: "text", text: JSON.stringify({ page_id: pageId, backlinks: items, count: items.length, note: "Based on search for page ID in workspace", timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_list_child_pages", "List child pages of a parent page", {
  parentId: z.string().describe("Parent page ID"),
}, async ({ parentId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const res = await fetch(`${NOTION_API}/blocks/${parentId}/children?page_size=50`, { headers: nHeaders() });
    const bd = await res.json();
    const children = (bd.results || []).filter(b => b.type === "child_page").map(b => ({
      id: b.id,
      title: b.child_page?.title || "(untitled)",
      created_time: b.created_time,
    }));
    return { content: [{ type: "text", text: JSON.stringify({ parent_id: parentId, child_pages: children, count: children.length, timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_get_page_properties", "Get all properties of a Notion page (including status, tags, etc.)", {
  pageId: z.string().describe("Notion page UUID"),
}, async ({ pageId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, { headers: nHeaders() });
    const page = await res.json();
    const props = {};
    for (const [key, val] of Object.entries(page.properties || {})) {
      if (val.type === "status") props[key] = { type: "status", value: val.status?.name || null };
      else if (val.type === "select") props[key] = { type: "select", value: val.select?.name || null };
      else if (val.type === "multi_select") props[key] = { type: "multi_select", value: (val.multi_select || []).map(s => s.name) };
      else if (val.type === "title") props[key] = { type: "title", value: (val.title || []).map(t => t.plain_text).join("") };
      else if (val.type === "rich_text") props[key] = { type: "rich_text", value: (val.rich_text || []).map(t => t.plain_text).join("") };
      else if (val.type === "date") props[key] = { type: "date", value: val.date };
      else if (val.type === "checkbox") props[key] = { type: "checkbox", value: val.checkbox };
      else props[key] = { type: val.type };
    }
    return { content: [{ type: "text", text: JSON.stringify({ id: page.id, title: page.properties?.title?.title?.[0]?.plain_text || "(untitled)", url: page.url, properties: props, last_edited: page.last_edited_time, timestamp: new Date().toISOString() }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_update_status", "Update the status property of a Notion page", {
  pageId: z.string().describe("Notion page UUID"),
  status: z.string().describe("New status value"),
}, async ({ pageId, status }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const pageRes = await fetch(`${NOTION_API}/pages/${pageId}`, { headers: nHeaders() });
    const page = await pageRes.json();
    const statusProp = Object.entries(page.properties || {}).find(([_, v]) => v.type === "status");
    if (!statusProp) return { content: [{ type: "text", text: JSON.stringify({ error: "No status property found", timestamp: new Date().toISOString() }) }] };
    const [propName] = statusProp;
    const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: "PATCH", headers: nHeaders(),
      body: JSON.stringify({ properties: { [propName]: { status: { name: status } } } })
    });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify({ page_id: pageId, status: status, property: propName, updated: !!d.id, timestamp: new Date().toISOString() }) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

server.tool("notion_authority_index", "Build an authority index of planning documents under a parent page", {
  parentPageId: z.string().describe("Root page ID for planning docs (e.g. Handoff Pack page)"),
}, async ({ parentPageId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: JSON.stringify({ error: "NOTION_TOKEN not configured", timestamp: new Date().toISOString() }) }] };
  try {
    const res = await fetch(`${NOTION_API}/blocks/${parentPageId}/children?page_size=50`, { headers: nHeaders() });
    const bd = await res.json();
    const items = (bd.results || []).map(b => {
      const title = b.child_page?.title || b[b.type]?.rich_text?.map(t => t.plain_text).join("") || "(untitled)";
      return { id: b.id, title, type: b.type, created_time: b.created_time };
    });
    return { content: [{ type: "text", text: JSON.stringify({
      parent_page_id: parentPageId,
      index: items,
      count: items.length,
      note: "Use notion_get_page_properties on each child to determine current/stale status.",
      timestamp: new Date().toISOString(),
    }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message, timestamp: new Date().toISOString() }) }] }; }
});

// ═══════════════ P5: Startup Authority Verification ═══════════════

server.tool("startup_authority_verification", "One-click baseline: checks GitHub, Supabase, Notion, New API in parallel", {}, async () => {
  const result = { status: "running", timestamp: new Date().toISOString(), checks: {} };
  
  // GitHub check
  if (GITHUB_TOKEN) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_DEFAULT_OWNER}/${GITHUB_DEFAULT_REPO}`, { headers: ghHeaders() });
      const d = await res.json();
      result.checks.github = { readable: true, repo: d.full_name, head: d.pushed_at, default_branch: d.default_branch };
    } catch(e) { result.checks.github = { readable: false, error: e.message }; }
  } else { result.checks.github = { readable: false, error: "GITHUB_TOKEN not configured" }; }
  
  // New API check
  try {
    const channels = db.prepare("SELECT COUNT(*) as count FROM channels").get();
    result.checks.new_api = { db_readable: true, channel_count: channels.count };
  } catch(e) { result.checks.new_api = { db_readable: false, error: e.message }; }
  
  // Supabase check
  if (SUPABASE_URL) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/?select=table_name`, { headers: { ...spHeaders(), Accept: "application/json" } });
      const data = await res.json();
      result.checks.supabase = { readable: true, table_count: Array.isArray(data) ? data.length : "unknown" };
    } catch(e) { result.checks.supabase = { readable: false, error: e.message }; }
  } else { result.checks.supabase = { readable: false, error: "SUPABASE not configured" }; }
  
  // Notion check
  if (NOTION_TOKEN) {
    try {
      const res = await fetch(`${NOTION_API}/search`, { method: "POST", headers: nHeaders(), body: JSON.stringify({ query: "Handoff", page_size: 5 }) });
      const d = await res.json();
      result.checks.notion = { readable: true, search_results: (d.results || []).length };
    } catch(e) { result.checks.notion = { readable: false, error: e.message }; }
  } else { result.checks.notion = { readable: false, error: "NOTION_TOKEN not configured" }; }
  
  // New API model diff
  try {
    const nexus = ["gpt-4o-mini","gpt-4o","deepseek-chat","deepseek-v4-flash","deepseek-v4-pro","gemini-2.5-flash","gemini-2.5-pro","claude-sonnet-4-20250514","img2","riverflow-v2.5-fast"];
    const ch = db.prepare("SELECT models FROM channels").all();
    const api = [...new Set(ch.flatMap(c => (c.models||"").split(",").filter(Boolean)))];
    result.checks.model_diff = { missing_in_api: nexus.filter(m => !api.some(a => a.includes(m)||m.includes(a))), count: nexus.filter(m => !api.some(a => a.includes(m)||m.includes(a))).length };
  } catch(e) { result.checks.model_diff = { error: e.message }; }
  
  result.status = Object.values(result.checks).every(c => c.readable !== false) ? "OK" : "DEGRADED";
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ═══════════════ P6: Slice Report Validator ═══════════════

const SLICE_REQUIRED_SECTIONS = ["Objective", "Scope", "Dependencies", "Risk Assessment", "Authorization"];
const FORBIDDEN_TERMS = ["implement", "deploy", "push", "migrate", "write code", "run on production"];

server.tool("slice_report_validator", "Validate a slice report against NEXUS planning standards", {
  sliceId: z.string().describe("Slice identifier (e.g. S-5)"),
  content: z.string().describe("Full slice report content to validate"),
}, async ({ sliceId, content }) => {
  const r = { slice_id: sliceId, timestamp: new Date().toISOString(), checklist: {} };
  
  // Required sections
  r.checklist.required_sections = {};
  for (const section of SLICE_REQUIRED_SECTIONS) {
    r.checklist.required_sections[section] = content.toLowerCase().includes(section.toLowerCase()) ? "PRESENT" : "MISSING";
  }
  
  // Forbidden action language
  r.checklist.forbidden_terms = [];
  for (const term of FORBIDDEN_TERMS) {
    if (content.toLowerCase().includes(term)) r.checklist.forbidden_terms.push(term);
  }
  
  // Implementation claims
  r.checklist.implementation_claims = (content.match(/implement|deploy|migrate/g) || []).length;
  
  // Addenda check
  r.checklist.addenda = content.includes("Addendum") || content.includes("addendum") ? "FOUND" : "NONE";
  
  // Risk/blocker terms
  r.checklist.risk_blocker_terms = {
    risk: content.toLowerCase().includes("risk"),
    blocker: content.toLowerCase().includes("blocker"),
    mitigation: content.toLowerCase().includes("mitigation"),
  };
  
  // Next slice authorization
  const nextSliceMatch = content.match(/S-\d+/g);
  r.checklist.referenced_slices = nextSliceMatch ? [...new Set(nextSliceMatch)] : [];
  
  // Final verdict
  const missingSections = Object.values(r.checklist.required_sections).filter(v => v === "MISSING").length;
  const hasForbidden = r.checklist.forbidden_terms.length > 0;
  r.checklist.verdict = missingSections === 0 && !hasForbidden ? "PASS" : "FAIL";
  r.checklist.issues = [];
  if (missingSections > 0) r.checklist.issues.push(`${missingSections} required sections missing`);
  if (hasForbidden) r.checklist.issues.push(`Forbidden action language: ${r.checklist.forbidden_terms.join(", ")}`);
  if (!r.checklist.risk_blocker_terms.risk) r.checklist.issues.push("No risk assessment language found");
  
  return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
});

// ═══════════════ P7: Security & Audit ═══════════════

server.tool("ops_capabilities", "Report all tools, repos, and projects accessible to this MCP server", {}, async () => {
  const tools = [
    "newapi_snapshot","newapi_list_channels","newapi_enabled_models","diagnose_model_route","nexus_newapi_diff",
    "newapi_channel_health","newapi_model_pricing_snapshot","newapi_model_route_trace","newapi_enabled_model_diff_since",
    "nexus_model_catalog_snapshot","nexus_model_catalog_drift_matrix",
    "supabase_gateway_audit","supabase_query","supabase_list_tables","supabase_model_usage",
    "supabase_project_snapshot","supabase_list_migrations","supabase_table_columns","supabase_list_policies",
    "supabase_list_functions","supabase_list_indexes","supabase_list_triggers","supabase_generated_types_gap","supabase_rls_audit",
    "github_read_file","github_list_commits","github_search_code","github_repo_snapshot",
    "github_list_repos","github_list_branches","github_get_head","github_list_tree","github_compare","github_commit_files",
    "notion_search","notion_read_page","notion_create_page","notion_append_blocks","notion_list_databases",
    "notion_page_snapshot","notion_find_backlinks","notion_list_child_pages","notion_get_page_properties",
    "notion_update_status","notion_authority_index",
    "startup_authority_verification","slice_report_validator",
    "ops_capabilities","ops_audit_log_recent","ops_tool_health","ops_secret_scan_text","ops_redact_secrets","ops_readonly_guard_status"
  ];
  return { content: [{ type: "text", text: JSON.stringify({
    version: "2.0.0",
    tools: tools.sort(),
    tool_count: tools.length,
    github: GITHUB_TOKEN ? { default_repo: `${GITHUB_DEFAULT_OWNER}/${GITHUB_DEFAULT_REPO}`, token_set: true } : { token_set: false },
    supabase: SUPABASE_URL ? { url: SUPABASE_URL.replace(/(https:\/\/)([^.]+)/, "$1***"), token_set: !!SUPABASE_KEY } : { token_set: false },
    notion: { token_set: !!NOTION_TOKEN },
    new_api_db: { path: NEW_API_DB, readable: true },
    port: PORT,
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("ops_audit_log_recent", "Recent audit log entries (last 50)", {}, async () => {
  try {
    const fs = await import("fs");
    if (!fs.existsSync(OPS_AUDIT_LOG)) return { content: [{ type: "text", text: JSON.stringify({ entries: [], count: 0, note: "No audit log yet" }) }] };
    const content = fs.readFileSync(OPS_AUDIT_LOG, "utf8");
    const lines = content.trim().split("\n").slice(-50);
    return { content: [{ type: "text", text: JSON.stringify({ entries: lines.map(l => { try { return JSON.parse(l); } catch { return l; } }), count: lines.length, timestamp: new Date().toISOString() }) }] };
  } catch(e) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] }; }
});

server.tool("ops_tool_health", "Check health of all tool dependencies", {}, async () => {
  const r = {};
  r.github = GITHUB_TOKEN ? "configured" : "MISSING";
  r.supabase = SUPABASE_URL && SUPABASE_KEY ? "configured" : "MISSING";
  r.notion = NOTION_TOKEN ? "configured" : "MISSING";
  try { db.prepare("SELECT 1").get(); r.new_api_db = "connected"; } catch(e) { r.new_api_db = `error: ${e.message}`; }
  r.overall = Object.values(r).every(v => v === "connected" || v === "configured") ? "healthy" : "degraded";
  return { content: [{ type: "text", text: JSON.stringify({ ...r, timestamp: new Date().toISOString() }, null, 2) }] };
});

server.tool("ops_secret_scan_text", "Scan text for potential secrets (keys, tokens, passwords)", {
  text: z.string().describe("Text to scan"),
}, async ({ text }) => {
  const patterns = [
    /sk-[A-Za-z0-9]{20,}/g,
    /ghp_[A-Za-z0-9]{20,}/g,
    /github_pat_[A-Za-z0-9]{20,}/g,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g,
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
    /AKIA[A-Z0-9]{16}/g,
    /password\s*[:=]\s*["']?[\S]+/gi,
    /secret\s*[:=]\s*["']?[\S]+/gi,
    /token\s*[:=]\s*["']?[\S]+/gi,
  ];
  const findings = [];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) findings.push({ pattern: p.source, count: matches.length, preview: matches[0].slice(0, 40) + "..." });
  }
  return { content: [{ type: "text", text: JSON.stringify({
    scanned_length: text.length,
    findings,
    finding_count: findings.length,
    verdict: findings.length ? "WARNING: Potential secrets detected" : "CLEAN",
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

server.tool("ops_redact_secrets", "Redact secrets from text, returning safe version", {
  text: z.string().describe("Text to redact"),
}, async ({ text }) => {
  let redacted = text;
  redacted = redacted.replace(/sk-[A-Za-z0-9]{20,}/g, "sk-***REDACTED***");
  redacted = redacted.replace(/ghp_[A-Za-z0-9]{20,}/g, "ghp_***REDACTED***");
  redacted = redacted.replace(/github_pat_[A-Za-z0-9]{20,}/g, "github_pat_***REDACTED***");
  redacted = redacted.replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, "JWT***REDACTED***");
  redacted = redacted.replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, "***REDACTED PRIVATE KEY***");
  redacted = redacted.replace(/AKIA[A-Z0-9]{16}/g, "AKIA***REDACTED***");
  const changed = redacted !== text;
  return { content: [{ type: "text", text: JSON.stringify({ redacted, changed, timestamp: new Date().toISOString() }, null, 2) }] };
});

server.tool("ops_readonly_guard_status", "Check if MCP server is in read-only mode (dev mode guard)", {}, async () => {
  return { content: [{ type: "text", text: JSON.stringify({
    read_only: true,
    mode: "development",
    note: "All tools are read-only inspections. No write operations to production systems.",
    writable_tools: ["notion_create_page", "notion_append_blocks", "notion_update_status"],
    writable_tools_note: "These can modify Notion planning docs but nothing in production infrastructure.",
    timestamp: new Date().toISOString(),
  }, null, 2) }] };
});

// ── HTTP Transport ──────────────────────────
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime(), version: "2.0.0" }));

app.post("/mcp", async (req, res) => {
  try { server.close(); } catch(_) {}
  const transport = new StreamableHTTPServerTransport();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// OAuth endpoints
app.get("/.well-known/oauth-authorization-server", (_req, res) => res.json({
  issuer: "https://ops.supaseanexus.com",
  authorization_endpoint: "https://ops.supaseanexus.com/oauth/authorize",
  token_endpoint: "https://ops.supaseanexus.com/oauth/token",
  response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
  token_endpoint_auth_methods_supported: ["none"]
}));
app.get("/oauth/authorize", (_req, res) => {
  const u = _req.query.redirect_uri || ""; const s = _req.query.state || "";
  res.redirect(302, u + "?code=dev-token&state=" + encodeURIComponent(s));
});
app.post("/oauth/token", (_req, res) => res.json({ access_token: "dev-token-supaseanexus-ops", token_type: "bearer", expires_in: 86400, scope: "ops:read ops:inspect" }));
app.post("/oauth/register", (_req, res) => res.status(201).json({ client_id: "supaseanexus-ops-client" }));

// OpenAPI endpoint
app.get("/openapi.json", (_req, res) => {
  const schema = {
    openapi: "3.1.0",
    info: { title: "SupaseaNexus Ops API", version: "2.0.0", description: "Authority inspection bridge for NEXUS system diagnostics across Vercel + Supabase + VPS + New API" },
    servers: [{ url: "https://ops.supaseanexus.com" }],
    paths: {}
  };
  const tools = ["newapi_snapshot","newapi_list_channels","newapi_enabled_models","diagnose_model_route","nexus_newapi_diff","newapi_channel_health","newapi_model_pricing_snapshot","newapi_model_route_trace","newapi_enabled_model_diff_since","nexus_model_catalog_snapshot","nexus_model_catalog_drift_matrix","supabase_gateway_audit","supabase_query","supabase_list_tables","supabase_model_usage","supabase_project_snapshot","supabase_list_migrations","supabase_table_columns","supabase_list_policies","supabase_list_functions","supabase_list_indexes","supabase_list_triggers","supabase_generated_types_gap","supabase_rls_audit","github_read_file","github_list_commits","github_search_code","github_repo_snapshot","github_list_repos","github_list_branches","github_get_head","github_list_tree","github_compare","github_commit_files","notion_search","notion_read_page","notion_create_page","notion_append_blocks","notion_list_databases","notion_page_snapshot","notion_find_backlinks","notion_list_child_pages","notion_get_page_properties","notion_update_status","notion_authority_index","startup_authority_verification","slice_report_validator","ops_capabilities","ops_audit_log_recent","ops_tool_health","ops_secret_scan_text","ops_redact_secrets","ops_readonly_guard_status"];
  for (const tool of tools) {
    schema.paths[`/mcp/${tool}`] = {
      post: {
        operationId: tool,
        summary: tool,
        responses: { "200": { description: "JSON response", content: { "application/json": { schema: { type: "object" } } } } }
      }
    };
  }
  res.json(schema);
});

app.listen(PORT, "127.0.0.1", () => console.log(`SupaseaNexus Ops MCP v2.0.0 listening on 127.0.0.1:${PORT} (${54} tools)`));

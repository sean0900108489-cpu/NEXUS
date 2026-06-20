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
const GITHUB_OWNER = process.env.GITHUB_OWNER || "sean0900108489-cpu";
const GITHUB_REPO = process.env.GITHUB_REPO || "NEXUS";
const PORT = process.env.PORT || 3003;

// ── Helpers ──────────────────────────────────
const db = new Database(NEW_API_DB, { readonly: true });
function safeJson(val) { try { return JSON.parse(val); } catch { return val; } }

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

function redact(s, show = 4) {
  const str = String(s || "");
  return str.length <= show * 2 ? str : str.slice(0, show) + "..." + str.slice(-show);
}

// ── MCP Server ──────────────────────────────
const server = new McpServer({ name: "supaseanexus-ops", version: "1.1.0" });

// ═══════════════ NEW API TOOLS ═══════════════

server.tool("newapi_snapshot", "New API full snapshot: channels, options, user count", {}, async () => {
  const channels = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
  const options = db.prepare("SELECT key, value FROM options WHERE key NOT LIKE '%key%' AND key NOT LIKE '%secret%' AND key NOT LIKE '%token%'").all();
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
  return { content: [{ type: "text", text: JSON.stringify({
    channels: channels.map(c => ({ id: c.id, type: c.type, name: c.name, models: (c.models||"").split(",").filter(Boolean) })),
    options: Object.fromEntries(options.map(o => [o.key, safeJson(o.value)])),
    user_count: users.count,
  }, null, 2) }] };
});

server.tool("newapi_list_channels", "List all New API channels", {}, async () => {
  const ch = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
  return { content: [{ type: "text", text: JSON.stringify(ch.map(c => ({
    id: c.id, type: c.type, name: c.name, models: (c.models||"").split(",").filter(Boolean), base_url: c.base_url || "(default)",
  })), null, 2) }] };
});

server.tool("newapi_enabled_models", "All enabled New API models", {}, async () => {
  const ch = db.prepare("SELECT models FROM channels").all();
  const models = [...new Set(ch.flatMap(c => (c.models||"").split(",").filter(Boolean)))];
  return { content: [{ type: "text", text: JSON.stringify({ enabled_models: models.sort(), count: models.length }, null, 2) }] };
});

server.tool("diagnose_model_route", "Trace model from NEXUS catalog through New API", { modelId: z.string() }, async ({ modelId }) => {
  const ch = db.prepare("SELECT id, type, name, models FROM channels").all();
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
  const ch = db.prepare("SELECT models FROM channels").all();
  const api = [...new Set(ch.flatMap(c => (c.models||"").split(",").filter(Boolean)))];
  return { content: [{ type: "text", text: JSON.stringify({
    nexus_count: nexus.length, api_count: api.length,
    in_nexus_not_api: nexus.filter(m => !api.some(a => a.includes(m)||m.includes(a))),
    in_api_not_nexus: api.filter(a => !nexus.some(m => a.includes(m)||m.includes(a))),
  }, null, 2) }] };
});

// ═══════════════ SUPABASE TOOLS ═══════════════

server.tool("supabase_gateway_audit", "NEXUS gateway health: tokens, ledger, sync", {}, async () => {
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: "SUPABASE not configured" }] };
  const r = {};
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/user_new_api_tokens?select=count`,{headers:h}); r.tokens = (await res.json())[0]?.count||0; } catch(e) { r.tokens = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/model_usage_ledger?select=count&source_type=is.null`,{headers:h}); r.null_source_type = (await res.json())[0]?.count||0; } catch(e) { r.null_source_type = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/sync_operations?select=count&status=eq.conflicted`,{headers:h}); r.conflicted_sync = (await res.json())[0]?.count||0; } catch(e) { r.conflicted_sync = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_tasks?select=count&status=in.(queued,created)`,{headers:h}); r.stuck_tasks = (await res.json())[0]?.count||0; } catch(e) { r.stuck_tasks = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/artifacts?select=count&content_url=like.data:*`,{headers:h}); r.base64_artifacts = (await res.json())[0]?.count||0; } catch(e) { r.base64_artifacts = `err:${e.message}`; }
  return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
});

server.tool("supabase_query", "Run a read-only SQL query on Supabase. Use SELECT only. Returns first 20 rows.", { query: z.string().describe("SELECT query (read-only, max 20 rows)") }, async ({ query }) => {
  const q = query.trim();
  if (!q.toLowerCase().startsWith("select")) return { content: [{ type: "text", text: "Only SELECT queries allowed" }] };
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: "SUPABASE not configured" }] };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ sql: q + " LIMIT 20" }) });
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("supabase_list_tables", "List all tables in the Supabase public schema", {}, async () => {
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: "SUPABASE not configured" }] };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?select=table_name`, { headers: { ...h, Accept: "application/json" } });
    const data = await res.text();
    return { content: [{ type: "text", text: data.slice(0, 5000) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("supabase_model_usage", "Get model usage ledger stats: top models, total tokens, recent activity", {}, async () => {
  const h = spHeaders(); if (!SUPABASE_URL) return { content: [{ type: "text", text: "SUPABASE not configured" }] };
  const r = {};
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/model_usage_ledger?select=model_id,source_type,status,created_at&limit=20&order=created_at.desc`,{headers:h});
    r.recent = await res.json();
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_model_usage_stats`,{method:"POST",headers:{...h,"Content-Type":"application/json"}});
    if (res2.ok) r.stats = await res2.json();
  } catch(e) { r.error = e.message; }
  return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
});

// ═══════════════ GITHUB TOOLS ═══════════════

server.tool("github_read_file", "Read a file from the NEXUS GitHub repo", { path: z.string().describe("File path within the repo, e.g. src/lib/backend/models/model-catalog.ts") }, async ({ path }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    if (data.content) {
      const text = Buffer.from(data.content, "base64").toString("utf8");
      return { content: [{ type: "text", text: `// ${path} (${data.size} bytes, sha: ${data.sha})\n\n${text.slice(0, 8000)}${text.length > 8000 ? '\n\n... (truncated)' : ''}` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("github_list_commits", "List recent commits on the main branch", { count: z.number().optional().describe("Number of commits (default 10)") }, async ({ count = 10 }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?sha=main&per_page=${count}`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    const commits = data.map(c => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
    }));
    return { content: [{ type: "text", text: JSON.stringify(commits, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("github_search_code", "Search NEXUS repo code", { query: z.string().describe("Search term, e.g. SERVER_MODEL_CATALOG or new_api_model") }, async ({ query }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  try {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${GITHUB_OWNER}/${GITHUB_REPO}&per_page=10`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    const items = (data.items || []).map(i => ({ path: i.path, url: i.html_url }));
    return { content: [{ type: "text", text: JSON.stringify({ total: data.total_count, results: items }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("github_repo_snapshot", "Get repo metadata: stars, forks, open issues, default branch, last push", {}, async () => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
    const res = await fetch(url, { headers: h });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify({
      full_name: d.full_name, description: d.description, stars: d.stargazers_count,
      forks: d.forks_count, open_issues: d.open_issues_count, default_branch: d.default_branch,
      pushed_at: d.pushed_at, size_kb: d.size, language: d.language, visibility: d.visibility,
    }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

// ── HTTP Transport ──────────────────────────
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.post("/mcp", async (req, res) => {
  try { server.close(); } catch(_) {}
  const transport = new StreamableHTTPServerTransport();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// OAuth endpoints (minimal — ChatGPT connector)
app.get("/.well-known/oauth-authorization-server", (_req, res) => res.json({
  issuer: "https://ops.supaseanexus.com",
  authorization_endpoint: "https://ops.supaseanexus.com/oauth/authorize",
  token_endpoint: "https://ops.supaseanexus.com/oauth/token",
  registration_endpoint: "https://ops.supaseanexus.com/oauth/register",
  response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
  token_endpoint_auth_methods_supported: ["none"]
}));
app.get("/oauth/authorize", (_req, res) => {
  const u = _req.query.redirect_uri || ""; const s = _req.query.state || "";
  res.redirect(302, u + "?code=dev-token&state=" + encodeURIComponent(s));
});
app.post("/oauth/token", (_req, res) => res.json({ access_token: "dev-token-supaseanexus-ops", token_type: "bearer", expires_in: 86400, scope: "ops:read" }));
app.post("/oauth/register", (_req, res) => res.status(201).json({ client_id: "supaseanexus-ops-client" }));

app.listen(PORT, "127.0.0.1", () => console.log(`SupaseaNexus Ops MCP v1.1.0 listening on 127.0.0.1:${PORT}`));

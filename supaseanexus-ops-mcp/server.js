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
const PORT = process.env.PORT || 3003;

function resolveGitHubRepo(repo) {
  if (!repo) return { owner: GITHUB_DEFAULT_OWNER, repo: GITHUB_DEFAULT_REPO };
  const parts = repo.split("/");
  if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
  return { owner: GITHUB_DEFAULT_OWNER, repo };
}

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

// ── MCP Server ──────────────────────────────
const server = new McpServer({ name: "supaseanexus-ops", version: "1.3.0" });

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

server.tool("github_read_file", "Read a file from a GitHub repo. Defaults to NEXUS if no repo specified.", {
  path: z.string().describe("File path within the repo"),
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
}, async ({ path, repo }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/contents/${path}`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    if (data.content) {
      const text = Buffer.from(data.content, "base64").toString("utf8");
      return { content: [{ type: "text", text: `// ${owner}/${r}/${path} (${data.size} bytes, sha: ${data.sha})\n\n${text.slice(0, 8000)}${text.length > 8000 ? '\n\n... (truncated)' : ''}` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("github_list_commits", "List recent commits. Defaults to NEXUS main branch.", {
  count: z.number().optional().describe("Number of commits (default 10)"),
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
}, async ({ count = 10, repo }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}/commits?sha=main&per_page=${count}`;
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

server.tool("github_search_code", "Search code within a GitHub repo. Defaults to NEXUS.", {
  query: z.string().describe("Search term"),
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
}, async ({ query, repo }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${r}&per_page=10`;
    const res = await fetch(url, { headers: h });
    const data = await res.json();
    const items = (data.items || []).map(i => ({ path: i.path, url: i.html_url }));
    return { content: [{ type: "text", text: JSON.stringify({ total: data.total_count, results: items }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("github_repo_snapshot", "Get repo metadata. Defaults to NEXUS.", {
  repo: z.string().optional().describe("Repo as owner/name (default: sean0900108489-cpu/NEXUS)"),
}, async ({ repo }) => {
  const h = ghHeaders(); if (!GITHUB_TOKEN) return { content: [{ type: "text", text: "GITHUB_TOKEN not configured" }] };
  const { owner, repo: r } = resolveGitHubRepo(repo);
  try {
    const url = `https://api.github.com/repos/${owner}/${r}`;
    const res = await fetch(url, { headers: h });
    const d = await res.json();
    return { content: [{ type: "text", text: JSON.stringify({
      full_name: d.full_name, description: d.description, stars: d.stargazers_count,
      forks: d.forks_count, open_issues: d.open_issues_count, default_branch: d.default_branch,
      pushed_at: d.pushed_at, size_kb: d.size, language: d.language, visibility: d.visibility,
    }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

// ═══════════════ NOTION TOOLS ═══════════════
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_API = "https://api.notion.com/v1";
const NOTION_HEADERS = () => NOTION_TOKEN ? {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28"
} : {};

server.tool("notion_search", "Search all Notion pages and databases in the workspace", { query: z.string().describe("Search term") }, async ({ query }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: "NOTION_TOKEN not configured" }] };
  try {
    const res = await fetch(`${NOTION_API}/search`, { method: "POST", headers: NOTION_HEADERS(), body: JSON.stringify({ query, page_size: 20 }) });
    const d = await res.json();
    const items = (d.results || []).map(r => ({ id: r.id, title: r.title?.[0]?.plain_text || r.properties?.title?.title?.[0]?.plain_text || "(untitled)", type: r.object, url: r.url }));
    return { content: [{ type: "text", text: JSON.stringify({ count: items.length, results: items }, null, 2) }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("notion_read_page", "Read a Notion page by ID (returns block content as text)", { pageId: z.string().describe("Notion page UUID") }, async ({ pageId }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: "NOTION_TOKEN not configured" }] };
  try {
    const blocks = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=50`, { headers: NOTION_HEADERS() });
    const bd = await blocks.json();
    const text = (bd.results || []).map(b => {
      const t = b.type;
      const content = b[t]?.rich_text || b[t]?.title || [];
      return content.map(c => c.plain_text).join("");
    }).filter(Boolean).join("\n");
    return { content: [{ type: "text", text: text.slice(0, 8000) || "(empty page)" }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("notion_create_page", "Create a new Notion page under a parent page", {
  parentId: z.string().describe("Parent page ID"),
  title: z.string().describe("Page title"),
  content: z.string().optional().describe("Page content in Markdown (optional)"),
}, async ({ parentId, title, content }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: "NOTION_TOKEN not configured" }] };
  try {
    const body = { parent: { page_id: parentId }, properties: { title: { title: [{ text: { content: title } }] } } };
    const res = await fetch(`${NOTION_API}/pages`, { method: "POST", headers: NOTION_HEADERS(), body: JSON.stringify(body) });
    const d = await res.json();
    const pageId = d.id;
    if (content && pageId) {
      const blocks = content.split("\n").filter(Boolean).map(line => {
        if (line.startsWith("# ")) return { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        if (line.startsWith("## ")) return { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } };
        if (line.startsWith("- ")) return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        return { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } };
      });
      await fetch(`${NOTION_API}/blocks/${pageId}/children`, { method: "PATCH", headers: NOTION_HEADERS(), body: JSON.stringify({ children: blocks.slice(0, 100) }) });
    }
    return { content: [{ type: "text", text: `Page created: ${d.url || pageId}` }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("notion_append_blocks", "Append content blocks to an existing Notion page", {
  pageId: z.string().describe("Notion page UUID"),
  text: z.string().describe("Text content to append"),
}, async ({ pageId, text }) => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: "NOTION_TOKEN not configured" }] };
  try {
    const blocks = text.split("\n").filter(Boolean).slice(0, 100).map(line => {
      if (line.startsWith("# ")) return { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
      if (line.startsWith("## ")) return { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } };
      if (line.startsWith("- ")) return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
      return { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } };
    });
    const res = await fetch(`${NOTION_API}/blocks/${pageId}/children`, { method: "PATCH", headers: NOTION_HEADERS(), body: JSON.stringify({ children: blocks }) });
    const d = await res.json();
    return { content: [{ type: "text", text: d.error ? `Error: ${d.message}` : `Appended ${blocks.length} blocks to ${pageId}` }] };
  } catch(e) { return { content: [{ type: "text", text: `Error: ${e.message}` }] }; }
});

server.tool("notion_list_databases", "List all databases the integration can access", {}, async () => {
  if (!NOTION_TOKEN) return { content: [{ type: "text", text: "NOTION_TOKEN not configured" }] };
  try {
    const res = await fetch(`${NOTION_API}/search`, { method: "POST", headers: NOTION_HEADERS(), body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 20 }) });
    const d = await res.json();
    const items = (d.results || []).map(r => ({ id: r.id, title: r.title?.[0]?.plain_text || "(untitled)", url: r.url }));
    return { content: [{ type: "text", text: JSON.stringify({ count: items.length, databases: items }, null, 2) }] };
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
app.post("/oauth/token", (_req, res) => res.json({ access_token: "dev-token-supaseanexus-ops", token_type: "bearer", expires_in: 86400, scope: "ops:read" }));
app.post("/oauth/register", (_req, res) => res.status(201).json({ client_id: "supaseanexus-ops-client" }));

app.listen(PORT, "127.0.0.1", () => console.log(`SupaseaNexus Ops MCP v1.3.0 listening on 127.0.0.1:${PORT}`));

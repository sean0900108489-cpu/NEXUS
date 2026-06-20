import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import Database from "better-sqlite3";
import { z } from "zod";

// ── Config ──────────────────────────────────
const NEW_API_DB = process.env.NEW_API_SQLITE_PATH || "/opt/new-api/data/one-api.db";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT || 3003;

// ── Helpers ──────────────────────────────────
const db = new Database(NEW_API_DB, { readonly: true });

function safeJson(val) {
  try { return JSON.parse(val); } catch { return val; }
}

// ── MCP Server ──────────────────────────────
const server = new McpServer({
  name: "supaseanexus-ops",
  version: "1.0.0",
});

// Tool: newapi_snapshot
server.tool("newapi_snapshot", "Full snapshot: channels, options, user count", {}, async () => {
  const channels = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
  const options = db.prepare("SELECT key, value FROM options WHERE key NOT LIKE '%key%' AND key NOT LIKE '%secret%' AND key NOT LIKE '%token%'").all();
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
  return { content: [{ type: "text", text: JSON.stringify({
    channels: channels.map(c => ({ id: c.id, type: c.type, name: c.name, models: (c.models||"").split(",").filter(Boolean) })),
    options: Object.fromEntries(options.map(o => [o.key, safeJson(o.value)])),
    user_count: users.count,
  }, null, 2) }] };
});

// Tool: newapi_list_channels
server.tool("newapi_list_channels", "List all channels", {}, async () => {
  const ch = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
  return { content: [{ type: "text", text: JSON.stringify(ch.map(c => ({
    id: c.id, type: c.type, name: c.name,
    models: (c.models||"").split(",").filter(Boolean),
    base_url: c.base_url || "(default)",
  })), null, 2) }] };
});

// Tool: newapi_enabled_models
server.tool("newapi_enabled_models", "All enabled models", {}, async () => {
  const ch = db.prepare("SELECT models FROM channels").all();
  const models = [...new Set(ch.flatMap(c => (c.models||"").split(",").filter(Boolean)))];
  return { content: [{ type: "text", text: JSON.stringify({ enabled_models: models.sort(), count: models.length }, null, 2) }] };
});

// Tool: supabase_gateway_audit
server.tool("supabase_gateway_audit", "Gateway health check", {}, async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { content: [{ type: "text", text: "SUPABASE not configured" }] };
  const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  const r = {};
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/user_new_api_tokens?select=count`,{headers:h}); r.tokens = (await res.json())[0]?.count||0; } catch(e) { r.tokens = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/model_usage_ledger?select=count&source_type=is.null`,{headers:h}); r.null_source = (await res.json())[0]?.count||0; } catch(e) { r.null_source = `err:${e.message}`; }
  try { const res = await fetch(`${SUPABASE_URL}/rest/v1/sync_operations?select=count&status=eq.conflicted`,{headers:h}); r.conflicted = (await res.json())[0]?.count||0; } catch(e) { r.conflicted = `err:${e.message}`; }
  return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
});

// Tool: diagnose_model_route
server.tool("diagnose_model_route", "Trace model routing", { modelId: z.string() }, async ({ modelId }) => {
  const ch = db.prepare("SELECT id, type, name, models FROM channels").all();
  const opts = db.prepare("SELECT value FROM options WHERE key='ModelRatio'").get();
  const ratio = opts ? safeJson(opts.value) : {};
  const matched = ch.filter(c => (c.models||"").split(",").map(m=>m.trim()).includes(modelId));
  return { content: [{ type: "text", text: JSON.stringify({
    model_id: modelId,
    channels: matched.map(c => ({ id: c.id, name: c.name, type: c.type })),
    model_ratio: ratio[modelId] ?? "NOT SET",
    routing: matched.length ? "READY" : "MISSING",
  }, null, 2) }] };
});

// Tool: nexus_newapi_diff
server.tool("nexus_newapi_diff", "NEXUS vs New API diff", {}, async () => {
  const nexus = ["gpt-4o-mini","gpt-4o","deepseek-chat","deepseek-v4-flash","deepseek-v4-pro","gemini-2.5-flash","gemini-2.5-pro","claude-sonnet-4-20250514","img2","riverflow-v2.5-fast"];
  const ch = db.prepare("SELECT models FROM channels").all();
  const api = [...new Set(ch.flatMap(c => (c.models||"").split(",").filter(Boolean)))];
  const missing = nexus.filter(m => !api.some(a => a.includes(m)||m.includes(a)));
  const extra = api.filter(a => !nexus.some(m => a.includes(m)||m.includes(a)));
  return { content: [{ type: "text", text: JSON.stringify({ nexus: nexus.length, api: api.length, in_nexus_not_api: missing, in_api_not_nexus: extra }, null, 2) }] };
});

// ── HTTP Transport ──────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// MCP endpoint
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`SupaseaNexus Ops MCP listening on 127.0.0.1:${PORT}`);
});

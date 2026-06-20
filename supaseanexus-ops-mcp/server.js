import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";

// ── Config ──────────────────────────────────
const NEW_API_DB = process.env.NEW_API_SQLITE_PATH || "/opt/new-api/data/one-api.db";
const NEW_API_URL = process.env.NEW_API_INTERNAL_BASE_URL || "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_REPO = process.env.GITHUB_REPO || "sean0900108489-cpu/NEXUS";

// ── Helpers ──────────────────────────────────
const db = new Database(NEW_API_DB, { readonly: true });

function redact(value, show = 4) {
  const s = String(value || "");
  if (s.length <= show * 2) return s;
  return s.slice(0, show) + "..." + s.slice(-show);
}

function safeJson(val) {
  try { return JSON.parse(val); } catch { return val; }
}

// ── Server ──────────────────────────────────
const server = new McpServer({
  name: "supaseanexus-ops",
  version: "1.0.0",
});

// Tool: newapi_snapshot
server.tool(
  "newapi_snapshot",
  "Full snapshot of New API: container, channels, models, options",
  {},
  async () => {
    const channels = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
    const options = db.prepare("SELECT key, value FROM options WHERE key NOT LIKE '%key%' AND key NOT LIKE '%secret%' AND key NOT LIKE '%token%'").all();
    const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
    
    return {
      content: [{ type: "text", text: JSON.stringify({
        channels: channels.map(c => ({ ...c, models: (c.models || "").split(",") })),
        options: Object.fromEntries(options.map(o => [o.key, safeJson(o.value)])),
        user_count: users.count,
        db_path: NEW_API_DB,
      }, null, 2) }],
    };
  }
);

// Tool: newapi_list_channels
server.tool(
  "newapi_list_channels",
  "List all New API channels with models",
  {},
  async () => {
    const channels = db.prepare("SELECT id, type, name, models, base_url FROM channels").all();
    return {
      content: [{ type: "text", text: JSON.stringify(channels.map(c => ({
        id: c.id, type: c.type, name: c.name,
        models: (c.models || "").split(","),
        base_url: c.base_url || "(default)",
      })), null, 2) }],
    };
  }
);

// Tool: newapi_enabled_models
server.tool(
  "newapi_enabled_models",
  "List all enabled models from all channels",
  {},
  async () => {
    const channels = db.prepare("SELECT models FROM channels").all();
    const models = [...new Set(channels.flatMap(c => (c.models || "").split(",").filter(Boolean)))];
    return {
      content: [{ type: "text", text: JSON.stringify({ enabled_models: models.sort(), count: models.length }, null, 2) }],
    };
  }
);

// Tool: supabase_gateway_audit
server.tool(
  "supabase_gateway_audit",
  "Check Supabase NEXUS gateway health: tokens, ledger, sync",
  {},
  async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return { content: [{ type: "text", text: "SUPABASE_URL/KEY not configured" }] };
    }
    
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
    const results = {};
    
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/user_new_api_tokens?select=count`, { headers });
      results.tokens = `count=${(await r.json())[0]?.count || 0}`;
    } catch (e) { results.tokens = `error: ${e.message}`; }
    
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/model_usage_ledger?select=count&source_type=is.null`, { headers });
      results.null_source_type = (await r.json())[0]?.count || 0;
    } catch (e) { results.null_source_type = `error: ${e.message}`; }
    
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sync_operations?select=count&status=eq.conflicted`, { headers });
      results.conflicted_sync = (await r.json())[0]?.count || 0;
    } catch (e) { results.conflicted_sync = `error: ${e.message}`; }
    
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

// Tool: diagnose_model_route
server.tool(
  "diagnose_model_route",
  "Trace full model routing: NEXUS catalog → plan → token → New API channel",
  { modelId: z.string().describe("NEXUS model ID (e.g., riverflow-v2.5-fast, img2)") },
  async ({ modelId }) => {
    const channels = db.prepare("SELECT id, type, name, models FROM channels").all();
    const options = db.prepare("SELECT value FROM options WHERE key='ModelRatio'").get();
    const modelRatio = options ? safeJson(options.value) : {};
    
    const matchedChannels = channels.filter(c => 
      (c.models || "").split(",").map(m => m.trim()).includes(modelId)
    );
    
    return {
      content: [{ type: "text", text: JSON.stringify({
        model_id: modelId,
        channels_matched: matchedChannels.map(c => ({ id: c.id, name: c.name, type: c.type })),
        model_ratio: modelRatio[modelId] ?? "NOT SET",
        routing: matchedChannels.length > 0 ? "READY" : "MISSING — add to a channel in New API",
      }, null, 2) }],
    };
  }
);

// Tool: nexus_newapi_diff (simplified — reads from known catalog)
server.tool(
  "nexus_newapi_diff",
  "Compare NEXUS model catalog with New API enabled models",
  {},
  async () => {
    // Known NEXUS catalog models
    const nexusModels = [
      "gpt-4o-mini", "gpt-4o", "deepseek-chat", "deepseek-v4-flash", "deepseek-v4-pro",
      "gemini-2.5-flash", "gemini-2.5-pro", "claude-sonnet-4-20250514",
      "img2", "riverflow-v2.5-fast"
    ];
    
    const channels = db.prepare("SELECT models FROM channels").all();
    const newApiModels = [...new Set(channels.flatMap(c => (c.models || "").split(",").filter(Boolean)))];
    
    const missing = nexusModels.filter(m => !newApiModels.some(n => n.includes(m) || m.includes(n)));
    const extra = newApiModels.filter(n => !nexusModels.some(m => n.includes(m) || m.includes(n)));
    
    return {
      content: [{ type: "text", text: JSON.stringify({
        nexus_catalog_count: nexusModels.length,
        newapi_enabled_count: newApiModels.length,
        in_nexus_not_in_newapi: missing,
        in_newapi_not_in_nexus: extra,
      }, null, 2) }],
    };
  }
);

// ── Start ───────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

# SupaseaNexus Ops MCP Server

Read-only MCP connector for ChatGPT to inspect New API, Supabase, and GitHub state.

## Tools
- `newapi_snapshot` — channels, options, user count
- `newapi_list_channels` — channel list with models
- `newapi_enabled_models` — all enabled model IDs
- `supabase_gateway_audit` — tokens, ledger, sync health
- `diagnose_model_route` — trace a model from catalog → New API
- `nexus_newapi_diff` — compare NEXUS catalog vs New API

## Deploy
```bash
scp -r supaseanexus-ops-mcp root@170.64.201.54:/opt/
ssh root@170.64.201.54
cd /opt/supaseanexus-ops-mcp
npm install

# Create systemd service
cat > /etc/systemd/system/nexus-ops-mcp.service << 'EOF'
[Unit]
Description=SupaseaNexus Ops MCP Server
After=network.target
[Service]
Type=simple
User=nexusops
WorkingDirectory=/opt/supaseanexus-ops-mcp
Environment=NODE_ENV=production
Environment=NEW_API_SQLITE_PATH=/opt/new-api/data/one-api.db
Environment=NEW_API_INTERNAL_BASE_URL=http://127.0.0.1:3000
Environment=SUPABASE_URL=https://xjuglddxwnikvcwxfbzg.supabase.co
Environment=SUPABASE_SERVICE_ROLE_KEY=<REDACTED>
ExecStart=/usr/bin/node server.js
Restart=always
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexus-ops-mcp
systemctl start nexus-ops-mcp
```

## Test
```bash
npx @modelcontextprotocol/inspector@latest --server-url https://ops.supaseanexus.com/mcp --transport http
```

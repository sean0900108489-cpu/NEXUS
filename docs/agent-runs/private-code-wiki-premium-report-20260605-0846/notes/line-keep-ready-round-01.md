Round 01 - 安全邊界與成果資料夾

本輪完成：
- 確認 cwd 是 /Users/sean/Documents/FreeChat。
- 建立 branch：agent/private-code-wiki-premium-report。
- 建立成果資料夾：docs/agent-runs/private-code-wiki-premium-report-20260605-0846/。
- 建立 assets、notes、round-logs、reports、context-packs。
- 新增 .codewikiignore / .agentignore，排除 .next、node_modules、.env*、secrets、keys、db、cache/build output。
- 建立 private-codebase-wiki skill：repo 內 .agents/skills/... 以及目前 Codex 可讀的 /Users/sean/.codex/skills/...。
- 複製既有第三方 skill/tool audit 到本次 run：reports/security/third-party-skill-audit.md。

本輪 ROI：高，先固定安全邊界與輸出位置，避免後續掃描污染 source 或誤掃 secrets/build cache。

最大風險：開始前工作樹已有大量既有修改與未追蹤檔案，後續會在 completion report 區分。

還沒做：
- secret scan
- Supabase map
- 大型檔案責任盤點
- dependency-cruiser / Knip report-only
- CodeWiki safety decision
- 圖片與互動 HTML
- manifest / completion report
- 本地 HTML 驗證

下一輪：只讀掃描安全關鍵字、Supabase touchpoints、核心大型檔案與 repo map。

預估距離不怕費時間燒 token、整體執行達標到質量上限：還需 5 輪。

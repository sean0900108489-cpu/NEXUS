Round 02 - 只讀掃描與核心地圖

本輪完成：
- 安全關鍵字掃描與 raw secret shape 掃描，只記錄 path / line / pattern，不輸出任何 secret 值。
- 建立 reports/security/secret-scan-report.md。
- 建立 Supabase manifest：reports/supabase/supabase-connection-manifest.json。
- 建立 Supabase risk register：reports/supabase/supabase-risk-register.md。
- 掃描四個核心大檔：nexus-ops.tsx、nexus-graph.tsx、workflow-pro-surface.tsx、nexus-store.ts。
- 跑 dependency-cruiser report-only；因 alias 解析不足，補自製 import graph。
- 跑 Knip report-only；只列疑點，不刪檔、不改 package。
- 建立 reports/00 到 reports/10、repo-map、context-pack、Serena 評估、CodeWiki safety decision。
- 建立 machine-manifest.json 初稿。

Evidence：
- Supabase touchpoints：137 files / 24 tables / 1 RPC / 25 migrations / 22 RLS-policy migrations。
- 自製 import graph：400 source files / 1317 internal edges / 9 suspected cycles。
- 大型檔案：nexus-ops.tsx 9653 行、nexus-store.ts 4814 行、nexus-graph.tsx 2345 行、workflow-pro-surface.tsx 1721 行。
- Knip：113 個疑似 unused file issue，沒有刪改。
- Raw secret shape hits：24 筆；.env.local 是預期配置，但 source/docs/tests 也有 OpenAI key 形狀字串，未確認前列 P0。

Inference：
- nexus-ops.tsx 與 nexus-store.ts 是最大重構風險。
- Supabase service role 目前看起來主要在 backend/API 邊界，但必須保留 bundle safety gate。
- generated image storage 使用 nexus-generated-assets bucket，不能只看 literal storage scan。

Contradiction / Blocked：
- CodeWiki 可用但可能外送 repo 給 provider；沒有證明 local-only 前，本輪依安全閘門不執行。
- Supabase CLI 本機不存在，且缺 supabase/config.toml，本輪沒有 local schema parity。

Computer Use / Provider：
- Round 01 LINE Keep 已貼送。
- 本輪尚未做 provider/image API，下一輪處理報告圖片。

目前施工/探索評分：8.1 / 10。
預估距離不怕費時間燒 token、整體執行達標到質量上限：還需 4 輪。

Round 03 - 真實 Image API 視覺資產與掃描校正

本輪完成：
- 依序檢查 .env.local、.env、~/.gateway.env 的 image provider 設定，只記錄 presence/source，不輸出 key。
- 使用真實 OpenAI-compatible image generation API 生成 5 張報告視覺圖。
- 更新 assets/data/image-metadata.json 與 machine-manifest.json 的 image_assets。
- 產出 index.html 初版。
- 預檢發現 HTML 指向尚未存在的 round-03.md，以及 secret scanner 對 task-heartbeat 類檔名 false positive。
- 改更嚴格 secret-shape pattern 後重掃。
- 修正 risk register / secret report：tracked source 目前剩 src/lib/backend/observability/observability-service.test.ts:121 的 bearer-shaped token assignment 需確認是否 dummy。

Evidence：
- cover.png、system-architecture.png、supabase-connection-map.png、module-migration-map.png、risk-heatmap.png 全部由真實 OpenAI image API 生成，status 200。
- image metadata 只記錄 model/status/source 類型，不含 raw key。
- 嚴格 raw secret shape 掃描：2 hits；.env.local 是預期配置，tracked source 剩 1 個 test fixture 風險。

Inference：
- image provider 真實可用。
- 原先 24 筆 raw secret shape hit 大多是 false positive，不應誤導成大規模 source leak。
- observability-service.test.ts 的 bearer-shaped token 仍需下一輪確認或改成明確 dummy。

Contradiction / Blocked：
- 無 provider blocked；5 張圖都是真實 API 成功。
- 尚未完成 Chrome/localhost 畫面驗證，下一步做。

目前施工/探索評分：8.8 / 10。
預估距離不怕費時間燒 token、整體執行達標到質量上限：還需 2 輪。

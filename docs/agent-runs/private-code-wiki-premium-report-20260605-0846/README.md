# Private Code Wiki Premium Report

本次成果資料夾：docs/agent-runs/private-code-wiki-premium-report-20260605-0846/

## 入口

- HTML：index.html
- Markdown 主報告：report.md
- Machine manifest：machine-manifest.json
- Completion report：completion-report.md

## 安全邊界

- 不改 src/ 業務邏輯。
- 不連 production Supabase。
- 不輸出 raw secrets。
- 不上傳 repo 到 hosted analyzer。
- 所有成果集中在本 run folder。

## 目前狀態

Round 01/02 已完成：安全邊界、audit 引用、secret scan、Supabase map、large file inventory、dependency/Knip report-only、machine-readable 初稿。圖片與 HTML 在後續 round 生成。

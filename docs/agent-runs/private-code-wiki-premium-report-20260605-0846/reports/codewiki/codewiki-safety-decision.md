# CodeWiki Safety Decision

## 結論

本輪未執行 CodeWiki。

## 原因

既有第三方 audit 指出 CodeWiki 本質是 repo documentation generator，可能把 repo 內容交給選定 LLM provider / Codex CLI。使用者的最高安全閘門要求：任何工具若即將把 repo 內容送到外部 LLM provider、hosted analyzer、remote API、GitHub Pages、第三方圖床、或 production Supabase，必須停止並說明風險。

## 替代作法

本輪使用本地 rg、Node 解析、dependency-cruiser report-only、Knip report-only、自製 import graph 產出等價 private wiki，不把 repo 送到 hosted analyzer。

## 下一輪可行條件

若要真的跑 CodeWiki，需要先證明：

- provider 是本機 Codex subscription mode，且不會上傳 source 到第三方 hosted analyzer。
- .codewikiignore 生效。
- output folder 指向本次 run folder。
- 不讀 .env*、.next、node_modules。

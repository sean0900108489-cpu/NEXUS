# 09 Risk Register

## 風險 1：Workspace God File

如果 WorkspaceShell 開始知道所有 app 細節，就會回到巨大檔案問題。

解法：WorkspaceShell 只能 host runtime，不放 app business logic。

## 風險 2：兩套 Runtime

如果 `/desktop` 一套 window runtime，workspace 又一套 floating runtime，未來維護會爆炸。

解法：盤點後抽 shared runtime。

## 風險 3：過早 Marketplace

Marketplace 會牽涉 profiles、feed、comments、payments、reviews、moderation、trust。如果 runtime 沒穩就做，會重工。

解法：先 runtime，再 product。

## 風險 4：Capability Registry 變 Runtime Engine

Capability Registry 應該只做 metadata。如果讓它控制 runtime，會過度抽象。

解法：capability 不阻止 app，不自動組 app。

## 風險 5：登入入口錯誤

登入後如果直接進 `/desktop`，會違背 workspace-first 方向。

解法：登入後回原本 NEXUS / Workspace entry。

## 風險 6：新 app 變新頁面

如果未來 Airtasker / Reddit / Canva 都做成獨立頁面，會偏離 floating app platform。

解法：新產品預設做成 workspace floating app。

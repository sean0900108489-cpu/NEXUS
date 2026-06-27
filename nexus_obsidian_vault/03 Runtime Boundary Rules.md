# 03 Runtime Boundary Rules

## 目的

避免 Workspace 再次變成巨大單檔或 god shell。

Workspace-first 不等於 workspace-god-file。

## 最大風險

如果所有功能都塞進 Workspace 本體，一定會爆量巨大。

錯誤形式：

```text
Workspace.tsx
  knows sandbox
  knows chat
  knows notes
  knows forum
  knows feed
  knows marketplace
  knows reddit
  knows canva
  owns all state
  owns all API calls
```

## 正確形式

```text
WorkspaceShell
  only hosts runtime

FloatingRuntime
  manages windows

FloatingAppRegistry
  knows metadata

features/*
  own business logic
```

## 防爆規則

1. WorkspaceShell 不准 import app internal business files。
2. WorkspaceShell 只能 import runtime / registry。
3. Window frame 不知道 app 內容。
4. App content 不直接改 workspace layout。
5. 跨 app 溝通只能走 ResourceRef、Commands、Bridge、Capability metadata。
6. 單檔超過 250 到 300 行就拆。
7. feature folder 超過一個責任就拆 api / types / components / store。
8. 不要把所有 state 塞進單一 nexus-store。
9. Capability Registry 只做 metadata，不控制 runtime。
10. New app = new feature folder + registry entry。

## 文件結論

Workspace 可以承載所有浮動 app，但 Workspace 不應擁有所有 app 邏輯。

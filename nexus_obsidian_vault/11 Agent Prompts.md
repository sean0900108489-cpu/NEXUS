# 11 Agent Prompts

## R0 Restore Login Landing

```text
請修正登入後 landing 行為。

目前問題：登入後被導向 /desktop。

新方向：NEXUS 是 Workspace-first Floating App Platform。使用者登入後應回到原本 NEXUS / Workspace-first 入口。/desktop 只保留為 proof-of-concept，不是預設登入目的地。

請搜尋所有 /desktop redirect，包括 router.push('/desktop')、redirect('/desktop')、next=/desktop、auth callback、middleware、login page、onAuthStateChange。

修正原則：一般登入 fallback 回 / 或原本 NEXUS home。只有使用者明確帶 next=/desktop 時，登入後才回 /desktop。

不要刪 /desktop。不要刪已完成 features。不要做 DB migration。不要重寫 workspace。

完成後跑 typecheck、build、smoke /、/desktop、/workspace/[id]。commit message: v41: restore login landing to nexus。
```

## R1 Workspace Floating Runtime Inventory

```text
請啟動 Workspace Floating Runtime Inventory。

目標：盤點現有 Workspace 內部 floating window system，以及 /desktop proof-of-concept window runtime，產出 unification plan。

請搜尋 workspace、sandbox、floating window、panel、agent window、resize、drag、z-index、layout persistence、WorkspacePanel、NexusAgent、NexusOps、WindowFrame、WindowManager。

請回報：
A. Workspace 現有 floating window 檔案
B. 現有 window state 結構
C. drag / resize / focus / z-index 如何實作
D. toolbar actions 如何實作
E. /desktop WindowFrame 和 workspace floating window 差異
F. 哪些能力可以抽 shared runtime
G. 風險點

不要重寫。不新增功能。不刪 /desktop。不做 DB migration。只產出 inventory 和 plan。
```

## R2 Shared Floating Runtime Plan

```text
請設計 shared floating runtime。

目標：讓 Workspace 和 /desktop proof-of-concept 共享同一套底層 window runtime，但產品主線是 Workspace。

請規劃：
- runtime folder structure
- FloatingWindowFrame
- FloatingWindowManager
- FloatingAppRegistry
- layout persistence adapter
- workspace context adapter
- app lifecycle
- migration steps

不要一次實作大搬家。先做 plan。
```

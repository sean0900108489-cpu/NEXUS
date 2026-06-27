# 04 Migration From Desktop Proof of Concept

## 目的

重新定位 `/desktop`。

`/desktop` 之前做了很多有價值的 proof-of-concept，但不應是最終主舞台。

## `/desktop` 裡值得保留的能力

- app registry
- capability registry
- resource refs
- notes bridge
- profile primitive
- feed primitive
- interaction primitive
- developer inspector
- command palette
- notification center
- layout utilities
- artifact preview
- artifact library

## 新定位

`/desktop` 是：

- 實驗場
- capability proof-of-concept
- developer playground
- future runtime staging area

不是：

- default login landing
- final product home
- workspace replacement

## 遷移策略

不要一次重寫。

建議：

1. 恢復登入後回到原本 NEXUS / Workspace。
2. 盤點 workspace 現有 floating window system。
3. 比較 workspace floating window 和 `/desktop` WindowFrame。
4. 抽 shared floating runtime。
5. 讓 Workspace 使用 shared runtime。
6. 把已完成的 POC apps 逐步接成 workspace floating apps。

## 不要做

- 不要刪 `/desktop`。
- 不要一次搬全部。
- 不要立刻 marketplace。
- 不要讓 workspace 和 desktop 形成兩套永久 runtime。

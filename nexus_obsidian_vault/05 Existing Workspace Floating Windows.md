# 05 Existing Workspace Floating Windows

## 目的

盤點目前 Workspace 內部已存在的 floating window 系統，例如 sandbox 浮動視窗。

## 要調查的問題

- Workspace floating window 相關檔案在哪裡？
- 現有 window state 怎麼存？
- drag / resize 誰負責？
- maximize / minimize 誰負責？
- focus / z-index 誰負責？
- toolbar actions 是否寫死？
- sandbox / agent / preview 能否變成 registry app？
- workspace floating window 和 `/desktop` WindowFrame 差在哪？

## 要保留的視覺語言

從截圖看，現有 workspace floating window 有很多可保留元素：

- 深色玻璃感視窗
- sandbox header
- toolbar action
- workspace grid 背景
- 右側 tool rail
- bottom prompt bar
- sync 狀態

這些可以成為 NEXUS 的主要 workspace runtime 視覺。

## 目標

不是丟掉 workspace 現有 floating windows，而是把它升級成更通用的 floating app runtime。

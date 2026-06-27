# 06 Capability System Repositioning

## 目的

重新定位 Capability Registry。

之前 Capability Registry 是跟 `/desktop` Window OS 一起發展的。現在它應該被重新定位成 NEXUS Floating App Runtime 的 metadata layer。

## 新定位

Capability Registry 屬於 workspace floating app architecture。

它回答：

- 這個 floating app 提供哪些能力？
- 未來某種產品 archetype 需要哪些能力？
- 現有 runtime 缺哪些能力？

## 現有 capability

- chat
- feed
- thread
- composer
- comments
- media-upload
- resource-library
- resource-preview
- notes-capture
- profiles
- reactions
- follow-graph
- search
- notifications
- commands
- moderation
- canvas
- templates
- export
- collaboration
- marketplace
- payments
- reviews
- workspace

## 原則

Capability Registry 只做 metadata。

它不控制 runtime，不阻止 app 開啟，不自動組裝產品。

## 正確使用方式

Airtasker-like floating app 可以宣告：

```text
marketplace + profiles + feed + media-upload + comments + payments + reviews
```

Canva-like floating app 可以宣告：

```text
canvas + resource-library + templates + export + collaboration
```

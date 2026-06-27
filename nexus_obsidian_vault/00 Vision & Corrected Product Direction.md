# 00 Vision & Corrected Product Direction

## 目的

修正 NEXUS 的產品北極星。

之前的規劃重心偏向獨立 `/desktop` / Window OS，這會讓產品看起來像要另外做一個桌面系統。這不是目前真正意圖。

真正意圖是：

**NEXUS 本體就是 workspace-first floating app platform。**

## 正確產品方向

使用者登入後應回到原本 NEXUS / Workspace-first 入口。

Workspace 是主舞台。所有新功能不是新頁面，不是外部網站，也不是單純 iframe，而是 workspace 裡可以開啟、拖曳、縮放、管理的 floating app。

## 不正確方向

不應把 `/desktop` 當成最終主線產品入口。

不應讓使用者登入後自動被拉到 Window OS / Desktop 實驗場。

不應把 Workspace 降級成 `/desktop` 裡的一個 app。

## 正確主從關係

```text
NEXUS Workspace
  ├── Workspace Shell
  ├── Floating App Runtime
  └── Floating Apps
        ├── Sandbox
        ├── Chat
        ├── Notes
        ├── Forum
        ├── Feed
        ├── Profile
        ├── Marketplace-like
        ├── Reddit-like
        └── Canva-like
```

## `/desktop` 的新定位

`/desktop` 不是要刪掉。

它目前應被視為：

- proof-of-concept
- capability sandbox
- runtime experiment
- developer testing surface

之後應把它裡面做好的能力吸收回 workspace floating runtime。

## 核心一句話

**NEXUS 的最高層不是 Window OS，而是 Workspace Floating App Runtime。**

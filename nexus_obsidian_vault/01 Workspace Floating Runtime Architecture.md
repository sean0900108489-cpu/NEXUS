# 01 Workspace Floating Runtime Architecture

## 目的

定義 Workspace 裡的 floating app runtime 架構，讓未來所有新功能都能接入同一套浮動視窗系統。

## 架構分層

```text
Workspace Shell
  只管舞台、背景、workspace context、右側工具列、底部 prompt bar。

Floating Runtime
  只管開窗、關窗、拖曳、縮放、focus、z-index、layout persistence。

Floating App Registry
  只管有哪些 app 可以被開啟。

Feature Folders
  每個 app 自己管自己的 UI、API、types、state、business logic。
```

## Workspace Shell 責任

Workspace Shell 負責：

- workspace background / grid
- workspace context
- right rail
- bottom prompt bar
- sync status
- opening entry points
- hosting runtime

Workspace Shell 不負責：

- Marketplace business logic
- Reddit-like feed logic
- Canva canvas logic
- Forum thread logic
- Notes storage logic
- Profile query logic

## Floating Runtime 責任

Floating Runtime 負責：

- open window
- close window
- drag
- resize
- minimize
- maximize
- focus
- z-index
- snap / cascade
- window toolbar
- window chrome
- layout persistence
- taskbar / dock / launcher

## App Content Slot

Runtime 只提供 frame 和 slot。

App 內容由 feature folder 提供。

```text
FloatingWindowFrame
  └── AppComponent
```

Runtime 不知道 app 裡面做什麼。

## 目標

未來新增一個 app 時，理想流程是：

1. 建立 `src/features/my-app/`
2. 建立 `MyAppWindow.tsx`
3. 寫 `my-app-api.ts` 和 `my-app-types.ts`
4. 在 floating app registry 註冊
5. Workspace 自動可以開啟

WorkspaceShell 不需要被大改。

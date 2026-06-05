# 04 State Store Contracts

## 這是什麼

src/store/nexus-store.ts 是 Zustand store，使用 persist、idb-keyval、zundo temporal，並連接 Supabase sync、runtime lite、workflow pro group/trace publish。

## 依賴什麼

- zustand, zustand/middleware, zundo, idb-keyval
- src/lib/state-sync.ts
- src/lib/supabase/client.ts
- src/lib/workflow-runtime-lite/*
- src/lib/workflow-pro/group-record-client.ts
- src/lib/api/nexus-api-client.ts

## 責任 inventory

- Workspace 建立/選擇/恢復。
- Agent graph 與 agent template。
- Chat message/history active window。
- Artifact vault/cache。
- Supabase cloud sync。
- Workflow runtime lite state/run/group/trace。
- Provider-backed LLM/image runtime bridge。
- Local persistence、undo/redo。

## Migration map

1. 先產出 store action list 與 selector contract，不改行為。
2. 補 characterization tests：workspace load/save、runtime run、generated history、Supabase sync。
3. 抽 workflowRuntimeSlice，但保留 public action name。
4. 抽 cloudSyncSlice，包住 Supabase side effect。
5. 抽 artifactVaultSlice / generatedHistorySlice。
6. 最後才拆 persistence/temporal。

## 不應該先動

- Persist migration schema。
- zundo temporal integration。
- Provider-backed execution path。
- Supabase sync write path。

## Machine-readable 摘要

    {
      "file": "src/store/nexus-store.ts",
      "lines": 4814,
      "risk": "P0",
      "migrationOrder": [
        "contract map",
        "characterization tests",
        "workflow runtime slice",
        "cloud sync slice",
        "artifact/generated history slice",
        "persistence/temporal last"
      ]
    }

# 08 Agent Context Pack

## 下一輪 agent 必讀

1. machine-manifest.json
2. context-packs/repo-map-compact.md
3. reports/02-supabase-map.md
4. reports/06-risk-register.md
5. reports/07-refactor-playbook.md

## 大型檔案讀法

- nexus-ops.tsx：先看 imports、props/state hooks、主要 panel render function，不要整份讀。
- nexus-graph.tsx：先看 node/edge data types，再讀 renderers。
- workflow-pro-surface.tsx：從 props contract 和 mode panels 讀。
- nexus-store.ts：先讀 imports、state shape、action groups、runtime/sync side effects。

## 禁止事項

- 不讀 .env* 值。
- 不掃 .next / node_modules。
- 不連 production Supabase。
- 不把 repo 丟給 hosted analyzer。

## Machine-readable 摘要

    {
      "mustRead": [
        "machine-manifest.json",
        "context-packs/repo-map-compact.md",
        "reports/02-supabase-map.md",
        "reports/06-risk-register.md"
      ],
      "avoid": [
        ".env* values",
        ".next",
        "node_modules",
        "production Supabase",
        "hosted analyzers"
      ]
    }

# 09 Unknowns And Questions

## Unknowns

- src/lib/backend/observability/observability-service.test.ts:121 的 bearer-shaped token 是否為 dummy fixture？
- nexus-generated-assets bucket 的 production policy 是否與 migration 完全一致？本輪未連 production。
- supabase/config.toml 缺失是否是刻意不保留 local stack？
- dependency-cruiser 為何無 config 時解析 alias 不完整？需 tsconfig-aware config。
- Knip 113 個 issue 中哪些是 Next route convention / dynamic import / test-only false positive？
- Workflow Pro provider-backed runtime 目前 live 狀態需下一輪真實 API + Computer Use 驗證。

## Human confirmation

- 是否允許下一輪建立 local-only Supabase config？
- 是否允許把 observability-service.test.ts 的 bearer-shaped token fixture 改成明確 dummy？
- 下一輪第一個安全重構是否從 Workflow Pro tab panels 開始？

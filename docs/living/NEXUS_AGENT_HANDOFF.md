# NEXUS Agent Handoff (V30)

> 給接手這個專案的 agent / 新上下文
> 最後更新：2026-06-17

---

## 快速啟動

新 agent 打開 repo 後，依序讀：
1. `docs/living/NEXUS_CURRENT_STATE.md` ← 最新狀態
2. `docs/living/NEXUS_TECH_DEBT_LEDGER.md` ← 技術債清單
3. `docs/living/NEXUS_SMOKE_TESTS.md` ← 煙測試記錄
4. `docs/V29_HANDOFF.md` ← V29 交接（歷史參考）
5. `docs/V29_TECH_DEBT_CROSS_REFERENCE.md` ← V29 修復對照

## 關鍵事實速查

| 問 | 答 |
|---|---|
| Production URL | `https://nexus-swart-ten.vercel.app` |
| New API 在哪 | VPS `170.64.201.54`, Docker, port 80→3000 |
| SSH 到 VPS | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| 能用哪些模型 | deepseek-chat, deepseek-v4-pro, deepseek-v4-flash |
| ModelRatio 價格 | 全部 0（MVP 階段 intentional） |
| Token 怎麼 provision | `POST /api/model-gateway/provision` |
| 哪些 route 被 legacy block | fs-scanner, web-surfer, memory-compress, predictive-intel, providers/verify |
| V30 分支 | `codex/v30` (current), 基於 main `fa0a294` |
| V30 主要修復 | idempotency lock takeover, stream abort orphan, sync counter terminal, maximize/branch mapping, graph delete confirm |

## Scope Rules

- MVP 階段：product reliability > security hardening
- Nova out of scope
- Domain/HTTPS/Cloudflare out of scope
- 不要叫使用者手動貼 token
- 不要做 full NexusOps rewrite
- 不要新增大功能
- 不要印 secrets

## 本次迭代優先級

1. P1: ResizeObserver N+1
2. P1: Artifact sync durability
3. P1: Duplicate agent names UX
4. P1: Composer reasoning mode drift
5. P1: Image gen catalog mismatch

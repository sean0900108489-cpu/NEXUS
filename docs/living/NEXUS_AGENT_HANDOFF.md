# NEXUS Agent Handoff

> 給接手這個專案的 agent / 新上下文
> 最後更新：2026-06-18 AEST
> 版本：V31 (all fixes merged, latest `e7d41c1`)

---

## 快速啟動

新 agent 打開 repo 後，依序讀：
1. `docs/living/NEXUS_CURRENT_STATE.md` ← 最新狀態
2. `docs/living/NEXUS_TECH_DEBT_LEDGER.md` ← 技術債清單
3. `docs/living/NEXUS_SMOKE_TESTS.md` ← 煙測試記錄
4. `docs/NEW_API_OPS_GUIDE.md` ← New API 運維
5. `docs/V29_HANDOFF.md` ← V29 交接（歷史參考）
6. `docs/V29_TECH_DEBT_CROSS_REFERENCE.md` ← V29 修復對照

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
| 最新 commit | `e7d41c1` on `main` |
| 主要修復 (V30-V31) | idempotency lock, stream abort, sync counter, graph delete, ResizeObserver, artifact queue, image gen catalog |

## Scope Rules

- MVP 階段：product reliability > security hardening
- Nova out of scope
- Domain/HTTPS/Cloudflare out of scope
- 不要叫使用者手動貼 token
- 不要做 full NexusOps rewrite
- 不要新增大功能
- 不要印 secrets

## Remaining P2 Debt

- SSE handler in NexusOps root (#18)
- Zundo undo stack bloat (#19)
- reasoningContent persist (#20)
- Macro save no local queue (#28)
- NexusOps god object (#33)
- /api/models contract drift (#23)
- Duplicate agent names UX (#11)
- Export wording/placeholders (#14-16)

# NEXUS Agent Report Template

> 使用此模板記錄每次 agent 迭代的工作成果

---

## 迭代資訊

| 項目 | 值 |
|---|---|
| 日期 | YYYY-MM-DD |
| 分支 | codex/vXX |
| Commit | xxxxxxx |
| 範圍 | (P0/P1/P2) |

---

## 煙測試結果

### Backend

| # | Endpoint | 結果 | 備註 |
|---|---|---|---|
| 1 | `/api/chat` | ✅/❌ | |
| 2 | `/api/v1/agents/[agentId]/stream` SSE | ✅/❌ | |
| 3 | `/api/workflow-pro/brain-draft` | ✅/❌ | |
| 4 | `model_usage_ledger` | ✅/❌ | |
| 5 | `agent_tasks` | ✅/❌ | |
| 6 | `messages` latest assistant | ✅/❌ | |

### UI

| # | 測試項目 | 結果 | 備註 |
|---|---|---|---|
| 1 | Save/Export → Sync status | ✅/❌ | |
| 2 | Maximize/Branch action mapping | ✅/❌ | |
| 3 | Graph Delete confirm | ✅/❌ | |
| 4 | Agent chat stream | ✅/❌ | |
| 5 | Composer reasoning mode | ✅/❌ | |

---

## 本輪修復

| # | 問題 | Root Cause | 修復 | 檔案 |
|---|---|---|---|---|
| | | | | |

---

## P1 分析 (未修)

| # | 項目 | 結論 |
|---|---|---|
| | | |

---

## P2 / Out of Scope

| 項目 | 原因 |
|---|---|
| | |

---

## 修改檔案

| 檔案 | 改動 |
|---|---|
| | |

---

## 下次建議

1. ...
2. ...

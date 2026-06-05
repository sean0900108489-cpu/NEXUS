# Serena MCP Evaluation

## Serena 可以幫什麼

Serena 適合用在下一輪 symbol-level 理解：找 function/class references、精準讀大型檔案區段、建立安全重構 patch，而不是整份讀 9653 行。

## 它會讀哪些檔案

建議限制在 src/、supabase/migrations/、package.json、tsconfig.json、必要 docs。排除 .next/、node_modules/、.env*、secrets、db、cache。

## 如何配合 Codex

- 先讀本次 machine-manifest.json。
- 只讓 Serena 做 symbol/reference 查詢。
- 不開 unrestricted shell tools。
- 不改 global MCP config，除非你下一輪明確授權。

## 風險

MCP server 可讀專案檔案；若設定不當可能讀到 secrets 或執行 shell。第一輪不建議直接改 global MCP config。

## 建議

等這份 wiki 完成後，下一輪以 local project-scoped Serena config 接入，先只讀，再開 patch。

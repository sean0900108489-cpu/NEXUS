# 第三方 Skill / Tool 靜態審查報告

建立時間：2026-06-05  
工作目錄：`/Users/sean/Documents/skill庫`  
審查範圍：`/Users/sean/Documents/skill庫/_skill-intake/`

## 本輪邊界

這一輪只做第三方 skill / tool 的靜態審查，沒有跑你的專案掃描。

已做：

- 只檢查 `_skill-intake/` 底下已下載的第三方 repo。
- 只讀 README、`SKILL.md`、package / pyproject / Dockerfile 等公開說明與安裝線索。
- 確認目前 Codex skill 主要路徑是 `/Users/sean/.codex/skills`。
- 確認 `/Users/sean/.codex/skills` 目前已有 `gpt-image-2`、`web-design-engineer`、`kb-retriever`、`web-video-presentation`。
- 確認 `/Users/sean/.agents/skills` 與本工作目錄 `.agents/skills` 目前不存在。

未做：

- 沒有掃描你的專案 source。
- 沒有讀 `.env`、`.env.local`、key、token 或 secret。
- 沒有執行 CodeWiki。
- 沒有執行 dependency-cruiser。
- 沒有執行 Knip。
- 沒有連 Supabase。
- 沒有修改 MCP global config。
- 沒有執行任何第三方 install script。
- 沒有改 `src/` 或任何業務邏輯。

## 快速結論

目前最安全的路線是：

1. 先沿用本機已安裝的 `/Users/sean/.codex/skills/web-design-engineer` 和 `/Users/sean/.codex/skills/gpt-image-2`。
2. `CodeWiki`、`Aider`、`Anthropic frontend-design`、`Addy agent-skills` 第一輪只做參考，不直接安裝到 Codex skill path。
3. `dependency-cruiser`、`Knip`、`Supabase CLI` 後續可以「報告模式」使用，但必須先設定 ignore / output folder，且不要自動修復、刪檔或連 production。
4. `Wangnov/gpt-image-2-skill` 功能強，但 runtime / credential / bootstrap 路徑較重，建議暫時 reference-only；你現有的 Garden `gpt-image-2` 已可用。
5. `deepwiki-skill` 是正式 skill，但它的 workflow 明確要求「執行到完成且不要問確認」，不適合在你的私有 codebase 第一輪直接啟用。
6. `Serena MCP` 很適合之後做 symbol-level 理解與安全重構，但第一輪不要自動改 MCP 設定。

## Repo 狀態表

| Repo | 本地路徑 | HEAD | 類型 | `SKILL.md` | 安裝 / 執行線索 | 網路 / secret 風險 | source 上傳風險 | 建議 |
|---|---|---:|---|---|---|---|---|---|
| OpenAI skills | `_skill-intake/openai-skills` | `a8924c2` | 官方 skill catalog | 有，多個 | 透過 Codex `$skill-installer` 安裝 curated / experimental skills | 中：安裝後會改變 agent 行為 | 低到中：取決於被安裝 skill | reference-only；只用現有系統 skill-installer |
| CodeWiki | `_skill-intake/CodeWiki` | `972dba9` | codebase wiki CLI | 非主要 skill | `pip install git+...`、`codewiki generate` | 高：會把 repo 內容送給選定 LLM provider / Codex CLI | 高：本質是 repo documentation generator | later-use；先不跑，需 ignore 與 provider 設定 |
| Garden skills | `_skill-intake/garden-skills` | `e3e9ada` | skill collection | 有 | 本機已安裝 `gpt-image-2`、`web-design-engineer` | 中：image skill 會讀 image API env；web skill 主要是指令 | 低：不主動掃 repo，依任務操作 | install already done；本輪不重裝 |
| Wangnov gpt-image-2-skill | `_skill-intake/gpt-image-2-skill` | `ef35ef9` | image skill + CLI | 有 | Node wrapper 解析 Rust binary，可 npm global update / bootstrap download | 高：支援 env、keychain、auth.json、shared config | 低：主要處理圖片，但可讀輸入圖與檔案 | reference-only；需明確授權才安裝 |
| deepwiki-skill | `_skill-intake/deepwiki-skill` | `db31ff8` | wiki documentation skill | 有 | repo-scan → toc → doc-write → validate → summary | 中：會主動掃 repo | 高：用來讀 codebase 並生成 docs | reference-only；不直接跑 |
| Serena MCP | `_skill-intake/serena` | `c9abd9f` | MCP / semantic code tool | 不是 Codex skill | `uv`、MCP launch config | 中：MCP server 可讀取專案檔案；可有 shell tools | 中：取決於 MCP client 和工具開啟狀態 | evaluate-only；不改 global config |
| dependency-cruiser | `_skill-intake/dependency-cruiser` | `0d8becb` | JS/TS dependency analyzer | 無 | `npx depcruise ...`、可產生 dot / html / json | 低：本地分析為主 | 低：除非輸出上傳 | later report-only；不跑 init/fix |
| Knip | `_skill-intake/knip` | `ec4c779` | unused files / exports analyzer | 無 | `knip` CLI，可找 unused dependencies / exports / files | 低：本地分析為主 | 低：除非輸出上傳 | later report-only；不刪檔 |
| Supabase CLI | `_skill-intake/supabase-cli` | `b749d52` | Supabase local / remote CLI | 無 | curl install、npm、brew；可 `supabase start/link/db` | 高：可能登入、link project、操作遠端 | 中：本地 reports 低；remote 操作高 | later local-only；嚴禁 production 操作 |
| Aider | `_skill-intake/aider` | `5dc9490` | AI pair programming CLI | 無 | pip installer；自帶 repo map、git commits、LLM providers | 高：會把 code context 給 LLM | 高：本質會讀寫 repo | reference-only；只借 repo-map 概念 |
| Addy agent-skills | `_skill-intake/addy-agent-skills` | `6ce0298` | engineering skill pack | 有，23 個 | Claude / Gemini / Codex 等 agent instruction pack | 中：安裝後會大幅改變 agent 行為 | 低到中：取決於 skill | reference-only；不要整包安裝 |
| Anthropic skills | `_skill-intake/anthropic-skills` | `da20c92` | Claude skill examples/spec | 有，多個 | Claude plugin / API skill examples | 中：部分 skill 有文件 / webapp workflow | 低到中：取決於 skill | reference-only；只參考 frontend-design / spec |

## 個別審查

### 1. OpenAI 官方 Skills Catalog

用途：

- 官方 skill catalog，包含 `.system`、`.curated`、`.experimental`。
- README 說明 Codex 的系統 skills 會自動安裝，curated / experimental 可透過 `$skill-installer` 安裝。

審查結果：

- 這是可信度最高的 skill 來源之一，但不代表每個 skill 都要裝。
- Skill 本質是會影響 agent 行為的指令，不是普通文件。
- 安裝 curated / experimental skill 前仍應讀該 skill 的 `SKILL.md`。

建議：

- `reference-only`。
- 使用目前 Codex 已內建的 `skill-installer` / `skill-creator` 即可。
- 不需要把整個 repo 搬進 skill path。

### 2. Garden skills

用途：

- ConardLi 的 skill collection。
- 本機已可用的重點是 `web-design-engineer` 和 `gpt-image-2`。

觀察：

- `web-design-engineer` 用於高質感互動 HTML / dashboard / presentation / data visualization。
- `gpt-image-2` 支援三種模式：本地 API 生圖、宿主圖像工具委派、純 prompt advisor。
- Garden `gpt-image-2` 會依序讀取 CLI 參數、`process.env`、`<cwd>/.env`、`<cwd>/.gateway.env`、`~/.gateway.env`。

風險：

- `gpt-image-2` 會使用 image API key；報告與 log 不可輸出 key。
- `web-design-engineer` workflow 會強調設計確認，但實際本輪只是審查，尚未用它產 HTML。

建議：

- `install already done`。
- 後續做互動 HTML 報告時用本機 `/Users/sean/.codex/skills/web-design-engineer`。
- 後續生圖時用本機 `/Users/sean/.codex/skills/gpt-image-2`，不重裝。

### 3. Wangnov gpt-image-2-skill

用途：

- 更完整的 image generation / edit CLI + skill。
- 支援 OpenAI `gpt-image-2`、OpenAI-compatible base URL、Codex `image_generation`，並提供 JSON output / JSONL events。

觀察：

- `SKILL.md` 指出 Node wrapper 會解析底層 Rust binary：env override、bundled binary、installed binary、Tauri app bundled CLI、repo cargo run、cached release、bootstrap download。
- 支援 credential sources：`file`、`env`、`keychain`。
- 可能讀 `$CODEX_HOME/gpt-image-2-skill/config.json`、`~/.codex/auth.json`。
- README 建議在 runtime 過舊時使用 `npm install -g gpt-image-2-skill@latest`。

風險：

- Runtime 較重，包含 binary discovery / bootstrap / npm global update。
- Credential path 多，必須確保 JSON output redaction 有效，也不能把 config 內容寫進報告。
- 目前任務不需要它，因為 Garden `gpt-image-2` 已可用。

建議：

- `reference-only`。
- 只有在你明確要透明 PNG、mask edit、JSONL progress、Codex image_generation provider 整合時，再單獨授權安裝或執行。

### 4. deepwiki-skill

用途：

- 生成 codebase wiki-style documentation。
- Workflow 包含 repo-scan、toc-design、doc-write、validate-docs、doc-summary、incremental-sync。

觀察：

- `SKILL.md` 明確寫「Fully execute this workflow until completion. Do not ask for user confirmation.」
- 這和你目前「先審查、不要掃描專案」的安全邊界相衝突。

風險：

- 一旦啟用，很可能主動掃 repo 並生成大量文件。
- 不適合在尚未建立 ignore、output folder、privacy policy 前執行。

建議：

- `reference-only`。
- 可借鑑它的 wiki workflow 結構，但不要安裝或執行。

### 5. CodeWiki

用途：

- 主力 codebase wiki / repository-level documentation CLI。
- 支援 Python / Java / JavaScript / TypeScript 等多語言。
- 支援 OpenAI-compatible、Anthropic、AWS Bedrock、Azure OpenAI，也支援 Claude Code / Codex CLI subscription mode。

觀察：

- `codewiki generate` 預設會輸出到 `./docs/`。
- 可用 `--output` 指定輸出資料夾。
- 可用 `--include` / `--exclude` 控制掃描範圍。
- Subscription mode 會透過本機 `claude` / `codex` CLI 路由 LLM calls。
- Credentials 可存在 keychain 或 `~/.codewiki/credentials.json`。

風險：

- 本質會讀取 repo 並把摘要 / 內容送給選定 LLM provider 或 CLI。
- 若沒有先設定 ignore，可能掃到 `.next`、build cache、generated output 或敏感檔。
- 若預設輸出到 `docs/`，可能污染既有 docs。

建議：

- `later-use`，但本輪不跑。
- 後續若使用，必須先建立 `.codewikiignore` / `.agentignore`、指定 output 到本次 run folder、使用 Codex provider，不用 Google / Gemini。

### 6. Serena MCP

用途：

- MCP server，提供 symbol-level code retrieval、editing、refactoring、debugging 類 IDE 能力。
- 對大型 codebase 的理解與安全重構有價值。

觀察：

- README 說 Serena 透過 MCP 接到 Codex / Claude / IDE 等 client。
- 需要 `uv`，並需要 client MCP launch config。
- 可提供 read_file、search、shell 等基礎工具，也可提供 symbol-aware tools。

風險：

- 需要改 MCP config；這會影響全域 agent 工具面。
- 若 shell / read tools 開得太寬，可能讀到不該讀的檔案。
- 本輪目標只是審查，不應自動接入。

建議：

- `evaluate-only`。
- 等第一份 wiki / risk map 產出後，再決定是否接 Serena，並加 ignore / project scope。

### 7. dependency-cruiser

用途：

- JS / TS dependency graph、circular dependencies、module boundary validation。
- 可輸出 text、dot、json、csv、html 等格式。

觀察：

- README 建議 `npx depcruise --init` 產 config，或直接 `npx depcruise src --output-type dot`。
- `--init` 會建立 config，因此第一輪不應直接跑 init。

風險：

- 本地分析風險低。
- 若輸出圖或 HTML 包含內部路徑，仍應只放本地 run folder。

建議：

- `later report-only`。
- 後續只跑讀取型 report，不產生 config 或自動改檔，除非你授權。

### 8. Knip

用途：

- 找 unused dependencies、exports、files。

觀察：

- README 說 Knip can find and fix unused items。
- 這次應只跑 report，不做 fix / delete。

風險：

- 本地報告風險低。
- 但 unused 判斷容易有 false positive，尤其 Next.js dynamic route、Supabase Edge Functions、generated types、外部入口。

建議：

- `later report-only`。
- 不自動刪任何檔案，不自動修改 `package.json`。

### 9. Supabase CLI

用途：

- Local Supabase stack、migrations、Edge Functions、types、project workflow。

觀察：

- README 提供 curl、npm、brew 等安裝方式。
- 常見命令包括 `supabase start`、`supabase link`、`supabase db diff`、`supabase db push`、`supabase gen types`。

風險：

- `supabase login` / `supabase link` / `db push` / `functions deploy` 可能碰遠端專案。
- 對你的要求而言，production Supabase 是 P0 邊界，不可碰。

建議：

- `later local-only`。
- 只允許檢查 local migrations / types / config。
- 不登入、不 link、不 push、不 deploy、不操作 production。

### 10. Aider

用途：

- AI pair programming CLI，特色包含 repo map、git integration、LLM coding workflow。

觀察：

- README 說 Aider 會 map codebase，也能直接編輯、commit、lint/test。
- 它是完整 coding agent，不只是文件工具。

風險：

- 會把 code context 給 LLM provider。
- 會修改 repo，甚至自動 commit。
- 不符合這一輪只讀審查的限制。

建議：

- `reference-only`。
- 只借鑑 repo-map 思路，不安裝、不執行。

### 11. Addy Osmani agent-skills

用途：

- 23 個 production-grade engineering workflow skills。
- 涵蓋 spec、plan、build、test、review、security、frontend、documentation 等。

觀察：

- README 表示 skills 會依工作自動觸發。
- 內容偏工程品質 gate，很有參考價值，但範圍很廣。

風險：

- 整包安裝會改變 agent 的預設行為與決策口味。
- 有些 skill 可能和你目前的私有 wiki 流程重疊或衝突。

建議：

- `reference-only`。
- 不建議第一輪全裝。
- 後續可只挑 `documentation-and-adrs`、`context-engineering`、`security-and-hardening` 之類的片段做參考。

### 12. Anthropic skills

用途：

- Anthropic / Claude skill examples、spec、template。
- 包含 `frontend-design`、`web-artifacts-builder`、`webapp-testing`、document skills 等。

觀察：

- README 說這些 skill 主要是 Claude skill examples / demonstration。
- 多數可當 skill pattern 參考，不一定直接適合 Codex。

風險：

- 直接搬整包會導入大量非本任務相關技能。
- 部分 skill 可能假設 Claude runtime 或特定工具。

建議：

- `reference-only`。
- 只用 `frontend-design` 和 Agent Skills spec 作為 `web-design-engineer` 的對照參考。

## 安裝 / 使用決策

可以立即使用：

- `/Users/sean/.codex/skills/web-design-engineer`
- `/Users/sean/.codex/skills/gpt-image-2`

可以現在參考，但不要安裝：

- OpenAI skills catalog
- CodeWiki README / docs
- Aider repo-map 概念
- Addy agent-skills 的工程品質 gate
- Anthropic frontend-design / skill spec
- deepwiki-skill workflow 結構

後續可跑 report-only，但本輪不要跑：

- dependency-cruiser
- Knip
- Supabase CLI local checks

需要你再次明確授權才做：

- 安裝 Wangnov `gpt-image-2-skill`
- 執行 CodeWiki 掃你的專案
- 安裝 / 啟用 deepwiki-skill
- 修改 Serena MCP global config
- 執行任何會登入、link、push、deploy 的 Supabase CLI 命令
- 執行 curl / bash / npm global / brew install 類安裝流程

## 主要風險清單

| Priority | 風險 | 說明 | 建議 |
|---|---|---|---|
| P0 | secret 外洩 | image / LLM / Supabase 工具都可能涉及 key | 報告只列 env var 名稱，不列值 |
| P0 | production Supabase 誤操作 | `db push`、`functions deploy`、`link` 會影響遠端 | 本階段禁用遠端操作 |
| P1 | CodeWiki / Aider 類工具上傳 code context | 這類工具本質會把 repo 摘要送到 LLM | 先設 provider、ignore、output folder |
| P1 | SKILL.md 指令污染 agent 行為 | 安裝太多 skill 會改變 Codex 決策 | 不整包安裝，只挑必要 skill |
| P1 | deepwiki-skill 自動執行過頭 | 它要求不要問確認直到完成 | 不啟用，只參考 workflow |
| P2 | dependency / unused report 誤判 | dynamic imports、Next.js routes、generated files 易 false positive | report-only，人類確認後才重構 |
| P2 | install script supply-chain 風險 | curl/bash/npm global/brew 都可能改系統 | 每次安裝前單獨授權 |

## 後續建議順序

1. 建立 `private-codebase-wiki` skill 草稿，只寫 instruction，不掃專案。
2. 建立本次 run folder 與 ignore policy。
3. 做只讀 secret scan，但只輸出風險位置，不輸出值。
4. 手動產生 repo map / Supabase touchpoint map 的第一版。
5. 再決定是否跑 CodeWiki。
6. 再決定是否接 dependency-cruiser / Knip report-only。
7. 等 wiki 與 risk map 完成後，再評估 Serena MCP 是否值得接入。

## 本輪完成項

- 已下載並靜態審查允許清單中的第三方 repo。
- 已分類 skill / CLI / MCP / concept-only。
- 已標註 install / reference-only / skip / later report-only。
- 已確認目前本機 skill path 狀態。
- 已保留「不要掃專案」邊界。

## 本輪沒有做的事

- 沒有建立 branch。
- 沒有建立專案 run folder。
- 沒有建立 `.agentignore` 或 `.codewikiignore`。
- 沒有建立 `private-codebase-wiki` skill。
- 沒有掃你的專案 source。
- 沒有跑 CodeWiki / dependency-cruiser / Knip / Supabase CLI。
- 沒有讀取或輸出任何 secret 值。

## 下一句建議指令

```text
審查並建立 private-codebase-wiki skill 草稿，但仍不要掃描專案。
```

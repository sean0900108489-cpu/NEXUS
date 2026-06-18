# NEXUS Current System Intelligence Report
## 报告日期：2026-06-19 | 时区：AEST
## 分支：`agent/nexus-current-system-intelligence-20260619`

---

# 一、执行摘要 / Executive Summary

NEXUS // AI OPS 是一个基于 **Next.js App Router + Supabase + Zustand** 的 **多智能体 AI 操作 IDE**。系统采用 **local-first** 架构，通过 Supabase 实现云端持久化。当前总代码量约 **119,000 行**，包含 **60 个路由/页面/布局文件**、**26 个 React 组件**、**111 个后端服务文件**、**26 个数据库表** 和 **28 个迁移文件**。

核心架构围绕一个 **集中式注册中心**（`nexus-registry.ts`）构建，所有 provider、model、capability、tool slot、graph node 均在此注册。系统定义了 **L1-L4 分层架构**，当前 L3（工作区图和运行时）实现最完整，L2（handoff 路由）和 L4（部分能力）尚在规划中。

# 二、关键数字 / Key Numbers

| 指标 | 数值 |
|---|---|
| **路由/页面/布局文件总数** | **60** |
| API route.ts 文件数 | **57** |
| page.tsx 文件数 | **2** |
| layout.tsx 文件数 | **1** |
| NEXUS 组件数 | **23** |
| Style Engine 组件数 | **2** |
| 后端服务文件数 | **111** |
| Supabase 客户端文件数 | **5** |
| 数据库表数 | **26** |
| 迁移文件数 | **28** |
| Store 状态字段数 | **~40** |
| Store 操作数 | **~100** |
| 超过 1000 行的文件数 | **16** |
| 超过 3000 行的文件数 | **3** |
| 已实现功能数 | **81+** |

# 三、架构图 / Architecture

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (CLIENT)                  │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │ NexusOps│──▶│ NexusStore   │──▶│NexusApiClient│  │
│  │(3684行) │◀──│ (4679行)     │◀──│(fetch封装)  │  │
│  └─────────┘   └──────┬───────┘   └──────┬──────┘  │
│                       │                   │         │
│              ┌────────▼───────┐           │         │
│              │  IndexedDB     │           │         │
│              │  (本地持久化)   │           │         │
│              └────────────────┘           │         │
└──────────────────────────┬────────────────┼─────────┘
                           │ HTTP           │
                           ▼                ▼
┌─────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER                      │
│  57 个 API Routes ──▶ 111 个后端服务 ──▶ Supabase   │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL)                   │
│  26 张数据库表 + 1 个存储桶 + 3 个 RPC 函数          │
└─────────────────────────────────────────────────────┘
```

# 四、路由清单 / Route Inventory

**页面**: `/`（主工作区）、`/style-lab`（样式实验室）

**API 分组**:
- **Agent**: 8 路由（memory, messages, archive, stream, tasks）
- **Artifact**: 6 路由（CRUD, archive, asset, references, versions）
- **Workspace**: 4 路由（session, state, recovery）
- **Sync**: 4 路由（operations, retry, cancel, status）
- **Tool Run**: 4 路由（CRUD, cancel, confirm）
- **Observability**: 3 路由（events, metrics, traces）
- **Deployment**: 2 路由（checks, feature flags）
- **其他**: chat, agent-stream, image-gen, memory-compress, model-gateway, models, predictive-intel, system-status, tools (fs-scanner, web-surfer), providers, health, public-config, notebooks, prompts, workflows, admin

# 五、组件清单 / Component Inventory

## NEXUS 核心组件
| 组件 | 行数 | 职责 |
|---|---|---|
| `NexusOps` | 3684 | 主工作区编排 |
| `NexusChrome` | - | Chrome UI 元素（命令面板、工具栏） |
| `NexusGraph` | 2409 | React Flow 智能体图 |
| `NexusAgentWindow` | - | 可拖拽的智能体窗口 |
| `NexusAgentSettingsSidebar` | 1987 | 智能体配置面板 |
| `WorkflowProSurface` | 1721 | 高级工作流构建器 |
| `NexusStyleLab` | 5965 | 样式/主题设计实验室 |

## 超大文件风险 / Large File Risks
1. **nexus-style-lab.tsx** (5965行) — 单体风格实验室，需拆分为 ~8 个子组件
2. **nexus-store.ts** (4679行) — 单体 Zustand store，建议按领域切片
3. **nexus-ops.tsx** (3684行) — 单体工作区 UI，需拆分为 ~6 个子模块

# 六、Store 状态图 / State Map

NEXUS 使用单一 Zustand store，配备三层持久化：
- **IndexedDB**（idb-keyval）：离线本地持久化
- **Supabase**（state-sync.ts）：云端同步
- **zundo**（temporal middleware）：撤销/重做

**主要状态域**:
- Agent 生命周期（创建、分支、删除、布局）
- 消息流（添加、流式追加、推理追加）
- 工作区管理（快照、导入/导出、恢复）
- 认证保险库（登录、API 密钥、提供商凭据）
- 数据缓存（artifact、historical messages、prompts、notebooks）
- 视图模式（panels / graph / workflow-pro）

# 七、Supabase 接触点 / Touchpoints

**26 张数据库表**:
- 身份：`workspaces`, `workspace_memberships`, `workspace_agents`, `agent_profiles`
- 状态：`workspace_snapshots`, `workspace_state_entities`
- 消息：`messages`, `agent_memory_records`
- 运行时：`agent_runtime_sessions`, `agent_tasks`, `agent_runtime_events`
- 工具：`tool_runs`, `tool_permissions`
- 内容：`artifacts`, `notebooks`, `prompts`, `prompt_revisions`, `workflow_templates`
- 运维：`sync_operations`, `feature_flags`, `deployment_checks`
- 可观测：`system_events`, `usage_metrics`
- 计费：`model_usage_ledger`, `user_new_api_tokens`
- 审计：`permission_audit_logs`

**28 个迁移文件**，覆盖 2026-05-25 至 2026-06-10

# 八、扩展层 / Extension Layer

集中式注册中心（`nexus-registry.ts`）提供：
- **8 个 Provider**（DeepSeek, Claude, Gemini, OpenAI + 兼容）
- **22 个模型**（chat/image/video/sandbox 多品类）
- **7 个能力类型**（chat 已实现，image/video mock，search/sandbox 已实现，audio/data-analysis 未实现）
- **8 个图节点类型**（5 已实现，3 未实现）
- **6 个工具槽**（3 已实现，3 未实现）
- **3 个执行器类型**（local-fs 已实现，rest-api 已实现，db-query 空）
- **1 个内存压缩配置文件**

**按需扩展**，避免临时结构。已在实践中严格执行"SCAN FIRST"规则。

# 九、能力清单 / Capability Inventory

| 域 | 已实现 | Mock | 未实现 |
|---|---|---|---|
| Chat（聊天） | 13 | 0 | 0 |
| Image（图像） | 6 | 1 | 0 |
| Video（视频） | 1 | 1 | 1 |
| Sandbox（沙箱） | 3 | 0 | 0 |
| Search（搜索） | 3 | 0 | 0 |
| Audio（音频） | 0 | 0 | 2 |
| Data Analysis（数据分析） | 0 | 0 | 2 |
| 跨领域功能 | 55+ | 0 | 0 |

# 十、未知项 / Unknowns

1. L2 Handoff 行为：注册表为空，智能体路由行为需要进一步分析
2. 音频和数据分析能力：完全未实现，需要规划
3. 数据库类型同步：手动维护的 TypeScript 接口 vs 自动生成的迁移
4. 撤销深度：未配置 zundo 深度限制
5. 离线体验：IndexedDB 持久化已存在，但离线功能边界不明确
6. Workflow Pro vs Runtime Lite 的关系：两个并行的工作流系统
7. 实时协作：未发现 WebSocket 基础设施
8. 安全模型深度：RLS 策略存在但威胁模型未明确

# 十一、建议 / Recommendations

1. **拆分超大文件**：三个 >3000 行的文件建议在下一阶段拆分
2. **Store 切片**：4679 行的单例 store 建议按 zustand slice 模式拆分
3. **运行时跟踪**：在关键路由上执行运行时跟踪以验证静态分析
4. **安全审计**：全面审查 RLS 策略、认证边界和密钥处理
5. **能力实现路线图**：audio 和 data-analysis 能力的实现优先级决策
6. **数据库类型自动生成**：考虑使用 Supabase CLI 自动生成 database.types.ts

---

*报告由 NEXUS Current System Cartographer 代理生成*
*证据来自静态文件分析 |
*未连接生产 Supabase — 运营指标有意未知*

# Script Tequila PRD

## 1) 用户原始需求

### 1.1 核心使用方式

用户希望这个软件形成一条完整且低摩擦的创作链路：

- 无缝的模型聊天体验：用户在同一工作区内连续对话，不需要反复粘贴上下文。
- 结构化整理到笔记区：模型输出不仅是聊天文本，还应自动整理为便于人类查看和复用的结构化笔记。
- 人类可结构化输入：用户可以直接在笔记区按结构输入（如场景、角色、冲突、节拍、对白意图），并被模型理解和利用。
- 多平台可访问：除桌面 Web 外，支持 iOS 与 Agent 入口（Hermes / OpenOpenClaw Agent）访问同一工作流能力。

### 1.2 用户要解决的真实问题

- 创作上下文分散在聊天、文档、临时想法中，导致重复描述、信息丢失。
- 模型回答可读性不足，难以沉淀成可维护的创作资产。
- 只有自然语言聊天，不足以支撑长期项目的结构化推进。
- 不同终端和 Agent 通道体验割裂，无法稳定复用同一项目上下文。

### 1.3 目标用户

- 独立编剧：需要快速从想法到场景草稿再到润色。
- 小型编剧协作团队：需要先以轻量本地方案验证流程。
- 制片/剧本编辑：需要高效做节拍、人物弧线、对白和张力检查。

### 1.4 成功标准（产品层）

- 用户可在 2 分钟内完成：创建项目 -> 输入结构化笔记 -> 发起 AI 对话 -> 回填结果到笔记。
- 聊天结果可一键或自动沉淀到结构化笔记，且可被后续轮次稳定引用。
- 在桌面端与 iOS / Agent 入口上，核心链路一致可用。

## 2) 技术实现方案

### 2.1 产品能力拆解

- 能力 A：上下文感知聊天（Contextual Chat）
  - 上下文来源：`system prompt + project brief + active note + recent history`。
  - 聊天应支持连续会话、状态可见、错误可恢复。

- 能力 B：结构化笔记编排（Structured Notes）
  - 定义统一笔记结构（建议）：
    - `scene`
    - `characters`
    - `objective`
    - `conflict`
    - `beats`
    - `dialogue_notes`
    - `revision_tasks`
  - 模型输出可映射到上述结构，并支持 append/replace 指定区块。

- 能力 C：人类结构化输入（Human-in-the-loop）
  - 在笔记区提供结构化编辑入口（表单 + 富文本混合）。
  - 人类输入优先级高于模型自动总结；所有变更可追溯。

- 能力 D：多平台接入（Web / iOS / Agent）
  - Web 为主工作台。
  - iOS 与 Agent 入口复用同一后端契约（而非复制业务逻辑）。
  - Hermes / OpenOpenClaw Agent 通过统一 API 访问项目、笔记和会话能力。

### 2.2 系统架构（OpenAI-first，Adapter-ready）

- 前端层：`Next.js/React` 工作台，负责编辑、展示、交互。
- API 层：`app/api/*` 统一输入校验、鉴权、错误结构化、编排领域服务。
- 领域层：
  - `ChatService`：模型请求与上下文组装
  - `NoteStructService`：结构化提取、区块写入策略
  - `SessionService`：会话状态与历史管理
- 模型层：默认 `OpenAI SDK`，未来通过 Adapter 扩展。
- 存储层：当前 `data/app.json`，后续可升级 SQLite。

### 2.3 关键 API 约定（建议）

- `POST /api/chat`
  - 输入：`projectId`, `noteId`, `message`, `includeNote`, `sessionId`
  - 输出：`{ userMessage, assistantMessage, structuredPatch? }`

- `POST /api/notes/:id/structure`
  - 输入：`mode: append|replace`, `sections`
  - 输出：`{ note, updatedSections }`

- `POST /api/agents/execute`
  - 用于 Hermes / OpenOpenClaw Agent 入口
  - 复用 chat 与结构化写入能力，返回统一事件流或标准响应

- 错误返回统一：`{ error: { code, message } }`

### 2.4 数据模型演进

- `Project`: 保留 brief 字段（logline/genre/tone/targetLength）
- `Note`: 新增 `structuredSections`（JSON）与 `updatedAt`
- `Message`: 增加 `sessionId`、`source`（human/model/agent）
- `Session`: 新实体，管理多轮会话元数据

### 2.5 非目标（当前阶段）

- 不做实时多人协同编辑。
- 不做完整版剧本排版和分页系统。
- 不在当前阶段做复杂多 Agent 编排 UI。

### 2.6 多端同步存储方案（Web / iOS / Agent）

- 同步策略：采用“服务端权威 + 客户端缓存”模式。
- 存储分层：
  - `Local Cache`（端侧）：用于离线浏览和草稿暂存。
  - `Sync Store`（服务端）：作为唯一真相源，统一项目/笔记/会话状态。
- 数据同步单位：
  - `Project`
  - `Note`（含 `structuredSections`）
  - `Session`
  - `Message`
- 写入规则：
  - 所有跨端写操作走 API，由服务端生成递增 `version` 与 `updatedAt`。
  - 客户端提交时带 `baseVersion`，服务端做冲突检测。
- 冲突策略（MVP）：
  - 不同 section 并行编辑：按 section 粒度合并。
  - 同 section 冲突：保留服务端版本并生成冲突副本，提示用户选择。
- 增量同步：
  - 客户端按 `sinceVersion` 拉取变更（delta sync）。
  - 支持幂等写入（`requestId` 防重复提交）。
- 一致性与性能目标（MVP）：
  - 读一致：同一 `sessionId` 在多端可追平到一致状态。
  - 写可见性：端 A 写入后，端 B 在目标时延内可见（建议 <= 3 秒）。
  - 失败恢复：断网恢复后可继续增量同步，不丢本地草稿。

### 2.7 域名与线上部署方案（Web 至少可访问）

- 目标：让 Web 版本可通过公网域名访问，支持真实用户试用与验收。
- 基础方案（MVP）：
  - 托管：Vercel（优先）或自建 Linux + Nginx。
  - 域名：购买主域名后配置 `app.<your-domain>` 指向 Web 服务。
  - TLS：开启 HTTPS（自动证书或 Let's Encrypt）。
- 环境规划：
  - `dev`：本地开发。
  - `staging`：预发布环境（给测试和验收用）。
  - `prod`：生产环境（外部访问）。
- 配置与密钥：
  - API key 仅放服务端环境变量，不进入前端 bundle。
  - 区分 `staging/prod` 的模型配置与日志级别。
- 发布流程：
  - `main` 分支触发生产部署。
  - Pull Request 触发预览部署（可选）。
- 线上可用性最低标准：
  - 首页与核心工作台可访问。
  - 聊天与笔记保存可用。
  - 关键错误有可读提示（鉴权/限流/超时）。

## 3) 未来计划

### 3.1 Phase 0（当前到近期）：打通核心链路

- 完成 OpenAI SDK 主链路稳定化。
- 聊天返回支持 `structuredPatch`，可写入笔记结构区。
- API 错误格式统一为 `code + message`。
- 完成最小可用的人类结构化输入界面。

验收：

- 聊天、结构化写入、人类结构化编辑三者可闭环。
- `npm run typecheck`、`npm run build` 通过。

### 3.2 Phase 1：体验与可靠性

- 会话管理（session 维度历史、恢复继续）。
- 笔记区块级版本历史与回滚。
- 聊天发送态、超时态、重试机制完善。
- 增加可观察性日志：`requestId`, `model`, `duration`, `status`。
- 完成 staging 环境部署，提供固定访问 URL 给测试。

### 3.3 Phase 2：多平台能力落地

- 生产环境部署 + 域名接入（`app.<your-domain>`）。
- 建立基础运维项：HTTPS、健康检查、错误告警、备份策略。
- iOS 客户端接入统一 API（先覆盖核心链路）。
- Hermes / OpenOpenClaw Agent 接入 `agents/execute` 契约。
- 跨端一致性策略：同一 `project/note/session` 在不同入口可连续工作。

### 3.4 Phase 3：Agent 深化

- 引入 `AgentAdapter` 抽象（保持 UI 与存储结构稳定）。
- 支持事件流渲染（text/tool_call/error/done）。
- 支持“插入笔记”高级模式（append/replace selection/section-targeted）。

### 3.5 风险与缓解

- 风险：不同网关对 Responses API 支持不一致。
  - 缓解：保留 `baseUrl` 配置与 fallback adapter。
- 风险：结构化抽取质量不稳定，污染笔记。
  - 缓解：人类确认写入、区块级回滚、保留原始响应。
- 风险：多端接入导致契约漂移。
  - 缓解：先冻结 API schema，再分端接入并做契约测试。
- 风险：线上环境与本地行为不一致导致可用性问题。
  - 缓解：先 staging 后 prod，发布前执行核心 user case 回归测试。

## 4) 精简 User Cases（丝滑体验验收）

### UC-01 首次闭环（Onboarding）

- 场景：新用户在 2 分钟内完成“建项目 -> 写结构化笔记 -> 发起聊天 -> 回填笔记”。
- 关键验收：
  - 全流程 <= 120 秒。
  - 无需重复粘贴长上下文。
  - 回填后笔记立即可编辑。

### UC-02 连续对话与上下文继承

- 场景：用户连续 3 轮提出不同改写约束，系统自动继承上下文。
- 关键验收：
  - 每轮保持同一 `sessionId`。
  - 无需重新提供完整背景。
  - 输入框与状态提示持续可用，无明显卡顿。

### UC-03 结构化沉淀与人工覆盖

- 场景：模型回复写入 `structuredSections` 后，用户手动修订并继续对话。
- 关键验收：
  - 支持 `append/replace section`。
  - 人工修改优先级高于模型旧结论。
  - section 级可追溯、可回滚。

### UC-04 跨端连续与异常恢复

- 场景：Web -> iOS -> Agent 连续创作，期间发生一次网络或鉴权异常。
- 关键验收：
  - 跨端读取同一 `project/note/session`。
  - 同步后结构字段一致。
  - 异常时有可操作错误提示，重试后会话不断裂。

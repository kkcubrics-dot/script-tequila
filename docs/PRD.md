# Script Tequila PRD

## Product Summary

Script Tequila is a local-first screenplay development workspace for writers who want one place to keep project context, scene notes, and AI-assisted rewrites. The product should feel like a focused writing desk, not a generic chatbot.

## Problem

Screenwriting work is fragmented across notes, outlines, chat transcripts, and model settings. Writers need AI assistance that understands the current project and note without forcing them to repeatedly paste context.

## Target Users

- Solo screenwriters developing premises, scenes, and dialogue passes.
- Small writing teams that need a lightweight local prototype before adopting hosted collaboration.
- Producers or script editors doing quick beat, pacing, and character feedback passes.

## Goals

- Let a writer create projects and notes quickly.
- Keep high-level project context attached to every AI request.
- Show immediate drafting signals such as word count and estimated read time.
- Provide reusable screenplay-specific prompts for common tasks.
- Persist all project, note, settings, and chat state locally.

## Non-Goals

- Real-time collaboration.
- Full screenplay formatting and pagination.
- Cloud sync, auth, billing, or account management.
- 同时深度集成多个 Vendor Agent SDK（先聚焦 OpenAI 一条主链路）。

## MVP Scope

### Project Workspace

- User can create and switch projects.
- User can edit a project brief with logline, genre, tone, and target length.
- Project brief is saved locally and included in AI context.

### Notes

- User can create and switch notes within the active project.
- User can edit title and body content.
- Note changes can be saved manually and on blur.
- Workspace shows word count, character count, and estimated read time.

### AI Copilot

- User can chat with an OpenAI-compatible model.
- User can choose whether to include the current note in context.
- User can trigger preset requests for rewrite, beat analysis, dialogue polish, and stakes/tension.
- User receives a clear missing-key message when credentials are absent.

### Settings

- User can set provider label, model, base URL, API key, and system prompt.
- Settings persist to local JSON storage.

## UX Principles

- The first screen is the working app, not a landing page.
- The editor remains the visual center of gravity.
- Controls should be compact, predictable, and specific to writing workflows.
- System state should be visible through short status text.

## Success Metrics

- A new user can create a project, write a note, save it, and ask for AI feedback in under two minutes.
- The app can be used without an API key for local drafting.
- Type checking and production build pass.

## Technical Architecture (OpenAI-first)

### System Boundaries

- **Frontend (Next.js / React):** Editing, project/note management, chat UI, status display.
- **Backend API Routes:** Context assembly, model invocation, persistence orchestration, error mapping.
- **Storage (local JSON):** `projects`, `notes`, `messages`, `settings` in `data/app.json`.
- **Model Layer:** OpenAI SDK as the default execution path.

### Layered Design

- **UI Layer:** `components/workspace.tsx` only handles interaction and rendering.
- **Route Layer:** `app/api/*/route.ts` validates input and returns stable JSON contracts.
- **Domain/Adapter Layer:** `lib/llm.ts` (current) and future `lib/agents/*` adapters.
- **Store Layer:** `lib/store.ts` as single persistence access point.

### Runtime Flow (Chat)

1. User submits message in Chat panel.
2. `POST /api/chat` loads `project`, `note`, `history`, `settings`.
3. Model context is assembled: `systemPrompt + project brief + optional note + recent history`.
4. OpenAI SDK `responses.create` executes generation.
5. User + assistant messages are persisted.
6. Route returns normalized response/error to frontend.

### API Contract Principles

- Response success shape remains stable: `{ userMessage, assistantMessage }`.
- Response error shape统一为: `{ error: { code, message } }`.
- Model/provider-specific details must not leak to UI state structure.

### Extensibility Rules

- Keep one active default path: `OpenAI SDK`.
- All future providers/agents must implement a shared adapter interface.
- UI switches adapters by config; message persistence format remains unchanged.

## Delivery Plan (OpenAI SDK Track)

### Stage A: Core Stabilization (Now)

- [x] Switch model call to OpenAI SDK (Responses API).
- [x] Keep existing context strategy and key fallback logic.
- [ ] Standardize `/api/chat` structured error format (`code`, `message`).
- [ ] Add request validation for required fields (`message`, `projectId/noteId` nullable handling).
- [ ] Add minimal observability logs (request id, provider/model, duration, status).

### Stage B: UX Reliability

- [ ] Frontend `postJson` parses structured error and shows friendly status text.
- [ ] Add pending/timeout states in chat send flow.
- [ ] Add lightweight retry affordance for transient model errors (429/5xx).

### Stage C: Adapter Preparation

- [ ] Extract `SimpleChatAdapter` from current `lib/llm.ts`.
- [ ] Add `AgentAdapter` and `AgentEvent` types in `lib/agents/types.ts`.
- [ ] Route-level adapter selection by settings (default: `simple-openai`).
- [ ] Keep persistence schema unchanged during refactor.

### Stage D: OpenAI Agent Mode (After Confirmation)

- [ ] Add `OpenAIAgentAdapter` with streaming events.
- [ ] Support event rendering in chat panel (`text/tool_call/error/done`).
- [ ] Add “Insert to Note” modes: append / replace selection.
- [ ] Persist session-level metadata for replay.

## Milestone Acceptance Checklist

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] Core chat works with OpenAI key in Config.
- [ ] Missing/invalid key returns clear structured error.
- [ ] Existing local data remains readable without migration.
- [ ] No breaking change in current UI interaction path.

## Risks and Mitigations

- **Risk:** Third-party OpenAI-compatible gateways partially implement Responses API.
  - **Mitigation:** Keep `baseUrl` configurable; fall back to `chat.completions` adapter if required.
- **Risk:** Error payload inconsistencies degrade UX.
  - **Mitigation:** Centralize server error mapping before returning to frontend.
- **Risk:** Agent mode introduces schema churn.
  - **Mitigation:** Freeze `AppState` message structure until Stage D is validated.

## Implementation Plan (Completed)

1. ✅ Extend the project model with screenplay brief fields.
2. ✅ Add backward-compatible state normalization for existing JSON data.
3. ✅ Add editable project brief controls to the workspace.
4. ✅ Add draft metrics derived from the active note.
5. ✅ Add quick prompt buttons that fill the chat composer.
6. ✅ Refresh visual styling for a more focused writing interface.
7. ✅ Verify with `npm run typecheck` and `npm run build`.

## Roadmap (Phased Iteration)

> 整体策略：先修地基，再提体验，最后上 Agent 能力。每阶段完成后验证 typedcheck + build 通过，再进入下一阶段。

---

### Phase 0: OpenAI Agent SDK Core (Now)

**目标：** 用 OpenAI 官方 SDK 替换当前手写 HTTP 调用，建立后续 Agent 化的最小闭环，不破坏现有写作工作流。

- [ ] **后端调用切换**
  - `lib/llm.ts` 改为 OpenAI SDK 调用（优先 Responses API）
  - 保持现有上下文注入策略（system prompt + project brief + optional note + recent history）
  - 保持 API key 解析优先级（Config -> env -> `~/.codex/auth.json`）
- [ ] **配置兼容**
  - 保留 `model` / `baseUrl` / `apiKey` 字段
  - `baseUrl` 默认 `https://api.openai.com/v1`，允许兼容代理网关
- [ ] **错误与可观察性**
  - 标准化模型错误消息（认证失败、限流、空响应）
  - API Route 输出结构化错误（`code` + `message`）
- [ ] **不在本阶段实现**
  - 不做多 provider 路由
  - 不做工具调用（function calling）UI
  - 不做多步 agent orchestration

**验收标准（DoD）**

- [ ] 聊天主流程可用：输入消息后稳定返回 assistant 回复
- [ ] 缺 key 时有明确提示
- [ ] `npm run typecheck` 和 `npm run build` 通过
- [ ] 不修改现有数据结构（`AppState` 向后兼容）

---

### Phase 1: 架构加固 (Architecture Hardening)

**目标：** 解决 MVP 遗留的技术债，为后续功能提供稳定基础。

- [ ] **错误处理增强**
  - API Route 统一异常捕获与结构化错误响应
  - 前端 fetch 调用统一错误处理/重试逻辑
  - React Error Boundary 包裹 Workspace，防止整页白屏
- [ ] **状态管理升级**
  - 引入轻量状态库（zustand）替代分散的 useState + 手动 fetch 模式
  - 将 API 调用逻辑抽离出组件，放入独立 hooks 或 services 层
- [ ] **API 认证改进**
  - 后端代理 API 调用，前端不直接暴露 API Key
  - API Key 仅在服务端存储和使用
- [ ] **构建与 CI**
  - 补充 `next build` 验证
  - 添加 ESLint 规则补充
- [ ] **样式体系**
  - 引入 CSS Modules 或 Tailwind，替代全局 CSS
  - 响应式布局基础支持
- [ ] **持久化升级 (可选)**
  - 评估 SQLite (better-sqlite3) 替代 JSON 文件，支持并发读写和增量更新

---

### Phase 2: 体验优化 (Note & Chat History)

**目标：** 解决版本恢复和会话管理两个核心痛点。

- [ ] **笔记版本历史 (Note History)**
  - 每次保存生成版本快照（noteId, version, content, savedAt）
  - 版本列表 UI（时间线视图）
  - 一键回滚到指定版本
  - 向后兼容的数据迁移策略
- [ ] **会话历史 (Chat Session History)**
  - 以 sessionId 为单位组织消息，不同写作轮次隔离
  - 历史会话列表 + 恢复上下文继续对话
  - 会话级元数据（标题、创建时间、关联项目/笔记）
- [ ] **UI 细节打磨**
  - 笔记保存状态指示器（已保存/未保存/保存中）
  - 聊天加载态（streaming 响应指示器）
  - 键盘快捷键（Ctrl+S 保存，Tab 切换面板）

---

### Phase 3: Agent 架构升级

**目标：** 从单次模型调用升级为可切换的 Agent 工作流，支持多步规划、工具调用和外部编码 Agent 编排。

#### 3.1 Agent Harness 抽象层

- [ ] 定义 `AgentAdapter` 接口：

```
interface AgentAdapter {
  execute(input: AgentInput): AsyncIterable<AgentEvent>;
}

type AgentInput = {
  systemPrompt: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  projectContext?: Project;
  noteContext?: Note;
};

type AgentEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; args: any; result?: any }
  | { type: "error"; message: string }
  | { type: "done" };
```

- [ ] 实现 `SimpleChatAdapter`（当前单次调用行为的封装）
- [ ] 前端 Chat 面板支持按 adapter 类型切换（Simple / Agent）
- [ ] Agent 模式下支持 streaming 响应

#### 3.2 OpenAI Agent 深化 (Agent 模式)

- [ ] 新增 `OpenAIAgentAdapter`（多步执行 + tools + streaming）
- [ ] 工具调用事件结构落库（可回放）
- [ ] Chat 面板展示中间事件（thinking/tool/result）
- [ ] 一键将 agent 输出插入当前 Note（append / replace 两种模式）

#### 3.3 Codex 集成 (Agent 模式)

- [ ] 新增 `CodexAgentAdapter` — 通过 Hermes Shell 调用 Codex CLI
- [ ] 提供两种 Codex 调用模式：
  - **exec 模式：** 给 Codex 一个一次性任务（"重写这段场景"），返回结果后注入当前 Note
  - **会话模式：** 启动后台 Codex 进程，消息转发到 Codex，持续对话
- [ ] 指令面板新增 "Send to Codex" 按钮，将当前上下文发给 Codex 执行
- [ ] Codex 执行结果回写到 Chat 消息流，可一键 Insert to Note

#### 3.4 Claude Code 集成 (备选 Agent)

- [ ] 新增 `ClaudeAgentAdapter` — 通过 Hermes Shell 调用 Claude Code CLI
- [ ] 与 Codex 共用统一的 AgentAdapter 接口
- [ ] Config 页面增加 Agent 选择（Simple / OpenAI Agent / Codex / Claude）

#### 3.5 本地模型支持 (可选)

- [ ] 通过 llama.cpp / Ollama 提供本地推理选项
- [ ] Config 页增加 Provider Type 切换（Remote / Local）

---

### Phase 4: 创意扩展 (Backlog)

- [ ] **AI 生图辅助工具** — 基于选定画板区域生成提示词
  - Reference: http://xhslink.com/o/3mtx6ydKvRC
- [ ] **剧本格式化预览** — 标准 screenplay 格式渲染
- [ ] **导出功能** — Markdown / Fountain / PDF 导出
- [ ] **多笔记对比** — 并排对比不同版本或不同笔记

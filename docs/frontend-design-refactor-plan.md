# Script Tequila 前端设计重构计划（基于 web-artifacts-builder 方法论）

## 1. 文档目标

本文档用于指导 `script-tequila` Web 前端重构，目标是：

- 在不破坏现有业务 API 契约的前提下，重建一致、可扩展的设计系统与交互体系。
- 将当前“单体状态 + 大组件渲染”演进为“容器编排 + 领域组件 + 基础 UI 组件”分层架构。
- 对齐 `web-artifacts-builder` 的核心方法：先搭建设计与组件基础，再做页面组合，再做打包验收与质量检查。

## 2. 方法论映射（web-artifacts-builder -> script-tequila）

`web-artifacts-builder` 的通用流程：

1. 初始化前端骨架
2. 组件化开发
3. 产物打包
4. 展示与验收
5. 可选测试

映射到本项目：

1. 现有 Next.js 工程作为基础骨架（不重建项目）
2. 先构建设计 token 与 shadcn/ui 基础组件层，再重构 Workspace 各面板
3. 以 `npm run build` 与可运行页面作为“交付产物”
4. 在 staging/dev 验证桌面与移动布局
5. 做必要交互回归与可访问性检查

## 3. 重构范围与非目标

### 3.1 重构范围（本轮）

- 工作台主链路 UI：
  - `TopBar`
  - `SidebarPane`
  - `NotePane`
  - `ChatPane`
  - `Workspace` 布局与模式切换
- 样式体系：`app/globals.css` 与组件样式组织方式
- 交互控件：引入并落地 `shadcn/ui`（Dialog/Sheet/Tabs/Dropdown/Toast 等）

### 3.2 非目标（本轮不做）

- 后端 API 语义调整
- 数据模型升级（如新增字段、迁移脚本）
- iOS 端 UI 实现
- 多人实时协同与复杂冲突合并 UI

## 4. 设计原则（本项目约束）

- 避免“AI 模板感”视觉：
  - 不使用默认紫色渐变、居中大卡片堆叠、统一圆角模板化样式
- 保持“创作工作台”定位：
  - 信息密度适中，强化编辑区与对话区的任务层级
- 状态可见：
  - 保存态、加载态、错误态必须即时可读
- 交互不中断：
  - 关键操作尽量用内联/侧滑/轻量弹层，减少阻断式 prompt
- 移动端可用：
  - 断点下侧栏与右栏可切换、触控命中达标

## 5. 技术策略

### 5.1 组件架构分层

- `UI Primitive Layer`（基础层）
  - shadcn/ui + 自定义 tokens
  - 示例：Button、Input、Textarea、Dialog、Sheet、Tabs、Badge、Toast
- `Feature Component Layer`（功能层）
  - `workspace/*` 下领域组件
  - 示例：FolderTree、SessionList、Composer、NoteToolbar
- `Container Layer`（编排层）
  - `Workspace` 只管理状态流转与动作分发

### 5.2 状态与渲染策略

- 将 `workspace.tsx` 中高耦合逻辑按职责拆分：
  - `notes/folders` 状态域
  - `chat/sessions` 状态域
  - `ui/layout` 状态域
- 使用 `useMemo/useCallback` 控制重渲染边界
- 按面板拆分 props，降低单组件复杂度

### 5.3 样式与主题策略

- 在 `globals.css` 中沉淀 token：
  - color / spacing / radius / shadow / motion / typography
- 保留品牌方向但提升语义化：
  - `--surface-elevated`, `--text-muted`, `--accent`, `--danger`
- 建立组件级样式约定：
  - 结构样式（layout）与皮肤样式（theme）分离

## 6. 分阶段执行计划

## Phase 0：基线审计与重构脚手架（0.5 天）

目标：明确改造边界，避免重构中途返工。

任务：

- 盘点现有组件依赖关系与样式耦合点
- 生成组件拆分清单与 props 责任边界
- 确认 shadcn/ui 接入方案与目录结构

产物：

- 组件拆分表
- 风险清单（高耦合逻辑、移动端断点、历史样式兼容）

验收：

- 团队确认分层与拆分边界，无阻塞项

## Phase 1：设计系统与基础组件层（1 天）

目标：建立统一视觉与交互基础。

任务：

- 引入/配置 shadcn/ui（保留现有业务组件）
- 重构全局 token 与基础排版体系
- 建立通用组件外观规范（按钮、输入、卡片、状态标签）

产物：

- 统一 token 变量
- 基础组件样式规范落地

验收：

- 基础组件在桌面/移动可用
- focus/hover/disabled/error 样式一致

## Phase 2：Workspace 布局壳重构（1 天）

目标：让布局切换稳定、可维护。

任务：

- 重构 `Workspace` 网格与模式切换逻辑
- 建立侧栏抽屉与右侧面板收展规则
- 清理与布局无关的业务逻辑，迁移到子容器

产物：

- 稳定的 layout shell
- 模式切换不丢上下文

验收：

- `write / write-assist / chat / chat-reference` 切换稳定
- 移动端断点下无重叠与不可点击区域

## Phase 3：面板级改造（1.5 天）

目标：完成核心工作流 UI 升级。

任务：

- `TopBar`：状态反馈、模式切换、全局动作统一
- `SidebarPane`：文件夹树、会话列表、快捷动作重构
- `NotePane`：编辑/保存态/结构化插入反馈增强
- `ChatPane`：消息流、composer、插入/替换动作明确化
- 将 `window.prompt` 替换为 `Dialog/Sheet` 交互

产物：

- 四大面板完成新交互与新视觉

验收：

- “建目录 -> 建笔记 -> 编辑 -> 聊天 -> 回填”闭环可顺畅执行

## Phase 4：质量收口（0.5-1 天）

目标：稳定可发布。

任务：

- 可访问性检查（键盘导航、焦点、语义标签）
- 性能收敛（长列表渲染、重复计算）
- 统一错误提示与空态
- 执行 `npm run build` + 主链路手工回归

产物：

- 可发布版本
- 回归记录与遗留问题列表

验收：

- build 通过
- 核心流程回归通过
- 无阻断级 UI bug

## 7. 里程碑与交付

- M1：设计系统完成（Phase 1）
- M2：布局壳完成（Phase 2）
- M3：核心面板完成（Phase 3）
- M4：质量收口完成（Phase 4）

交付件：

- 可运行前端重构版本
- 设计 token 与组件规范
- 回归清单与后续优化 backlog

## 8. 风险与应对

- 风险：`workspace.tsx` 状态耦合高，拆分后可能出现行为回归
  - 应对：分域拆分 + 每阶段回归主链路
- 风险：shadcn/ui 默认样式与当前视觉不一致
  - 应对：仅复用交互结构，视觉通过 token 全量覆盖
- 风险：移动端布局在复杂模式切换下错位
  - 应对：优先稳定移动断点规则，再做视觉微调
- 风险：改造周期内 PR 冲突频繁
  - 应对：按模块分批提交，降低单次改动面

## 9. 验收清单（给你确认）

- 是否同意本轮“仅前端重构，不动 API 语义”？
- 是否同意优先级：设计系统 -> 布局壳 -> 面板功能 -> 质量收口？
- 是否同意 `shadcn/ui` 作为基础交互层，保留业务组件层命名与职责？
- 是否同意先完成 Web 重构再推进 iOS UI 对齐？

---

## 10. 已确认决策（2026-05-08）

- 范围确认：本轮以“前端重构”为主；若为提升效率与质量有必要，可做小范围 API 语义优化，并保持变更可追踪。
- 执行优先级确认：设计系统 -> 布局壳 -> 面板功能 -> 质量收口。
- 组件策略确认：`shadcn/ui` 作为基础交互层，保留业务组件层命名与职责。
- 多端节奏确认：先完成 Web 重构，再推进 iOS UI 对齐。

---

状态：Approved v1（进入实施）

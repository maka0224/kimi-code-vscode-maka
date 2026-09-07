# Active Context

> 本文件更新最频繁：每次会话收尾时更新当前焦点、最近变更与下一步。

## 当前焦点

**0.3.4 已打包待发布**：技能/MCP 使用摘要（计数 chip + 点击 Popover 明细）+ `maka.showToolUsageSummary` 开关；修复 chip「追加至光标处」双 `@`。版本号已由用户拍板 bump 至 0.3.4（根与 apps/vscode 同步），通用 vsix 已产出；图谱已 fast 重建（39163 节点）。

## 最近变更（0.3.4 批次）

- 特性：技能/MCP 使用摘要——`webview-ui/src/lib/tool-usage.ts` 的 `extractToolUsage` 从 `message.steps`（递归 subagent_steps）提取 Skill 调用（`arguments.skill`）与 `mcp__<server>__<tool>` 按完整工具名计数；`ChatMessage.tsx` 的 `ToolUsageChips` 在「用时」旁只渲染计数 chip（如 `技能 2 · MCP 5`），点击弹 Popover 明细（复用 `ui/popover`，参照 ChatStatus 模式），避免列表过长撑乱排版
- 设置链路：`package.json` contributes → `vscode-settings.ts` getter/getExtensionConfig/onSettingsChange keys → `shared/types.ts` ExtensionConfig → webview `useSettingsStore.extensionConfig`
- 测试：`test/webview/tool-usage.test.ts`（5 用例全过）
- 修复：`InputArea.appendMentionToCursor` 双 `@` 前缀——`getEditorMention` 返回值本身已含 `@`，插入时不再重复拼接
- 规范：AGENTS.md 新增版本规则（改动前先查 `apps/vscode/package.json`；功能改动不动 package.json 版本号，bump 只由用户发布时做且根/扩展两处同步）与更新说明一句话风格（含示例）

## 上批次（0.3.3，已提交并打包）

- 优化：编辑器上下文 chip 新增右键菜单——「锁定/取消锁定」与左键一致，「追加至光标处」将 mention 以 `@` 引用插入输入框当前光标位置（`InputArea.appendMentionToCursor`）；未锁定项提示文案精简为「点击锁定至上下文」
- 优化：欢迎页改为固定显示「快速上手指南」（`WelcomeScreen.tsx` 内联 `ShortcutGuide` 组件：命令/技巧/进阶技巧三组快捷键表）——原先 `useWelcomeHint` 每次启动从提示池随机轮换，且启动期 AGENTS.md/会话历史两项异步检查各触发一次重选导致内容连续跳动；`hooks/useWelcomeHint.tsx` 整个删除
- 修复：编辑器上下文 chip 空选区（仅光标、未选中文本）时 display 误带光标行号（`README.md:21`），锁定时显示为 `文件:行`；改为 `bridge-handler.ts getActiveEditorContext` 空选区 display 只显示文件名，与 mention（本就只在有选区时带行号）对齐
- 文档：两个 README 的「更新说明」0.3.1/0.3.0/0.2.3 小节按 0.3.3 的简约风格改写（每条一句、去实现细节括号），并保持两个 README 同步

## 下一步

1. 手动验证 0.3.4 交互（技能/MCP chip 点击弹层、空摘要不渲染、设置开关即时生效、chip 右键「追加至光标处」单 `@`）
2. 发布 0.3.1 ~ 0.3.4 vsix（`publish:vsix` / `publish:ovsx`）

## 活跃决策与考虑

- **chip 发送形式**：用户拍板只发 `@路径:行范围` 引用（不发代码全文），与手动 `@` 同链路、省 token；若模型读文件体验不足再考虑内联代码块
- **锁定语义**：多项锁定、发送后自动全部解除（避免下一条误带旧上下文）；固定项不参与聚焦；右键菜单「追加至光标处」只插入引用不锁定
- **chip display 规则**：空选区只显示文件名（mention 为 `@文件`）；有选区才显示 `文件:行` 或 `文件:行-行`
- **欢迎页**：固定「快速上手指南」取代随机提示池——随机轮换 + 异步重选导致启动时内容跳动，用户感知差
- **与 maka.editorContext 静默注入互不干扰**：旧设置保留，chip 是用户显式控制的每轮上下文
- **输入建议配置位置**：设置弹窗 prefs（非 VS Code settings schema）；已填的旧配置键不再被读取，需手动清理
- **流式建议**未做（bridge 是请求/响应式），候选优化：指定轻量模型 / 缩短防抖 / 流式事件通道
- **README 更新说明风格**：0.3.3 起每条压缩为一句（去实现细节括号），详细描述留在 CHANGELOG

## 项目洞察

- fork 与上游无共同 git 历史，同步靠「基线提交 + 逐文件三方合并」，详见 systemPatterns.md
- 本机 Windows 全量测试基线就有约 640 个环境性失败（fsync EPERM、symlink 权限、超时），判断回归必须与基线对比，不能看绝对数；`baseline.manager.test.ts` 的 ENOTEMPTY 清理失败也是环境性偶发，单跑即过
- 一次性模型调用（不进会话）的样板：prompt-optimize.handler.ts（provider 构建、OAuth 401 重试、env 凭据回退），新同类功能直接复用其导出
- VS Code 拖拽 MIME：资源管理器 `application/vnd.code.tree.explorer`、编辑器标签页 `ResourceURLs`（JSON URI 数组）+ `text/uri-list`（仅单条）、`CodeEditors`（marshalling 序列化编辑器输入）；浏览器侧 `dataTransfer.types` 一律小写
- 代码知识图谱项目名 `F-4github-kimi-code-vscode-maka`，大改后 `index_repository`（fast）重建即可

# Active Context

> 本文件更新最频繁：每次会话收尾时更新当前焦点、最近变更与下一步。

## 当前焦点

刚完成 **0.3.1 批次**（待提交）：Alt+Tab 焦点恢复缺陷修复 + 陌生目录信任确认特性。版本号已升至 `0.3.1`（`apps/vscode/package.json`），文档（README×2、CHANGELOG、AGENTS.md）已同步。

## 最近变更（0.3.1 批次）

- 缺陷：Alt+Tab 切走再切回输入框不聚焦——根因是 webview iframe 的 blur 事件不可靠，焦点标记从未记录；新增宿主广播 `WindowBlurred` 事件（`shared/bridge.ts`、`src/extension.ts` 的 `onDidChangeWindowState`），webview 收到广播时记录 `document.activeElement === textarea`（`InputArea.tsx`），仅切走前聚焦才恢复
- 特性：陌生目录信任确认（对齐 kimi-cli）——引擎（agent-core-v2 `IWorkspaceTrust`）与 SDK（`getWorkspaceTrustInfo`/`trustWorkspace`）早已齐备，本次只加了扩展消费层：
  - 桥接：`getWorkspaceTrust`/`trustWorkspace` 方法 + `WorkspaceTrustChanged` 事件（`shared/bridge.ts`、`src/handlers/workspace.handler.ts`）
  - UI：新组件 `WorkspaceTrustBanner.tsx`（TanStack Query `["workspaceTrust"]`），未信任时顶部琥珀横幅，列出被门控的项目 MCP 服务器；「信任此目录」实时生效无需重启；「忽略」仅本次关闭，重开窗口再提示
  - 联动：`App.tsx` 监听事件失效 workspaceTrust/mcpServers 查询；`WorkDirModal`/`SessionList` 切换工作目录后重查
  - 信任标记在 `~/.kimi-code/workspace-trust/`（与 kimi-cli 共用），v1 引擎恒报 trusted 不受影响

## 下一步

1. 提交 0.3.1 批次（用户已要求提交）
2. 实际在未信任目录中手动验证横幅交互
3. 打包发布 0.3.1 vsix（`package:universal` / `publish:vsix` / `publish:ovsx`）

## 活跃决策与考虑

- **信任提示形式**：用户拍板用 webview 横幅而非 VS Code 模态框；不阻止使用但需说明受限项；所有陌生目录都提示（不限于存在被门控内容的目录）
- **「忽略」语义**：用户明确=仅关闭本次、下次仍提示（与最初的 X 按钮语义相同，改为文字按钮并移除 X）
- **信任取消**：暂无界面入口，需手动删除 `~/.kimi-code/workspace-trust/` 下对应文件

## 项目洞察

- fork 与上游无共同 git 历史，同步靠「基线提交 + 逐文件三方合并」，详见 systemPatterns.md
- 本机 Windows 全量测试基线就有约 640 个环境性失败（fsync EPERM、symlink 权限、超时），判断回归必须与基线对比，不能看绝对数

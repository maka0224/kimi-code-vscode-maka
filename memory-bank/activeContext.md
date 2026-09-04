# Active Context

> 本文件更新最频繁：每次会话收尾时更新当前焦点、最近变更与下一步。

## 当前焦点

**0.3.2 批次已提交并打包**（commit `bc80714ff`）：编辑器上下文锁定 chip + 标签页拖拽引用。文档（README×2、CHANGELOG）、图谱（fast 重建 39149 节点）、memory-bank 均已同步。webview 改动经 typecheck + build 验证；宿主侧新增 4 个 `getActiveEditorContext` 用例通过。

## 最近变更（0.3.2 批次）

- 特性：编辑器上下文 chip——输入框上方实时显示活动编辑器文件与框选范围，点击锁定后随消息以 `@路径:行范围` 引用发送
  - 协议：`shared/bridge.ts` 新增 `ActiveEditorContext` 类型、`getActiveEditorContext` RPC、`activeEditorContextChanged` 事件
  - 宿主：`bridge-handler.ts` `getActiveEditorContext()`（mention 复用 `getEditorMention`，display 为 `文件名:行范围`，空选区显示光标行）；`KimiWebviewProvider.broadcastActiveEditorContext()` 逐 webview 计算 + 指纹去重定向广播；`extension.ts` 监听活动编辑器/选区变化，150ms 防抖
  - webview：`inputarea/EditorContextChip.tsx` 新组件；`InputArea.tsx` 维护 `liveCtx`（实时）+ `pinnedList`（锁定快照，**可多项**），已锁定项不再作为实时 chip 展示，发送时所有 mention 拼到消息前头，**发送后自动清空 pinnedList**；`canSend` 放行仅锁定项发送
  - 边界：无工作区/虚拟文档（untitled、git:）→ null 不显示；多 webview 各自 workDir 独立计算
- 特性：拖拽插入 `@` 引用支持编辑器标签页——标签页拖拽携带 `ResourceURLs`（JSON URI 数组），`InputArea.tsx` 的 `isFileDrop`/蒙层检测/handleDrop 均识别（types 一律小写比较）；`ResourceURLs` 优先、`text/uri-list` 回退避免重复
- 补提交 0.3.1 遗留：提示词优化独立设置弹窗（PromptOptimizeModal/Settings/Button + useOptimizePrefs，删 PromptOptimizePopover）、输入建议 Tab 完整接受后接力下一段

## 下一步

1. 手动验证 0.3.1/0.3.2 交互（信任横幅、Alt+Tab 焦点、输入建议、编辑器上下文 chip、标签页拖拽）
2. 发布 0.3.1 + 0.3.2 vsix（`publish:vsix` / `publish:ovsx`）

## 活跃决策与考虑

- **chip 发送形式**：用户拍板只发 `@路径:行范围` 引用（不发代码全文），与手动 `@` 同链路、省 token；若模型读文件体验不足再考虑内联代码块
- **锁定语义**：多项锁定、发送后自动全部解除（避免下一条误带旧上下文）；固定项不参与聚焦
- **与 maka.editorContext 静默注入互不干扰**：旧设置保留，chip 是用户显式控制的每轮上下文
- **输入建议配置位置**：设置弹窗 prefs（非 VS Code settings schema）；已填的旧配置键不再被读取，需手动清理
- **流式建议**未做（bridge 是请求/响应式），候选优化：指定轻量模型 / 缩短防抖 / 流式事件通道

## 项目洞察

- fork 与上游无共同 git 历史，同步靠「基线提交 + 逐文件三方合并」，详见 systemPatterns.md
- 本机 Windows 全量测试基线就有约 640 个环境性失败（fsync EPERM、symlink 权限、超时），判断回归必须与基线对比，不能看绝对数；`baseline.manager.test.ts` 的 ENOTEMPTY 清理失败也是环境性偶发，单跑即过
- 一次性模型调用（不进会话）的样板：prompt-optimize.handler.ts（provider 构建、OAuth 401 重试、env 凭据回退），新同类功能直接复用其导出
- VS Code 拖拽 MIME：资源管理器 `application/vnd.code.tree.explorer`、编辑器标签页 `ResourceURLs`（JSON URI 数组）+ `text/uri-list`（仅单条）、`CodeEditors`（marshalling 序列化编辑器输入）；浏览器侧 `dataTransfer.types` 一律小写
- 代码知识图谱项目名 `F-4github-kimi-code-vscode-maka`，大改后 `index_repository`（fast）重建即可

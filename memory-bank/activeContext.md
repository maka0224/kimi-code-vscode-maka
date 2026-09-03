# Active Context

> 本文件更新最频繁：每次会话收尾时更新当前焦点、最近变更与下一步。

## 当前焦点

刚完成 **上游 0.7.4/0.7.5 同步**（提交 `14b0c30bd`，分支 `sync/upstream-0.7.5`，版本仍为 0.3.0——按用户要求同步内容并入 0.3.0 发布）。vsix 已打包：`apps/vscode/artifacts/vsix/kimi-code-maka-0.3.0.vsix`。

## 最近变更（0.3.0 批次）

- 上游 #3453：`@` 文件建议改由引擎实时提供，匹配字符高亮、支持文件夹引用、移除 Browse folders 模式、修复 @ 与 / 列表滚动抖动
- 上游 #3440：webview 数据层 ahooks → TanStack Query，新增 test/webview（jsdom）测试工程
- 上游引擎：Bash cwd 允许工作区根之外、压缩后重提醒未注入的 AGENTS.md、实验性回合级文件历史、kimi-cli 迁移完善且不再重复弹提示
- 0.3.0 原有特性：提示词优化按钮栏 + 气泡（用户后来简化了 README 中的文案描述）

## 下一步

1. 扩展宿主冒烟：`@` 提及、拖拽引用、提示词优化、会话列表（InputArea.tsx 合并复杂度最高）
2. 把 `sync/upstream-0.7.5` 合并回 main（或直接以该分支发布）
3. 推送并发布市场（`publish:vsix` / `publish:ovsx`）

## 活跃决策与考虑

- **版本号**：同步内容按用户明确要求并入 0.3.0（0.3.0 尚未推送/发布），不设 0.4.0
- **transcript 包恢复**：上游 migration-legacy 的测试依赖 `@moonshot-ai/transcript`，fork 此前裁剪了它，已按上游 0.7.5 原文恢复
- **fileHistory 测试**：2 个用例在 Windows 下因路径分隔符失败，属上游固有问题，未改动上游测试

## 项目洞察

- fork 与上游无共同 git 历史，同步靠「基线提交 + 逐文件三方合并」，详见 systemPatterns.md
- 本机 Windows 全量测试基线就有约 640 个环境性失败（fsync EPERM、symlink 权限、超时），判断回归必须与基线对比，不能看绝对数

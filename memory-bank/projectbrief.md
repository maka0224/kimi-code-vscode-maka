# Project Brief

## 项目是什么

**Kimi Code Maka** 是 [Kimi Code](https://github.com/MoonshotAI/kimi-code) 官方 VS Code 扩展的社区维护独立分支（fork）。

- 基于官方扩展 `0.7.5`（上游版本对应关系记录在 `README.md` 与 `apps/vscode/CHANGELOG.md`）
- 本分支独立从 `0.1.0` 起版，当前版本 `0.3.0`
- 发布者标识 `maka`，命令 / 配置 / 视图统一使用 `maka.*` 命名空间，可与官方扩展并行安装、互不影响

## 核心目标

1. **跟进上游**：持续把官方扩展的新版本同步到本分支（同步方法见 `systemPatterns.md`）
2. **全中文界面**：Webview 界面文案全面中文化
3. **体验增强**：上下文/额度用量可视、会话状态通知、提示词优化、拖拽引用等官方没有的功能
4. **独立发布**：独立的版本号、vsix 产物与扩展市场条目

## 范围边界

- 只做 VS Code 扩展及其依赖的共享库（`apps/vscode` + 扩展用到的 `packages/*`）
- 不做 CLI / TUI / 服务端（上游的 `apps/kimi-code`、`kap-server`、`acp-*`、`pi-tui` 等已被裁剪删除）
- 与 Moonshot AI 官方无隶属关系，不代表官方立场

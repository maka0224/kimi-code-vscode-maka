# Kimi Code Maka

[Kimi Code](https://github.com/MoonshotAI/kimi-code) VS Code 扩展的独立分支（fork），使用新的发布者标识与命令命名空间，可与官方扩展并行安装、互不影响。

本分支仓库：[maka0224/kimi-code-vscode-maka](https://github.com/maka0224/kimi-code-vscode-maka)

## 特性

- **全中文界面**：Webview 界面文案全面中文化。
- **会话状态通知**：审批/提问/完成/失败时进行系统通知（失焦进系统通知中心），默认开启。
- **计划审阅优化**：重构计划模式后的审阅框，解决文字排版问题。
- **上下文与额度统计**：状态栏显示上下文占用与 tokens 明细；额度面板展示周额度、5小时额度。
- **文件/文件夹拖拽引用**：按住 Shift 拖文件/文件夹到输入框插入 `@` 引用。
- **斜杠命令优化**：斜杠命令按回车/Tab键改为补全，而非发送。
- **会话自动命名**：会话自动命名，支持手动修改。默认关闭，需在配置中开启。
- **对话过程折叠**：会话处理过程可折叠只留结果，回合完成后自动折叠，并展示本轮用时。
- **切换窗口恢复聚焦**：Alt+Tab 切回自动聚焦输入框。
- **界面调整**：全新 Logo、蓝紫主题、用量/额度并入输入框工具行等。

## 更新说明

- **当前版本：`0.2.2`**，基于官方扩展 `0.7.3`（[MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code)）。
- 独立版本号从 `0.1.0` 起；与上游的对应关系记录在本文档与 `apps/vscode/CHANGELOG.md` 中。

### 0.2.2

- 特性：会话自动命名与重命名（`maka.autoGenerateSessionTitle` 默认关闭，勾选走大模型，否则取首条提问前 20 字）。
- 特性：计划审阅框改为 Markdown 渲染并默认展开（原先整份计划挤在等宽小框里无法阅读）。
- 特性：界面结构调整——上下文用量与额度移入输入框工具行，会话详情并入用量弹层。
- 特性：欢迎页加入拖拽插入引用说明。
- 缺陷：顶部会话名称不刷新（改为标题落盘后主动推送）；「前 20 字」回退被引擎默认标题挡住不生效。
- 缺陷：重命名会话报「Invalid bridge params」（桥接方法补参数校验）。

### 0.2.1

- 特性：通知前缀携带会话标题，审批/提问/完成/失败各有独立文案。
- 特性：拖拽时输入框显示居中蒙层提示。
- 缺陷：长时间运行后发送消息失败（先静默重试一次，仍失败才报错）。
- 缺陷：通知配置无法直接勾选（改回 6 个扁平配置项 `maka.notifications.*`）。

### 0.2.0

- 特性：对话中间过程折叠，回合完成后自动折叠。
- 特性：会话时长显示。
- 特性：会话状态通知（`maka.notifications.*` 分项开关）。
- 特性：全新 Logo。
- 缺陷：会话忙碌时发送消息的冲突提示。
- 缺陷：运行时断连后发起新对话无反应。
- 缺陷：思考强度下拉面板被裁剪。
- 缺陷：欢迎页文件名笔误（`AGENT.md` → `AGENTS.md`）。

### 0.1.0

- 特性：独立发布者 `maka` 与 `maka.*` 命名空间，可与官方扩展并行安装。
- 特性：界面全面中文化，蓝紫主题配色。
- 特性：上下文用量统计（状态栏百分比、tokens 明细）。
- 特性：额度信息面板（含 5 小时窗口进度条）。
- 特性：按住 Shift 拖拽文件/文件夹插入 `@` 引用。
- 特性：Alt+Tab 切回自动聚焦输入框。
- 特性：斜杠命令选中改为补全而非直接发送。

## 安装

### 从扩展市场安装

1. 打开 VS Code 扩展面板（`Ctrl+Shift+X`）；
2. 搜索 `kimi-code-maka`，认准发布者 `maka`；
3. 点击「安装」即可。

### 从 VSIX 安装

1. 在 [Releases 页面](https://marketplace.visualstudio.com/items?itemName=maka.kimi-code-maka)下载最新的 `.vsix` 文件；
2. VS Code 中执行 `Ctrl+Shift+P` → `Extensions: Install from VSIX...`，选择下载的文件；
3. 或命令行安装：

```bash
code --install-extension kimi-code-maka-<version>.vsix
```


## 贡献

欢迎 Issue 与 Pull Request。提交 PR 前请确保：

```bash
pnpm --filter kimi-code-maka typecheck
pnpm --filter kimi-code-maka test
pnpm --filter kimi-code-maka build
```

全部通过。

## 许可证

[MIT](LICENSE)

## 声明

本项目是社区维护的独立分支，与 Moonshot AI（月之暗面）官方无隶属关系，不代表官方立场。"Kimi"、"Kimi Code" 等相关名称与商标的权利归其所有者所有，此处仅用于描述与上游项目的派生关系。

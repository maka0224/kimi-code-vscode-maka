# Kimi Code Maka

[Kimi Code](https://github.com/MoonshotAI/kimi-code) VS Code 扩展的独立分支（fork），使用新的发布者标识与命令命名空间，可与官方扩展并行安装、互不影响。

本分支仓库：[maka0224/kimi-code-vscode-maka](https://github.com/maka0224/kimi-code-vscode-maka)

## 版本说明

- **当前版本：`0.2.1`**
- **基于官方版本：`0.7.3`**（[MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) VS Code 扩展）
- 本分支使用独立版本号，从 `0.1.0` 开始；与上游的对应关系记录在本文档与 `apps/vscode/CHANGELOG.md` 中，后续按需跟进上游更新。



## 特性

本分支在上游基础上新增/调整，按版本分组（新版本在前）：

### 0.2.1

- **通知携带会话标题**：通知内容前显示对话标题，多会话并行时能区分来源；审批、提问、完成、失败各有独立文案。

### 0.2.0

- **对话过程折叠**：回复标题栏可折叠单轮对话的中间过程（工具调用、思考等），只保留最终文本结果；回合完成后自动折叠。
- **会话时长显示**：每轮回复完成后在消息下方展示本轮用时。
- **会话状态通知**：审批请求、提问等待、回复完成、任务失败时发送通知（窗口失焦时进入系统通知中心），`maka.notifications.*` 配置项可分别开关（设置界面按 Notifications 分组展示）。
- **全新 Logo**：活动栏图标、商店图标、左上角标识、欢迎页/登录页横幅整体替换为新图标。

### 0.1.0

- **全中文界面**：Webview 界面文案全面中文化。
- **上下文用量统计**：状态栏显示上下文窗口占用百分比与进度条，点击查看输入、输出、缓存命中 tokens 与缓存命中率明细。
- **额度信息面板**：展示账户额度、5 小时窗口进度条与周用量。
- **拖拽插入文件**：按住 Shift 将文件或文件夹拖到输入框光标位置，松开后自动插入 `@` 引用；拖拽时输入框上方会显示操作提示。
- **输入体验细节**：Alt+Tab 切换窗口回来后输入框自动恢复焦点。
- **斜杠命令补全**：命令菜单中回车/Tab/点击为补全到输入框，确认参数后再按回车发送，不再选中即发送。
- **界面样式调整**：蓝紫主题配色、更小的圆角等视觉细节。

## 缺陷修复

### 0.2.1

- 修复长时间运行后发送消息直接失败、文字被弹回输入框的问题：回合开始前失败时自动取消引擎残留状态并重试一次，仍失败才报错。
- 修复通知配置在设置界面无法直接勾选的问题：0.2.0 的对象形式配置改回 6 个扁平配置项 `maka.notifications.*`，设置界面按 Notifications 分组展示。

### 0.2.0

- 修复会话忙碌时的冲突提示：中断事件不再误清生成状态，忙碌时发送消息会提示"当前会话正在生成回复，请等待完成后再发送"。
- 修复运行时断连时发起新对话无反应、回不到欢迎页的问题（不再等待可能挂起的宿主调用）。
- 修复思考强度下拉面板被裁剪到触发按钮宽度、缓存失效提示文案放不下的问题。
- 修复欢迎页检测文件名笔误（`AGENT.md` → `AGENTS.md`）。

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

### 安装包版本划分

- **通用包** `kimi-code-maka-<version>.vsix`：无平台标记，全平台通用，手动安装选它。
- **平台包** `kimi-code-<os>-<arch>.vsix`：内容与通用包完全一致，仅清单多一个目标平台标记；上传市场后只对对应平台用户可见，日常使用不需要。



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

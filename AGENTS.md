# AGENTS.md

> 本文件供 AI 编码代理阅读，默认读者对本项目一无所知。

## 项目概览

**Kimi Code Maka** 是 [Kimi Code](https://github.com/MoonshotAI/kimi-code) VS Code 扩展的社区维护独立分支（fork），基于官方扩展 `0.7.3`，本分支独立从 `0.1.0` 起版。使用独立发布者标识 `maka` 与 `maka.*` 命令/配置/视图命名空间，可与官方扩展并行安装、互不影响。本分支在上游基础上的新增/调整：Webview 界面全面中文化、上下文用量统计（状态栏百分比与进度条、tokens 明细）、额度信息面板（含 5 小时窗口进度条）、拖拽文件/文件夹插入 `@` 引用（按住 Shift，带操作提示）、Alt+Tab 切回自动聚焦输入框、斜杠命令选中改为补全而非直接发送、会话状态系统通知（审批/提问/完成/异常，`maka.notifications.*` 配置）、会话时长显示（回复完成后展示本轮用时）、单轮对话中间过程折叠（只保留最终结果）、蓝紫主题配色等。

这是一个 **pnpm 10 的 monorepo**（`pnpm-workspace.yaml`：`packages/*` 与 `apps/*`），Node 要求 `>=24.15.0`，统一使用 TypeScript（`type: "module"`，ESM）。

## 仓库结构与模块划分

```
apps/vscode/          # VS Code 扩展本体（包名 kimi-code-maka）
packages/             # 被扩展与 CLI 共享的底层库（@moonshot-ai/* 作用域）
build/                # 共享构建工具：raw-text 插件/loader（把 prompt 文本等资源作为字符串内联打包）
```

### apps/vscode（扩展宿主）

- `src/extension.ts`：扩展入口；`main` 指向 `./dist/extension.js`（tsdown 产物）。
- `src/KimiWebviewProvider.ts` + `src/bridge-handler.ts` + `src/handlers/*.handler.ts`：Webview 消息桥接，按领域拆分（auth / chat / config / file / mcp / session / usage / workspace / slash-command）。
- `src/runtime/`：会话运行时与事件适配（`session-runtime.ts`、`event-adapter.ts`、`replay-adapter.ts`、`kimi-runtime.ts` 等），即 VS Code 宿主与 agent 引擎之间的适配层。
- `src/config/`、`src/managers/`、`src/migration/`、`src/utils/`：配置读取、基线/文件管理、旧数据迁移、工具函数。
- `shared/`：扩展宿主与 Webview 共用的类型与桥接协议（`bridge.ts`、`types.ts`），两侧均通过别名 `shared` 引用。
- `webview-ui/`：聊天界面，React 19 + Tailwind CSS 4 + radix-ui/shadcn + zustand + react-markdown（KaTeX 公式）。Vite 以 IIFE 库模式构建为单文件 `dist/webview.js`，CSS 通过 `vite-plugin-css-injected-by-js` 注入 JS；路径别名 `@` → `webview-ui/src`。
- `scripts/`：开发/打包/发布脚本（见下文命令）。
- `test/`：vitest 单元与集成测试（`*.test.ts`），另有 `test/extension-host/` 冒烟用扩展宿主脚本。

### packages/（共享库）

| 包 | 名称 | 职责 |
| --- | --- | --- |
| `agent-core` | `@moonshot-ai/agent-core` | 统一 agent 引擎 v1（遗留，可通过 `maka.useAgentCoreV1` 回滚启用） |
| `agent-core-v2` | `@moonshot-ai/agent-core-v2` | 当前默认的 agent 引擎，DI Scope 架构；`src/` 下按 `agent / app / features / mcpCore / persistence / runtime / session / tool / wire / workspace` 等分层 |
| `node-sdk` | `@moonshot-ai/kimi-code-sdk` | TypeScript SDK：扩展通过它在 Extension Host 内直接运行引擎（含 v1/v2 两套 RPC 客户端） |
| `klient` | `@moonshot-ai/klient` | 契约驱动的 Kimi 客户端门面，覆盖 agent-core-v2，支持 ipc 与 in-memory 两种 transport |
| `kosong` | `@moonshot-ai/kosong` | LLM 抽象层（provider / message / tool / usage） |
| `kaos` | `@moonshot-ai/kaos` | 执行环境抽象（local / ssh / process / shell 路径） |
| `oauth` | `@moonshot-ai/kimi-code-oauth` | Kimi OAuth 认证工具包 |
| `protocol` | `@moonshot-ai/protocol` | 共享 REST + WS 协议 schema（envelope、错误码、分页、ws-control） |
| `minidb` | `@moonshot-ai/minidb` | 纯 Node.js 嵌入式 KV 数据库（内存 KV + WAL/快照持久化） |
| `migration-legacy` | `@moonshot-ai/migration-legacy` | 将 kimi-cli（`~/.kimi/`）数据迁移到 kimi-code（`~/.kimi-code/`） |
| `tree-sitter-bash` | `@moonshot-ai/tree-sitter-bash` | 纯 TypeScript bash 解析器，节点类型与 tree-sitter-bash 一一对应 |

## 技术栈与运行架构

- 语言/构建：TypeScript 6（`strict` 等严格项全开，见根 `tsconfig.json`），库统一用 **tsdown** 打包为 ESM；扩展入口也用 tsdown（`apps/vscode/tsdown.config.ts`），其中把 `@moonshot-ai/*` 工作区包别名到 `src/index.ts` 直接打包进产物（`alwaysBundle: [/^@moonshot-ai\//, 'immer', 'zod']`），`vscode` 模块 external。
- 运行架构：扩展不再拉起外部 Python CLI，而是在 VS Code Extension Host 内通过 `@moonshot-ai/kimi-code-sdk` 直接运行 TypeScript agent 引擎（详见 `apps/vscode/docs/node-sdk-migration.md`）。默认走 agent-core-v2，设置 `maka.useAgentCoreV1: true` 可临时回滚 v1 引擎。
- Webview ↔ 宿主：React 单页应用通过 `shared/bridge.ts` 定义的消息协议与 `src/handlers/` 通信。
- `zod` 版本由 workspace catalog 固定（`4.3.6`）。

## 常用命令

在仓库根目录执行（均可用 `pnpm -r` 递归或 `--filter` 限定单包）：

```bash
pnpm install                        # 安装依赖（pnpm 10，engine-strict）
pnpm build                          # 递归构建全部包与扩展
pnpm build:packages                 # 只构建 packages/*
pnpm typecheck                      # 递归 tsc --noEmit（含 webview-ui）
pnpm test                           # 根目录 vitest run（按各包 vitest 配置运行）
pnpm clean                          # 清理各包 dist
```

针对扩展（`kimi-code-maka`）：

```bash
pnpm --filter kimi-code-maka dev                # 开发模式：prepare + 并行 watch 扩展与 webview
pnpm --filter kimi-code-maka typecheck
pnpm --filter kimi-code-maka test               # vitest（test/**/*.test.ts，node 环境）
pnpm --filter kimi-code-maka test:extension-host# 扩展宿主冒烟测试
pnpm --filter kimi-code-maka build              # tsdown 扩展 + vite webview
pnpm --filter kimi-code-maka package:platform   # 打包平台化 vsix（scripts/vsix-package.mjs）
pnpm --filter kimi-code-maka package:verify     # 校验 vsix 产物
pnpm --filter kimi-code-maka publish:vsix       # 发布到 VS Code Marketplace
pnpm --filter kimi-code-maka publish:ovsx       # 发布到 Open VSX
```

其他值得注意的包级脚本：

- `agent-core-v2`：`gen:contract-types` / `gen:config-manifest` / `gen:wire-manifest` / `gen:state-manifest`（生成契约类型与各 manifest，`scripts/gen-*.mts`）；`lint:imports`（检查模块导入边界 `scripts/check-import-boundaries.mjs`）。改动相关 schema/config 后需重新生成。
- `klient`：`smoke`、`smoke:boundary`、`smoke:select-tools`、`stress:kosong-config`（examples 下的冒烟/压测，经 tsx 运行）；`docker:e2e`。
- `minidb`：`bench`、`bench:cluster`、`bench:open` 基准测试。

## 代码风格约定

- 全程使用 TypeScript ESM；根 `tsconfig.json` 开启 `strict`、`noUncheckedIndexedAccess`、`noPropertyAccessFromIndexSignature`、`verbatimModuleSyntax` 等，类型导入请用 `import type`。
- 全仓库统一的提交检查是 `pnpm typecheck` + `pnpm test` + `pnpm build`（README 贡献指南即要求扩展三项全绿再提 PR）。
- 扩展侧所有命令、配置、视图 ID 一律使用 `maka.*` 命名空间（与官方扩展隔离是本分支的立足点），新增贡献项时保持一致。
- 用户可见的界面文案使用中文（本分支定位是全中文界面）；代码标识符、包名、脚本保持英文。README/CHANGELOG 用中文，设计文档（`apps/vscode/docs/`）用英文，与既有文件各自保持一致。
- `pnpm-workspace.yaml` 中已配置 `allowBuilds` 白名单与若干 `overrides`（如剥离 `ssh2` 的可选原生依赖），调整依赖时注意这些固定项。

## 测试策略

- 测试框架统一为 **vitest 4**，各包测试放在各自的 `test/` 目录、以 `*.test.ts` 命名；扩展测试配置见 `apps/vscode/vitest.config.ts`（node 环境，别名 `@`/`shared`）。
- 扩展有 `test:extension-host`（`scripts/extension-host-smoke.mjs`）做真实 Extension Host 冒烟；`klient` 用 examples 下的 smoke/stress 脚本验证契约边界。
- 覆盖工具为 `@vitest/coverage-v8`（根 devDependencies）。
- 仓库没有 GitHub Actions 等 CI 配置，质量把关完全依赖本地 `typecheck / test / build` 三件套。

## 安全与注意事项

- OAuth/密钥相关逻辑集中在 `packages/oauth` 与 `node-sdk` 的 auth 模块，改动时注意不要把凭据写入日志或仓库。
- `allowImportingTsExtensions` 已开启，tsdown/vite 构建可直接引用 `.ts` 源；但运行期脚本（tsx 执行的 smoke/gen 脚本）依赖 `build/register-raw-text-loader.mjs` 来内联 prompt 文本，删除 `build/` 目录会破坏这些流程。
- 扩展在不受信任工作区下不可用（`untrustedWorkspaces.supported: false`），功能设计可假定工作区可信，但仍需遵守最小权限原则。
- 与上游（官方 kimi-code）的差异是本分支的价值所在：版本对应关系记录在 `README.md` 与 `apps/vscode/CHANGELOG.md`，跟进上游更新时同步维护。

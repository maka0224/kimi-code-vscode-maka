# System Patterns

## 总体架构

pnpm 10 monorepo，两个层面：

- `apps/vscode`：扩展本体。Extension Host 内通过 `@moonshot-ai/kimi-code-sdk` 直接运行 TypeScript agent 引擎（不再拉起外部 Python CLI）
- `packages/*`：共享库（agent-core-v2 引擎、node-sdk、klient、kosong LLM 抽象、kaos 执行环境、oauth、protocol、minidb、migration-legacy、tree-sitter-bash、transcript）

关键链路：Webview（React 单文件构建）⇄ `shared/bridge.ts` 消息协议 ⇄ `src/handlers/*.handler.ts` ⇄ node-sdk RPC ⇄ agent-core-v2（DI Scope 架构：App/Workspace/Session/Agent 四层）。

## 关键模式

- **引擎版本**：默认 agent-core-v2；`maka.useAgentCoreV1: true` 可回滚 v1
- **打包**：tsdown 把 `@moonshot-ai/*` 工作区包按 `src/index.ts` 源码直接打进产物（`alwaysBundle`），`vscode` 模块 external
- **Webview 构建**：Vite IIFE 库模式 → 单文件 `dist/webview.js`，CSS 由 vite-plugin-css-injected-by-js 注入
- **配置/命令/视图 ID**：一律 `maka.*` 命名空间（与官方隔离是本分支立足点）
- **测试**：vitest 4；扩展测试分 node 与 test/webview（jsdom）两个 vitest project

## 上游同步方法（重要）

fork 与上游无共同 git 历史（init 为快照建库）。同步流程：

1. `git fetch upstream`，用 `apps/vscode/package.json` 的 version 字段定位上游 release 提交（无 vscode tag）
2. 确定 fork 基线提交（上次同步时的上游 main 快照）
3. 计算基线→目标的上游改动文件集，分两类：
   - fork 未动的文件 → `git checkout <上游提交> -- <files>` 原样检出
   - fork 也改过的文件 → 逐文件三方合并（base=基线、ours=HEAD、theirs=目标）
4. fork 裁剪掉的区域（CLI/TUI/kap-server 等）跳过
5. 全仓 `pnpm typecheck` / `pnpm test`（与基线对比失败集）/ `pnpm build`

## 文档同步约定

- 根 `README.md` 与 `apps/vscode/README.md` 必须同步；市场版额外保留「使用」小节、链接全用绝对 URL
- 发版必须同步：两个 README（特性 + 更新说明）+ `apps/vscode/CHANGELOG.md` + `AGENTS.md` 中的上游版本号
- 用户可见文案中文；代码标识符/包名/脚本英文；`apps/vscode/docs/` 设计文档用英文

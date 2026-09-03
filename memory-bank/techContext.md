# Tech Context

## 技术栈

- Node `>=24.15.0`，pnpm 10（engine-strict），TypeScript 6 ESM（strict、noUncheckedIndexedAccess 等全开，类型导入用 `import type`）
- 构建：tsdown（库与扩展入口）；web­view：Vite 6 + React 19 + Tailwind CSS 4 + radix-ui/shadcn + zustand + **TanStack Query**（0.3.0 起替代 ahooks）+ react-markdown/KaTeX
- 测试：vitest 4 + @vitest/coverage-v8；webview 组件测试 @testing-library/* + jsdom
- 关键依赖：zod 4（workspace catalog 固定）、immer、fuse.js
- 质量工具：@microsoft/api-extractor（node-sdk 构建 d.ts）

## 常用命令（仓库根）

```bash
pnpm install / build / typecheck / test / clean
pnpm --filter kimi-code-maka dev|typecheck|test|build
pnpm --filter kimi-code-maka package:universal   # 市场上传单文件 vsix
pnpm --filter kimi-code-maka publish:vsix|publish:ovsx
```

## 约束与注意事项

- `build/` 目录的 raw-text loader 不能删（tsx 运行期脚本依赖）
- `pnpm-workspace.yaml` 有 allowBuilds 白名单与 overrides（如剥离 ssh2 原生依赖），调整依赖时保持
- 扩展不支持不受信任工作区（`untrustedWorkspaces.supported: false`）
- 运行期脚本经 tsx 执行，靠 `build/register-raw-text-loader.mjs` 内联 prompt 文本
- 提交前三件套：`typecheck` + `test` + `build` 全绿（README 贡献要求）；注意本机 Windows 测试基线有环境性失败，需与基线对比
- `package:verify` 脚本目前找的是上游平台包命名，与 fork 的 `kimi-code-maka-<version>.vsix` 命名失配（既有问题），校验 vsix 用人工解包

## 依赖的索引与记忆工具

- codebase-memory-mcp：本仓库已建图索引（项目名 `F-4github-kimi-code-vscode-maka`），代码检索优先用图查询工具而非 grep
- 本 `memory-bank/`：跨会话记忆，配合 `.clinerules/memory-bank.md` 使用

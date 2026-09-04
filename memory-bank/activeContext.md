# Active Context

> 本文件更新最频繁：每次会话收尾时更新当前焦点、最近变更与下一步。

## 当前焦点

刚完成 **0.3.2 批次**（待提交）：输入后续文字建议（ghost text）新特性 + 提示词优化思考模式默认关闭 + 输入框增高。文档（README×2、CHANGELOG）已同步，typecheck / 397 项测试 / 构建全绿。

## 最近变更（0.3.2 批次）

- 特性：输入后续文字建议——打字时 ghost text 预测后续文字，Tab 接受、Esc 丢弃
  - 分流：`useInputSuggestion.ts`（新 hook），`混合`（历史前缀匹配优先、模型兜底）/ `历史会话记录` / `大模型` 三种方式；历史匹配同步即时，模型请求防抖 400ms、≥4 字符、结尾非空白才触发；继续打字若仍是「原文+建议」前缀则裁剪保留不重复请求
  - 宿主：`input-suggest.handler.ts`（新方法 `suggestInput`），复用 prompt-optimize.handler 导出的 `resolveApiKey`/`buildChatProvider`，effort 固定 `off`（强制关闭思考），失败静默降级为无建议；`cleanSuggestion` 取首行、剥复述前缀、60 字截断
  - 提示词：`DEFAULT_SUGGEST_SYSTEM_PROMPT`（shared/bridge.ts）——「自动补全不是对话」定位 + few-shot + user 消息 `<input>` 标签包装（修复模型把半截输入当对话回复的缺陷）
  - 配置：设置菜单（齿轮）→「输入建议」弹窗（`InputSuggestionModal.tsx`），启用开关（**默认关闭**）/ 方式 / 建议模型（平铺下拉，默认跟随当前会话）；prefs 走 workspaceState（`maka.inputSuggestionPrefs`），react-query key `["inputSuggestionPrefs"]` 共享缓存，即改即存
  - 渲染：textarea 下垫排版一致的镜像层（透明原文 + 灰色建议），onScroll 同步
  - 抑制：提示词优化写回/还原原稿调 `suppress()` 避免误触发
- 特性：输入框高度增加一半（min 48→72px，自适应上限 140→210px，`InputArea.tsx` adjustHeight + Tailwind 类）
- 特性：提示词优化气泡思考模式默认关闭（`PromptOptimizePopover.tsx`：`prefs.effort ?? "off"`，不再跟随全局）

## 下一步

1. 提交 0.3.2 批次（用户已要求提交）
2. 实际验证输入建议交互（历史匹配、模型续写、Tab/Esc）
3. 打包发布 0.3.2 vsix

## 活跃决策与考虑

- **输入建议配置位置**：先做成 `maka.inputSuggestion.*` VS Code 配置（含 QuickPick 选模型命令），用户拍板改为设置弹窗 prefs——VS Code settings schema 静态无法动态下拉是主因；已填的旧配置键不再被读取，需手动清理
- **模型显示名容错**曾短暂存在（用户把显示名当 ID 填导致回退默认模型），弹窗下拉选择后已删除
- **建议内容上下文**：v1 只发当前输入文本，不带会话历史；效果不足再迭代
- **流式建议**未做（bridge 是请求/响应式，感知延迟主要来自非流式一次性返回），候选优化：指定轻量模型 / 缩短防抖 / 流式事件通道

## 项目洞察

- fork 与上游无共同 git 历史，同步靠「基线提交 + 逐文件三方合并」，详见 systemPatterns.md
- 本机 Windows 全量测试基线就有约 640 个环境性失败（fsync EPERM、symlink 权限、超时），判断回归必须与基线对比，不能看绝对数
- 一次性模型调用（不进会话）的样板：prompt-optimize.handler.ts（provider 构建、OAuth 401 重试、env 凭据回退），新同类功能直接复用其导出

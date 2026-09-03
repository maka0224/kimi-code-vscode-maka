# Memory Bank 使用规则

我的记忆在会话之间完全重置。每次开始任务时，我必须先阅读 `memory-bank/` 下的**全部**记忆文件——这不是可选项。项目构建/测试等硬规范以根目录 `AGENTS.md` 为准，本记忆库用于跨会话的上下文延续。

## 目录结构（memory-bank/）

核心文件（必备，按层级互相补充）：

1. `projectbrief.md` — 项目基础：目标与范围，所有其他文件的根基
2. `productContext.md` — 项目为什么存在、解决什么问题、体验目标
3. `activeContext.md` — 当前焦点、最近变更、下一步（更新最频繁）
4. `systemPatterns.md` — 架构、关键模式、上游同步方法
5. `techContext.md` — 技术栈、命令、约束
6. `progress.md` — 已完成、待办、已知问题、决策演进

## 何时更新记忆库

1. 发现新的项目模式时
2. 完成重要变更后
3. 用户说「更新记忆库」（update memory bank）时——必须审阅**全部**文件
4. 上下文需要澄清时

`activeContext.md` 每次会话收尾都应更新；`progress.md` 在有里程碑或方向变化时更新。

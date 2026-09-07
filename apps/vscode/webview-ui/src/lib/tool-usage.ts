import type { UIStep } from "@/stores/chat.store";

export interface ToolUsageSummary {
  /** 技能名 → 调用次数（按首次出现顺序） */
  skills: [string, number][];
  /** MCP 完整工具名 → 调用次数（按首次出现顺序） */
  mcpTools: [string, number][];
}

const MCP_NAME_PREFIX = "mcp__";

/** 安全解析工具调用参数，非法 JSON 返回 null（调用方跳过该项）。 */
function parseToolArgs(args: string | null): Record<string, unknown> | null {
  if (!args) return null;
  try {
    const parsed: unknown = JSON.parse(args);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function bump(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

/**
 * 从一轮回复的步骤中提取技能与 MCP 工具使用情况。
 * 递归统计子代理步骤（subagent_steps），Skill 工具名取 arguments.skill，
 * MCP 工具按 `mcp__<server>__<tool>` 前缀识别、按完整工具名计数。
 */
export function extractToolUsage(steps: UIStep[]): ToolUsageSummary {
  const skills = new Map<string, number>();
  const mcpTools = new Map<string, number>();

  const walk = (list: UIStep[]): void => {
    for (const step of list) {
      for (const item of step.items) {
        if (item.type !== "tool_use") continue;
        const name = item.call.name;
        if (name === "Skill") {
          const skill = parseToolArgs(item.call.arguments)?.skill;
          if (typeof skill === "string" && skill) bump(skills, skill);
        } else if (name.startsWith(MCP_NAME_PREFIX)) {
          bump(mcpTools, name);
        }
        if (item.subagent_steps) walk(item.subagent_steps);
      }
    }
  };
  walk(steps);

  return { skills: [...skills], mcpTools: [...mcpTools] };
}

/** 是否本轮用到了技能或 MCP 工具（决定摘要是否渲染）。 */
export function hasToolUsage(summary: ToolUsageSummary): boolean {
  return summary.skills.length > 0 || summary.mcpTools.length > 0;
}

import { describe, expect, it } from 'vitest';
import { extractToolUsage, hasToolUsage } from '@/lib/tool-usage';
import type { UIStep } from '@/stores/chat.store';

function toolStep(name: string, args: string | null, subagent_steps?: UIStep[]): UIStep {
  return {
    n: 1,
    items: [{ type: 'tool_use', id: 't1', call: { id: 't1', name, arguments: args }, subagent_steps }],
  };
}

describe('extractToolUsage', () => {
  it('空步骤或无技能/MCP 调用时返回空', () => {
    expect(hasToolUsage(extractToolUsage([]))).toBe(false);
    expect(hasToolUsage(extractToolUsage([toolStep('Shell', '{"command":"ls"}')]))).toBe(false);
  });

  it('解析 Skill 调用并累计同名技能次数', () => {
    const usage = extractToolUsage([
      toolStep('Skill', '{"skill":"pdf","args":"a.pdf"}'),
      toolStep('Skill', '{"skill":"xlsx"}'),
      toolStep('Skill', '{"skill":"pdf"}'),
    ]);
    expect(usage.skills).toEqual([
      ['pdf', 2],
      ['xlsx', 1],
    ]);
  });

  it('按完整工具名统计 mcp__ 工具调用次数', () => {
    const usage = extractToolUsage([
      toolStep('mcp__github__search_code', '{}'),
      toolStep('mcp__github__list_issues', '{}'),
      toolStep('mcp__playwright__browser_click', '{}'),
      toolStep('mcp__github__search_code', '{}'),
    ]);
    expect(usage.mcpTools).toEqual([
      ['mcp__github__search_code', 2],
      ['mcp__github__list_issues', 1],
      ['mcp__playwright__browser_click', 1],
    ]);
  });

  it('递归统计子代理步骤中的调用', () => {
    const sub = [toolStep('Skill', '{"skill":"commit"}'), toolStep('mcp__github__get_me', '{}')];
    const usage = extractToolUsage([toolStep('Task', '{"prompt":"x"}', sub)]);
    expect(usage.skills).toEqual([['commit', 1]]);
    expect(usage.mcpTools).toEqual([['mcp__github__get_me', 1]]);
  });

  it('容忍非法 JSON 与缺失 skill 字段', () => {
    const usage = extractToolUsage([
      toolStep('Skill', '{oops'),
      toolStep('Skill', null),
      toolStep('Skill', '{"args":"x"}'),
    ]);
    expect(hasToolUsage(usage)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { historySuffix } from '@/components/inputarea/hooks/useInputSuggestion';

describe('historySuffix', () => {
  it('returns null for empty input', () => {
    expect(historySuffix(['修复登录 bug'], '')).toBeNull();
  });

  it('returns the suffix of the newest prefix-matching entry', () => {
    const history = ['帮我 review 代码', '帮我写一个排序函数', '帮我 review 这个 PR'];
    expect(historySuffix(history, '帮我 r')).toBe('eview 这个 PR');
  });

  it('returns null when the only match equals the input', () => {
    expect(historySuffix(['修复登录 bug'], '修复登录 bug')).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(historySuffix(['修复登录 bug'], '优化')).toBeNull();
  });

  it('matches multi-line history entries', () => {
    expect(historySuffix(['第一行\n第二行'], '第一行\n')).toBe('第二行');
  });
});

/**
 * Scenario: SDK tool input displays are projected into the legacy Webview display contract.
 * Responsibilities: verify plan_review maps to a short description plus a markdown plan block.
 * Wiring: pure mapping functions, no stubs.
 * Run: pnpm exec vitest run --config apps/vscode/vitest.config.ts apps/vscode/test/tool-display.test.ts
 */

import { describe, expect, it } from 'vitest';

import { describeToolDisplay, toLegacyDisplay } from '../src/runtime/tool-display';

describe('tool display mapping', () => {
  const plan = '# 计划\n\n1. 第一步\n2. 第二步';

  it('describes plan_review with a short prompt instead of the full plan', () => {
    expect(describeToolDisplay({ kind: 'plan_review', plan })).toBe('计划内容如下，请审阅');
  });

  it('projects plan_review into a single plan block carrying the full plan text', () => {
    expect(toLegacyDisplay({ kind: 'plan_review', plan })).toEqual([{ type: 'plan', text: plan }]);
  });
});

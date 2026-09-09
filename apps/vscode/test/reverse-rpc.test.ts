/**
 * Scenario: approval responses from the Webview are resolved into SDK approval results.
 * Responsibilities: verify the decision mapping and selectedLabel passthrough for plan options.
 * Wiring: ReverseRpcController with a captured emit, no engine.
 * Run: pnpm exec vitest run --config apps/vscode/vitest.config.ts apps/vscode/test/reverse-rpc.test.ts
 */

import { describe, expect, it } from 'vitest';

import { ReverseRpcController } from '../src/runtime/reverse-rpc';

describe('reverse rpc approval', () => {
  function setup() {
    let id = '';
    const controller = new ReverseRpcController((event) => {
      if (event.type === 'ApprovalRequest') id = event.payload.id;
    });
    const promise = controller.requestApproval({
      toolCallId: 'call-1',
      toolName: 'ExitPlanMode',
      action: 'ExitPlanMode',
      display: { kind: 'plan_review', plan: '# 计划' },
    });
    return { controller, promise, id };
  }

  it('resolves approve with the selected plan option label', async () => {
    const { controller, promise, id } = setup();
    expect(controller.respondApproval(id, 'approve', '方案B')).toBe(true);
    await expect(promise).resolves.toEqual({ decision: 'approved', selectedLabel: '方案B' });
  });

  it('resolves approve without selectedLabel for regular approvals', async () => {
    const { controller, promise, id } = setup();
    expect(controller.respondApproval(id, 'approve')).toBe(true);
    await expect(promise).resolves.toEqual({ decision: 'approved', selectedLabel: undefined });
  });
});

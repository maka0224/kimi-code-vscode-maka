import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readLlmCallTrace, type LlmCallTraceRecord } from '#/v2/llm-call-trace';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeSessionDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'kimi-sdk-trace-'));
  tempDirs.push(dir);
  return dir;
}

function traceRecord(agentId: string, time: number): LlmCallTraceRecord {
  return {
    type: 'llm.call',
    time,
    agentId,
    kind: 'loop',
    turnStep: '1.1',
    model: 'wire-model',
    request: { systemPrompt: 'system', tools: [], messages: [] },
    response: {
      message: { role: 'assistant', content: [], toolCalls: [] },
      usage: { inputOther: 1, output: 2, inputCacheRead: 0, inputCacheCreation: 0 },
    },
  };
}

async function writeTrace(sessionDir: string, agentId: string, lines: string[]): Promise<void> {
  const dir = join(sessionDir, 'agents', agentId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'llm-calls.jsonl'), lines.join('\n'), 'utf-8');
}

describe('readLlmCallTrace', () => {
  it('returns an empty list when the session has no agents directory', async () => {
    expect(await readLlmCallTrace(await makeSessionDir())).toEqual([]);
  });

  it('merges main and subagent journals sorted by record time', async () => {
    const sessionDir = await makeSessionDir();
    await writeTrace(sessionDir, 'main', [JSON.stringify(traceRecord('main', 300))]);
    await writeTrace(sessionDir, 'sub-1', [
      JSON.stringify(traceRecord('sub-1', 100)),
      JSON.stringify(traceRecord('sub-1', 200)),
    ]);

    const records = await readLlmCallTrace(sessionDir);
    expect(records.map((r) => [r.agentId, r.time])).toEqual([
      ['sub-1', 100],
      ['sub-1', 200],
      ['main', 300],
    ]);
  });

  it('skips malformed lines and a truncated tail line', async () => {
    const sessionDir = await makeSessionDir();
    await writeTrace(sessionDir, 'main', [
      JSON.stringify(traceRecord('main', 100)),
      '{"type":"llm.call","time":',
      '{"type":"something-else","time":50}',
      '',
    ]);

    const records = await readLlmCallTrace(sessionDir);
    expect(records).toHaveLength(1);
    expect(records[0]?.time).toBe(100);
  });

  it('ignores agents without a trace file', async () => {
    const sessionDir = await makeSessionDir();
    await mkdir(join(sessionDir, 'agents', 'sub-no-trace'), { recursive: true });
    await writeTrace(sessionDir, 'main', [JSON.stringify(traceRecord('main', 100))]);

    const records = await readLlmCallTrace(sessionDir);
    expect(records).toHaveLength(1);
  });
});

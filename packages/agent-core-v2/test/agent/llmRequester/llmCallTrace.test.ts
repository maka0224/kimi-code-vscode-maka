import { describe, expect, it } from 'vitest';

import type { Message } from '#/kosong/contract/message';

import {
  buildLlmCallTraceRecord,
  LLM_CALL_TRACE_LOG_KEY,
} from '#/agent/llmRequester/llmCallTrace';

const baseInput = {
  time: 1000,
  agentId: 'main',
  kind: 'loop' as const,
  model: 'wire-model',
  request: {
    systemPrompt: 'system',
    tools: [],
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'hi' }], toolCalls: [] },
    ] satisfies Message[],
  },
  response: {
    message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }], toolCalls: [] },
    usage: { inputOther: 1, output: 2, inputCacheRead: 3, inputCacheCreation: 4 },
  },
};

describe('buildLlmCallTraceRecord', () => {
  it('assembles a trace record and omits absent optional fields', () => {
    const record = buildLlmCallTraceRecord(baseInput);

    expect(record.type).toBe('llm.call');
    expect(LLM_CALL_TRACE_LOG_KEY).toBe('llm-calls.jsonl');
    expect(record).not.toHaveProperty('turnStep');
    expect(record).not.toHaveProperty('attempt');
    expect(record).not.toHaveProperty('projection');
    expect(record).not.toHaveProperty('modelAlias');
    expect(record.request.messages).toEqual(baseInput.request.messages);
  });

  it('replaces data URIs in media parts with a size placeholder', () => {
    const dataUri = `data:image/png;base64,${'a'.repeat(100)}`;
    const record = buildLlmCallTraceRecord({
      ...baseInput,
      turnStep: '1.1',
      request: {
        ...baseInput.request,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', imageUrl: { url: dataUri } },
              { type: 'image_url', imageUrl: { url: 'https://example.test/a.png' } },
              { type: 'text', text: 'look' },
            ],
            toolCalls: [],
          },
        ],
      },
    });

    const [omitted, kept, text] = record.request.messages[0]!.content;
    expect(omitted).toEqual({
      type: 'image_url',
      imageUrl: { url: `[data URI omitted, ${dataUri.length} chars]` },
    });
    expect(kept).toEqual({ type: 'image_url', imageUrl: { url: 'https://example.test/a.png' } });
    expect(text).toEqual({ type: 'text', text: 'look' });
    expect(record.turnStep).toBe('1.1');
  });
});

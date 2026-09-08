/**
 * LLM call trace reader — reads the per-agent `llm-calls.jsonl` journals the
 * v2 engine's `AgentLLMRequesterService` appends under
 * `<sessionDir>/agents/<agentId>/` (one record per completed model request,
 * with the full request input and the assembled response).
 *
 * Read-only and best-effort, like `resume-replay.ts`: missing directories,
 * unreadable files, and malformed lines (including a truncated tail line from
 * a crashed flush) are skipped, never thrown.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const LLM_CALL_TRACE_FILE = 'llm-calls.jsonl';

export interface LlmCallTraceUsage {
  readonly inputOther: number;
  readonly output: number;
  readonly inputCacheRead: number;
  readonly inputCacheCreation: number;
}

export interface LlmCallTraceRecord {
  readonly type: 'llm.call';
  readonly time: number;
  readonly agentId: string;
  readonly kind: string;
  readonly turnStep?: string;
  readonly attempt?: string;
  readonly projection?: string;
  readonly model: string;
  readonly modelAlias?: string;
  readonly request: {
    readonly systemPrompt: string;
    readonly tools: readonly unknown[];
    readonly messages: readonly unknown[];
  };
  readonly response: {
    readonly message: unknown;
    readonly usage: LlmCallTraceUsage;
    readonly providerFinishReason?: string;
    readonly rawFinishReason?: string;
    readonly providerMessageId?: string;
    readonly timing?: Readonly<Record<string, number>>;
    readonly traceId?: string;
  };
}

/**
 * Read every agent's `llm-calls.jsonl` under the session directory, sorted by
 * record time. `agentId === 'main'` is the primary agent; any other directory
 * name is a subagent.
 */
export async function readLlmCallTrace(sessionDir: string): Promise<LlmCallTraceRecord[]> {
  const agentsDir = join(sessionDir, 'agents');
  let agentIds: readonly string[];
  try {
    agentIds = (await readdir(agentsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }

  const records: LlmCallTraceRecord[] = [];
  for (const agentId of agentIds) {
    let content: string;
    try {
      content = await readFile(join(agentsDir, agentId, LLM_CALL_TRACE_FILE), 'utf-8');
    } catch {
      continue;
    }
    records.push(...parseTraceRecords(content));
  }
  records.sort((a, b) => a.time - b.time);
  return records;
}

function parseTraceRecords(content: string): LlmCallTraceRecord[] {
  const records: LlmCallTraceRecord[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line.length === 0) continue;
    try {
      const record: unknown = JSON.parse(line);
      if (isTraceRecord(record)) records.push(record);
    } catch {
      // Malformed or truncated line (e.g. crashed mid-flush): skip it.
    }
  }
  return records;
}

function isTraceRecord(value: unknown): value is LlmCallTraceRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record['type'] === 'llm.call' &&
    typeof record['time'] === 'number' &&
    typeof record['agentId'] === 'string' &&
    typeof record['request'] === 'object' &&
    typeof record['response'] === 'object'
  );
}

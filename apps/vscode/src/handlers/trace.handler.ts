import { readLlmCallTrace } from "@moonshot-ai/kimi-code-sdk";

import { Methods } from "../../shared/bridge";
import type { LlmCallTraceResult } from "../../shared/types";
import type { Handler } from "./types";

/** 对话轨迹：读取当前会话各 agent（含 subagent）的 llm-calls.jsonl，仅 v2 引擎产生该文件 */
export const traceHandlers: Record<string, Handler<any, any>> = {
  [Methods.GetLlmCallTrace]: async (_, ctx): Promise<LlmCallTraceResult> => {
    if (ctx.runtime.isAgentCoreV1) return { supported: false, records: [] };
    const sessionDir = ctx.getSession()?.summary?.sessionDir;
    if (sessionDir === undefined) return { supported: true, records: [] };
    try {
      const records = await readLlmCallTrace(sessionDir);
      return { supported: true, records };
    } catch (error) {
      ctx.logError("Failed to read LLM call trace", error);
      return { supported: true, records: [] };
    }
  },
};

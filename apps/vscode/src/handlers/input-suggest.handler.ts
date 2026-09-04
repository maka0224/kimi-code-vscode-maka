import { effectiveModelAlias } from "@moonshot-ai/kimi-code-sdk";
import {
  APIStatusError,
  createUserMessage,
  extractText,
  generate,
} from "@moonshot-ai/kosong";

import { Methods, DEFAULT_SUGGEST_SYSTEM_PROMPT, DEFAULT_INPUT_SUGGESTION_PREFS, type InputSuggestionPrefs, type SuggestInputResult } from "../../shared/bridge";
import { buildChatProvider, resolveApiKey } from "./prompt-optimize.handler";
import type { Handler, HandlerContext } from "./types";

interface SuggestInputParams {
  text: string;
  modelId: string;
}

/** 建议片段最大长度（字符），超出截断。 */
const MAX_SUGGESTION_LENGTH = 60;

/** workspaceState key for input-suggestion preferences. */
const INPUT_SUGGESTION_PREFS_KEY = "maka.inputSuggestionPrefs";

// 输入建议由打字停顿被动触发，任何失败（未配置模型、网络、配额）都静默
// 降级为"无建议"，不向用户报错打扰输入。
const suggestInput: Handler<SuggestInputParams, SuggestInputResult> = async (params, ctx) => {
  try {
    const config = await ctx.harness.getConfig({ reload: true });
    const rawAlias =
      config.models?.[params.modelId] ??
      (config.defaultModel !== undefined ? config.models?.[config.defaultModel] : undefined);
    if (rawAlias === undefined) return { text: "" };
    const providerName = rawAlias.provider;
    const provider = config.providers?.[providerName];
    if (provider === undefined) return { text: "" };
    // Apply user overrides the same way a session turn does.
    const alias = effectiveModelAlias(rawAlias, provider.type);
    // 标签包装让模型明确这是"待补全的半截文本"而非发给它的消息。
    const history = [createUserMessage(`<input>${params.text}</input>`)];

    const run = async (force: boolean) => {
      const apiKey = await resolveApiKey(ctx, providerName, provider, force);
      const chat = buildChatProvider(alias, provider, apiKey, "off");
      return generate(chat, DEFAULT_SUGGEST_SYSTEM_PROMPT, [], history);
    };

    let result;
    try {
      result = await run(false);
    } catch (error) {
      // OAuth token may have expired mid-session: force-refresh once and retry,
      // mirroring the engine's resolveAuth 401 handling.
      if (!(error instanceof APIStatusError) || error.statusCode !== 401) throw error;
      result = await run(true);
    }

    return { text: cleanSuggestion(extractText(result.message), params.text) };
  } catch {
    return { text: "" };
  }
};

/** 清洗模型输出：取首行、去掉复述输入的前缀、超长截断。 */
function cleanSuggestion(raw: string, input: string): string {
  let text = raw.split("\n", 1)[0]?.trim() ?? "";
  if (text.startsWith(input)) {
    text = text.slice(input.length).trimStart();
  }
  if (text.length === 0 || input.endsWith(text)) return "";
  return text.length > MAX_SUGGESTION_LENGTH ? text.slice(0, MAX_SUGGESTION_LENGTH) : text;
}

export const inputSuggestHandlers = {
  [Methods.SuggestInput]: suggestInput,
  [Methods.GetInputSuggestionPrefs]: (async (_: void, ctx: HandlerContext): Promise<InputSuggestionPrefs> => {
    return { ...DEFAULT_INPUT_SUGGESTION_PREFS, ...ctx.workspaceState.get<Partial<InputSuggestionPrefs>>(INPUT_SUGGESTION_PREFS_KEY, {}) };
  }) satisfies Handler<void, InputSuggestionPrefs>,
  [Methods.SaveInputSuggestionPrefs]: (async (params: InputSuggestionPrefs, ctx: HandlerContext) => {
    await ctx.workspaceState.update(INPUT_SUGGESTION_PREFS_KEY, params);
    return { ok: true };
  }) satisfies Handler<InputSuggestionPrefs, { ok: boolean }>,
} as Record<string, Handler<any, any>>;

import { effectiveModelAlias, type ModelAlias } from "@moonshot-ai/kimi-code-sdk";
import {
  APIStatusError,
  classifyKimiQuotaError,
  createProvider,
  createUserMessage,
  extractText,
  generate,
  type ChatProvider,
  type ProviderConfig as KosongProviderConfig,
  type ThinkingEffort,
} from "@moonshot-ai/kosong";

import { Methods, type OptimizePrefs, type OptimizePromptResult, DEFAULT_OPTIMIZE_SYSTEM_PROMPT } from "../../shared/bridge";
import type { Handler, HandlerContext } from "./types";

interface OptimizePromptParams {
  text: string;
  modelId: string;
  effort?: string;
  systemPrompt?: string;
}

type ProviderEntry = NonNullable<
  Awaited<ReturnType<HandlerContext["harness"]["getConfig"]>>["providers"]
>[string];

/** workspaceState key for cached prompt-optimizer preferences. */
const OPTIMIZE_PREFS_KEY = "maka.optimizePrefs";

// Per-provider API-key env fallbacks, mirroring the engine's provider-manager
// (packages/agent-core/src/session/provider-manager.ts) so a one-shot request
// resolves credentials exactly like a session turn would.
export const PROVIDER_API_KEY_ENV: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  openai_responses: "OPENAI_API_KEY",
  kimi: "KIMI_API_KEY",
  "google-genai": "GOOGLE_API_KEY",
  vertexai: "GOOGLE_API_KEY",
};

const PROVIDER_BASE_URL_ENV: Record<string, string> = {
  anthropic: "ANTHROPIC_BASE_URL",
  openai: "OPENAI_BASE_URL",
  openai_responses: "OPENAI_BASE_URL",
  kimi: "KIMI_BASE_URL",
  "google-genai": "GOOGLE_GEMINI_BASE_URL",
  vertexai: "GOOGLE_VERTEX_BASE_URL",
};

export type { ProviderEntry };

const optimizePrompt: Handler<OptimizePromptParams, OptimizePromptResult> = async (params, ctx) => {
  const config = await ctx.harness.getConfig({ reload: true });
  const rawAlias =
    config.models?.[params.modelId] ??
    (config.defaultModel !== undefined ? config.models?.[config.defaultModel] : undefined);
  if (rawAlias === undefined) throw new Error("未找到可用模型，请先在设置中配置模型。");
  const providerName = rawAlias.provider;
  const provider = config.providers?.[providerName];
  if (provider === undefined) {
    throw new Error(`模型 "${params.modelId}" 引用的服务商 "${providerName}" 不存在。`);
  }
  // Apply user overrides the same way a session turn does.
  const alias = effectiveModelAlias(rawAlias, provider.type);
  const history = [createUserMessage(params.text)];

  const run = async (force: boolean) => {
    const apiKey = await resolveApiKey(ctx, providerName, provider, force);
    const chat = buildChatProvider(alias, provider, apiKey, params.effort);
    const systemPrompt = nonEmpty(params.systemPrompt) ?? DEFAULT_OPTIMIZE_SYSTEM_PROMPT;
    return generate(chat, systemPrompt, [], history);
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

  const text = extractText(result.message).trim();
  if (text.length === 0) throw new Error("模型未返回优化结果，请重试。");
  return { text, traceId: result.traceId ?? null };
};

export async function resolveApiKey(
  ctx: HandlerContext,
  providerName: string,
  provider: ProviderEntry,
  force: boolean,
): Promise<string | undefined> {
  const direct = providerValue(provider.apiKey, provider.env, PROVIDER_API_KEY_ENV[provider.type]);
  if (direct !== undefined) return direct;
  if (provider.oauth === undefined) return undefined;
  const tokenProvider = ctx.harness.auth.resolveOAuthTokenProvider(providerName, provider.oauth);
  const token = await tokenProvider.getAccessToken(force ? { force: true } : undefined);
  return token.trim().length === 0 ? undefined : token;
}

/** Build a kosong chat provider, mirroring the engine's toKosongProviderConfig. */
export function buildChatProvider(
  alias: ModelAlias,
  provider: ProviderEntry,
  apiKey: string | undefined,
  effort: string | undefined,
): ChatProvider {
  // A model declaring the anthropic protocol is routed over the Anthropic
  // transport even when its provider entry is the managed `kimi` one.
  const effectiveType = alias.protocol === "anthropic" ? "anthropic" : provider.type;
  const baseUrl =
    nonEmpty(alias.baseUrl) ??
    providerValue(provider.baseUrl, provider.env, PROVIDER_BASE_URL_ENV[provider.type]);
  const headers =
    provider.customHeaders === undefined || Object.keys(provider.customHeaders).length === 0
      ? undefined
      : { ...provider.customHeaders };
  let config: KosongProviderConfig;
  switch (effectiveType) {
    case "anthropic":
      config = {
        type: "anthropic",
        model: alias.model,
        baseUrl: alias.protocol === "anthropic" ? baseUrl?.replace(/\/v1\/?$/, "") : baseUrl,
        apiKey,
        ...(alias.maxOutputSize !== undefined ? { defaultMaxTokens: alias.maxOutputSize } : {}),
        supportEfforts: alias.supportEfforts,
        adaptiveThinking: alias.adaptiveThinking,
        // Kimi routed over the Anthropic transport keeps its vendor error
        // classification, exactly like the engine does.
        ...(provider.type === "kimi" ? { kimiThinking: true, convertError: classifyKimiQuotaError } : {}),
        betaApi: alias.betaApi,
        ...(headers !== undefined ? { defaultHeaders: headers } : {}),
      };
      break;
    case "openai":
      config = {
        type: "openai",
        model: alias.model,
        baseUrl,
        apiKey,
        reasoningKey: alias.reasoningKey,
        offEffort: alias.offEffort,
        ...(headers !== undefined ? { defaultHeaders: headers } : {}),
      };
      break;
    case "kimi":
      config = {
        type: "kimi",
        model: alias.model,
        baseUrl,
        apiKey,
        ...(headers !== undefined ? { defaultHeaders: headers } : {}),
      };
      break;
    case "google-genai":
      config = {
        type: "google-genai",
        model: alias.model,
        baseUrl,
        apiKey,
        ...(headers !== undefined ? { defaultHeaders: headers } : {}),
      };
      break;
    case "openai_responses":
      config = {
        type: "openai_responses",
        model: alias.model,
        baseUrl,
        apiKey,
        offEffort: alias.offEffort,
        ...(headers !== undefined ? { defaultHeaders: headers } : {}),
      };
      break;
    default:
      throw new Error(`暂不支持类型为 "${String(effectiveType)}" 的服务商。`);
  }
  const chat = createProvider(config);
  return effort !== undefined && effort !== "" ? chat.withThinking(effort as ThinkingEffort) : chat;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function providerValue(
  configured: string | undefined,
  env: Record<string, string> | undefined,
  envKey: string | undefined,
): string | undefined {
  if (envKey === undefined) return nonEmpty(configured);
  return nonEmpty(configured) ?? nonEmpty(env?.[envKey]);
}

export const promptOptimizeHandlers = {
  [Methods.OptimizePrompt]: optimizePrompt,
  [Methods.GetOptimizePrefs]: (async (_: void, ctx: HandlerContext): Promise<OptimizePrefs> => {
    return ctx.workspaceState.get<OptimizePrefs>(OPTIMIZE_PREFS_KEY, {});
  }) satisfies Handler<void, OptimizePrefs>,
  [Methods.SaveOptimizePrefs]: (async (params: OptimizePrefs, ctx: HandlerContext) => {
    await ctx.workspaceState.update(OPTIMIZE_PREFS_KEY, params);
    return { ok: true };
  }) satisfies Handler<OptimizePrefs, { ok: boolean }>,
} as Record<string, Handler<any, any>>;

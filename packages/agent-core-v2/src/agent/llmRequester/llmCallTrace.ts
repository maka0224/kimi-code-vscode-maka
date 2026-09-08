import type { ContentPart, Message } from '#/kosong/contract/message';
import type { FinishReason } from '#/kosong/contract/provider';
import type { Tool } from '#/kosong/contract/tool';
import type { TokenUsage } from '#/kosong/contract/usage';
import type { ModelRequestTiming } from '#/kosong/model/modelRequester';

export const LLM_CALL_TRACE_LOG_KEY = 'llm-calls.jsonl';

export interface LlmCallTraceRecord {
  readonly type: 'llm.call';
  readonly time: number;
  readonly agentId: string;
  readonly kind: 'loop' | 'compaction';
  readonly turnStep?: string;
  readonly attempt?: string;
  readonly projection?: string;
  readonly model: string;
  readonly modelAlias?: string;
  readonly request: {
    readonly systemPrompt: string;
    readonly tools: readonly Tool[];
    readonly messages: readonly Message[];
  };
  readonly response: {
    readonly message: Message;
    readonly usage: TokenUsage;
    readonly providerFinishReason?: FinishReason;
    readonly rawFinishReason?: string;
    readonly providerMessageId?: string;
    readonly timing?: ModelRequestTiming;
    readonly traceId?: string;
  };
}

export function buildLlmCallTraceRecord(input: {
  readonly time: number;
  readonly agentId: string;
  readonly kind: 'loop' | 'compaction';
  readonly turnStep?: string;
  readonly attempt?: string;
  readonly projection?: string;
  readonly model: string;
  readonly modelAlias?: string;
  readonly request: LlmCallTraceRecord['request'];
  readonly response: LlmCallTraceRecord['response'];
}): LlmCallTraceRecord {
  return {
    type: 'llm.call',
    time: input.time,
    agentId: input.agentId,
    kind: input.kind,
    ...(input.turnStep === undefined ? {} : { turnStep: input.turnStep }),
    ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
    ...(input.projection === undefined ? {} : { projection: input.projection }),
    model: input.model,
    ...(input.modelAlias === undefined ? {} : { modelAlias: input.modelAlias }),
    request: {
      systemPrompt: input.request.systemPrompt,
      tools: input.request.tools,
      messages: sanitizeMediaDataUris(input.request.messages),
    },
    response: input.response,
  };
}

function sanitizeMediaDataUris(messages: readonly Message[]): Message[] {
  return messages.map((message) => ({
    ...message,
    content: message.content.map(sanitizePart),
  }));
}

function sanitizePart(part: ContentPart): ContentPart {
  switch (part.type) {
    case 'image_url':
      return { ...part, imageUrl: { ...part.imageUrl, url: omitDataUri(part.imageUrl.url) } };
    case 'audio_url':
      return { ...part, audioUrl: { ...part.audioUrl, url: omitDataUri(part.audioUrl.url) } };
    case 'video_url':
      return { ...part, videoUrl: { ...part.videoUrl, url: omitDataUri(part.videoUrl.url) } };
    default:
      return part;
  }
}

function omitDataUri(url: string): string {
  return url.startsWith('data:') ? `[data URI omitted, ${url.length} chars]` : url;
}

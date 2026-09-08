import type { RunResult, StreamEvent } from "./legacy-sdk";

export interface SessionConfig {
  model: string;
  thinking?: boolean;
  effort?: string;
  /**
   * Whether the user explicitly changed the effort. Re-confirming the effort
   * already shown is not an explicit choice: the model is persisted but the
   * stored effort preference is left alone (mirrors the TUI's
   * persistModelSelection). Treated as true when omitted.
   */
  effortChanged?: boolean;
}

export interface ProjectFile {
  path: string;
  name: string;
  isDirectory: boolean;
  /** Matched-character offsets into `path`, for mention-style highlighting. */
  matchPositions?: number[];
}

export interface FileChange {
  path: string;
  status: "Modified" | "Added" | "Deleted";
  additions: number;
  deletions: number;
}

export interface ExtensionConfig {
  yoloMode: boolean;
  autosave: boolean;
  useCtrlEnterToSend: boolean;
  enableNewConversationShortcut: boolean;
  showThinkingContent: boolean;
  showThinkingExpanded: boolean;
  showToolUsageSummary: boolean;
  version: string;
}

export interface WorkspaceStatus {
  hasWorkspace: boolean;
  path?: string;
  workspaceRoot?: string;
}

/** 目录信任状态（镜像 SDK WorkspaceTrustInfo，仅保留 webview 需要的字段） */
export interface WorkspaceTrustServerInfo {
  readonly name: string;
  readonly transport: "stdio" | "http" | "sse";
  readonly command?: string;
  readonly url?: string;
}

export interface WorkspaceTrustState {
  readonly trusted: boolean;
  /** 信任后将启用的项目级 MCP 服务器（未信任时被门控） */
  readonly gatedMcpServers: readonly WorkspaceTrustServerInfo[];
}

export type ErrorPhase = "preflight" | "runtime";

export interface StreamError {
  type: "error";
  code: string;
  message: string;
  detail?: string; // 原始服务器错误信息
  phase: ErrorPhase;
  /**
   * `false` marks a mid-turn warning: the turn is still running, so UIs must
   * not treat it as turn-ending. Do not unlock the composer, offer Retry, or
   * flush the queued messages for non-terminal errors.
   */
  terminal?: boolean;
}

export type UIStreamEvent =
  | { type: "session_start"; sessionId: string; model?: string; _sessionId?: string }
  | { type: "stream_complete"; result: RunResult; _sessionId?: string; _time?: number }
  | (StreamError & { _sessionId?: string })
  | (StreamEvent & { _sessionId?: string });

export interface LoginStatus {
  loggedIn: boolean;
}

/** 对话轨迹：单次大模型调用的 token 用量（镜像引擎 TokenUsage） */
export interface LlmCallTraceUsage {
  readonly inputOther: number;
  readonly output: number;
  readonly inputCacheRead: number;
  readonly inputCacheCreation: number;
}

/**
 * 对话轨迹：一次完整的大模型调用记录（引擎 llm-calls.jsonl 的每行）。
 * request 为发给模型的完整输入，response 为汇总后的原始响应；
 * messages/tools/message 结构复杂，webview 只做 JSON 展示，故用 unknown。
 */
export interface LlmCallTraceRecord {
  readonly type: "llm.call";
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

/** 对话轨迹查询结果：supported=false 表示当前引擎（v1）不支持该能力 */
export interface LlmCallTraceResult {
  readonly supported: boolean;
  readonly records: readonly LlmCallTraceRecord[];
}

export type { QuestionRequest, QuestionItem, QuestionOption, QuestionResponse } from "./legacy-sdk";

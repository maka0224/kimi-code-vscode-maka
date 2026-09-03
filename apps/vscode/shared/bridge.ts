/**
 * Bridge Protocol - Communication between VS Code extension and webview.
 *
 * Architecture:
 * - Webview calls Methods via RPC (request/response)
 * - Extension broadcasts Events to webview (one-way notifications)
 *
 * RPC flow: webview.call(method, params) -> extension.dispatch -> webview.resolve(result)
 * Event flow: extension.broadcast(event, data) -> webview.on(event, handler)
 */

export const Methods = {
  CheckWorkspace: "checkWorkspace",
  GetWorkspaceTrust: "getWorkspaceTrust",
  TrustWorkspace: "trustWorkspace",
  GetInputHistory: "getInputHistory",
  AddInputHistory: "addInputHistory",

  GetSlashCommands: "getSlashCommands",
  CheckLoginStatus: "checkLoginStatus",
  Login: "login",
  Logout: "logout",
  SaveConfig: "saveConfig",
  GetExtensionConfig: "getExtensionConfig",
  OpenSettings: "openSettings",
  OpenFolder: "openFolder",
  GetModels: "getModels",
  GetUsage: "getUsage",
  OptimizePrompt: "optimizePrompt",
  GetOptimizePrefs: "getOptimizePrefs",
  SaveOptimizePrefs: "saveOptimizePrefs",

  GetMCPServers: "getMCPServers",
  AddMCPServer: "addMCPServer",
  UpdateMCPServer: "updateMCPServer",
  RemoveMCPServer: "removeMCPServer",
  AuthMCP: "authMCP",
  ResetAuthMCP: "resetAuthMCP",
  TestMCP: "testMCP",

  StreamChat: "streamChat",
  AbortChat: "abortChat",
  ResetSession: "resetSession",
  SetPlanMode: "setPlanMode",
  SteerChat: "steerChat",
  RespondApproval: "respondApproval",

  GetKimiSessions: "getKimiSessions",
  GetAllKimiSessions: "getAllKimiSessions",
  GetRegisteredWorkDirs: "getRegisteredWorkDirs",
  SetWorkDir: "setWorkDir",
  BrowseWorkDir: "browseWorkDir",
  LoadKimiSessionHistory: "loadKimiSessionHistory",
  DeleteKimiSession: "deleteKimiSession",
  ForkKimiSession: "forkKimiSession",
  RenameKimiSession: "renameKimiSession",
  GetProjectFiles: "getProjectFiles",
  PickMedia: "pickMedia",
  OpenFile: "openFile",
  CheckFileExists: "checkFileExists",
  CheckFilesExist: "checkFilesExist",
  OpenFileDiff: "openFileDiff",
  TrackFiles: "trackFiles",
  ClearTrackedFiles: "clearTrackedFiles",
  RevertFiles: "revertFiles",
  KeepChanges: "keepChanges",
  GetImageDataUri: "getImageDataUri",
  ShowLogs: "showLogs",
  ReloadWebview: "reloadWebview",
  RespondQuestion: "respondQuestion",
  ResolveDroppedUris: "resolveDroppedUris",
} as const;

export type RpcMethod = (typeof Methods)[keyof typeof Methods];

export interface RpcMessage {
  readonly id: string;
  readonly method: RpcMethod;
  readonly params?: unknown;
}

export interface RpcResult {
  readonly id: string;
  readonly result?: unknown;
  readonly error?: string;
}

export interface UsageWindow {
  readonly duration: number;
  readonly unit: "minute" | "hour" | "day" | "week";
}

export interface UsageRow {
  /** Backend-provided label; takes priority over the generated window label. */
  readonly name?: string;
  readonly window?: UsageWindow;
  readonly used: number;
  readonly limit: number;
  /** ISO timestamp at which the window resets. */
  readonly resetAt?: string;
}

export interface BoosterWalletInfo {
  /** Remaining balance in whole cents. */
  readonly balanceCents: number;
  /** Total balance in whole cents. */
  readonly totalCents: number;
  readonly monthlyChargeLimitEnabled: boolean;
  readonly monthlyChargeLimitCents: number;
  readonly monthlyUsedCents: number;
  readonly currency: string;
}

export interface ManagedUsageOk {
  readonly kind: "ok";
  readonly summary: UsageRow | null;
  readonly limits: UsageRow[];
  readonly extraUsage: BoosterWalletInfo | null;
}

export interface ManagedUsageError {
  readonly kind: "error";
  readonly status?: number;
  readonly message: string;
}

export type ManagedUsageResult = ManagedUsageOk | ManagedUsageError;

/** Result of a one-shot prompt-optimization generation (no session, no history). */
export interface OptimizePromptResult {
  readonly text: string;
  /** Provider trace identifier (Kimi/KFC only), or null when not reported. */
  readonly traceId?: string | null;
}

/** Cached prompt-optimizer preferences (model / thinking / system prompt). */
export interface OptimizePrefs {
  readonly modelId?: string;
  readonly effort?: string;
  readonly systemPrompt?: string;
}

/**
 * 提示词优化的默认 system prompt。用户可在气泡的「编辑提示词」中覆盖，
 * 覆盖值经 SaveOptimizePrefs 持久化；宿主在 optimizePrompt 未携带
 * systemPrompt 时回退到本常量，两端共用此单一来源。
 */
export const DEFAULT_OPTIMIZE_SYSTEM_PROMPT = `# 角色
你是一个编程指令优化器。用户会给你一段准备发送给 AI 编程助手的原始文本，你的任务是将其改写为清晰、准确、结构化的指令，使接收方大模型能够无歧义地理解并执行。

# 优化目标（按优先级）
1. 修正错别字、病句、标点错误，不改变原意。
2. 消除歧义：把"这个""那个""它"等指代替换为具体对象；把模糊量词（"一些""大概""改一下"）替换为可执行的具体描述。若原文信息不足以消除歧义，保留原样，不要臆造细节。
3. 补全技术上下文：仅当原文已隐含时可显式化（如提到文件名、函数名、错误信息时规范其格式），禁止编造原文不存在的需求、路径或参数。
4. 结构化排版：使用 Markdown 组织——需求用有序步骤或要点列出；代码、命令、文件路径、标识符用反引号包裹；错误信息/日志用代码块包裹；多个独立任务用标题或分隔线分开。

# 硬性规则
- 保持用户原意，不增删需求，不替用户做技术决策。
- 保持原文语言（中文进中文出，英文进英文出，中英混合保持混合）。
- 代码片段、命令、URL、版本号等字面内容原样保留，不得"修正"。
- 只输出优化后的文本本身，不要输出解释、对比、前后说明或任何元信息。
- 若原文本身已清晰规范，直接原样返回。`;

export type RpcMessageValidation =
  | { readonly ok: true; readonly message: RpcMessage }
  | {
      readonly ok: false;
      readonly id: string;
      readonly method: string;
      readonly error: string;
    };

export const Events = {
  ExtensionConfigChanged: "extensionConfigChanged",
  MCPServersChanged: "mcpServersChanged",
  StreamEvent: "streamEvent",
  FocusInput: "focusInput",
  InsertMention: "insertMention",
  NewConversation: "newConversation",
  FileChangesUpdated: "fileChangesUpdated",
  RollbackInput: "rollbackInput",
  LoginUrl: "loginUrl",
  WindowFocused: "windowFocused",
  WindowBlurred: "windowBlurred",
  WorkspaceTrustChanged: "workspaceTrustChanged",
  SessionTitleChanged: "sessionTitleChanged",
} as const;

const rpcMethods = new Set<string>(Object.values(Methods));

/** Validates the untrusted Webview message before any host-side handler runs. */
export function validateRpcMessage(value: unknown): RpcMessageValidation {
  if (!isPlainObject(value)) {
    return invalidMessage("", "<invalid>", "Invalid bridge request: expected a plain object.");
  }

  const id = value["id"];
  if (!Object.hasOwn(value, "id") || typeof id !== "string" || id.trim().length === 0) {
    return invalidMessage("", safeMethod(value["method"]), "Invalid bridge request: id must be a non-empty string.");
  }

  const method = value["method"];
  if (!Object.hasOwn(value, "method") || typeof method !== "string" || method.trim().length === 0) {
    return invalidMessage(id, "<invalid>", "Invalid bridge request: method must be a non-empty string.");
  }
  if (!rpcMethods.has(method)) {
    return invalidMessage(id, method, `Unknown bridge method: ${method}`);
  }
  const params = Object.hasOwn(value, "params") ? value["params"] : undefined;
  if (!validateParams(method as RpcMethod, params)) {
    return invalidMessage(id, method, `Invalid bridge params for method: ${method}`);
  }

  return { ok: true, message: { id, method: method as RpcMethod, params } };
}

function validateParams(method: RpcMethod, params: unknown): boolean {
  switch (method) {
    case Methods.CheckWorkspace:
    case Methods.GetWorkspaceTrust:
    case Methods.TrustWorkspace:
    case Methods.GetInputHistory:
    case Methods.GetSlashCommands:
    case Methods.CheckLoginStatus:
    case Methods.Login:
    case Methods.Logout:
    case Methods.GetExtensionConfig:
    case Methods.OpenSettings:
    case Methods.OpenFolder:
    case Methods.GetModels:
    case Methods.GetUsage:
    case Methods.GetMCPServers:
    case Methods.AbortChat:
    case Methods.ResetSession:
    case Methods.GetKimiSessions:
    case Methods.GetAllKimiSessions:
    case Methods.GetRegisteredWorkDirs:
    case Methods.BrowseWorkDir:
    case Methods.ClearTrackedFiles:
    case Methods.ShowLogs:
    case Methods.ReloadWebview:
    case Methods.GetOptimizePrefs:
      return params === undefined;

    case Methods.AddInputHistory:
      return hasString(params, "text");
    case Methods.OptimizePrompt:
      return isPlainObject(params)
        && hasNonEmptyString(params, "text")
        && isNonEmptyString(params["modelId"])
        && isOptionalType(params["effort"], "string")
        && isOptionalType(params["systemPrompt"], "string");
    case Methods.SaveOptimizePrefs:
      return isPlainObject(params)
        && isOptionalType(params["modelId"], "string")
        && isOptionalType(params["effort"], "string")
        && isOptionalType(params["systemPrompt"], "string");
    case Methods.SaveConfig:
      return isPlainObject(params)
        && typeof params["model"] === "string"
        && isOptionalType(params["thinking"], "boolean")
        && isOptionalType(params["effort"], "string")
        && isOptionalType(params["effortChanged"], "boolean");
    case Methods.AddMCPServer:
      return isMcpServerConfig(params);
    case Methods.UpdateMCPServer:
      return isMcpUpdate(params);
    case Methods.RemoveMCPServer:
    case Methods.AuthMCP:
    case Methods.ResetAuthMCP:
    case Methods.TestMCP:
      return hasNonEmptyString(params, "name");
    case Methods.StreamChat:
      return isStreamChatParams(params);
    case Methods.RespondApproval:
      return isPlainObject(params)
        && isNonEmptyString(params["requestId"])
        && (params["response"] === "approve"
          || params["response"] === "approve_for_session"
          || params["response"] === "reject");
    case Methods.RespondQuestion:
      return isPlainObject(params)
        && isNonEmptyString(params["rpcRequestId"])
        && isNonEmptyString(params["questionRequestId"])
        && isStringRecord(params["answers"]);
    case Methods.SetPlanMode:
      return hasBoolean(params, "enabled");
    case Methods.SteerChat:
      return isPlainObject(params) && isContent(params["content"]);
    case Methods.GetProjectFiles:
      return params === undefined || (
        isPlainObject(params)
        && isOptionalType(params["query"], "string")
        && isOptionalType(params["directory"], "string")
      );
    case Methods.SetWorkDir:
      return isPlainObject(params) && (params["workDir"] === null || typeof params["workDir"] === "string");
    case Methods.LoadKimiSessionHistory:
      return hasNonEmptyString(params, "kimiSessionId");
    case Methods.DeleteKimiSession:
      return hasNonEmptyString(params, "sessionId");
    case Methods.RenameKimiSession:
      return isPlainObject(params)
        && isNonEmptyString(params["sessionId"])
        && typeof params["title"] === "string";
    case Methods.ForkKimiSession:
      return isPlainObject(params)
        && isNonEmptyString(params["sessionId"])
        && Number.isInteger(params["turnIndex"])
        && (params["turnIndex"] as number) >= 0;
    case Methods.PickMedia:
      return isPlainObject(params)
        && (params["maxCount"] === undefined
          || (Number.isInteger(params["maxCount"]) && (params["maxCount"] as number) >= 0))
        && isOptionalType(params["includeVideo"], "boolean");
    case Methods.OpenFile:
    case Methods.OpenFileDiff:
    case Methods.CheckFileExists:
    case Methods.GetImageDataUri:
      return hasString(params, "filePath");
    case Methods.CheckFilesExist:
    case Methods.TrackFiles:
      return hasStringArray(params, "paths");
    case Methods.ResolveDroppedUris:
      return isPlainObject(params) && hasStringArray(params, "uris");
    case Methods.RevertFiles:
    case Methods.KeepChanges:
      return isPlainObject(params) && isOptionalType(params["filePath"], "string");
    default:
      return false;
  }
}

function isStreamChatParams(value: unknown): boolean {
  return isPlainObject(value)
    && isContent(value["content"])
    && typeof value["model"] === "string"
    && isOptionalType(value["effort"], "string")
    && isOptionalType(value["thinking"], "boolean")
    && isOptionalType(value["planMode"], "boolean")
    && isOptionalType(value["sessionId"], "string");
}

function isContent(value: unknown): boolean {
  return typeof value === "string" || (Array.isArray(value) && value.every(isContentPart));
}

function isContentPart(value: unknown): boolean {
  if (!isPlainObject(value) || typeof value["type"] !== "string") return false;
  switch (value["type"]) {
    case "text":
      return typeof value["text"] === "string";
    case "think":
      return typeof value["think"] === "string"
        && (value["encrypted"] === undefined
          || value["encrypted"] === null
          || typeof value["encrypted"] === "string");
    case "image_url":
    case "audio_url":
    case "video_url": {
      const media = value[value["type"]];
      return isPlainObject(media)
        && typeof media["url"] === "string"
        && (media["id"] === undefined || media["id"] === null || typeof media["id"] === "string");
    }
    default:
      return false;
  }
}

function isMcpUpdate(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (Object.hasOwn(value, "server")) {
    return isNonEmptyString(value["originalName"]) && isMcpServerConfig(value["server"]);
  }
  return isMcpServerConfig(value);
}

function isMcpServerConfig(value: unknown): boolean {
  return isPlainObject(value)
    && isNonEmptyString(value["name"])
    && (value["transport"] === "stdio" || value["transport"] === "http")
    && isOptionalType(value["url"], "string")
    && isOptionalType(value["command"], "string")
    && (value["args"] === undefined || isStringArray(value["args"]))
    && (value["env"] === undefined || isStringRecord(value["env"]))
    && (value["headers"] === undefined || isStringRecord(value["headers"]))
    && (value["auth"] === undefined || value["auth"] === "oauth")
    && isOptionalType(value["bearerTokenEnvVar"], "string");
}

function hasString(value: unknown, key: string): boolean {
  return isPlainObject(value) && typeof value[key] === "string";
}

function hasNonEmptyString(value: unknown, key: string): boolean {
  return isPlainObject(value) && isNonEmptyString(value[key]);
}

function hasBoolean(value: unknown, key: string): boolean {
  return isPlainObject(value) && typeof value[key] === "boolean";
}

function hasStringArray(value: unknown, key: string): boolean {
  return isPlainObject(value) && isStringArray(value[key]);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringRecord(value: unknown): boolean {
  return isPlainObject(value) && Object.values(value).every((item) => typeof item === "string");
}

function isOptionalType(value: unknown, type: "string" | "boolean"): boolean {
  return value === undefined || typeof value === type;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalidMessage(id: string, method: string, error: string): RpcMessageValidation {
  return { ok: false, id, method, error };
}

function safeMethod(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "<invalid>";
}

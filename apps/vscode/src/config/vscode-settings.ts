import * as vscode from "vscode";
import type { ExtensionConfig } from "../../shared/types";

declare const __EXTENSION_VERSION__: string;
const EXTENSION_VERSION = typeof __EXTENSION_VERSION__ !== "undefined" ? __EXTENSION_VERSION__ : "0.0.0";

/** Support backdoor with the highest priority: a truthy value forces the legacy v1 engine. */
export const LEGACY_ENGINE_ENV = "KIMI_CODE_LEGACY_FLAG";

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

/**
 * The single engine-selection decision for the whole extension. A truthy
 * `KIMI_CODE_LEGACY_FLAG` wins over the `maka.useAgentCoreV1` setting, so
 * support and headless test runs can force the legacy engine without
 * touching user settings. Both default to the v2 engine.
 */
export function resolveUseAgentCoreV1(
  settingValue: boolean,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  if (TRUTHY_ENV_VALUES.has((env[LEGACY_ENGINE_ENV] ?? "").trim().toLowerCase())) {
    return true;
  }
  return settingValue;
}

function getConfig() {
  return vscode.workspace.getConfiguration("maka");
}

export const VSCodeSettings = {
  get yoloMode(): boolean {
    return getConfig().get<boolean>("yoloMode", false);
  },

  get autosave(): boolean {
    return getConfig().get<boolean>("autosave", true);
  },

  get enableNewConversationShortcut(): boolean {
    return getConfig().get<boolean>("enableNewConversationShortcut", false);
  },

  get useCtrlEnterToSend(): boolean {
    return getConfig().get<boolean>("useCtrlEnterToSend", false);
  },

  get showThinkingContent(): boolean {
    return getConfig().get<boolean>("showThinkingContent", false);
  },

  get showThinkingExpanded(): boolean {
    return getConfig().get<boolean>("showThinkingExpanded", false);
  },

  get editorContext(): "never" | "onConversationStart" | "onFileChange" {
    return getConfig().get<"never" | "onConversationStart" | "onFileChange">("editorContext", "never");
  },

  /** Read once at activation; a change needs a window reload to take effect. */
  get useAgentCoreV1(): boolean {
    return resolveUseAgentCoreV1(getConfig().get<boolean>("useAgentCoreV1", false), process.env);
  },

  /** 开启后首轮完成调用大模型生成会话名称；关闭时回退为首条提问前 20 字（运行时读取，即时生效）。 */
  get autoGenerateSessionTitle(): boolean {
    return getConfig().get<boolean>("autoGenerateSessionTitle", false);
  },

  /** 通知设置（maka.notifications.* 扁平配置，设置界面自动归入 Notifications 分组）。 */
  get notificationsEnabled(): boolean {
    return getConfig().get<boolean>("notifications.enabled", true);
  },

  get notificationsOnlyWhenUnfocused(): boolean {
    return getConfig().get<boolean>("notifications.onlyWhenUnfocused", true);
  },

  get notificationsOnApproval(): boolean {
    return getConfig().get<boolean>("notifications.onApproval", true);
  },

  get notificationsOnQuestion(): boolean {
    return getConfig().get<boolean>("notifications.onQuestion", true);
  },

  get notificationsOnComplete(): boolean {
    return getConfig().get<boolean>("notifications.onComplete", true);
  },

  get notificationsOnError(): boolean {
    return getConfig().get<boolean>("notifications.onError", true);
  },

  getExtensionConfig(): ExtensionConfig {
    return {
      yoloMode: this.yoloMode,
      autosave: this.autosave,
      useCtrlEnterToSend: this.useCtrlEnterToSend,
      enableNewConversationShortcut: this.enableNewConversationShortcut,
      showThinkingContent: this.showThinkingContent,
      showThinkingExpanded: this.showThinkingExpanded,
      version: EXTENSION_VERSION,
    };
  },
};

export function onSettingsChange(callback: (changedKeys: string[]) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration("maka")) {
      return;
    }
    const keys = ["yoloMode", "autosave", "enableNewConversationShortcut", "useCtrlEnterToSend", "showThinkingContent", "showThinkingExpanded", "editorContext"];
    const changedKeys = keys.filter((key) => e.affectsConfiguration(`maka.${key}`));
    if (changedKeys.length > 0) {
      callback(changedKeys);
    }
  });
}

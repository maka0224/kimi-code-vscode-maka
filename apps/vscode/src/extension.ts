import { stat } from "node:fs/promises";

import * as vscode from "vscode";

import { Events } from "../shared/bridge";
import { KimiWebviewProvider } from "./KimiWebviewProvider";
import { onSettingsChange, VSCodeSettings } from "./config/vscode-settings";
import {
  LegacyMigrationManager,
  type LegacyMigrationDiscovery,
  type LegacyMigrationRunResult,
} from "./migration";
import { updateLoginContext } from "./utils/context";

let outputChannel: vscode.OutputChannel | undefined;
let provider: KimiWebviewProvider | undefined;

/** onDidChangeTextEditorSelection 随光标移动高频触发，广播前统一防抖。 */
let activeEditorContextTimer: NodeJS.Timeout | undefined;
function scheduleActiveEditorContextBroadcast(): void {
  clearTimeout(activeEditorContextTimer);
  activeEditorContextTimer = setTimeout(() => {
    void provider?.broadcastActiveEditorContext();
  }, 150);
}

const LEGACY_REAUTH_NOTICE_KEY = "maka.legacyMigration.reauthNotice.v1";
const LEGACY_WARNING_NOTICE_KEY = "maka.legacyMigration.warningNotice.v1";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 引擎默认关闭 auto_session_title（env 默认 false）；flag 只控制 generateSessionTitle
  // 是否可用，自动触发的责任在客户端（首轮完成后调用），所以这里无条件打开。
  // 必须在引擎/harness 初始化前设置。
  process.env["KIMI_CODE_EXPERIMENTAL_AUTO_SESSION_TITLE"] = "1";

  outputChannel = vscode.window.createOutputChannel("Kimi Code Maka");
  const remoteInfo = vscode.env.remoteName ? ` (remote: ${vscode.env.remoteName})` : "";
  log(`Kimi Code Maka ${VSCodeSettings.getExtensionConfig().version} activating${remoteInfo}`);

  provider = new KimiWebviewProvider(
    context.extensionUri,
    context,
    () => outputChannel?.show(),
    (message) => log(message),
  );
  context.subscriptions.push(provider, outputChannel);

  let isLoggedIn = false;
  try {
    isLoggedIn = await updateLoginContext(provider.harness);
  } catch (error) {
    logError("Unable to determine login status", error);
  }

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("maka-baseline", {
      provideTextDocumentContent: async (uri) => {
        const sessionId = new URLSearchParams(uri.query).get("sessionId");
        if (!sessionId || !provider) return "";
        const relativePath = decodeURIComponent(uri.path.replace(/^\//, ""));
        try {
          return await provider.getBaselineContent(sessionId, relativePath);
        } catch (error) {
          logError("Unable to open baseline content", error);
          return "";
        }
      },
    }),
  );

  context.subscriptions.push(
    onSettingsChange((changedKeys) => {
      provider?.broadcast(Events.ExtensionConfigChanged, {
        config: VSCodeSettings.getExtensionConfig(),
        changedKeys,
      });
      if (changedKeys.includes("yoloMode")) {
        void provider
          ?.setYoloModeForActiveSessions(VSCodeSettings.yoloMode)
          .catch((error) => logError("Unable to update session permission", error));
      }
    }),
    vscode.window.registerWebviewViewProvider("maka.webview", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    // webview iframe 的 window focus/blur 事件在 VS Code 窗口焦点变化时不一定触发，
    // 由宿主广播窗口聚焦/失焦，webview 据此记录并恢复输入框焦点
    vscode.window.onDidChangeWindowState((state) => {
      provider?.broadcast(state.focused ? Events.WindowFocused : Events.WindowBlurred, {});
    }),
    // 输入框上方的编辑器上下文 chip：活动编辑器或选区变化时广播最新值。
    // 光标移动高频触发，防抖 + provider 内部去重双保险
    vscode.window.onDidChangeActiveTextEditor(scheduleActiveEditorContextBroadcast),
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor === vscode.window.activeTextEditor) scheduleActiveEditorContextBroadcast();
    }),
  );

  const migrationManager = new LegacyMigrationManager({
    targetHome: provider.harness.homeDir,
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    legacyEnvironmentVariables: vscode.workspace
      .getConfiguration("kimi")
      .get<unknown>("environmentVariables"),
  });
  let migrationInFlight: Promise<void> | undefined;
  const runMigration = (retry: boolean): Promise<void> => {
    if (migrationInFlight !== undefined) return migrationInFlight;
    migrationInFlight = performMigration(migrationManager, retry).finally(() => {
      migrationInFlight = undefined;
    });
    return migrationInFlight;
  };

  const commands: Record<string, () => void | Promise<void>> = {
    "maka.clearAllState": async () => {
      await context.globalState.update("maka.config", undefined);
      await context.globalState.update("maka.mcpServers", undefined);
      await context.workspaceState.update("maka.mcpEnabled", undefined);
      await vscode.window.showInformationMessage("Kimi Code Maka: Extension UI state cleared.");
    },
    "maka.openInTab": () => {
      provider?.createPanel();
    },
    "maka.openInSideBar": async () => {
      await vscode.commands.executeCommand("maka.webview.focus");
    },
    "maka.focusInput": async () => {
      await vscode.commands.executeCommand("maka.webview.focus");
      provider?.broadcast(Events.FocusInput, {});
    },
    "maka.insertMention": async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        await vscode.window.showWarningMessage("No active editor");
        return;
      }
      await vscode.commands.executeCommand("maka.webview.focus");
      if (!(await provider?.insertEditorMention(editor.document.uri, editor.selection))) {
        await vscode.window.showWarningMessage("The active file is outside the selected working directory.");
      }
    },
    "maka.newConversation": async () => {
      await vscode.commands.executeCommand("maka.webview.focus");
      provider?.broadcast(Events.NewConversation, {});
    },
    "maka.showLogs": () => outputChannel?.show(),
    "maka.resetKimi": () => provider?.resetAllWebviews(),
    "maka.logout": async () => {
      await vscode.commands.executeCommand("maka.webview.focus");
      await vscode.window.showInformationMessage("Use the logout button in Kimi Code Maka settings.");
    },
    "maka.migrateLegacyData": () => runMigration(true),
  };

  for (const [id, handler] of Object.entries(commands)) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }

  // 开发模式下轮询 vite watch 产物，webview.js 重建后自动重载所有 webview，
  // 免去手动 Developer: Reload Webviews（webview.html 只在创建时赋值，不会自动刷新）
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    context.subscriptions.push(watchWebviewBundle(context.extensionUri, () => provider?.reloadAllWebviews()));
  }

  void offerLegacyMigration(
    migrationManager,
    () => runMigration(false),
    context.globalState,
    isLoggedIn,
  ).catch((error) => {
    logError("Unable to check for legacy Kimi data", error);
  });
  log("Kimi Code Maka activated");
}

export async function deactivate(): Promise<void> {
  log("Kimi Code Maka deactivating");
  await provider?.shutdown();
  provider = undefined;
}

function log(message: string): void {
  outputChannel?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

/** 轮询 dist/webview.js 的 mtime，变化时回调；返回可释放对象。用轮询而非 fs.watch，与 scripts/watch-extension.mjs 保持一致（Windows 上 fs.watch 不可靠） */
function watchWebviewBundle(extensionUri: vscode.Uri, onRebuild: () => void): vscode.Disposable {
  const bundlePath = vscode.Uri.joinPath(extensionUri, "dist", "webview.js").fsPath;
  let lastMtimeMs = 0;
  let reloadTimer: NodeJS.Timeout | undefined;
  const interval = setInterval(async () => {
    try {
      const { mtimeMs } = await stat(bundlePath);
      if (lastMtimeMs === 0) {
        lastMtimeMs = mtimeMs;
        return;
      }
      if (mtimeMs === lastMtimeMs) return;
      lastMtimeMs = mtimeMs;
      // vite 一次 rebuild 会多次落盘，稍作防抖
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        log("Webview bundle rebuilt; reloading webviews");
        onRebuild();
      }, 300);
    } catch {
      // 产物暂时不存在（clean 后/首次构建前），忽略
    }
  }, 1_000);
  return new vscode.Disposable(() => {
    clearInterval(interval);
    clearTimeout(reloadTimer);
  });
}

function logError(message: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  log(`${message}: ${detail}`);
}

async function offerLegacyMigration(
  manager: LegacyMigrationManager,
  migrate: () => Promise<void>,
  globalState: vscode.Memento,
  isLoggedIn: boolean,
): Promise<void> {
  const discovery = await manager.discover();
  logMigrationDiscovery(discovery);
  const reauthNotice = legacyReauthNotice(discovery, isLoggedIn);
  const warningNotice =
    discovery.warnings.length === 0
      ? null
      : "Some legacy Kimi data could not be inspected. Use “Kimi Code Maka: Migrate Legacy Data” to retry.";
  if (discovery.prompt === null) {
    if (reauthNotice !== null && !globalState.get<boolean>(LEGACY_REAUTH_NOTICE_KEY, false)) {
      await vscode.window.showWarningMessage(reauthNotice);
      await globalState.update(LEGACY_REAUTH_NOTICE_KEY, true);
    }
    if (
      discovery.warnings.length > 0 &&
      !globalState.get<boolean>(LEGACY_WARNING_NOTICE_KEY, false)
    ) {
      const action = await vscode.window.showWarningMessage(
        warningNotice ?? "Some legacy Kimi data could not be inspected.",
        "Show Logs",
      );
      await globalState.update(LEGACY_WARNING_NOTICE_KEY, true);
      if (action === "Show Logs") outputChannel?.show();
    }
    return;
  }

  const action = await vscode.window.showInformationMessage(
    [discovery.prompt.message, reauthNotice, warningNotice]
      .filter((message) => message !== null)
      .join(" "),
    ...discovery.prompt.actions.map(({ label }) => label),
  );
  if (reauthNotice !== null) await globalState.update(LEGACY_REAUTH_NOTICE_KEY, true);
  if (warningNotice !== null) await globalState.update(LEGACY_WARNING_NOTICE_KEY, true);
  if (action === "Migrate Now") await migrate();
}

function legacyReauthNotice(
  discovery: LegacyMigrationDiscovery,
  isLoggedIn: boolean,
): string | null {
  const kimiLogins = isLoggedIn ? 0 : discovery.notices.oauthLoginsRequiringRelogin.length;
  const mcpLogins = discovery.notices.mcpOauthServersRequiringReauth.length;
  if (kimiLogins === 0 && mcpLogins === 0) return null;
  if (kimiLogins > 0 && mcpLogins > 0) {
    return "Legacy OAuth credentials are not copied. Sign in to Kimi Code Maka and authorize your MCP servers again.";
  }
  return kimiLogins > 0
    ? "Legacy OAuth credentials are not copied. Sign in to Kimi Code Maka again."
    : "Legacy MCP OAuth credentials are not copied. Authorize those MCP servers again.";
}

async function performMigration(
  manager: LegacyMigrationManager,
  retry: boolean,
): Promise<void> {
  log(`${retry ? "Retrying" : "Starting"} legacy Kimi data migration`);
  const result = retry ? await manager.retry() : await manager.migrateNow();
  logMigrationResult(result);

  if (result.status === "completed" || result.status === "partial") {
    try {
      await provider?.harness.getConfig({ reload: true });
      await provider?.resetAllWebviews();
    } catch (error) {
      logError("Migration finished, but the runtime config could not be reloaded", error);
    }
  }

  const reauthCount =
    result.notices.oauthLoginsRequiringRelogin.length +
    result.notices.mcpOauthServersRequiringReauth.length;
  const reauthNotice =
    reauthCount === 0
      ? ""
      : ` ${reauthCount} OAuth connection(s) must be signed in again.`;
  const message = `${result.message}${reauthNotice}`;
  const needsLogs =
    result.status === "partial" ||
    result.status === "failed" ||
    result.warnings.length > 0 ||
    result.manualActions.length > 0;

  if (result.status === "failed") {
    const action = await vscode.window.showErrorMessage(message, "Show Logs");
    if (action === "Show Logs") outputChannel?.show();
  } else if (needsLogs) {
    const action = await vscode.window.showWarningMessage(message, "Show Logs");
    if (action === "Show Logs") outputChannel?.show();
  } else {
    await vscode.window.showInformationMessage(message);
  }
}

function logMigrationDiscovery(discovery: LegacyMigrationDiscovery): void {
  for (const warning of discovery.warnings) log(`Legacy migration warning: ${warning.message}`);
  for (const source of discovery.suppressedSources) {
    log(`Legacy migration already completed for ${source.sourceHome}`);
  }
}

function logMigrationResult(result: LegacyMigrationRunResult): void {
  const { totals } = result;
  log(
    `Legacy migration ${result.status}: config=${totals.configFiles} mcp=${totals.mcpServers} history=${totals.userHistoryEntries} skills=${totals.skills} sessions=${totals.sessions} alreadyMigrated=${totals.alreadyMigratedSessions} skipped=${totals.skippedItems} conflicts=${totals.conflicts} failures=${totals.failures}`,
  );
  for (const warning of result.warnings) log(`Legacy migration warning: ${warning.message}`);
  for (const source of result.sources) {
    for (const failure of source.failures) {
      log(`Legacy migration failure (${failure.sourceHome}): ${failure.message}`);
    }
  }
  for (const action of result.manualActions) log(`Legacy migration action: ${action}`);
}

export { log };

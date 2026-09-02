import { execFile } from "node:child_process";

import * as vscode from "vscode";

import { VSCodeSettings } from "./config/vscode-settings";

/** 会话状态通知的事件类别。 */
export type SessionNotificationKind = "approval" | "question" | "complete" | "error";

const VIEW_FOCUS_COMMAND = "maka.webview.focus";
const VIEW_ACTION = "查看";
const NOTIFICATION_TITLE = "Kimi Code Maka";

/** 检查事件类别对应的分项开关。 */
function kindEnabled(kind: SessionNotificationKind): boolean {
  switch (kind) {
    case "approval":
      return VSCodeSettings.notificationsOnApproval;
    case "question":
      return VSCodeSettings.notificationsOnQuestion;
    case "complete":
      return VSCodeSettings.notificationsOnComplete;
    case "error":
      return VSCodeSettings.notificationsOnError;
  }
}

/** PowerShell 单引号字符串与 XML 内容的双重转义。 */
function escapePowerShellXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "''");
}

/** AppleScript 双引号字符串转义。 */
function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * 发送操作系统级通知（Windows 通知中心 / macOS 通知中心 / Linux notify-send）。
 * VS Code 内置通知只出现在应用内，窗口失焦时用户看不到，所以失焦场景改走
 * 系统原生命令；调用失败一律静默，不影响会话本身。
 */
export function sendSystemNotification(title: string, message: string): void {
  try {
    if (process.platform === "win32") {
      const xml =
        `<toast><visual><binding template="ToastGeneric">` +
        `<text>${escapePowerShellXml(title)}</text><text>${escapePowerShellXml(message)}</text>` +
        `</binding></visual></toast>`;
      // 借用 PowerShell 自带的 AppUserModelID，免安装模块即可在 Win10+ 弹出 Toast
      const script = [
        "[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime] | Out-Null",
        "[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom,ContentType=WindowsRuntime] | Out-Null",
        "$xml = New-Object Windows.Data.Xml.Dom.XmlDocument",
        `$xml.LoadXml('${xml}')`,
        "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(" +
          `'{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'` +
          ").Show([Windows.UI.Notifications.ToastNotification]::new($xml))",
      ].join("; ");
      execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], () => undefined);
    } else if (process.platform === "darwin") {
      execFile("osascript", ["-e", `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`], () => undefined);
    } else {
      execFile("notify-send", [title, message], () => undefined);
    }
  } catch {
    // 系统通知不可用时静默降级
  }
}

/**
 * 发送会话状态通知。窗口失焦时发系统通知（进操作系统通知中心）；
 * 窗口聚焦且关闭了 onlyWhenUnfocused 时发应用内通知，带「查看」按钮聚焦聊天视图。
 */
export function notifySessionEvent(kind: SessionNotificationKind, message: string): void {
  if (!VSCodeSettings.notificationsEnabled || !kindEnabled(kind)) return;

  const focused = vscode.window.state.focused;
  if (VSCodeSettings.notificationsOnlyWhenUnfocused && focused) return;

  if (!focused) {
    sendSystemNotification(NOTIFICATION_TITLE, message);
    return;
  }

  const show =
    kind === "error"
      ? vscode.window.showErrorMessage
      : kind === "complete"
        ? vscode.window.showInformationMessage
        : vscode.window.showWarningMessage;
  void show(message, VIEW_ACTION).then((choice) => {
    if (choice === VIEW_ACTION) void vscode.commands.executeCommand(VIEW_FOCUS_COMMAND);
  });
}

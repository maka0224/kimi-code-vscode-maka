/**
 * Scenario: session state changes surface as notifications — OS-level system
 * notifications when the window is unfocused, in-app VS Code notifications with
 * a focus action when focused (and onlyWhenUnfocused is off).
 * Responsibilities: master/per-kind switches gate delivery, focused windows are
 * spared when onlyWhenUnfocused is on, unfocused delivery routes to the platform
 * notifier, and the kind picks the in-app message severity.
 * Wiring: the real notifySessionEvent; vscode window/commands/configuration and
 * node:child_process.execFile are mutable in-memory fakes.
 * Run: pnpm exec vitest run --config apps/vscode/vitest.config.ts apps/vscode/test/notifications.test.ts
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({
  configValues: new Map<string, unknown>(),
  focused: true,
  showInformationMessage: vi.fn(() => Promise.resolve(undefined as string | undefined)),
  showWarningMessage: vi.fn(() => Promise.resolve(undefined as string | undefined)),
  showErrorMessage: vi.fn(() => Promise.resolve(undefined as string | undefined)),
  executeCommand: vi.fn(),
  execFile: vi.fn(),
}));

vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => host.configValues.get(key) ?? fallback,
    }),
  },
  window: {
    get state() {
      return { focused: host.focused };
    },
    showInformationMessage: host.showInformationMessage,
    showWarningMessage: host.showWarningMessage,
    showErrorMessage: host.showErrorMessage,
  },
  commands: { executeCommand: host.executeCommand },
}));

vi.mock("node:child_process", () => ({
  execFile: host.execFile,
}));

import { notifySessionEvent } from "../src/notifications";

afterEach(() => {
  host.configValues.clear();
  host.focused = true;
  vi.clearAllMocks();
});

describe("notifySessionEvent", () => {
  it("sends a system notification when the window is unfocused", () => {
    host.focused = false;

    notifySessionEvent("complete", "回复已生成完成");

    expect(host.execFile).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(host.execFile.mock.calls[0])).toContain("回复已生成完成");
    expect(host.showInformationMessage).not.toHaveBeenCalled();
  });

  it("suppresses notifications for a focused window when onlyWhenUnfocused is on", () => {
    host.focused = true;

    notifySessionEvent("complete", "回复已生成完成");

    expect(host.execFile).not.toHaveBeenCalled();
    expect(host.showInformationMessage).not.toHaveBeenCalled();
  });

  it("notifies in-app for a focused window when onlyWhenUnfocused is off", () => {
    host.configValues.set("notifications.onlyWhenUnfocused", false);
    host.focused = true;

    notifySessionEvent("complete", "回复已生成完成");

    expect(host.showInformationMessage).toHaveBeenCalledWith("回复已生成完成", "查看");
    expect(host.execFile).not.toHaveBeenCalled();
  });

  it("does nothing when the master switch is off", () => {
    host.configValues.set("notifications.enabled", false);
    host.focused = false;

    notifySessionEvent("error", "任务失败：boom");

    expect(host.execFile).not.toHaveBeenCalled();
    expect(host.showErrorMessage).not.toHaveBeenCalled();
  });

  it("does nothing when the per-kind switch is off", () => {
    host.configValues.set("notifications.onApproval", false);
    host.focused = false;

    notifySessionEvent("approval", "请求审批：Bash");

    expect(host.execFile).not.toHaveBeenCalled();
    expect(host.showWarningMessage).not.toHaveBeenCalled();
  });

  it("routes approval/question to warning, complete to info and error to error in-app", () => {
    host.configValues.set("notifications.onlyWhenUnfocused", false);
    host.focused = true;

    notifySessionEvent("approval", "请求审批：Bash");
    notifySessionEvent("question", "有一个问题等待你回答");
    notifySessionEvent("complete", "回复已生成完成");
    notifySessionEvent("error", "任务失败：boom");

    expect(host.showWarningMessage).toHaveBeenCalledTimes(2);
    expect(host.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(host.showErrorMessage).toHaveBeenCalledTimes(1);
  });

  it("focuses the chat view when the user picks the view action in-app", async () => {
    host.configValues.set("notifications.onlyWhenUnfocused", false);
    host.focused = true;
    host.showInformationMessage.mockResolvedValue("查看");

    notifySessionEvent("complete", "回复已生成完成");
    await vi.waitFor(() => {
      expect(host.executeCommand).toHaveBeenCalledWith("maka.webview.focus");
    });
  });

  it("does not focus the chat view when the notification is dismissed", async () => {
    host.configValues.set("notifications.onlyWhenUnfocused", false);
    host.focused = true;
    host.showInformationMessage.mockResolvedValue(undefined);

    notifySessionEvent("complete", "回复已生成完成");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.executeCommand).not.toHaveBeenCalled();
  });

  it("escapes markup and quotes in system notification text", () => {
    host.focused = false;

    notifySessionEvent("error", "任务失败：<bad> 'xml'");

    const payload = JSON.stringify(host.execFile.mock.calls[0]);
    expect(payload).not.toContain("<bad>");
    expect(payload).toContain("&lt;bad&gt;");
  });
});

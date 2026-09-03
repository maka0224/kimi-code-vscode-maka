import * as vscode from "vscode";
import { Events, Methods } from "../../shared/bridge";
import type { Handler } from "./types";
import type { WorkspaceStatus, WorkspaceTrustState } from "shared/types";

const INPUT_HISTORY_KEY = "maka.inputHistory";
const MAX_HISTORY_SIZE = 100;

const checkWorkspace: Handler<void, WorkspaceStatus> = async (_, ctx) => {
  return {
    hasWorkspace: ctx.workDir !== null,
    path: ctx.workDir ?? undefined,
    workspaceRoot: ctx.workspaceRoot ?? undefined,
  };
};

// 目录信任：未信任目录的项目级 MCP 配置被引擎门控，横幅提示用户确认后写入信任标记
const getWorkspaceTrust: Handler<void, WorkspaceTrustState> = async (_, ctx) => {
  return ctx.harness.getWorkspaceTrustInfo(ctx.requireWorkDir());
};

const trustWorkspace: Handler<void, WorkspaceTrustState> = async (_, ctx) => {
  await ctx.harness.trustWorkspace(ctx.requireWorkDir());
  const state = await ctx.harness.getWorkspaceTrustInfo(ctx.requireWorkDir());
  ctx.broadcast(Events.WorkspaceTrustChanged, state);
  return state;
};

const openFolder: Handler<void, { ok: boolean }> = async () => {
  await vscode.commands.executeCommand("vscode.openFolder");
  return { ok: true };
};

const getInputHistory: Handler<void, string[]> = async (_, ctx) => {
  return ctx.workspaceState.get<string[]>(INPUT_HISTORY_KEY, []);
};

const addInputHistory: Handler<{ text: string }, { ok: boolean }> = async ({ text }, ctx) => {
  const history = ctx.workspaceState.get<string[]>(INPUT_HISTORY_KEY, []);
  // 避免重复添加相同的最近一条
  if (history[history.length - 1] !== text) {
    history.push(text);
    if (history.length > MAX_HISTORY_SIZE) {
      history.shift();
    }
    await ctx.workspaceState.update(INPUT_HISTORY_KEY, history);
  }
  return { ok: true };
};

export const workspaceHandlers: Record<string, Handler<any, any>> = {
  [Methods.CheckWorkspace]: checkWorkspace,
  [Methods.GetWorkspaceTrust]: getWorkspaceTrust,
  [Methods.TrustWorkspace]: trustWorkspace,
  [Methods.OpenFolder]: openFolder,
  [Methods.GetInputHistory]: getInputHistory,
  [Methods.AddInputHistory]: addInputHistory,
};

/**
 * Scenario: resolving dropped file:// URIs into workspace-relative mentions.
 * Responsibilities: keep in-workspace files, append trailing slash to directories, skip outsiders.
 * Wiring: mocked VS Code URI/fs boundary; real workspace-path utilities.
 * Run: pnpm --filter kimi-code exec vitest run --config vitest.config.ts test/file.handler.test.ts
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";

import { Methods } from "../shared/bridge";
import { fileHandlers } from "../src/handlers/file.handler";
import type { HandlerContext } from "../src/handlers/types";

const host = vi.hoisted(() => {
  class Uri {
    readonly scheme: string;
    readonly authority: string;
    readonly path: string;
    readonly fsPath: string;

    constructor(scheme: string, authority: string, path: string, fsPath: string) {
      this.scheme = scheme;
      this.authority = authority;
      this.path = path;
      this.fsPath = fsPath;
    }

    static file(fsPath: string): Uri {
      return new Uri("file", "", fsPath.replace(/\\/g, "/"), fsPath);
    }

    static parse(value: string): Uri {
      const url = new URL(value);
      let pathname = decodeURIComponent(url.pathname);
      // file:///C:/path → path C:/path on Windows
      if (pathname.startsWith("/") && /^\/[A-Za-z]:\//.test(pathname)) {
        pathname = pathname.slice(1);
      }
      const fsPath = pathname.replace(/\//g, "\\");
      return new Uri(url.protocol.slice(0, -1), url.host, pathname, fsPath);
    }

    toString(): string {
      return `${this.scheme}://${this.path}`;
    }
  }

  const stat = vi.fn();

  return { Uri, stat };
});

vi.mock("vscode", () => ({
  Uri: host.Uri,
  FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
  workspace: { fs: { stat: host.stat } },
}));

function createContext(workDir: string): HandlerContext {
  return {
    workDirUri: host.Uri.file(workDir) as vscode.Uri,
    workDir,
  } as unknown as HandlerContext;
}

describe("ResolveDroppedUris", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a relative mention for an in-workspace file", async () => {
    host.stat.mockResolvedValue({ type: 1 });

    const result = await fileHandlers[Methods.ResolveDroppedUris]!(
      { uris: ["file:///C:/workspace/src/app.ts"] },
      createContext("C:\\workspace"),
    );

    expect(result).toEqual({ mentions: ["src/app.ts"], skipped: 0 });
  });

  it("appends a trailing slash to an in-workspace directory", async () => {
    host.stat.mockResolvedValue({ type: 2 });

    const result = await fileHandlers[Methods.ResolveDroppedUris]!(
      { uris: ["file:///C:/workspace/src/components"] },
      createContext("C:\\workspace"),
    );

    expect(result).toEqual({ mentions: ["src/components/"], skipped: 0 });
  });

  it("skips URIs outside the working directory and counts them", async () => {
    host.stat.mockResolvedValue({ type: 1 });

    const result = await fileHandlers[Methods.ResolveDroppedUris]!(
      { uris: ["file:///C:/other/outside.ts"] },
      createContext("C:\\workspace"),
    );

    expect(result).toEqual({ mentions: [], skipped: 1 });
  });
});

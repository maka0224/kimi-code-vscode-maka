import { describe, expect, it, vi } from "vitest";

import { Methods } from "../shared/bridge";
import { usageHandlers } from "../src/handlers/usage.handler";
import type { HandlerContext } from "../src/handlers";

describe("usageHandlers", () => {
  const makeCtx = (getManagedUsage: () => Promise<unknown>): HandlerContext =>
    ({
      harness: { auth: { getManagedUsage } },
      logError: vi.fn(),
    }) as unknown as HandlerContext;

  it(`${Methods.GetUsage} passes through a successful result`, async () => {
    const result = {
      kind: "ok" as const,
      summary: { used: 10, limit: 100, window: { duration: 1, unit: "week" as const } },
      limits: [],
      extraUsage: null,
    };
    const ctx = makeCtx(() => Promise.resolve(result));
    const handler = usageHandlers[Methods.GetUsage]!;

    const response = await handler(undefined, ctx);

    expect(response).toEqual(result);
  });

  it(`${Methods.GetUsage} returns an error when getManagedUsage throws`, async () => {
    const ctx = makeCtx(() => Promise.reject(new Error("暂不支持查询")));
    const handler = usageHandlers[Methods.GetUsage]!;

    const response = await handler(undefined, ctx);

    expect(response).toEqual({ kind: "error", message: "暂不支持查询" });
    expect(ctx.logError).toHaveBeenCalledWith("Failed to get usage", expect.any(Error));
  });
});

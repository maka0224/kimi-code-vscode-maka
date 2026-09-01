import type { AuthManagedUsageResult } from "@moonshot-ai/kimi-code-oauth";

import { Methods } from "../../shared/bridge";
import type { Handler } from "./types";

export const usageHandlers: Record<string, Handler<any, any>> = {
  [Methods.GetUsage]: async (_, ctx): Promise<AuthManagedUsageResult> => {
    try {
      return await ctx.harness.auth.getManagedUsage();
    } catch (error) {
      ctx.logError("Failed to get usage", error);
      const message = error instanceof Error ? error.message : String(error);
      return { kind: "error", message };
    }
  },
};

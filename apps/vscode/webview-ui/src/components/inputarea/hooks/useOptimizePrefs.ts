import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bridge } from "@/services";
import { getModelById } from "@/stores";
import type { OptimizePrefs } from "shared/bridge";
import type { ModelConfig } from "shared/legacy-sdk";

const PREFS_KEY = ["optimizePrefs"] as const;

/** 提示词优化偏好：react-query 缓存，设置弹窗编辑即保存，优化按钮共享同一份。 */
export function useOptimizePrefs() {
  const queryClient = useQueryClient();
  const { data: prefs = {} } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => bridge.getOptimizePrefs(),
  });
  const save = (next: OptimizePrefs) => {
    queryClient.setQueryData(PREFS_KEY, next);
    void bridge.saveOptimizePrefs(next);
  };
  return { prefs, save };
}

/** 偏好中的模型已失效（配置变更）或未设置时回退到当前会话模型。 */
export function resolveOptimizeModelId(prefs: OptimizePrefs, models: ModelConfig[], currentModel: string): string {
  return prefs.modelId !== undefined && getModelById(models, prefs.modelId) !== undefined
    ? prefs.modelId
    : currentModel;
}

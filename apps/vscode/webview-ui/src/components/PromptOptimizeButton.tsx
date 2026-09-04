import { useState } from "react";
import { IconBulb, IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/sonner";
import { bridge } from "@/services";
import { useSettingsStore } from "@/stores";
import { resolveOptimizeModelId, useOptimizePrefs } from "./inputarea/hooks/useOptimizePrefs";

interface PromptOptimizeButtonProps {
  /** 输入框当前文本（优化对象）。 */
  text: string;
  /** 优化成功后写回输入框（由 InputArea 记录原稿用于回退）。 */
  onApplied: (optimized: string) => void;
}

/** 提示词优化按钮：点击即按设置弹窗中缓存的偏好直接执行优化；功能在设置中关闭时不显示。 */
export function PromptOptimizeButton({ text, onApplied }: PromptOptimizeButtonProps) {
  const { models, currentModel } = useSettingsStore();
  const { prefs } = useOptimizePrefs();
  const [loading, setLoading] = useState(false);

  const runOptimize = async () => {
    setLoading(true);
    try {
      const response = await bridge.optimizePrompt({
        text,
        modelId: resolveOptimizeModelId(prefs, models, currentModel),
        effort: prefs.effort ?? "off",
        systemPrompt: prefs.systemPrompt,
      });
      onApplied(response.text);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  if (prefs.enabled === false) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={loading}
          onClick={() => void runOptimize()}
          className="text-muted-foreground"
        >
          {loading ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconBulb className="size-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>提示词优化</TooltipContent>
    </Tooltip>
  );
}

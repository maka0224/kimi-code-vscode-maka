import { useState } from "react";
import { IconTextCaption } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores";
import { resolveOptimizeModelId, useOptimizePrefs } from "./inputarea/hooks/useOptimizePrefs";
import { DEFAULT_OPTIMIZE_SYSTEM_PROMPT } from "shared/bridge";

function effortLabel(effort: string): string {
  const map: Record<string, string> = { off: "关闭", low: "低", medium: "中", high: "高" };
  return map[effort.toLowerCase()] ?? effort.charAt(0).toUpperCase() + effort.slice(1);
}

/** radix Select 不允许空字符串 value，用哨兵值表示「跟随当前会话模型」。 */
const FOLLOW_CURRENT = "__follow_current__";

/** 提示词优化设置：功能开关、优化用的模型、思考模式与自定义 system prompt。 */
export function PromptOptimizeSettings() {
  const { models, currentModel } = useSettingsStore();
  const { prefs, save } = useOptimizePrefs();
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");

  const enabled = prefs.enabled ?? true;
  const sortedModels = models.toSorted((left, right) => left.name.localeCompare(right.name));
  // 偏好中的模型已从配置中删除时回退为跟随当前会话，重新选择即覆盖。
  const modelId = resolveOptimizeModelId(prefs, models, currentModel);
  const modelValue = models.some((m) => m.id === modelId) && prefs.modelId !== undefined ? modelId : FOLLOW_CURRENT;
  const effort = prefs.effort ?? "off";
  const effortOptions = ["off", ...(models.find((m) => m.id === modelId)?.support_efforts ?? ["low", "medium", "high"])];

  const openPromptEditor = () => {
    setDraftPrompt(prefs.systemPrompt ?? DEFAULT_OPTIMIZE_SYSTEM_PROMPT);
    setPromptEditorOpen(true);
  };

  return (
    <>
      <label className="flex items-center justify-between gap-3">
        <span>启用提示词优化</span>
        <Switch checked={enabled} onCheckedChange={(checked) => save({ ...prefs, enabled: checked })} />
      </label>

      <div className="flex items-center justify-between gap-3">
        <span>优化模型</span>
        <Select
          value={modelValue}
          onValueChange={(value) => save({ ...prefs, modelId: value === FOLLOW_CURRENT ? undefined : value })}
          disabled={!enabled}
        >
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FOLLOW_CURRENT} className="text-xs">
              跟随当前会话模型
            </SelectItem>
            {sortedModels.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-xs">
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span>思考模式</span>
        <Select value={effort} onValueChange={(value) => save({ ...prefs, effort: value })} disabled={!enabled}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {effortOptions.map((option) => (
              <SelectItem key={option} value={option} className="text-xs">
                {effortLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span>优化提示词</span>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={openPromptEditor} disabled={!enabled}>
          <IconTextCaption className="size-3.5" />
          编辑
        </Button>
      </div>

      {/* 优化提示词编辑弹窗 */}
      <Dialog open={promptEditorOpen} onOpenChange={setPromptEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑提示词</DialogTitle>
          </DialogHeader>
          <textarea
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full resize-y rounded-md border bg-background px-2.5 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap"
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPromptEditorOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => {
                save({ ...prefs, systemPrompt: draftPrompt });
                setPromptEditorOpen(false);
              }}
              disabled={draftPrompt.trim().length === 0}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { IconBulb } from "@tabler/icons-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores";
import { useInputSuggestionPrefs } from "./inputarea/hooks/useInputSuggestion";
import type { InputSuggestionMode } from "shared/bridge";

const MODE_OPTIONS: { value: InputSuggestionMode; label: string; hint: string }[] = [
  { value: "hybrid", label: "混合", hint: "历史会话记录匹配优先，无匹配时由大模型生成" },
  { value: "history", label: "历史会话记录", hint: "仅匹配当前工作区发送过的输入" },
  { value: "llm", label: "大模型", hint: "仅由大模型实时生成（强制关闭思考模式）" },
];

/** radix Select 不允许空字符串 value，用哨兵值表示「跟随当前会话模型」。 */
const FOLLOW_CURRENT = "__follow_current__";

export function InputSuggestionModal() {
  const { inputSuggestionModalOpen, setInputSuggestionModalOpen, models } = useSettingsStore();
  const { prefs, save } = useInputSuggestionPrefs();
  const sortedModels = models.toSorted((left, right) => left.name.localeCompare(right.name));
  const needsModel = prefs.mode !== "history";
  // 偏好中的模型已从配置中删除时回退为跟随当前会话，重新选择即覆盖。
  const modelValue = prefs.model !== "" && models.some((m) => m.id === prefs.model) ? prefs.model : FOLLOW_CURRENT;

  return (
    <Dialog open={inputSuggestionModalOpen} onOpenChange={setInputSuggestionModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <IconBulb className="size-4" />
            输入建议设置
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span>启用输入建议</span>
            <Switch checked={prefs.enabled} onCheckedChange={(enabled) => save({ ...prefs, enabled })} />
          </label>

          <div className="flex items-center justify-between gap-3">
            <span>建议方式</span>
            <Select
              value={prefs.mode}
              onValueChange={(value) => save({ ...prefs, mode: value as InputSuggestionMode })}
              disabled={!prefs.enabled}
            >
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {MODE_OPTIONS.find((option) => option.value === prefs.mode)?.hint}
          </p>

          <div className="flex items-center justify-between gap-3">
            <span>建议模型</span>
            <Select
              value={modelValue}
              onValueChange={(value) => save({ ...prefs, model: value === FOLLOW_CURRENT ? "" : value })}
              disabled={!prefs.enabled || !needsModel}
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
          {!needsModel && (
            <p className="text-xs text-muted-foreground -mt-2">建议方式为「历史会话记录」时不使用模型</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

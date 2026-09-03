import { useEffect, useState } from "react";
import { IconBulb, IconCheck, IconChevronDown, IconLoader2, IconTextCaption } from "@tabler/icons-react";

import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { bridge } from "@/services";
import { getModelById, groupModelsByProvider, useSettingsStore } from "@/stores";
import { DEFAULT_OPTIMIZE_SYSTEM_PROMPT, type OptimizePrefs } from "shared/bridge";
import { cn } from "@/lib/utils";

interface PromptOptimizePopoverProps {
  /** 输入框当前文本（优化对象）。 */
  text: string;
  /** 优化成功后写回输入框（由 InputArea 记录原稿用于回退）。 */
  onApplied: (optimized: string) => void;
  disabled?: boolean;
}

type Status = "idle" | "loading" | "error";

function effortLabel(effort: string): string {
  const map: Record<string, string> = { off: "关闭", low: "低", medium: "中", high: "高" };
  return map[effort.toLowerCase()] ?? effort.charAt(0).toUpperCase() + effort.slice(1);
}

export function PromptOptimizePopover({ text, onApplied, disabled = false }: PromptOptimizePopoverProps) {
  const { models, currentModel, thinkingEffort } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<OptimizePrefs>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");

  // 首次打开气泡时拉取缓存的模型/思考模式/提示词偏好。
  useEffect(() => {
    if (open && !prefsLoaded) {
      void bridge.getOptimizePrefs().then((cached) => {
        setPrefs(cached);
        setPrefsLoaded(true);
      });
    }
  }, [open, prefsLoaded]);

  // 缓存的模型不存在（配置变更）时回退到当前选择；未缓存过也回退到当前选择。
  const modelId =
    prefs.modelId !== undefined && getModelById(models, prefs.modelId) !== undefined
      ? prefs.modelId
      : currentModel;
  const effort = prefs.effort ?? thinkingEffort;
  const modelConfig = getModelById(models, modelId);
  const effortOptions = ["off", ...(modelConfig?.support_efforts ?? ["low", "medium", "high"])];
  const modelGroups = groupModelsByProvider(models);

  const savePrefs = (next: OptimizePrefs) => {
    setPrefs(next);
    void bridge.saveOptimizePrefs(next);
  };

  const runOptimize = async () => {
    setStatus("loading");
    setError("");
    try {
      const response = await bridge.optimizePrompt({ text, modelId, effort, systemPrompt: prefs.systemPrompt });
      setStatus("idle");
      setOpen(false);
      onApplied(response.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  };

  const openPromptEditor = () => {
    setDraftPrompt(prefs.systemPrompt ?? DEFAULT_OPTIMIZE_SYSTEM_PROMPT);
    setPromptEditorOpen(true);
  };

  const savePrompt = () => {
    savePrefs({ ...prefs, systemPrompt: draftPrompt });
    setPromptEditorOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-xs" disabled={disabled} className="text-muted-foreground">
                <IconBulb className="size-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>提示词优化</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" side="top" sideOffset={6} className="w-60">
          <PopoverArrow />
          <div className="space-y-2">
            {/* 模型选择 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-14">模型</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 flex-1 justify-between min-w-0 h-7 text-xs">
                    <span className="truncate">{modelConfig?.name ?? "暂无可选模型"}</span>
                    <IconChevronDown className="size-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72!" align="start">
                  {modelGroups.map((group, groupIndex) => (
                    <div key={group.provider}>
                      <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                      {group.models.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => savePrefs({ ...prefs, modelId: model.id })}
                          className="text-xs gap-2"
                        >
                          <IconCheck className={cn("size-3", model.id !== modelId && "opacity-0")} />
                          {model.name}
                        </DropdownMenuItem>
                      ))}
                      {groupIndex < modelGroups.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 思考模式选择 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-14">思考模式</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 flex-1 justify-between min-w-0 h-7 text-xs">
                    <span className="truncate">{effortLabel(effort)}</span>
                    <IconChevronDown className="size-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {effortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => savePrefs({ ...prefs, effort: option })}
                      className="text-xs gap-2"
                    >
                      <IconCheck className={cn("size-3", option !== effort && "opacity-0")} />
                      {effortLabel(option)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {status === "error" && (
              <div className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive break-words">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={openPromptEditor}>
                    <IconTextCaption className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑提示词</TooltipContent>
              </Tooltip>
              <Button size="sm" onClick={() => void runOptimize()} disabled={status === "loading"}>
                {status === "loading" ? <IconLoader2 className="size-4 animate-spin" /> : <IconBulb className="size-4" />}
                优化
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

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
            <Button size="sm" onClick={savePrompt} disabled={draftPrompt.trim().length === 0}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useChatStore } from "@/stores";
import { cn } from "@/lib/utils";
import { IconBrandSpeedtest, IconRefresh } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

function formatTokens(n: number | null | undefined): string {
  if (n === undefined || n === null) return "-";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function contextClasses(percent: number): string {
  if (percent > 95) return "text-destructive";
  if (percent > 80) return "text-amber-500";
  return "text-muted-foreground";
}

function contextBarClasses(percent: number): string {
  if (percent > 95) return "bg-destructive";
  if (percent > 80) return "bg-amber-500";
  return "bg-primary";
}

export function TokenInfo() {
  const { lastStatus, tokenUsage, activeTokenUsage } = useChatStore();

  const contextPercent = lastStatus?.context_usage ? Math.round(lastStatus.context_usage * 1000) / 10 : 0;
  const contextTokens = lastStatus?.context_tokens;
  const maxContextTokens = lastStatus?.max_context_tokens;

  const cumulativeInput =
    tokenUsage.input_other + tokenUsage.input_cache_read + tokenUsage.input_cache_creation;
  const activeInput =
    activeTokenUsage.input_other + activeTokenUsage.input_cache_read + activeTokenUsage.input_cache_creation;
  const totalCacheRead = tokenUsage.input_cache_read + activeTokenUsage.input_cache_read;
  const totalCacheCreation = tokenUsage.input_cache_creation + activeTokenUsage.input_cache_creation;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Token 用量</div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-[10px]">上下文</span>
          <span className={cn(contextClasses(contextPercent))}>{contextPercent}%</span>
          {contextTokens !== undefined && maxContextTokens !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {formatTokens(contextTokens)} / {formatTokens(maxContextTokens)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-[10px]">输入</span>
          <span>{cumulativeInput.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">本轮 {activeInput.toLocaleString()}</span>
          <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-1 mt-0.5 space-y-0.5">
            <div>缓存读取 {totalCacheRead.toLocaleString()}</div>
            <div>缓存创建 {totalCacheCreation.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-[10px]">输出</span>
          <span>{tokenUsage.output.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">本轮 {activeTokenUsage.output.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function ChatStatus() {
  const { lastStatus, tokenUsage, activeTokenUsage } = useChatStore();

  if (!lastStatus) {
    return null;
  }

  const { context_usage, context_tokens, max_context_tokens, retrying } = lastStatus;

  const cacheRead = tokenUsage.input_cache_read + activeTokenUsage.input_cache_read;
  const inputTotal =
    tokenUsage.input_other +
    tokenUsage.input_cache_read +
    tokenUsage.input_cache_creation +
    activeTokenUsage.input_other +
    activeTokenUsage.input_cache_read +
    activeTokenUsage.input_cache_creation;

  const outputTotal = tokenUsage.output + activeTokenUsage.output;

  const contextPercent = context_usage ? Math.round(context_usage * 1000) / 10 : 0;
  const cacheHitRate = inputTotal > 0 ? Math.round((cacheRead / inputTotal) * 1000) / 10 : 0;

  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 select-none h-6 box-border mr-2 @max-[240px]:hidden">
      {retrying && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-amber-500">
              <IconRefresh className="size-3" />
              重试 {retrying.next_attempt}/{retrying.max_attempts}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {Math.ceil(retrying.delay_ms / 1000)} 秒后重试：{retrying.message}
          </TooltipContent>
        </Tooltip>
      )}
      {retrying && <div className="w-px h-3 bg-border/50" />}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 cursor-pointer rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="上下文窗口用量（点击查看详情）"
          >
            <IconBrandSpeedtest className="size-3 opacity-70" />
            <span className={cn("flex items-center gap-1", contextClasses(contextPercent))}>
              <span>{contextPercent}%</span>
              <span className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                <span
                  className={cn("h-full block rounded-full", contextBarClasses(contextPercent))}
                  style={{ width: `${Math.min(contextPercent, 100)}%` }}
                />
              </span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
          <div className="space-y-1.5 text-xs">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">上下文窗口用量</div>
            {context_tokens !== undefined && max_context_tokens !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">上下文</span>
                <span>
                  {formatTokens(context_tokens)} / {formatTokens(max_context_tokens)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">输入</span>
              <span>{inputTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">输出</span>
              <span>{outputTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">缓存命中</span>
              <span>{cacheRead.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">缓存命中率</span>
              <span>{cacheHitRate}%</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

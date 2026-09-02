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

export function ChatStatus() {
  const { lastStatus, tokenUsage, activeTokenUsage, sessionId, messages } = useChatStore();

  // 有活动会话就显示（StatusUpdate 到达前数据为空，显示 0%）；完全无会话时隐藏
  if (!lastStatus && !sessionId) {
    return null;
  }

  const { context_usage, context_tokens, max_context_tokens, retrying } = lastStatus ?? {};

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
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 select-none h-6 box-border @max-[240px]:hidden">
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
        <PopoverContent align="start" className="w-64 p-3">
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
            {sessionId && (
              <div className="border-t border-border/50 pt-1.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">消息数</span>
                  <span>{messages.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">会话 ID</span>
                  <span className="font-mono text-[10px] text-foreground break-all select-all text-right">{sessionId}</span>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

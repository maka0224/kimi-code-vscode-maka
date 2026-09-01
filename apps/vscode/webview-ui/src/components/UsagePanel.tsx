import { useCallback, useEffect, useState } from "react";
import { IconGauge, IconRefresh } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bridge } from "@/services";
import { cn } from "@/lib/utils";
import type { BoosterWalletInfo, ManagedUsageResult, UsageRow } from "shared/bridge";

const WINDOW_UNIT_LABELS: Record<string, string> = {
  minute: "分钟",
  hour: "小时",
  day: "天",
  week: "周",
};

function formatWindowLabel(row: UsageRow): string {
  if (row.name) {
    return row.name;
  }
  if (!row.window) {
    return "窗口";
  }
  const { duration, unit } = row.window;
  return `${duration} ${WINDOW_UNIT_LABELS[unit] ?? unit}`;
}

function formatResetCountdown(resetAt?: string): string {
  if (!resetAt) {
    return "";
  }
  const diff = new Date(resetAt).getTime() - Date.now();
  if (diff <= 0) {
    return "已重置";
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days} 天`);
  if (hours) parts.push(`${hours} 小时`);
  if (minutes) parts.push(`${minutes} 分钟`);
  return parts.length > 0 ? `${parts.join(" ")}后重置` : "即将重置";
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case "CNY":
      return "¥";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    default:
      return currency;
  }
}

function formatMoney(cents: number, currency: string): string {
  return `${currencySymbol(currency)}${(cents / 100).toFixed(2)}`;
}

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

function UsageBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          percent < 80 && "bg-primary",
          percent >= 80 && percent < 95 && "bg-amber-500",
          percent >= 95 && "bg-destructive",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function UsagePanel() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ManagedUsageResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bridge.getUsage();
      setResult(data);
    } catch (error) {
      setResult({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchUsage();
    }
  }, [open, fetchUsage]);

  const summary = result?.kind === "ok" ? result.summary : null;
  const limits = result?.kind === "ok" ? result.limits : [];
  const extra = result?.kind === "ok" ? result.extraUsage : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" title="额度信息" aria-label="额度信息">
          <IconGauge className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-1rem)] p-0">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">额度信息</h3>
            <Button variant="ghost" size="icon-xs" onClick={fetchUsage} disabled={loading} title="刷新" aria-label="刷新">
              <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
            </Button>
          </div>

          {loading && result === null && <div className="text-xs text-muted-foreground py-2">加载中...</div>}

          {!loading && result?.kind === "error" && (
            <div className="text-xs text-destructive py-1">用量查询失败：{result.message}</div>
          )}

          {result?.kind === "ok" && (
            <>
              {summary && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">本周额度</span>
                    <span>
                      {summary.used.toLocaleString()} / {summary.limit.toLocaleString()}
                    </span>
                  </div>
                  <UsageBar percent={usagePercent(summary.used, summary.limit)} />
                  <div className="text-[10px] text-muted-foreground">
                    {formatResetCountdown(summary.resetAt)}
                  </div>
                </div>
              )}

              {!summary && limits.length === 0 && !extra && (
                <div className="text-xs text-muted-foreground py-1">暂无额度信息</div>
              )}

              {limits.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">窗口限制</div>
                  {limits.map((row, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatWindowLabel(row)}</span>
                        <span>
                          {row.used.toLocaleString()} / {row.limit.toLocaleString()}
                        </span>
                      </div>
                      <UsageBar percent={usagePercent(row.used, row.limit)} />
                      {row.resetAt && (
                        <div className="text-[10px] text-muted-foreground">
                          {formatResetCountdown(row.resetAt)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {extra && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">余额</div>
                  <div className="text-xs font-medium">{formatMoney(extra.balanceCents, extra.currency)}</div>
                  {extra.monthlyChargeLimitEnabled && (
                    <div className="text-[10px] text-muted-foreground">
                      本月已用 {formatMoney(extra.monthlyUsedCents, extra.currency)} / 限额{" "}
                      {formatMoney(extra.monthlyChargeLimitCents, extra.currency)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IconLoader2, IconTimeline } from "@tabler/icons-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Content } from "@/lib/content";
import { bridge } from "@/services";
import { useChatStore, useSettingsStore } from "@/stores";

import type { LlmCallTraceRecord } from "shared/types";

/** 时间线条目：用户提问或一次大模型调用 */
type TraceEntry =
  | { kind: "prompt"; time: number; text: string }
  | { kind: "call"; time: number; record: LlmCallTraceRecord };

/** 对话轨迹弹窗：按时间线展示当前会话的用户提问与每次大模型调用的完整请求/响应。 */
export function TraceModal() {
  const { traceModalOpen, setTraceModalOpen } = useSettingsStore();
  const messages = useChatStore((s) => s.messages);
  const [records, setRecords] = useState<readonly LlmCallTraceRecord[]>([]);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!traceModalOpen) return;
    setLoading(true);
    bridge
      .getLlmCallTrace()
      .then((result) => {
        setSupported(result.supported);
        setRecords(result.records);
      })
      .catch(() => {
        setSupported(true);
        setRecords([]);
      })
      .finally(() => setLoading(false));
  }, [traceModalOpen]);

  const entries: TraceEntry[] = useMemo(
    () =>
      [
        ...messages
          .filter((m) => m.role === "user")
          .map((m): TraceEntry => ({ kind: "prompt", time: m.timestamp, text: Content.getText(m.content) })),
        ...records.map((record): TraceEntry => ({ kind: "call", time: record.time, record })),
      ].sort((a, b) => a.time - b.time),
    [messages, records],
  );

  return (
    <Dialog open={traceModalOpen} onOpenChange={setTraceModalOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <IconTimeline className="size-4" />
            对话轨迹
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
              <IconLoader2 className="size-4 animate-spin" />
              正在读取调用记录…
            </div>
          ) : !supported ? (
            <EmptyHint text="当前使用 v1 引擎，不支持对话轨迹（仅 v2 引擎记录大模型调用）。" />
          ) : entries.length === 0 ? (
            <EmptyHint text="本会话还没有记录。大模型调用记录从本次升级后开始产生。" />
          ) : (
            <div className="space-y-1.5">
              {entries.map((entry, index) =>
                entry.kind === "prompt" ? (
                  <PromptEntry key={`p-${index}`} entry={entry} />
                ) : (
                  <CallEntry key={`c-${index}`} record={entry.record} />
                ),
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="py-8 text-center text-muted-foreground text-sm">{text}</div>;
}

/**
 * 延迟渲染的 details：折叠时只渲染标题行、不挂载内容。
 * 轨迹条目内容（尤其大体积 JSON）只在展开时才 stringify 并上屏，避免长列表打开弹窗即卡顿。
 */
function LazyDetails({ className, summary, children }: { className?: string; summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className={className} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      {summary}
      {open ? children : null}
    </details>
  );
}

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString("zh-CN", { hour12: false });
}

function PromptEntry({ entry }: { entry: Extract<TraceEntry, { kind: "prompt" }> }) {
  return (
    <LazyDetails
      className="rounded-md border border-border px-2.5 py-1.5"
      summary={
        <summary className="flex cursor-pointer items-center gap-2 text-xs">
          <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">提问</span>
          <span className="min-w-0 flex-1 line-clamp-2">{entry.text || "（媒体消息）"}</span>
          <span className="shrink-0 text-muted-foreground">{formatTime(entry.time)}</span>
        </summary>
      }
    >
      <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
        {entry.text}
      </pre>
    </LazyDetails>
  );
}

function CallEntry({ record }: { record: LlmCallTraceRecord }) {
  const usage = record.response.usage;
  const inputTokens = usage.inputOther + usage.inputCacheRead + usage.inputCacheCreation;
  const agentLabel = record.agentId === "main" ? "主代理" : `子代理 ${record.agentId}`;
  // turnStep 形如 "1.0"（回合.步），引擎步号从 0 起，展示时 +1 只显示步号
  const stepNum = record.turnStep?.split(".").pop();
  const stepLabel = stepNum === undefined ? (record.kind === "compaction" ? "压缩" : "调用") : `第 ${Number(stepNum) + 1} 步`;
  return (
    <LazyDetails
      className="rounded-md border border-border px-2.5 py-1.5"
      summary={
        <summary className="flex cursor-pointer items-center gap-2 text-xs">
          <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-600 dark:text-sky-400">模型</span>
          <span className="min-w-0 flex-1 line-clamp-2">
            {stepLabel} · {agentLabel} · {record.modelAlias ?? record.model} · 输入 {inputTokens} / 输出 {usage.output}
          </span>
          <span className="shrink-0 text-muted-foreground">{formatTime(record.time)}</span>
        </summary>
      }
    >
      <div className="mt-1.5 space-y-1.5">
        <TraceSection title="System Prompt" value={record.request.systemPrompt} />
        <TraceSection title={`Tools（${record.request.tools.length}）`} value={record.request.tools} json />
        <TraceSection title={`Messages（${record.request.messages.length}）`} value={record.request.messages} json />
        <TraceSection title="Response" value={record.response} json />
      </div>
    </LazyDetails>
  );
}

function TraceSection({ title, value, json }: { title: string; value: unknown; json?: boolean }) {
  return (
    <LazyDetails
      className="rounded border border-border/60 bg-muted/40 px-2 py-1"
      summary={<summary className="cursor-pointer text-xs text-muted-foreground">{title}</summary>}
    >
      <TraceSectionBody value={value} json={json === true} />
    </LazyDetails>
  );
}

/** 展开时才 stringify 大体积内容，折叠状态不产生任何序列化开销 */
function TraceSectionBody({ value, json }: { value: unknown; json: boolean }) {
  const text = json ? JSON.stringify(value, null, 2) : String(value);
  return <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">{text}</pre>;
}

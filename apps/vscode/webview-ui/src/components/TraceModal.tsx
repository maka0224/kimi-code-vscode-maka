import { useEffect, useState } from "react";
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

  const entries: TraceEntry[] = [
    ...messages
      .filter((m) => m.role === "user")
      .map((m): TraceEntry => ({ kind: "prompt", time: m.timestamp, text: Content.getText(m.content) })),
    ...records.map((record): TraceEntry => ({ kind: "call", time: record.time, record })),
  ].sort((a, b) => a.time - b.time);

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

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString("zh-CN", { hour12: false });
}

function PromptEntry({ entry }: { entry: Extract<TraceEntry, { kind: "prompt" }> }) {
  return (
    <details className="rounded-md border border-border px-2.5 py-1.5">
      <summary className="flex cursor-pointer items-center gap-2 text-xs">
        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-primary">提问</span>
        <span className="min-w-0 flex-1 line-clamp-2">{entry.text || "（媒体消息）"}</span>
        <span className="shrink-0 text-muted-foreground">{formatTime(entry.time)}</span>
      </summary>
      <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
        {entry.text}
      </pre>
    </details>
  );
}

function CallEntry({ record }: { record: LlmCallTraceRecord }) {
  const usage = record.response.usage;
  const inputTokens = usage.inputOther + usage.inputCacheRead + usage.inputCacheCreation;
  const agentLabel = record.agentId === "main" ? "主代理" : `子代理 ${record.agentId}`;
  const stepLabel = record.turnStep ? `第 ${record.turnStep} 步` : record.kind === "compaction" ? "压缩" : "调用";
  return (
    <details className="rounded-md border border-border px-2.5 py-1.5">
      <summary className="flex cursor-pointer items-center gap-2 text-xs">
        <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-accent-foreground">模型</span>
        <span className="min-w-0 flex-1 line-clamp-2">
          {stepLabel} · {agentLabel} · {record.modelAlias ?? record.model} · 输入 {inputTokens} / 输出 {usage.output}
        </span>
        <span className="shrink-0 text-muted-foreground">{formatTime(record.time)}</span>
      </summary>
      <div className="mt-1.5 space-y-1.5">
        <TraceSection title="System Prompt" value={record.request.systemPrompt} />
        <TraceSection title={`Tools（${record.request.tools.length}）`} value={record.request.tools} json />
        <TraceSection title={`Messages（${record.request.messages.length}）`} value={record.request.messages} json />
        <TraceSection title="Response" value={record.response} json />
      </div>
    </details>
  );
}

function TraceSection({ title, value, json }: { title: string; value: unknown; json?: boolean }) {
  const text = json === true ? JSON.stringify(value, null, 2) : String(value);
  return (
    <details className="rounded border border-border/60 bg-muted/40 px-2 py-1">
      <summary className="cursor-pointer text-xs text-muted-foreground">{title}</summary>
      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">{text}</pre>
    </details>
  );
}

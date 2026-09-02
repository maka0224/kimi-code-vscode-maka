import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { bridge, Events } from "@/services";
import { useChatStore } from "@/stores";
import { cleanSystemTags } from "shared/utils";
import { toast } from "./ui/sonner";
import { cn } from "@/lib/utils";

/**
 * 顶部会话名称：点击进入编辑（失焦 / 回车保存，Esc 取消）。
 * 初始标题靠拉取（消息数变化时重新拉取），命名/重命名的后续更新由宿主经
 * SessionTitleChanged 事件推送，避免与异步写盘竞态。
 */
export function SessionTitle() {
  const sessionId = useChatStore((s) => s.sessionId);
  const messageCount = useChatStore((s) => s.messages.length);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setTitle("");
      return;
    }
    let cancelled = false;
    void bridge
      .getAllKimiSessions()
      .then((sessions) => {
        if (cancelled) return;
        setTitle(cleanSystemTags(sessions.find((s) => s.id === sessionId)?.brief ?? ""));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId, messageCount]);

  // 宿主侧标题落盘（首轮自动命名 / 大模型生成 / 重命名）后主动推送，直接采用不再拉取
  useEffect(() => {
    return bridge.on(Events.SessionTitleChanged, (payload: { sessionId: string; title?: string }) => {
      if (payload.sessionId !== sessionId || payload.title === undefined) return;
      setTitle(cleanSystemTags(payload.title));
    });
  }, [sessionId]);

  if (!sessionId) {
    return <span className="text-sm font-semibold whitespace-nowrap truncate">Kimi Code Maka</span>;
  }

  const save = async () => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === title) return;
    try {
      const { ok } = await bridge.renameSession(sessionId, next);
      if (!ok) throw new Error("rename rejected");
      setTitle(next);
    } catch (error) {
      toast.error(`无法重命名会话：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-6 px-1.5 text-sm font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      title="点击修改会话名称"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      className={cn(
        "min-w-0 flex-1 text-left truncate rounded px-1 -mx-1 hover:bg-accent/60 transition-colors",
        "text-sm font-semibold text-foreground"
      )}
    >
      {title || "未命名会话"}
    </button>
  );
}

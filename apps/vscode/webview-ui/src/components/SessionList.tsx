import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconSearch, IconDots, IconTrash, IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StreamingConfirmDialog } from "./StreamingConfirmDialog";
import { bridge } from "@/services";
import type { SessionInfo } from "shared/legacy-sdk";
import { cn } from "@/lib/utils";
import { useChatStore, useSettingsStore } from "@/stores";
import { cleanSystemTags } from "shared/utils";
import { toast } from "./ui/sonner";

interface SessionListProps {
  onClose: () => void;
}

const KIMI_SESSIONS_KEY = ["kimiSessions"] as const;
const NO_SESSIONS: SessionInfo[] = [];

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  if (h < 24) return `${h} 小时前`;
  if (d < 7) return `${d} 天前`;
  return new Date(timestamp).toLocaleDateString();
}

interface SessionItemProps {
  session: SessionInfo;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  dirLabel: string | null; // null = current dir, string = relative path
}

function SessionItem({ session, isSelected, onSelect, onDelete, dirLabel }: SessionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn("group relative px-2 py-1 rounded-md cursor-pointer transition-colors", isSelected ? "bg-accent" : "hover:bg-accent/50")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <p className="text-xs leading-relaxed line-clamp-3 text-foreground">{cleanSystemTags(session.brief) || "未命名"}</p>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isSelected && <IconCheck className="size-3 text-blue-500 shrink-0" />}
          <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeDate(session.updatedAt)}</span>
          {dirLabel && <span className="text-[10px] text-muted-foreground/70 truncate" title={session.workDir}>· {dirLabel}</span>}
        </div>
        <div className={cn("transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 -m-1 rounded hover:bg-muted transition-colors" onClick={(e) => e.stopPropagation()}>
                <IconDots className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem
                className="text-xs text-destructive focus:text-destructive cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <IconTrash className="size-3.5 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function SessionList({ onClose }: SessionListProps) {
  const { loadSession, sessionId, startNewConversation, isStreaming } = useChatStore();
  const { workspaceRoot, currentWorkDir, setCurrentWorkDir } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SessionInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingSession, setPendingSession] = useState<SessionInfo | null>(null);

  const queryClient = useQueryClient();
  const { data: kimiSessions = NO_SESSIONS, isPending: loading } = useQuery({
    queryKey: KIMI_SESSIONS_KEY,
    queryFn: () => bridge.getAllKimiSessions(),
  });

  const getWorkDirLabel = (sessionWorkDir: string): string | null => {
    const activeWorkDir = currentWorkDir || workspaceRoot;
    if (sessionWorkDir === activeWorkDir) return null;
    if (!workspaceRoot) return sessionWorkDir;
    // Show (root) for workspace root, relative path for subdirs
    if (sessionWorkDir === workspaceRoot) {
      return "/";
    }
    if (sessionWorkDir.startsWith(workspaceRoot)) {
      return "." + sessionWorkDir.slice(workspaceRoot.length);
    }
    return sessionWorkDir;
  };

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return kimiSessions;
    const q = searchQuery.toLowerCase();
    return kimiSessions.filter((s) => s.brief.toLowerCase().includes(q));
  }, [kimiSessions, searchQuery]);

  const handleSelect = async (session: SessionInfo) => {
    console.log("[SessionList] Loading session:", session.id);

    // If streaming, show confirmation dialog
    if (isStreaming) {
      setPendingSession(session);
      return;
    }

    await doLoadSession(session);
  };

  const doLoadSession = async (session: SessionInfo) => {
    try {
      // Switch workDir if session is from a different directory
      const activeWorkDir = currentWorkDir || workspaceRoot;
      if (session.workDir !== activeWorkDir) {
        const newWorkDir = session.workDir === workspaceRoot ? null : session.workDir;
        const result = await bridge.setWorkDir(newWorkDir);
        if (result.ok) {
          setCurrentWorkDir(newWorkDir);
        }
      }
      const events = await bridge.loadSessionHistory(session.id);
      await loadSession(session.id, events);
      onClose();
    } catch (error) {
      console.error("[SessionList] Failed to load session:", error);
      toast.error(`无法打开会话：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleConfirmSwitch = async () => {
    if (!pendingSession) return;
    await doLoadSession(pendingSession);
    setPendingSession(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await bridge.deleteSession(deleteTarget.id);

      if (sessionId === deleteTarget.id) {
        await startNewConversation();
      }

      queryClient.setQueryData<SessionInfo[]>(KIMI_SESSIONS_KEY, (prev) => prev?.filter((s) => s.id !== deleteTarget.id) ?? []);
    } catch (error) {
      console.error("[SessionList] Failed to delete session:", error);
      toast.error(`无法删除会话：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="flex flex-col max-h-[70vh]">
        <div className="p-2 border-b border-border shrink-0">
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input placeholder="搜索会话…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="p-1.5 space-y-1">
            {loading ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">加载中…</div>
            ) : filteredSessions.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">{searchQuery ? "未找到会话" : "暂无会话"}</div>
            ) : (
              filteredSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isSelected={sessionId === session.id}
                  onSelect={() => {
                    void handleSelect(session);
                  }}
                  onDelete={() => setDeleteTarget(session)}
                  dirLabel={getWorkDirLabel(session.workDir)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <StreamingConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除会话？"
        description="此操作将永久删除该会话，无法撤销。"
        confirmLabel="删除"
        onConfirm={() => {
          void handleDelete();
        }}
        confirmDisabled={isDeleting}
        cancelDisabled={isDeleting}
        confirmLoading={isDeleting}
      />

      <StreamingConfirmDialog
        open={pendingSession !== null}
        onOpenChange={(open) => !open && setPendingSession(null)}
        title="切换会话？"
        description="当前对话仍在生成回复。切换会话将截断当前输出。确定要继续吗？"
        confirmLabel="切换"
        onConfirm={() => {
          void handleConfirmSwitch();
        }}
      />
    </>
  );
}

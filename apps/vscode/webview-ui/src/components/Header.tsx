import { useState } from "react";
import { IconPlus, IconChevronDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StreamingConfirmDialog } from "./StreamingConfirmDialog";
import { KimiLogo } from "./KimiLogo";
import { SessionList } from "./SessionList";
import { SessionTitle } from "./SessionTitle";
import { useChatStore } from "@/stores";

export function Header() {
  const [showSessionList, setShowSessionList] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const { startNewConversation, isStreaming } = useChatStore();

  const handleNewSession = async () => {
    // If streaming, show confirmation dialog
    if (isStreaming) {
      setShowConfirmNew(true);
      return;
    }

    await doStartNewSession();
  };

  const doStartNewSession = async () => {
    await startNewConversation();
    setShowSessionList(false);
    setShowConfirmNew(false);
  };

  return (
    <header className="flex items-center gap-2 px-3.5 py-2 border-b border-border shrink-0 @container">
      <div className="flex items-center gap-2 shrink-0">
        <KimiLogo className="size-5 shrink-0" />
      </div>
      <SessionTitle />
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <Popover open={showSessionList} onOpenChange={setShowSessionList}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="xs" className="gap-1 h-6">
              <span className="text-xs @max-[280px]:hidden">历史</span>
              <IconChevronDown className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[20rem] max-w-[calc(100vw-1rem)] p-0">
            <SessionList onClose={() => setShowSessionList(false)} />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => {
            void handleNewSession();
          }}
        >
          <IconPlus className="size-3.5" />
        </Button>
      </div>

      <StreamingConfirmDialog
        open={showConfirmNew}
        onOpenChange={(open) => !open && setShowConfirmNew(false)}
        title="开始新对话？"
        description="当前对话仍在生成回复。开始新对话将截断当前输出。确定要继续吗？"
        confirmLabel="新对话"
        onConfirm={() => {
          void doStartNewSession();
        }}
      />
    </header>
  );
}

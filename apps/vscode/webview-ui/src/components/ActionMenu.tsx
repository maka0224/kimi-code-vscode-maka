import { useState } from "react";
import { IconSettings, IconServer, IconLogout, IconLogin, IconLoader2, IconRefresh, IconFileText, IconFolder } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores";
import { bridge } from "@/services";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface ActionMenuProps {
  className?: string;
  onAuthAction?: () => void;
}

function MenuSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-2.5 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
        <span>{title}</span>
        {subtitle && <span className="normal-case tracking-normal">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function MenuItem({ onClick, disabled, danger, children }: { onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        danger && "text-red-500 hover:text-red-600",
      )}
    >
      {children}
    </button>
  );
}

export function ActionMenu({ className, onAuthAction }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setMCPModalOpen, isLoggedIn, setIsLoggedIn, extensionConfig } = useSettingsStore();

  const handleOpenSettings = () => {
    void bridge.openSettings();
    setOpen(false);
  };

  const handleOpenMCPServers = () => {
    setMCPModalOpen(true);
    setOpen(false);
  };

  const handleChangeWorkDir = () => {
    useSettingsStore.getState().setWorkDirModalOpen(true);
    setOpen(false);
  };

  const handleReset = () => {
    setOpen(false);
    void bridge.reloadWebview();
  };

  const handleShowLogs = () => {
    void bridge.showLogs();
    setOpen(false);
  };

  const handleAuthAction = async () => {
    setLoading(true);
    try {
      if (isLoggedIn) {
        await bridge.logout();
        setIsLoggedIn(false);
      } else {
        const result = await bridge.login();
        if (result.success) {
          setIsLoggedIn(true);
        } else {
          toast.error(result.error ?? "登录失败，请查看日志了解详情。");
        }
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
    onAuthAction?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" className={cn("text-muted-foreground", className)}>
          <IconSettings className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1rem)] max-w-72 p-1.5 gap-0!" align="end" side="top">
        <MenuSection title="设置">
          <MenuItem onClick={handleChangeWorkDir}>
            <IconFolder className="size-4 text-muted-foreground" />
            <span className="flex-1">工作目录</span>
          </MenuItem>
          <MenuItem onClick={handleOpenMCPServers}>
            <IconServer className="size-4 text-muted-foreground" />
            <span className="flex-1">MCP 服务器</span>
          </MenuItem>
          <MenuItem onClick={handleOpenSettings}>
            <IconSettings className="size-4 text-muted-foreground" />
            <span className="flex-1">通用配置</span>
            <span className="text-[10px] text-muted-foreground">↗</span>
          </MenuItem>
        </MenuSection>

        <Separator className="my-px" />

        <MenuSection title="支持" subtitle={extensionConfig.version ? `v${extensionConfig.version}` : undefined}>
          <MenuItem onClick={handleShowLogs}>
            <IconFileText className="size-4 text-muted-foreground" />
            <span className="flex-1">查看日志</span>
          </MenuItem>
          <MenuItem onClick={handleReset}>
            <IconRefresh className="size-4 text-muted-foreground" />
            <span className="flex-1">重置 Kimi</span>
          </MenuItem>
        </MenuSection>

        <Separator className="my-px" />

        <MenuSection title="账户">
          <MenuItem
            onClick={() => {
              void handleAuthAction();
            }}
            disabled={loading}
            danger={isLoggedIn}
          >
            {loading ? <IconLoader2 className="size-4 animate-spin" /> : isLoggedIn ? <IconLogout className="size-4" /> : <IconLogin className="size-4 text-muted-foreground" />}
            <span className="flex-1">{loading ? "处理中…" : isLoggedIn ? "退出登录" : "登录"}</span>
          </MenuItem>
        </MenuSection>
      </PopoverContent>
    </Popover>
  );
}

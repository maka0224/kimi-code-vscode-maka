import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertTriangle } from "@tabler/icons-react";
import { bridge } from "@/services";
import { toast } from "./ui/sonner";

/**
 * 目录信任横幅：当前工作目录未加入 Kimi 信任目录时提示（对齐 kimi-cli 的确认流程）。
 * 不阻塞使用，但说明受限功能；点「信任此目录」后引擎实时接入项目级 MCP 配置。
 * 「忽略」仅关闭横幅，重载后重新出现（等价于每次启动询问）。
 */
export function WorkspaceTrustBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [trusting, setTrusting] = useState(false);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["workspaceTrust"],
    queryFn: () => bridge.getWorkspaceTrust(),
  });

  if (dismissed || !data || data.trusted) return null;

  const handleTrust = async () => {
    setTrusting(true);
    try {
      await bridge.trustWorkspace();
      void queryClient.invalidateQueries({ queryKey: ["workspaceTrust"] });
      void queryClient.invalidateQueries({ queryKey: ["mcpServers"] });
      toast.success("已信任此目录，项目级配置已生效");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setTrusting(false);
    }
  };

  const gatedNames = data.gatedMcpServers.map((server) => server.name);

  return (
    <div className="shrink-0 mx-2 mt-2 rounded-lg border border-amber-300/50 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-950/20 px-3 py-2">
      <div className="flex items-start gap-2">
        <IconAlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            当前目录未加入 Kimi 信任目录
          </div>
          <div className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-300/70">
            仍可正常对话，但项目级配置暂不生效：项目 MCP 服务器不会加载
            {gatedNames.length > 0 && `（受影响：${gatedNames.join("、")}）`}
            。信任后将自动载入，且记录到信任目录，下次不再提示。
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              disabled={trusting}
              onClick={() => void handleTrust()}
              className="rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {trusting ? "信任中..." : "信任此目录"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              title="仅关闭本次提示，重开窗口后会再次提示"
              className="rounded-md px-2.5 py-1 text-[11px] font-medium text-amber-700/70 dark:text-amber-300/70 hover:bg-amber-500/15 transition-colors cursor-pointer"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

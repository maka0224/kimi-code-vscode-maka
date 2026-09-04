import { IconBulb } from "@tabler/icons-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSettingsStore } from "@/stores";
import { PromptOptimizeSettings } from "./PromptOptimizeSettings";

/** 提示词优化设置弹窗：由输入框设置菜单（齿轮）打开。 */
export function PromptOptimizeModal() {
  const { promptOptimizeModalOpen, setPromptOptimizeModalOpen } = useSettingsStore();

  return (
    <Dialog open={promptOptimizeModalOpen} onOpenChange={setPromptOptimizeModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <IconBulb className="size-4" />
            提示词优化设置
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <PromptOptimizeSettings />
        </div>
      </DialogContent>
    </Dialog>
  );
}

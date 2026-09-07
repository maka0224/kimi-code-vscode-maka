import { KimiMascot } from "./KimiMascot";

function ShortcutRow({ kbd, children }: { kbd: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <kbd className="kbd shrink-0">{kbd}</kbd>
      <span className="text-right">{children}</span>
    </div>
  );
}

function ShortcutGuide() {
  return (
    <div className="text-left text-xs mt-2 space-y-5 w-full max-w-96">
      <div>
        <div className="font-medium text-foreground mb-1.5">⚡ 命令</div>
        <div className="text-muted-foreground space-y-1">
          <ShortcutRow kbd="/">查看全部命令</ShortcutRow>
          <ShortcutRow kbd="/init">扫描项目并生成 AGENTS.md 文件</ShortcutRow>
          <ShortcutRow kbd="/compact">精简上下文，让我聚焦重点</ShortcutRow>
        </div>
      </div>
      <div>
        <div className="font-medium text-foreground mb-1.5">💡 技巧</div>
        <div className="text-muted-foreground space-y-1">
          <ShortcutRow kbd="↑">浏览输入历史</ShortcutRow>
          <ShortcutRow kbd="@">添加/搜索要引用的文件</ShortcutRow>
          <ShortcutRow kbd="Alt+K">直接添加编辑器中选中的代码</ShortcutRow>
          <ShortcutRow kbd="Shift+拖拽">把文件/文件夹拖入输入框插入引用</ShortcutRow>
        </div>
      </div>
      <div>
        <div className="font-medium text-foreground mb-1.5">🚀 进阶技巧</div>
        <div className="text-muted-foreground space-y-1">
          <div>• 使用 YOLO 模式自动批准工具调用</div>
          <div>• AGENTS.md 能帮助我理解你的代码库</div>
          <div>• 复杂任务可开启思考模式</div>
        </div>
      </div>
    </div>
  );
}

export function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center gap-3 px-4">
      <KimiMascot className="h-12" />
      <ShortcutGuide />
    </div>
  );
}

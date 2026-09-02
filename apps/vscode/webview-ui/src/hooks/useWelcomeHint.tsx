import { useState, useEffect, useMemo } from "react";
import { bridge } from "@/services";

export interface WelcomeHint {
  title: string;
  description: string;
  slashCommand?: string;
  component?: React.ReactNode;
}

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

const HINT_FIRST_TIME: WelcomeHint = {
  title: "快速上手指南",
  description: "",
  component: <ShortcutGuide />,
};

const HINT_AGENT_MD: WelcomeHint = {
  title: "让我了解你的代码库",
  description: "运行 /init 扫描项目并生成文档",
  slashCommand: "/init",
};

const HINTS_POOL: WelcomeHint[] = [
  HINT_FIRST_TIME,
  HINT_AGENT_MD,
  {
    title: "引用指定代码",
    description: "输入 @ 选择文件，或选中代码后按 Alt+K",
  },
  {
    title: "拖拽也能引用",
    description: "按住 Shift 把文件/文件夹拖入输入框，即可插入引用",
  },
  {
    title: "看看我能做什么",
    description: "输入 / 查看全部命令——比如用 /compact 精简上下文",
  },
  {
    title: "需要更深入的分析？",
    description: "复杂架构或调试任务可开启思考模式",
  },
  {
    title: "不止于代码",
    description: "粘贴截图或设计稿，我来帮你实现",
  },
  {
    title: "添加更多工具",
    description: "在设置中通过 MCP 服务器连接外部服务",
  },
  {
    title: "不想被频繁打断？",
    description: "开启 YOLO 模式自动批准工具调用",
  },
  {
    title: "上下文太长了？",
    description: "输入 /compact 只保留要点",
    slashCommand: "/compact",
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function withProbability(p: number): boolean {
  return Math.random() < p;
}

export function useWelcomeHint(): WelcomeHint {
  const [hasAgentMd, setHasAgentMd] = useState<boolean | null>(null);
  const [hasHistory, setHasHistory] = useState<boolean | null>(null);

  useEffect(() => {
    bridge
      .checkFileExists("AGENTS.md")
      .then(setHasAgentMd)
      .catch(() => setHasAgentMd(false));
    bridge
      .getKimiSessions()
      .then((s) => setHasHistory(s.length > 0))
      .catch(() => setHasHistory(false));
  }, []);

  return useMemo(() => {
    // First time user: show shortcut guide
    if (hasHistory === false) {
      return HINT_FIRST_TIME;
    }
    // 30% chance to show AGENT.md hint if missing
    if (hasAgentMd === false && withProbability(0.3)) {
      return HINT_AGENT_MD;
    }
    return pickRandom(HINTS_POOL);
  }, [hasAgentMd, hasHistory]);
}

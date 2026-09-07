import { IconFile, IconPin, IconPinFilled } from '@tabler/icons-react'
import type { ActiveEditorContext } from 'shared/bridge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'

interface EditorContextChipProps {
  context: ActiveEditorContext
  pinned: boolean
  onToggle: () => void
  onAppend: () => void
}

/** 输入框上方的当前编辑器/选区上下文 chip；点击锁定（可多项），发送消息时作为 @ 引用一并发送；右键可锁定/追加至光标处 */
export function EditorContextChip({ context, pinned, onToggle, onAppend }: EditorContextChipProps) {
  return (
    <Tooltip>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                'flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] leading-4 transition-colors cursor-pointer',
                pinned
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:text-accent-foreground hover:border-border'
              )}>
              {pinned ? <IconPinFilled className="size-3 shrink-0" /> : <IconPin className="size-3 shrink-0" />}
              <IconFile className="size-3 shrink-0" />
              <span className="truncate">{context.display}</span>
            </button>
          </TooltipTrigger>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onToggle}>{pinned ? '取消锁定' : '锁定'}</ContextMenuItem>
          <ContextMenuItem onSelect={onAppend}>追加至光标处</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <TooltipContent>
        {pinned ? '已锁定，发送时作为上下文引用；点击解除' : '点击锁定至上下文'}
      </TooltipContent>
    </Tooltip>
  )
}

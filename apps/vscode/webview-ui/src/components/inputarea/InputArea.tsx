import { Fragment, useRef, useMemo, useState, useEffect } from 'react'
import { IconSend, IconPlayerStop, IconChevronDown, IconPlus, IconArrowBackUp } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ActionMenu } from '../ActionMenu'
import { SlashCommandMenu } from '../SlashCommandMenu'
import { FilePickerMenu } from '../FilePickerMenu'
import { MediaThumbnail } from '../MediaThumbnail'
import { MediaPreviewModal } from '../MediaPreviewModal'
import { BottomToolbar } from '../BottomToolbar'
import { ChatStatus } from '../ChatStatus'
import { UsagePanel } from '../UsagePanel'
import { StreamingConfirmDialog } from '../StreamingConfirmDialog'
import { PromptOptimizePopover } from '../PromptOptimizePopover'
import { ThinkingButton } from '../ThinkingButton'
import { PlanModeButton } from '../PlanModeButton'
import {
  getModelById,
  getMediaFallbackModel,
  getModelsForMedia,
  groupModelsByProvider,
  providerDisplayName,
  useChatStore,
  useSettingsStore
} from '@/stores'
import { bridge, Events } from '@/services'
import { Content } from '@/lib/content'
import { cn } from '@/lib/utils'
import { useSlashMenu, findActiveToken } from './hooks/useSlashMenu'
import { useFilePicker } from './hooks/useFilePicker'
import { useMediaUpload } from './hooks/useMediaUpload'
import { useClickOutside } from './hooks/useClickOutside'
import { useInputHistory } from './hooks/useInputHistory'
import { useInputSuggestion } from './hooks/useInputSuggestion'
import { computeMentionInsert } from './utils'

interface InputAreaProps {
  onAuthAction?: () => void
}

const SWITCH_CACHE_NOTE =
  '注意：切换模型或思考强度会使当前提示缓存失效。如需避免额外 Token 消耗，请开启新对话。'

function adjustHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 210)}px`
}

export function InputArea({ onAuthAction }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const [previewMedia, setPreviewMedia] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [preOptimizeText, setPreOptimizeText] = useState<string | null>(null)

  const {
    isStreaming,
    sendMessage,
    abort,
    draftMedia,
    removeDraftMedia,
    hasProcessingMedia,
    getMediaInConversation,
    pendingInput,
    planMode,
    messages,
    sessionId,
    lastStatus
  } = useChatStore()
  const {
    currentModel,
    thinkingEffort,
    updateModel,
    toggleThinking,
    selectThinkingEffort,
    models,
    extensionConfig,
    getCurrentThinkingMode,
    isLoggedIn
  } = useSettingsStore()

  const isProcessing = hasProcessingMedia()
  const thinkingMode = getCurrentThinkingMode()
  // A switch from a non-empty conversation resends the accumulated context,
  // losing the prompt cache — surface the cost note in the switcher dropdowns.
  const hasConversationHistory = messages.some(message => message.role === 'user')

  const [showPlanModeConfirm, setShowPlanModeConfirm] = useState(false)

  const handleTogglePlanMode = () => {
    // Turning OFF during streaming needs confirmation — user may want next turn, not current
    if (planMode && isStreaming) {
      setShowPlanModeConfirm(true)
      return
    }
    const newState = !planMode
    useChatStore.setState({ planMode: newState }) // optimistic
    void bridge.setPlanMode(newState)
  }

  const handleConfirmExitPlanMode = () => {
    useChatStore.setState({ planMode: false })
    void bridge.setPlanMode(false)
    setShowPlanModeConfirm(false)
  }

  const mediaReq = useMemo(() => {
    const media = getMediaInConversation()
    return { image: media.hasImage, video: media.hasVideo }
  }, [getMediaInConversation, draftMedia])

  const availableModels = useMemo(() => getModelsForMedia(models, mediaReq), [models, mediaReq])
  const currentModelConfig = getModelById(models, currentModel)
  const modelGroups = useMemo(() => groupModelsByProvider(availableModels), [availableModels])
  const showProviderGroups = modelGroups.length > 1
  const currentModelLabel =
    currentModelConfig === undefined
      ? '暂无可选模型'
      : showProviderGroups
        ? `${currentModelConfig.name} · ${providerDisplayName(currentModelConfig.provider)}`
        : currentModelConfig.name

  // Auto-switch model if current model doesn't support required media
  useEffect(() => {
    if (!mediaReq.image && !mediaReq.video) {
      return
    }
    const isCurrentModelValid = availableModels.some(m => m.id === currentModel)
    if (isCurrentModelValid) {
      return
    }
    const fallbackModel = getMediaFallbackModel(availableModels, currentModelConfig)
    if (fallbackModel !== undefined) {
      updateModel(fallbackModel.id)
    }
  }, [
    mediaReq.image,
    mediaReq.video,
    currentModel,
    currentModelConfig,
    availableModels,
    updateModel
  ])

  // Restore pending input
  useEffect(() => {
    if (!pendingInput || isStreaming) {
      return
    }

    // 只在输入框为空时恢复
    if (text.trim()) {
      return
    }

    const textContent = Content.getText(pendingInput.content)
    if (textContent) {
      setText(textContent)
      setTimeout(() => {
        textareaRef.current?.focus()
        adjustHeight(textareaRef.current)
      }, 0)
    }
  }, [pendingInput, isStreaming])

  const activeToken = useMemo(() => findActiveToken(text, cursorPos), [text, cursorPos])

  const { handlePaste, handlePickMedia } = useMediaUpload()

  const {
    handleKey: handleHistoryKey,
    add: addToHistory,
    reset: resetHistoryIndex
  } = useInputHistory({
    text,
    setText,
    onHeightChange: () =>
      setTimeout(() => {
        adjustHeight(textareaRef.current)
      }, 0)
  })

  function clearInput() {
    setText('')
    setCursorPos(0)
    setTimeout(() => {
      adjustHeight(textareaRef.current)
    }, 0)
  }

  function removeActiveToken() {
    if (!activeToken) return
    const newText = text.slice(0, activeToken.start) + text.slice(cursorPos)
    const newCursorPos = activeToken.start
    setText(newText)
    setCursorPos(newCursorPos)
    setTimeout(() => {
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      adjustHeight(textareaRef.current)
    }, 0)
  }

  function handleSend() {
    if (isProcessing || (!text.trim() && draftMedia.length === 0)) {
      return
    }

    addToHistory(text)
    sendMessage(text)
    clearInput()
    setPreOptimizeText(null)
  }

  // 提示词优化成功后写回输入框，并记录原稿用于工具行的回退按钮。
  function handleOptimized(optimized: string) {
    suppressSuggestion(optimized)
    setPreOptimizeText(text)
    setText(optimized)
    setCursorPos(optimized.length)
  }

  // 选中命令（回车/Tab/点击）只补全到输入框，不直接发送
  function completeSlashCommand(name: string) {
    if (!activeToken) return
    const insert = `/${name} `
    const newText = text.slice(0, activeToken.start) + insert + text.slice(cursorPos)
    const newPos = activeToken.start + insert.length
    setText(newText)
    setCursorPos(newPos)
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newPos, newPos)
      adjustHeight(textareaRef.current)
    }, 0)
  }

  function applyMention(filePath: string) {
    const { newText, newCursorPos } = computeMentionInsert({
      text,
      cursorPos,
      filePath,
      activeToken,
      isAppend: false
    })

    setText(newText)
    setCursorPos(newCursorPos)
    setTimeout(() => {
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      textareaRef.current?.focus()
      adjustHeight(textareaRef.current)
    }, 0)
  }

  const {
    showSlashMenu,
    filteredCommands,
    selectedIndex: slashSelectedIndex,
    setSelectedIndex: setSlashSelectedIndex,
    handleSlashMenuKey,
    resetSlashMenu
  } = useSlashMenu(activeToken, completeSlashCommand, removeActiveToken)

  const {
    showFileMenu,
    fileItems,
    selectedIndex: fileSelectedIndex,
    isLoading: isFileLoading,
    isStale: isFileStale,
    showMediaOption,
    setSelectedIndex: setFileSelectedIndex,
    handleSelectItem: handleSelectFileItem,
    handleFileMenuKey,
    resetFilePicker
  } = useFilePicker(
    activeToken,
    applyMention,
    () => {
      void handlePickMedia()
    },
    removeActiveToken
  )

  const closeMenus = () => {
    if (showSlashMenu || showFileMenu) {
      removeActiveToken()
    }
  }

  const { suggestion, dismiss: dismissSuggestion, suppress: suppressSuggestion } = useInputSuggestion({
    text,
    currentModelId: currentModel,
    enabled: !isStreaming && !showSlashMenu && !showFileMenu
  })

  // 镜像层滚动跟随 textarea（overflow-hidden 元素也可设 scrollTop）
  const syncGhostScroll = () => {
    if (ghostRef.current && textareaRef.current) {
      ghostRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // 建议出现/更新时对齐一次滚动位置
  useEffect(() => {
    syncGhostScroll()
  }, [suggestion])

  useClickOutside([textareaRef, menuRef], showSlashMenu || showFileMenu, closeMenus)

  useEffect(() => {
    resetSlashMenu()
  }, [showSlashMenu, resetSlashMenu])

  useEffect(() => {
    if (!showFileMenu) {
      resetFilePicker()
    }
  }, [showFileMenu, resetFilePicker])

  useEffect(() => {
    const unsub = bridge.on<{ mention: string }>(Events.InsertMention, ({ mention }) => {
      setText(prev => prev + mention + ' ')

      setTimeout(() => {
        textareaRef.current?.focus()
        adjustHeight(textareaRef.current)
      }, 0)
    })

    return unsub
  }, [])

  // Alt+Tab 切走再切回时恢复输入框焦点：窗口失焦时记录焦点是否在输入框，
  // 窗口重新聚焦后恢复；窗口仍聚焦时的 blur 是用户主动点走，清除标记避免抢焦点。
  // webview iframe 的 blur/focus 事件不可靠，以宿主的窗口状态广播为准，本地事件作兜底
  const hadFocusOnBlur = useRef(false)
  useEffect(() => {
    const ta = textareaRef.current
    const onWindowBlur = () => {
      hadFocusOnBlur.current = document.activeElement === ta
    }
    const onTextareaBlur = () => {
      if (document.hasFocus()) hadFocusOnBlur.current = false
    }
    const refocus = () => {
      if (hadFocusOnBlur.current) textareaRef.current?.focus()
    }
    const unsubFocus = bridge.on(Events.WindowFocused, refocus)
    const unsubBlur = bridge.on(Events.WindowBlurred, onWindowBlur)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', refocus)
    ta?.addEventListener('blur', onTextareaBlur)
    return () => {
      unsubFocus()
      unsubBlur()
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', refocus)
      ta?.removeEventListener('blur', onTextareaBlur)
    }
  }, [])

  // 全局面板级的文件拖拽检测，仅用于展示蒙层提示（实际落点处理在下方容器上）
  // 必须用捕获阶段监听：useMediaUpload 在 document 冒泡阶段对 dragover/drop
  // 调用了 stopPropagation，冒泡到 window 的监听永远收不到事件
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      const types = Array.from(e.dataTransfer?.types || [])
      if (
        types.includes('Files') ||
        types.includes('text/uri-list') ||
        types.includes('application/vnd.code.tree.explorer')
      ) {
        setIsDraggingFile(true)
      }
    }
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setIsDraggingFile(false)
    }
    const reset = () => setIsDraggingFile(false)
    window.addEventListener('dragover', onDragOver, true)
    window.addEventListener('dragleave', onDragLeave, true)
    window.addEventListener('drop', reset, true)
    window.addEventListener('dragend', reset, true)
    return () => {
      window.removeEventListener('dragover', onDragOver, true)
      window.removeEventListener('dragleave', onDragLeave, true)
      window.removeEventListener('drop', reset, true)
      window.removeEventListener('dragend', reset, true)
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) {
      return
    }

    if (handleSlashMenuKey(e)) {
      return
    }

    if (handleFileMenuKey(e)) {
      return
    }

    // 有后续建议时：Tab 接受、Esc 丢弃
    if (suggestion) {
      if (e.key === 'Tab') {
        e.preventDefault()
        const next = text + suggestion
        setText(next)
        setCursorPos(next.length)
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(next.length, next.length)
          adjustHeight(textareaRef.current)
        }, 0)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissSuggestion()
        return
      }
    }

    if (handleHistoryKey(e)) {
      return
    }

    if (extensionConfig.useCtrlEnterToSend) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSend()
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setCursorPos(e.target.selectionStart)
    resetHistoryIndex()
    setTimeout(() => {
      adjustHeight(textareaRef.current)
    }, 0)
  }

  const handleSelect = () => {
    setCursorPos(textareaRef.current?.selectionStart ?? 0)
  }

  function isFileDrop(e: React.DragEvent) {
    const types = Array.from(e.dataTransfer?.types || [])
    return types.includes('text/uri-list') || types.includes('application/vnd.code.tree.explorer')
  }

  function handleDragOver(e: React.DragEvent) {
    if (!isFileDrop(e)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  async function handleDrop(e: React.DragEvent) {
    if (!isFileDrop(e)) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const uriStrings: string[] = []
    const uriList = e.dataTransfer.getData('text/uri-list')
    if (uriList) {
      for (const line of uriList.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        uriStrings.push(trimmed)
      }
    }

    if (uriStrings.length === 0) {
      const explorerData = e.dataTransfer.getData('application/vnd.code.tree.explorer')
      if (explorerData) {
        try {
          const items = JSON.parse(explorerData) as unknown
          if (Array.isArray(items)) {
            for (const item of items) {
              if (
                item &&
                typeof item === 'object' &&
                typeof item.scheme === 'string' &&
                typeof item.path === 'string'
              ) {
                const uri =
                  item.scheme === 'file' && !item.path.startsWith('/')
                    ? `file:///${item.path}`
                    : `${item.scheme}://${item.path}`
                uriStrings.push(uri)
              }
            }
          }
        } catch {
          // 忽略无法解析的内部拖拽数据
        }
      }
    }

    if (uriStrings.length === 0) return

    try {
      const { mentions, skipped } = await bridge.resolveDroppedUris(uriStrings)
      let insertCursor = cursorPos
      let newText = text
      for (const mention of mentions) {
        const before = newText.slice(0, insertCursor)
        const after = newText.slice(insertCursor)
        newText = `${before}@${mention} ${after}`
        insertCursor = before.length + 1 + mention.length + 1
      }
      setText(newText)
      setCursorPos(insertCursor)
      if (skipped > 0) {
        toast(`${skipped} 个项目不在当前工作目录，已跳过`)
      }
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(insertCursor, insertCursor)
        adjustHeight(textareaRef.current)
      }, 0)
    } catch {
      toast.error('插入路径失败')
    }
  }

  function handleAddButtonClick() {
    const newText = text + '@'
    setText(newText)
    setCursorPos(newText.length)
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newText.length, newText.length)
      adjustHeight(textareaRef.current)
    }, 0)
  }

  const hasModels = availableModels.length > 0
  const canSend = (text.trim() || draftMedia.length > 0) && !isProcessing

  return (
    <div className="p-2 pt-0! flex flex-col min-h-0">
      <BottomToolbar />
      {/* 输入框上方按钮栏：提示词优化居右 */}
      <div className="flex items-center justify-end px-0.5 pb-1">
        <PromptOptimizePopover text={text} onApplied={handleOptimized} disabled={!text.trim()} />
      </div>
      <div className="relative shrink-0">
        {showSlashMenu && filteredCommands.length > 0 && (
          <div ref={menuRef} className="absolute bottom-full left-0 right-0 mb-2 z-10">
            <SlashCommandMenu
              commands={filteredCommands}
              query={activeToken?.query || ''}
              selectedIndex={slashSelectedIndex}
              onSelect={completeSlashCommand}
              onHover={setSlashSelectedIndex}
            />
          </div>
        )}

        {showFileMenu && (
          <div ref={menuRef} className="absolute bottom-full left-0 right-0 mb-2 z-10">
            <FilePickerMenu
              items={fileItems}
              selectedIndex={fileSelectedIndex}
              isLoading={isFileLoading}
              isStale={isFileStale}
              showMediaOption={showMediaOption}
              onSelectMedia={() => {
                void handlePickMedia()
              }}
              onSelectItem={handleSelectFileItem}
              onHover={setFileSelectedIndex}
            />
          </div>
        )}

        <div
          className={cn(
            'relative border border-input rounded-xl bg-card shadow-sm overflow-hidden transition-shadow focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/25',
            isDragOver && 'ring-2 ring-ring/50 border-primary/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>
          {isDraggingFile && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
              <span className="text-xs text-primary">按住 Shift 拖动后释放，在光标处插入引用</span>
            </div>
          )}
          {draftMedia.length > 0 && (
            <div className="flex gap-2 p-2 overflow-x-auto">
              {draftMedia.map(item => (
                <MediaThumbnail
                  key={item.id}
                  src={item.dataUri}
                  size="sm"
                  onClick={item.dataUri ? () => setPreviewMedia(item.dataUri!) : undefined}
                  onRemove={() => removeDraftMedia(item.id)}
                />
              ))}
            </div>
          )}

          <div className="relative">
            {/* ghost 建议镜像层：与 textarea 排版一致，透明原文 + 灰色建议 */}
            {suggestion && (
              <div
                ref={ghostRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden px-2.5 py-1.5 text-xs leading-relaxed whitespace-pre-wrap break-words">
                <span className="text-transparent">{text}</span>
                <span className="text-muted-foreground/60">{suggestion}</span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              onPaste={handlePaste}
              onScroll={syncGhostScroll}
              placeholder={
                isStreaming ? '继续追问…' : '向 Kimi Code Maka 提问…（/ 命令 · @ 文件 · Alt+K 代码）'
              }
              className={cn(
                'w-full min-h-18 max-h-[210px] px-2.5 py-1.5 text-xs leading-relaxed',
                'bg-transparent resize-none outline-none border-none overflow-y-auto',
                'placeholder:text-muted-foreground'
              )}
            />
          </div>

          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="gap-0.5 text-accent-foreground border-0! h-6 px-1.5 min-w-0 max-w-[calc(100%-4rem)]"
                        disabled={isStreaming || !hasModels}>
                        {/* Name stays readable longest: the dimmed provider
                            suffix carries a higher shrink factor so space
                            pressure truncates it before the model name, and
                            below 520px it drops out entirely (still shown in
                            the tooltip and the dropdown) — a narrow sidebar
                            has no room for both. */}
                        <span className="flex min-w-0 items-center text-xs">
                          <span className="truncate">
                            {currentModelConfig?.name ?? '暂无可选模型'}
                          </span>
                          {currentModelConfig !== undefined && showProviderGroups && (
                            <span className="shrink-[3] truncate text-muted-foreground max-[520px]:hidden">
                              {' · '}
                              {providerDisplayName(currentModelConfig.provider)}
                            </span>
                          )}
                        </span>
                        {hasModels && <IconChevronDown className="size-3.5 shrink-0" />}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{currentModelLabel}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent className="w-72!" align="start">
                  {modelGroups.map((group, groupIndex) => (
                    <Fragment key={group.provider}>
                      {showProviderGroups && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
                      {group.models.map(model => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => updateModel(model.id)}
                          className={cn(
                            'text-xs px-3 py-1.5 cursor-pointer',
                            currentModel === model.id && 'bg-accent'
                          )}>
                          {model.name}
                        </DropdownMenuItem>
                      ))}
                      {showProviderGroups && groupIndex < modelGroups.length - 1 && (
                        <DropdownMenuSeparator />
                      )}
                    </Fragment>
                  ))}
                  {hasConversationHistory && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-3 py-1.5 text-[10px] leading-snug whitespace-normal text-muted-foreground">
                        {SWITCH_CACHE_NOTE}
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <ThinkingButton
                mode={thinkingMode}
                effort={thinkingEffort}
                efforts={currentModelConfig?.support_efforts}
                alwaysOn={currentModelConfig?.capabilities.includes('always_thinking')}
                disabled={isStreaming}
                cacheNote={hasConversationHistory ? SWITCH_CACHE_NOTE : undefined}
                onToggle={toggleThinking}
                onSelectEffort={selectThinkingEffort}
              />
              <PlanModeButton active={planMode} onToggle={handleTogglePlanMode} />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ChatStatus />
              {isLoggedIn && <UsagePanel />}
              {/* 与右侧发送工具组拉开距离；两侧组件都不可见时不渲染 */}
              {(lastStatus || sessionId || isLoggedIn) && (
                <div className="w-px h-4 bg-border/60 mx-0.5" />
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleAddButtonClick}
                    className="text-muted-foreground">
                    <IconPlus className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>添加文件或媒体</TooltipContent>
              </Tooltip>

              <ActionMenu onAuthAction={onAuthAction} />

              {preOptimizeText !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        suppressSuggestion(preOptimizeText)
                        setText(preOptimizeText)
                        setPreOptimizeText(null)
                      }}
                      className="text-muted-foreground">
                      <IconArrowBackUp className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>还原优化前的文本</TooltipContent>
                </Tooltip>
              )}

              {isStreaming ? (
                <Button variant="destructive" size="icon-xs" onClick={abort}>
                  <IconPlayerStop className="size-3.5" />
                </Button>
              ) : (
                <Button variant="default" size="icon-xs" onClick={handleSend} disabled={!canSend}>
                  <IconSend className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <MediaPreviewModal src={previewMedia} onClose={() => setPreviewMedia(null)} />
      <StreamingConfirmDialog
        open={showPlanModeConfirm}
        onOpenChange={setShowPlanModeConfirm}
        title="退出规划模式"
        description="智能体仍在运行。立即退出规划模式会影响当前回合，确定要立即退出吗？"
        confirmLabel="立即退出"
        onConfirm={handleConfirmExitPlanMode}
      />
    </div>
  )
}

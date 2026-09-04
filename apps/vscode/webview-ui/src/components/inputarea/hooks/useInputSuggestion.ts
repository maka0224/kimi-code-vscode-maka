import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bridge } from "@/services";
import { DEFAULT_INPUT_SUGGESTION_PREFS, type InputSuggestionPrefs } from "shared/bridge";

const INPUT_HISTORY_KEY = ["inputHistory"] as const;
const NO_HISTORY: string[] = [];
const PREFS_KEY = ["inputSuggestionPrefs"] as const;

/** 停顿多少毫秒后才请求模型生成建议。 */
const DEBOUNCE_MS = 400;
/** 触发模型建议的最小输入长度。 */
const MIN_LENGTH = 4;

interface LlmSuggestion {
  /** 请求建议时的输入文本。 */
  base: string;
  /** 模型返回的续写片段。 */
  suffix: string;
}

interface UseInputSuggestionOptions {
  text: string;
  /** 当前会话模型 ID（偏好未指定模型时跟随）。 */
  currentModelId: string;
  /** 外部抑制条件（生成中、slash/@ 菜单打开等）。 */
  enabled: boolean;
}

/** 输入建议偏好：react-query 缓存，设置弹窗编辑即保存，所有消费方共享同一份。 */
export function useInputSuggestionPrefs() {
  const queryClient = useQueryClient();
  const { data: prefs = DEFAULT_INPUT_SUGGESTION_PREFS } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => bridge.getInputSuggestionPrefs(),
  });
  const save = (next: InputSuggestionPrefs) => {
    queryClient.setQueryData(PREFS_KEY, next);
    void bridge.saveInputSuggestionPrefs(next);
  };
  return { prefs, save };
}

/**
 * 从输入历史中找前缀匹配的续写片段（纯函数，便于测试）。
 * 最新的历史优先；完全相等不算建议。
 */
export function historySuffix(history: readonly string[], text: string): string | null {
  if (text.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]!;
    if (entry.length > text.length && entry.startsWith(text)) {
      return entry.slice(text.length);
    }
  }
  return null;
}

/**
 * 输入建议：按偏好分流——history 仅历史前缀匹配（同步即时），llm 仅模型
 * 生成，hybrid 历史优先模型兜底（停顿后请求）。模型建议返回后继续打字，
 * 只要输入仍是「原文 + 建议」的前缀就保留裁剪，不重复请求。
 */
export function useInputSuggestion({ text, currentModelId, enabled: externalEnabled }: UseInputSuggestionOptions) {
  const { prefs } = useInputSuggestionPrefs();
  const modelId = prefs.model || currentModelId;
  const enabled = externalEnabled && prefs.enabled;
  const mode = prefs.mode;

  const { data: history = NO_HISTORY } = useQuery({
    queryKey: INPUT_HISTORY_KEY,
    queryFn: () => bridge.getInputHistory(),
  });
  const [llm, setLlm] = useState<LlmSuggestion | null>(null);
  const seqRef = useRef(0);
  const dismissedRef = useRef<string | null>(null);
  const suppressedRef = useRef<string | null>(null);

  const useHistory = enabled && mode !== "llm";
  const useLlm = enabled && mode !== "history";
  const fromHistory = useHistory ? historySuffix(history, text) : null;

  useEffect(() => {
    // 程序化写回的文本（提示词优化、还原原稿）：本次变化不触发模型建议。
    if (text === suppressedRef.current) {
      suppressedRef.current = null;
      setLlm(null);
      return;
    }
    // 输入仍是已有建议的前缀：建议继续有效，不发新请求。
    if (llm !== null && (llm.base + llm.suffix).startsWith(text) && text.startsWith(llm.base)) {
      return;
    }
    setLlm(null);
    if (!useLlm || fromHistory !== null) return;
    // 结尾是空白时用户通常在斟酌措辞，不触发。
    if (text.length < MIN_LENGTH || text !== text.trimEnd()) return;
    const seq = ++seqRef.current;
    const timer = setTimeout(() => {
      bridge
        .suggestInput({ text, modelId })
        .then((result) => {
          if (seq === seqRef.current && result.text.length > 0) {
            setLlm({ base: text, suffix: result.text });
          }
        })
        .catch(() => {
          // 建议失败静默降级，不打扰输入。
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, useLlm, fromHistory, modelId, llm]);

  // Esc 丢弃后，同一文本不再显示建议；继续打字自动恢复。
  const dismiss = () => {
    dismissedRef.current = text;
    setLlm(null);
  };
  /** 程序化写回文本（提示词优化、还原原稿）前调用，抑制该次变化触发模型建议。 */
  const suppress = (nextText: string) => {
    suppressedRef.current = nextText;
  };
  if (text !== dismissedRef.current && dismissedRef.current !== null && !text.startsWith(dismissedRef.current)) {
    dismissedRef.current = null;
  }
  const dismissed = dismissedRef.current !== null && text.startsWith(dismissedRef.current);

  let suggestion: string | null = null;
  if (!dismissed) {
    if (fromHistory !== null) {
      suggestion = fromHistory;
    } else if (llm !== null && text.startsWith(llm.base) && (llm.base + llm.suffix).startsWith(text)) {
      suggestion = llm.suffix.slice(text.length - llm.base.length) || null;
    }
  }

  return { suggestion, dismiss, suppress };
}

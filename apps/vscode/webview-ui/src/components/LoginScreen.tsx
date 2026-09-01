import { useState, useEffect } from "react";
import { IconLoader2, IconCopy, IconCheck, IconExternalLink, IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { KimiMascot } from "./KimiMascot";
import { bridge, Events } from "@/services";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onSkip: () => void;
}

type LoginState = "idle" | "pending" | "error";

function isPaymentRequiredError(error: string | null): boolean {
  if (!error) return false;
  return error.includes("402") || error.toLowerCase().includes("payment required");
}

export function LoginScreen({ onLoginSuccess, onSkip }: LoginScreenProps) {
  const [state, setState] = useState<LoginState>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);

  useEffect(() => {
    return bridge.on<{ url: string }>(Events.LoginUrl, ({ url }) => {
      setUrl(url);
    });
  }, []);

  const handleLogin = async () => {
    setState("pending");
    setUrl(null);
    setError(null);
    try {
      const result = await bridge.login();
      if (result.success) {
        onLoginSuccess();
      } else {
        const errorMessage = result.error || "登录失败";
        if (isPaymentRequiredError(errorMessage)) {
          setShowSubscribeDialog(true);
          setState("idle");
        } else {
          setState("error");
          setError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (isPaymentRequiredError(errorMessage)) {
        setShowSubscribeDialog(true);
        setState("idle");
      } else {
        setState("error");
        setError(errorMessage);
      }
    }
  };

  const handleSubscribe = () => {
    // TODO(region-split): derive this from the region profile's siteBase
    // (`https://www.kimi.ai/code` for overseas logins). The webview cannot
    // resolve the region itself — @moonshot-ai/kimi-code-oauth is not a
    // webview dependency and its region resolver is Node-only — so the
    // extension host needs to hand the site URL over the bridge first.
    window.open("https://www.kimi.com/code", "_blank");
    setShowSubscribeDialog(false);
  };

  const handleCopyUrl = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state === "pending") {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <KimiMascot className="h-12 mx-auto" />
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-blue-500">
              <IconLoader2 className="size-5 animate-spin" />
              <span className="text-sm font-medium">等待认证…</span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground text-left">浏览器将自动打开，请在其中完成登录。</p>
          </div>
          {url && (
            <div className="bg-muted/50 rounded-lg p-2 text-left space-y-3">
              <p className="text-xs text-muted-foreground">如果浏览器未打开，请访问该链接：</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 font-mono break-all select-all">{url}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 size-8"
                  onClick={() => {
                    void handleCopyUrl();
                  }}
                >
                  {copied ? <IconCheck className="size-4 text-emerald-500" /> : <IconCopy className="size-4" />}
                </Button>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
                <IconExternalLink className="size-3.5" />
                在浏览器中打开
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <KimiMascot className="h-12 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">欢迎使用 Kimi Code Maka</h1>
            <div className="text-left space-y-2">
              <p className="text-xs leading-5">使用你的 Kimi 账户订阅或现有 API 配置来运行 Kimi Code Maka。</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 text-left">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="text-left space-y-1">
              <Button
                onClick={() => {
                  void handleLogin();
                }}
                className="w-full justify-center gap-2"
              >
                使用 Kimi 账户登录
              </Button>
              <p className="text-[11px] text-muted-foreground leading-4">使用你的 Kimi 账户与 Kimi Code Maka 订阅。</p>
            </div>

            <div className="text-left space-y-1">
              <Button type="button" variant="outline" onClick={onSkip} className="w-full relative justify-center font-normal">
                <span>跳过</span>
                <IconArrowRight className="size-4 text-muted-foreground absolute right-3" />
              </Button>
              <p className="text-[11px] text-muted-foreground leading-4">使用你现有的 API Key 配置。</p>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>需要订阅</AlertDialogTitle>
            <AlertDialogDescription>
              你的账户没有生效的 Kimi Code Maka 订阅。请订阅后继续使用 Kimi Code Maka。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSubscribeDialog(false)}>跳过</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubscribe}>订阅</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

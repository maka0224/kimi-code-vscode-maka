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

interface StreamingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmLoading?: boolean;
}

export function StreamingConfirmDialog({
  open,
  onOpenChange,
  title,
  description = "当前对话仍在生成回复。此操作将截断当前输出。确定要继续吗？",
  confirmLabel = "继续",
  cancelLabel = "取消",
  onConfirm,
  confirmDisabled = false,
  cancelDisabled = false,
  confirmLoading = false,
}: StreamingConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={cancelDisabled}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLoading ? `${confirmLabel}…` : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  confirmVariant?:
    | "primary"
    | "danger";
  onConfirm:
    () =>
      | void
      | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "확인",
  description = "정말 진행하시겠습니까?",
  confirmText = "확인",
  cancelText = "취소",
  loading = false,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      closeOnBackdrop={
        !loading
      }
      closeOnEsc={
        !loading
      }
      onClose={
        onCancel
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={
              loading
            }
            onClick={
              onCancel
            }
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={
              confirmVariant
            }
            loading={
              loading
            }
            onClick={
              onConfirm
            }
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="py-1">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--flow-danger-soft)] text-lg text-[var(--flow-danger)]">
            !
          </div>

          <div className="min-w-0 pt-0.5">
            <p className="text-sm leading-6 text-[var(--flow-text-secondary)]">
              {description}
            </p>

            {confirmVariant ===
              "danger" && (
              <p className="mt-2 text-xs leading-5 text-[var(--flow-text-muted)]">
                이 작업은 되돌릴 수 없을 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
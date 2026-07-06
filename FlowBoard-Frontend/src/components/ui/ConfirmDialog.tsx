import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "확인",
  description = "정말 진행하시겠습니까?",
  confirmText = "확인",
  cancelText = "취소",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>

          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "처리 중..." : confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">{description}</p>
    </Modal>
  );
}

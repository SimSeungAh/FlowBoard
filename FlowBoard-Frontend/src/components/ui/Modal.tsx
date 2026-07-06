import { useEffect, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";

const modalVariants = cva("w-full rounded-xl bg-white p-6 shadow-xl", {
  variants: {
    size: {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface ModalProps extends VariantProps<typeof modalVariants> {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose: () => void;
}

export default function Modal({
  open,
  title,
  children,
  footer,
  size,
  closeOnBackdrop = true,
  closeOnEsc = true,
  onClose,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(modalVariants({ size }))}
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <h2 id="modal-title" className="mb-4 text-xl font-bold text-gray-900">
            {title}
          </h2>
        )}

        <div className="text-gray-700">{children}</div>

        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </section>
    </div>
  );
}

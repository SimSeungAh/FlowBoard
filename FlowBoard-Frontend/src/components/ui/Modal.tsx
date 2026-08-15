import {
  useEffect,
  useId,
  type ReactNode,
} from "react";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";

import { cn } from "@/utils/cn";

const modalVariants = cva(
  [
    "w-full overflow-hidden",
    "rounded-xl",
    "border border-[var(--flow-border)]",
    "bg-white",
    "shadow-[var(--flow-shadow-md)]",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "max-w-[360px]",
        md: "max-w-[440px]",
        lg: "max-w-[680px]",
        xl: "max-w-[960px]",
      },
    },

    defaultVariants: {
      size: "md",
    },
  },
);

interface ModalProps
  extends VariantProps<typeof modalVariants> {
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
  const titleId =
    useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (
      !open ||
      !closeOnEsc
    ) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    closeOnEsc,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          closeOnBackdrop &&
          event.target ===
            event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          title
            ? titleId
            : undefined
        }
        className={cn(
          modalVariants({
            size,
          }),
        )}
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {title && (
          <header className="flex h-14 items-center justify-between gap-4 border-b border-[var(--flow-border)] px-5">
            <h2
              id={titleId}
              className="min-w-0 truncate text-base font-bold text-[var(--flow-text)]"
            >
              {title}
            </h2>

            <button
              type="button"
              aria-label="모달 닫기"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-xl leading-none text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]"
              onClick={
                onClose
              }
            >
              ×
            </button>
          </header>
        )}

        <div className="max-h-[calc(100vh-140px)] overflow-y-auto px-5 py-5 text-[var(--flow-text-secondary)]">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-5 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}
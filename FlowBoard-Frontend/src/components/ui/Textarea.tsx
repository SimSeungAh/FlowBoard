import {
  forwardRef,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/utils/cn";

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  errorMessage?: string;
}

const Textarea =
  forwardRef<
    HTMLTextAreaElement,
    TextareaProps
  >(
    (
      {
        label,
        errorMessage,
        className,
        id,
        required,
        disabled,
        ...props
      },
      ref,
    ) => {
      const hasError =
        Boolean(errorMessage);

      return (
        <div className="flex w-full flex-col gap-1.5">
          {label && (
            <label
              htmlFor={id}
              className="text-xs font-semibold text-[var(--flow-text-secondary)]"
            >
              {label}

              {required && (
                <span className="ml-1 text-[var(--flow-danger)]">
                  *
                </span>
              )}
            </label>
          )}

          <textarea
            id={id}
            ref={ref}
            required={required}
            disabled={disabled}
            className={cn(
              [
                "min-h-24 w-full resize-y",
                "rounded-lg border bg-white",
                "px-3 py-2.5",
                "text-sm leading-6",
                "text-[var(--flow-text)]",
                "shadow-[var(--flow-shadow-xs)]",
                "outline-none",
                "placeholder:text-[var(--flow-text-placeholder)]",
                "transition-[border-color,box-shadow,background-color]",
                "duration-150",
              ],
              hasError
                ? [
                    "border-[var(--flow-danger)]",
                    "focus:ring-4",
                    "focus:ring-red-50",
                  ]
                : [
                    "border-[var(--flow-border-strong)]",
                    "hover:border-[var(--flow-gray-400)]",
                    "focus:border-[var(--flow-primary-500)]",
                    "focus:ring-4",
                    "focus:ring-[var(--flow-focus-ring)]",
                  ],
              disabled && [
                "cursor-not-allowed",
                "border-[var(--flow-border)]",
                "bg-[var(--flow-gray-100)]",
                "text-[var(--flow-text-muted)]",
              ],
              className,
            )}
            {...props}
          />

          {errorMessage && (
            <p className="text-xs leading-5 text-[var(--flow-danger)]">
              {errorMessage}
            </p>
          )}
        </div>
      );
    },
  );

Textarea.displayName =
  "Textarea";

export default Textarea;
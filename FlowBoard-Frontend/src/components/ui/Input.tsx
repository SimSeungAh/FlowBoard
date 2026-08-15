import type {
  InputHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "@/utils/cn";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  fullWidth?: boolean;
}

export default function Input({
  label,
  helperText,
  errorMessage,
  leftElement,
  rightElement,
  fullWidth = true,
  className,
  id,
  required,
  disabled,
  ...props
}: InputProps) {
  const inputId =
    id ?? props.name;

  const hasError =
    Boolean(errorMessage);

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        fullWidth && "w-full",
      )}
    >
      {label && (
        <label
          htmlFor={inputId}
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

      <div
        className={cn(
          [
            "flex h-9 items-center",
            "rounded-lg border bg-white px-3",
            "shadow-[var(--flow-shadow-xs)]",
            "transition-[border-color,box-shadow,background-color]",
            "duration-150",
          ],
          hasError
            ? [
                "border-[var(--flow-danger)]",
                "focus-within:ring-4",
                "focus-within:ring-red-50",
              ]
            : [
                "border-[var(--flow-border-strong)]",
                "hover:border-[var(--flow-gray-400)]",
                "focus-within:border-[var(--flow-primary-500)]",
                "focus-within:ring-4",
                "focus-within:ring-[var(--flow-focus-ring)]",
              ],
          disabled && [
            "cursor-not-allowed",
            "border-[var(--flow-border)]",
            "bg-[var(--flow-gray-100)]",
          ],
        )}
      >
        {leftElement && (
          <span className="mr-2 flex shrink-0 items-center text-[var(--flow-text-placeholder)]">
            {leftElement}
          </span>
        )}

        <input
          id={inputId}
          required={required}
          disabled={disabled}
          className={cn(
            [
              "h-full min-w-0 flex-1",
              "border-0 bg-transparent",
              "text-sm text-[var(--flow-text)]",
              "outline-none",
              "placeholder:text-[var(--flow-text-placeholder)]",
              "disabled:cursor-not-allowed",
              "disabled:text-[var(--flow-text-muted)]",
            ],
            className,
          )}
          {...props}
        />

        {rightElement && (
          <span className="ml-2 flex shrink-0 items-center text-[var(--flow-text-placeholder)]">
            {rightElement}
          </span>
        )}
      </div>

      {errorMessage ? (
        <p className="text-xs leading-5 text-[var(--flow-danger)]">
          {errorMessage}
        </p>
      ) : (
        helperText && (
          <p className="text-xs leading-5 text-[var(--flow-text-muted)]">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
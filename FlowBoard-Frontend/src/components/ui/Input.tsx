import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
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
  const inputId = id ?? props.name;
  const hasError = !!errorMessage;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div
        className={cn(
          "flex h-11 items-center rounded-lg border bg-white px-3 transition-colors",
          hasError
            ? "border-red-500 focus-within:ring-2 focus-within:ring-red-100"
            : "border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100",
          disabled && "cursor-not-allowed bg-gray-100 opacity-70",
        )}
      >
        {leftElement && (
          <span className="mr-2 text-gray-400">{leftElement}</span>
        )}

        <input
          id={inputId}
          required={required}
          disabled={disabled}
          className={cn(
            "h-full w-full bg-transparent text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed",
            className,
          )}
          {...props}
        />

        {rightElement && (
          <span className="ml-2 text-gray-400">{rightElement}</span>
        )}
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-500">{errorMessage}</p>
      ) : (
        helperText && <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

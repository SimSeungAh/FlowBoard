import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";

import Spinner from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-lg border",
    "font-semibold",
    "transition-[background-color,border-color,color,box-shadow]",
    "duration-150",
    "focus-visible:outline-none",
    "focus-visible:ring-4",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "border-[var(--flow-primary-600)]",
          "bg-[var(--flow-primary-600)]",
          "text-white",
          "shadow-[var(--flow-shadow-xs)]",
          "hover:border-[var(--flow-primary-700)]",
          "hover:bg-[var(--flow-primary-700)]",
          "focus-visible:ring-[var(--flow-focus-ring)]",
        ].join(" "),

        secondary: [
          "border-[var(--flow-secondary)]",
          "bg-[var(--flow-secondary)]",
          "text-white",
          "shadow-[var(--flow-shadow-xs)]",
          "hover:border-[var(--flow-secondary-hover)]",
          "hover:bg-[var(--flow-secondary-hover)]",
          "focus-visible:ring-sky-100",
        ].join(" "),

        danger: [
          "border-[var(--flow-danger)]",
          "bg-[var(--flow-danger)]",
          "text-white",
          "shadow-[var(--flow-shadow-xs)]",
          "hover:border-[var(--flow-danger-dark)]",
          "hover:bg-[var(--flow-danger-dark)]",
          "focus-visible:ring-red-100",
        ].join(" "),

        outline: [
          "border-[var(--flow-border-strong)]",
          "bg-white",
          "text-[var(--flow-text-secondary)]",
          "shadow-[var(--flow-shadow-xs)]",
          "hover:border-[var(--flow-primary-300)]",
          "hover:bg-[var(--flow-primary-50)]",
          "hover:text-[var(--flow-primary-700)]",
          "focus-visible:ring-[var(--flow-focus-ring)]",
        ].join(" "),

        ghost: [
          "border-transparent",
          "bg-transparent",
          "text-[var(--flow-text-secondary)]",
          "shadow-none",
          "hover:bg-[var(--flow-gray-100)]",
          "hover:text-[var(--flow-text)]",
          "focus-visible:ring-[var(--flow-focus-ring)]",
        ].join(" "),
      },

      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
      },

      fullWidth: {
        true: "w-full",
        false: "",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function Button({
  children,
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled =
    disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        buttonVariants({
          variant,
          size,
          fullWidth,
        }),
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        leftIcon
      )}

      <span>{children}</span>

      {!loading &&
        rightIcon}
    </button>
  );
}
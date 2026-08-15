import type {
  ReactNode,
} from "react";

import { cn } from "@/utils/cn";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClassName: Record<
  BadgeVariant,
  string
> = {
  default: [
    "border-[var(--flow-primary-100)]",
    "bg-[var(--flow-primary-50)]",
    "text-[var(--flow-primary-700)]",
  ].join(" "),

  success: [
    "border-emerald-100",
    "bg-[var(--flow-success-soft)]",
    "text-[var(--flow-success-dark)]",
  ].join(" "),

  warning: [
    "border-amber-100",
    "bg-[var(--flow-warning-soft)]",
    "text-[var(--flow-warning-dark)]",
  ].join(" "),

  danger: [
    "border-red-100",
    "bg-[var(--flow-danger-soft)]",
    "text-[var(--flow-danger-dark)]",
  ].join(" "),
};

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        [
          "inline-flex h-6 shrink-0 items-center",
          "rounded-md border",
          "px-2",
          "text-[11px] font-semibold leading-none",
        ],
        variantClassName[
          variant
        ],
        className,
      )}
    >
      {children}
    </span>
  );
}
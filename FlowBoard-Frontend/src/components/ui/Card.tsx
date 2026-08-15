import type {
  ReactNode,
} from "react";

import { cn } from "@/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?:
    | "none"
    | "sm"
    | "md"
    | "lg";
}

const paddingClassName = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-7",
};

export default function Card({
  children,
  className,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        [
          "w-full",
          "rounded-[var(--flow-radius-lg)]",
          "border border-[var(--flow-border)]",
          "bg-[var(--flow-surface)]",
          "shadow-[var(--flow-shadow-xs)]",
        ],
        paddingClassName[
          padding
        ],
        className,
      )}
    >
      {children}
    </div>
  );
}
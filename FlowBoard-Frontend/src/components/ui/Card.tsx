import type {
  ReactNode,
} from "react";

import { cn } from "@/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className,
}: CardProps) {
  return (
    <div
      className={cn(
        [
          "w-full",
          "rounded-xl",
          "border border-[var(--flow-border)]",
          "bg-[var(--flow-surface)]",
          "p-5",
          "shadow-[var(--flow-shadow-xs)]",
        ],
        className,
      )}
    >
      {children}
    </div>
  );
}
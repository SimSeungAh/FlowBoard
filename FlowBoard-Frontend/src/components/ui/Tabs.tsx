import type { ReactNode } from "react";

interface TabItem<T extends string> {
  label: string;
  value: T;
  content: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: TabsProps<T>) {
  const selectedItem = items.find((item) => item.value === value);

  return (
    <div className={className}>
      <div className="flex border-b border-[var(--flow-border)]">
        {items.map((item) => {
          const isActive = item.value === value;

          return (
            <button
              key={item.value}
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(item.value)}
              className={[
                "border-b-2 px-4 py-2.5",
                "text-sm font-semibold",
                "transition-[border-color,color,background-color]",
                isActive
                  ? ["border-[var(--flow-primary)]", "text-[var(--flow-primary)]"].join(" ")
                  : [
                      "border-transparent",
                      "text-[var(--flow-text-muted)]",
                      "hover:text-[var(--flow-text)]",
                    ].join(" "),
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="pt-4">{selectedItem?.content}</div>
    </div>
  );
}

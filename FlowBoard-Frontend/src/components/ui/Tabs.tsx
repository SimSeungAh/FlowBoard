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
      <div className="flex border-b border-slate-200">
        {items.map((item) => {
          const isActive = item.value === value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
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

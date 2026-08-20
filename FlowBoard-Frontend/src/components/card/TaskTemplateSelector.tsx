import { TASK_TEMPLATES, type TaskTemplateId } from "@/features/card/taskTemplates";
import { cn } from "@/utils/cn";

interface TaskTemplateSelectorProps {
  value: TaskTemplateId;
  disabled?: boolean;
  onChange: (templateId: TaskTemplateId) => void;
}

const templateNumberMap: Record<TaskTemplateId, string> = {
  basic: "01",
  blank: "02",
  bug: "03",
  "test-case": "04",
  "design-review": "05",
  requirements: "06",
  "security-review": "07",
  "release-check": "08",
};

export default function TaskTemplateSelector({
  value,
  disabled = false,
  onChange,
}: TaskTemplateSelectorProps) {
  return (
    <fieldset disabled={disabled}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <legend className="text-[13px] font-bold text-[var(--flow-text)]">작업 템플릿</legend>

          <p className="mt-1 text-[11px] leading-5 text-[var(--flow-text-muted)]">
            작업 목적에 맞는 시작 구조를 선택하세요.
          </p>
        </div>

        <span className="shrink-0 text-[10px] font-medium text-[var(--flow-text-placeholder)]">
          선택 후 자유롭게 수정 가능
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TASK_TEMPLATES.map((template) => {
          const selected = template.id === value;

          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              className={cn(
                "group relative min-w-0 rounded-xl border p-3 text-left",
                "transition-[border-color,background-color,box-shadow]",
                "focus-visible:outline-none",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--flow-primary)]",
                "focus-visible:ring-offset-2",
                selected
                  ? [
                      "border-[var(--flow-primary)]",
                      "bg-[var(--flow-primary-50)]",
                      "shadow-[0_0_0_1px_var(--flow-primary)]",
                    ]
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "hover:border-[var(--flow-primary-200)]",
                      "hover:bg-[var(--flow-gray-50)]",
                    ],
                disabled && "cursor-not-allowed opacity-60",
              )}
              onClick={() => onChange(template.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-[9px] font-bold tracking-[0.08em]",
                    selected ? "text-[var(--flow-primary)]" : "text-[var(--flow-text-placeholder)]",
                  )}
                >
                  {templateNumberMap[template.id]}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    selected
                      ? "border-[var(--flow-primary)] bg-[var(--flow-primary)]"
                      : "border-[var(--flow-gray-300)] bg-white",
                  )}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </div>

              <p className="mt-2 truncate text-[12px] font-bold text-[var(--flow-text)]">
                {template.name}
              </p>

              <p className="mt-1 line-clamp-2 min-h-[32px] text-[10px] leading-4 text-[var(--flow-text-muted)]">
                {template.helperText}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

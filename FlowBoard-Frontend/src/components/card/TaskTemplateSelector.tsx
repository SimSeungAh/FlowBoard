import {
  TASK_TEMPLATES,
  type TaskTemplateId,
} from "@/features/card/taskTemplates";
import { cn } from "@/utils/cn";

interface TaskTemplateSelectorProps {
  value: TaskTemplateId;
  disabled?: boolean;
  onChange: (templateId: TaskTemplateId) => void;
}

export default function TaskTemplateSelector({
  value,
  disabled = false,
  onChange,
}: TaskTemplateSelectorProps) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-[13px] font-semibold text-[var(--flow-text)]">
        작업 템플릿
      </legend>

      <p className="mb-3 text-[12px] leading-5 text-[var(--flow-text-muted)]">
        목적에 맞는 템플릿을 고르면 설명 구조가 자동으로 채워집니다.
        선택 후 자유롭게 수정할 수 있습니다.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TASK_TEMPLATES.map((template) => {
          const selected = template.id === value;

          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              className={cn(
                "min-w-0 rounded-xl border px-3.5 py-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flow-primary)] focus-visible:ring-offset-2",
                selected
                  ? "border-[var(--flow-primary)] bg-[var(--flow-primary-50)]"
                  : "border-[var(--flow-border)] bg-white hover:border-[var(--flow-gray-300)] hover:bg-[var(--flow-gray-50)]",
                disabled && "cursor-not-allowed opacity-60",
              )}
              onClick={() => onChange(template.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-[var(--flow-text)]">
                  {template.name}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full border",
                    selected
                      ? "border-[var(--flow-primary)] bg-[var(--flow-primary)]"
                      : "border-[var(--flow-gray-300)] bg-white",
                  )}
                />
              </div>

              <p className="mt-1.5 text-[11px] leading-[1.55] text-[var(--flow-text-muted)]">
                {template.helperText}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
import { TEST_CASE_TYPES, type TestCaseTypeId } from "@/features/card/taskTemplates";
import { cn } from "@/utils/cn";

interface TestCaseTypeSelectorProps {
  value: TestCaseTypeId;
  disabled?: boolean;
  onChange: (testCaseTypeId: TestCaseTypeId) => void;
}

export default function TestCaseTypeSelector({
  value,
  disabled = false,
  onChange,
}: TestCaseTypeSelectorProps) {
  return (
    <fieldset disabled={disabled}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <legend className="text-[13px] font-bold text-[var(--flow-text)]">테스트 유형</legend>

        <span className="text-[10px] text-[var(--flow-text-placeholder)]">
          한 카드 = 한 테스트 시나리오
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEST_CASE_TYPES.map((testCaseType) => {
          const selected = testCaseType.id === value;

          return (
            <button
              key={testCaseType.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              title={testCaseType.helperText}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3",
                "text-[11px] font-semibold",
                "transition-[border-color,background-color,color]",
                "focus-visible:outline-none",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--flow-primary)]",
                "focus-visible:ring-offset-2",
                selected
                  ? [
                      "border-[var(--flow-primary)]",
                      "bg-[var(--flow-primary-50)]",
                      "text-[var(--flow-primary-700)]",
                    ]
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "text-[var(--flow-text-secondary)]",
                      "hover:border-[var(--flow-primary-200)]",
                      "hover:bg-[var(--flow-gray-50)]",
                    ],
                disabled && "cursor-not-allowed opacity-60",
              )}
              onClick={() => onChange(testCaseType.id)}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  selected ? "bg-[var(--flow-primary)]" : "bg-[var(--flow-gray-300)]",
                )}
              />

              {testCaseType.name}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-5 text-[var(--flow-text-muted)]">
        {TEST_CASE_TYPES.find((testCaseType) => testCaseType.id === value)?.helperText}
      </p>
    </fieldset>
  );
}

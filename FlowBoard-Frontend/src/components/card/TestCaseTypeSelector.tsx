import {
  TEST_CASE_TYPES,
  type TestCaseTypeId,
} from "@/features/card/taskTemplates";
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
      <div className="mb-3">
        <legend className="text-[13px] font-semibold text-[var(--flow-text)]">
          테스트 유형
        </legend>

        <p className="mt-1 text-[12px] leading-5 text-[var(--flow-text-muted)]">
          한 카드에는 하나의 테스트 시나리오를 기록합니다. 유형을 바꾸면 설명
          기본 구조도 함께 바뀝니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TEST_CASE_TYPES.map((testCaseType) => {
          const selected = testCaseType.id === value;

          return (
            <button
              key={testCaseType.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              className={cn(
                "min-w-0 rounded-xl border px-3 py-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flow-primary)] focus-visible:ring-offset-2",
                selected
                  ? "border-[var(--flow-primary)] bg-[var(--flow-primary-50)]"
                  : "border-[var(--flow-border)] bg-white hover:border-[var(--flow-gray-300)] hover:bg-[var(--flow-gray-50)]",
                disabled && "cursor-not-allowed opacity-60",
              )}
              onClick={() => onChange(testCaseType.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold text-[var(--flow-text)]">
                  {testCaseType.name}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full border",
                    selected
                      ? "border-[var(--flow-primary)] bg-[var(--flow-primary)]"
                      : "border-[var(--flow-gray-300)] bg-white",
                  )}
                />
              </div>

              <p className="mt-1.5 line-clamp-2 text-[10px] leading-[1.5] text-[var(--flow-text-muted)]">
                {testCaseType.helperText}
              </p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
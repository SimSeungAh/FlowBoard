import {
  FLOWBOARD_THEMES,
  useThemeStore,
  type FlowBoardTheme,
} from "@/store/themeStore";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ThemePreview({
  primary,
  secondary,
  accent,
}: {
  primary: string;
  secondary: string;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex h-9 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              primary,
          }}
        />

        <span className="h-1.5 w-16 rounded-full bg-slate-200" />
      </div>

      <div className="flex h-[74px] gap-2.5 p-3">
        <div className="w-8 rounded-md bg-slate-100">
          <div
            className="mx-auto mt-2 h-5 w-5 rounded"
            style={{
              backgroundColor:
                `${primary}18`,
            }}
          />
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="h-1.5 w-20 rounded-full bg-slate-200" />

            <div className="mt-2 h-1.5 w-28 rounded-full bg-slate-100" />
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="h-4 w-12 rounded"
              style={{
                backgroundColor:
                  primary,
              }}
            />

            <span
              className="h-4 w-5 rounded"
              style={{
                backgroundColor:
                  secondary,
              }}
            />

            <span
              className="h-4 w-5 rounded"
              style={{
                backgroundColor:
                  accent,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemePicker() {
  const theme =
    useThemeStore(
      (state) =>
        state.theme,
    );

  const setTheme =
    useThemeStore(
      (state) =>
        state.setTheme,
    );

  const handleSelect = (
    nextTheme: FlowBoardTheme,
  ) => {
    setTheme(nextTheme);
  };

  return (
    <section>
      <div>
        <h2 className="text-base font-bold tracking-[-0.015em] text-[var(--flow-text)]">
          사이트 테마
        </h2>

        <p className="mt-1.5 text-sm leading-6 text-[var(--flow-text-muted)]">
          작업하기 편한 색상을
          선택하세요. 보드와 기능은
          그대로 유지되고 주요 버튼,
          선택 상태, 메뉴의 강조 색상이
          변경됩니다.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {FLOWBOARD_THEMES.map(
          (item) => {
            const selected =
              theme ===
              item.id;

            return (
              <button
                key={
                  item.id
                }
                type="button"
                aria-pressed={
                  selected
                }
                onClick={() =>
                  handleSelect(
                    item.id,
                  )
                }
                className={[
                  "group relative rounded-xl border bg-white p-3.5 text-left",
                  "transition-[border-color,box-shadow,transform] duration-150",
                  "hover:-translate-y-px hover:shadow-[var(--flow-shadow-sm)]",
                  selected
                    ? "border-[var(--flow-primary)] shadow-[0_0_0_2px_var(--flow-primary-100)]"
                    : "border-[var(--flow-border)] hover:border-[var(--flow-border-strong)]",
                ].join(
                  " ",
                )}
              >
                <ThemePreview
                  primary={
                    item.primary
                  }
                  secondary={
                    item.secondary
                  }
                  accent={
                    item.accent
                  }
                />

                <div className="mt-3 flex items-center justify-between gap-3 px-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--flow-text)]">
                      {
                        item.name
                      }
                    </p>

                    <div className="mt-1.5 flex items-center gap-1">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/5"
                        style={{
                          backgroundColor:
                            item.primary,
                        }}
                      />

                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/5"
                        style={{
                          backgroundColor:
                            item.secondary,
                        }}
                      />

                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/5"
                        style={{
                          backgroundColor:
                            item.accent,
                        }}
                      />
                    </div>
                  </div>

                  {selected && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--flow-primary)] text-white">
                      <CheckIcon />
                    </span>
                  )}
                </div>
              </button>
            );
          },
        )}
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg bg-[var(--flow-gray-50)] px-4 py-3">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--flow-text-muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M12 11v5" />

          <path d="M12 8h.01" />
        </svg>

        <p className="text-xs leading-5 text-[var(--flow-text-muted)]">
          카드에 사용하는 태그
          색상은 사이트 테마와 별도로
          유지됩니다. Bug, Frontend,
          Backend 등 작업 분류 색상을
          자유롭게 사용할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
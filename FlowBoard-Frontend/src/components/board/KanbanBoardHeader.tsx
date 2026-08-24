import type { BoardRole } from "@/api/board";
import Button from "@/components/ui/Button";

interface KanbanBoardHeaderProps {
  boardTitle: string;
  boardDescription: string | null;
  ownerNickname: string;
  role: BoardRole;
  columnCount: number;
  cardCount: number;
  moving: boolean;
  canManageColumns: boolean;
  readOnly: boolean;
  onOpenSearch: () => void;
  onOpenWorkflowSettings: () => void;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />

      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

const getRoleLabel = (role: BoardRole) => {
  switch (role) {
    case "OWNER":
      return "OWNER";

    case "MEMBER":
      return "MEMBER";

    case "VIEWER":
      return "VIEWER";
  }
};

export default function KanbanBoardHeader({
  boardTitle,
  boardDescription,
  ownerNickname,
  role,
  columnCount,
  cardCount,
  moving,
  canManageColumns,
  readOnly,
  onOpenSearch,
  onOpenWorkflowSettings,
}: KanbanBoardHeaderProps) {
  return (
    <div className="shrink-0 border-b border-[var(--flow-border)] bg-white px-5 py-3 xl:px-6">
      <div className="flex min-h-14 items-center justify-between gap-6">
        <div className="min-w-0 flex-1" title={boardDescription || undefined}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="max-w-[620px] truncate text-[21px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
              {boardTitle}
            </h1>

            <span className="rounded-full border border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] px-2 py-0.5 text-[9px] font-bold tracking-[0.04em] text-[var(--flow-primary-700)]">
              {getRoleLabel(role)}
            </span>

            {readOnly && (
              <span className="rounded-full bg-[var(--flow-warning-soft)] px-2 py-0.5 text-[9px] font-bold text-[var(--flow-warning-dark)]">
                읽기 전용
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--flow-text-muted)]">
            <span>
              소유자{" "}
              <strong className="font-semibold text-[var(--flow-text-secondary)]">
                {ownerNickname}
              </strong>
            </span>

            <span className="h-3 w-px bg-[var(--flow-border-strong)]" />

            <span>
              컬럼 <strong className="font-bold text-[var(--flow-text)]">{columnCount}</strong>
            </span>

            <span className="h-3 w-px bg-[var(--flow-border-strong)]" />

            <span>
              작업 <strong className="font-bold text-[var(--flow-text)]">{cardCount}</strong>
            </span>

            {moving && (
              <>
                <span className="h-3 w-px bg-[var(--flow-border-strong)]" />

                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--flow-primary-700)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                  이동 저장 중
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<SearchIcon />}
            onClick={onOpenSearch}
          >
            작업 검색
          </Button>

          {canManageColumns && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<SettingsIcon />}
              onClick={onOpenWorkflowSettings}
            >
              워크플로우 설정
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

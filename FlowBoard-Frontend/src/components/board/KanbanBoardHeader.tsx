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
    <div className="shrink-0 border-b border-[var(--flow-border)] bg-white px-6 py-5 xl:px-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
              칸반 보드
            </h1>

            <span className="rounded-full border border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] text-[var(--flow-primary-700)]">
              {getRoleLabel(role)}
            </span>

            {readOnly && (
              <span className="rounded-full bg-[var(--flow-warning-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--flow-warning-dark)]">
                읽기 전용
              </span>
            )}
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="max-w-[360px] truncate text-[13px] font-semibold text-[var(--flow-text-secondary)]">
              {boardTitle}
            </span>

            <span className="h-3.5 w-px bg-[var(--flow-border-strong)]" />

            <span className="text-[12px] text-[var(--flow-text-muted)]">
              소유자 <strong className="font-semibold text-[var(--flow-text-secondary)]">{ownerNickname}</strong>
            </span>
          </div>

          {boardDescription && (
            <p className="mt-2 max-w-[760px] truncate text-[12px] leading-5 text-[var(--flow-text-muted)]">
              {boardDescription}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<SearchIcon />}
            onClick={onOpenSearch}
          >
            작업 검색
          </Button>

          {canManageColumns && (
            <Button
              type="button"
              variant="outline"
              size="md"
              leftIcon={<SettingsIcon />}
              onClick={onOpenWorkflowSettings}
            >
              워크플로우 설정
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 flex min-h-9 flex-wrap items-center gap-2.5">
        <div className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-3 text-[11px] text-[var(--flow-text-muted)]">
          <span>컬럼</span>
          <strong className="font-bold text-[var(--flow-text)]">{columnCount}</strong>
        </div>

        <div className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-3 text-[11px] text-[var(--flow-text-muted)]">
          <span>전체 작업</span>
          <strong className="font-bold text-[var(--flow-text)]">{cardCount}</strong>
        </div>

        {moving && (
          <div className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] px-3 text-[11px] font-semibold text-[var(--flow-primary-700)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flow-primary)]" />
            이동 저장 중
          </div>
        )}
      </div>
    </div>
  );
}

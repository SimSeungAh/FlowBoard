import type { CardTaskType } from "@/api/card";
import type { CardDueDateFilter } from "@/api/cardSearch";
import type { BoardMemberResponse } from "@/api/cardAssignee";
import type { TagResponse } from "@/api/tag";

interface KanbanFilterBarProps {
  taskType: CardTaskType | "";
  assigneeId: string;
  tagId: string;
  dueDateFilter: CardDueDateFilter | "";

  members: BoardMemberResponse[];
  tags: TagResponse[];

  totalCount: number;
  filteredCount: number;

  active: boolean;
  loading: boolean;
  error: boolean;

  onTaskTypeChange: (value: CardTaskType | "") => void;
  onAssigneeIdChange: (value: string) => void;
  onTagIdChange: (value: string) => void;
  onDueDateFilterChange: (value: CardDueDateFilter | "") => void;

  onReset: () => void;
}

const selectClassName = [
  "h-8 shrink-0 rounded-lg",
  "border border-[var(--flow-border-strong)]",
  "bg-white px-2.5 pr-7",
  "text-[10px] font-semibold",
  "text-[var(--flow-text-secondary)]",
  "outline-none",
  "transition-[border-color,box-shadow]",
  "hover:border-[var(--flow-gray-400)]",
  "focus:border-[var(--flow-primary)]",
  "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
].join(" ");

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

export default function KanbanFilterBar({
  taskType,
  assigneeId,
  tagId,
  dueDateFilter,

  members,
  tags,

  totalCount,
  filteredCount,

  active,
  loading,
  error,

  onTaskTypeChange,
  onAssigneeIdChange,
  onTagIdChange,
  onDueDateFilterChange,

  onReset,
}: KanbanFilterBarProps) {
  return (
    <div className="shrink-0 border-b border-[var(--flow-border)] bg-white px-5 py-2 xl:px-6">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain">
        <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--flow-gray-100)] px-2.5 text-[10px] font-bold text-[var(--flow-text-secondary)]">
          <FilterIcon />
          필터
        </div>

        <select
          aria-label="작업 유형 필터"
          value={taskType}
          className={selectClassName}
          onChange={(event) => onTaskTypeChange(event.target.value as CardTaskType | "")}
        >
          <option value="">전체 작업</option>

          <option value="GENERAL">일반 작업</option>

          <option value="BUG">버그</option>

          <option value="REQUIREMENT">기획 / 요구사항</option>

          <option value="DESIGN_REVIEW">디자인 리뷰</option>

          <option value="TEST_CASE">테스트 케이스</option>

          <option value="SECURITY_REVIEW">보안 점검</option>

          <option value="RELEASE_CHECK">릴리즈 체크</option>
        </select>

        <select
          aria-label="담당자 필터"
          value={assigneeId}
          className={selectClassName}
          onChange={(event) => onAssigneeIdChange(event.target.value)}
        >
          <option value="">담당자: 전체</option>

          {members.map((member) => (
            <option key={member.id} value={member.userId}>
              {member.nickname} · {member.role}
            </option>
          ))}
        </select>

        <select
          aria-label="태그 필터"
          value={tagId}
          className={selectClassName}
          onChange={(event) => onTagIdChange(event.target.value)}
        >
          <option value="">태그: 전체</option>

          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

        <select
          aria-label="마감일 필터"
          value={dueDateFilter}
          className={selectClassName}
          onChange={(event) => onDueDateFilterChange(event.target.value as CardDueDateFilter | "")}
        >
          <option value="">마감일: 전체</option>

          <option value="OVERDUE">마감 지남</option>

          <option value="TODAY">오늘 마감</option>

          <option value="UPCOMING">마감 예정</option>

          <option value="NO_DUE_DATE">마감일 없음</option>
        </select>

        {active && (
          <button
            type="button"
            className="h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-bold text-[var(--flow-primary)] transition-colors hover:bg-[var(--flow-primary-50)]"
            onClick={onReset}
          >
            초기화
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[var(--flow-text-muted)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--flow-primary)]" />
              적용 중
            </span>
          )}

          {error ? (
            <span className="rounded-md bg-[var(--flow-danger-soft)] px-2 py-1 text-[9px] font-semibold text-[var(--flow-danger)]">
              필터 조회 실패
            </span>
          ) : active ? (
            <span
              className="rounded-md bg-[var(--flow-primary-50)] px-2 py-1 text-[9px] font-bold text-[var(--flow-primary-700)]"
              title="필터 상태에서 바꾼 순서와 컬럼 이동은 전체 보드에 반영됩니다."
            >
              {filteredCount} / {totalCount}개
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-[var(--flow-text-placeholder)]">
              전체 {totalCount}개
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";

import { getBoardDetail } from "@/api/board";
import { getCardsByColumn, type CardResponse } from "@/api/card";
import CardDetailModal from "@/components/card/CardDetailModal";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

type ScheduleFilter = "ALL" | "OVERDUE" | "DUE_SOON" | "NO_SCHEDULE";

type RequirementItem = CardResponse & {
  columnTitle: string;
  columnPosition: number;
  completionColumn: boolean;
};

const DUE_SOON_DAYS = 7;

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const isOverdue = (item: RequirementItem) => {
  if (item.completionColumn || !item.dueDate) {
    return false;
  }

  const dueDate = new Date(item.dueDate);

  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
};

const isDueSoon = (item: RequirementItem) => {
  if (item.completionColumn || !item.dueDate || isOverdue(item)) {
    return false;
  }

  const dueDate = new Date(item.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const limit = Date.now() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

  return dueDate.getTime() <= limit;
};

const getScheduleBadge = (item: RequirementItem) => {
  if (item.completionColumn) {
    return {
      label: "완료",
      className:
        "border-emerald-100 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
    };
  }

  if (isOverdue(item)) {
    return {
      label: "마감 지남",
      className: "border-red-100 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
    };
  }

  if (isDueSoon(item)) {
    return {
      label: "7일 내 마감",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (!item.startDate && !item.dueDate) {
    return {
      label: "일정 미정",
      className:
        "border-[var(--flow-border)] bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
    };
  }

  return {
    label: "계획됨",
    className:
      "border-[var(--flow-primary-100)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  };
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: number;
  helper: string;
  tone?: "default" | "primary" | "success" | "danger" | "warning";
}) {
  const toneClassName = {
    default: "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
    primary: "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
    success: "bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
    danger: "bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-xl border border-[var(--flow-border)] bg-white p-4 shadow-[var(--flow-shadow-xs)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-[var(--flow-text-muted)]">{label}</p>
          <strong className="mt-1 block text-[24px] font-bold tracking-[-0.04em] text-[var(--flow-text)]">
            {value}
          </strong>
        </div>
        <span className={["rounded-full px-2 py-1 text-[9px] font-bold", toneClassName].join(" ")}>REQ</span>
      </div>
      <p className="mt-2 text-[10px] leading-5 text-[var(--flow-text-placeholder)]">{helper}</p>
    </div>
  );
}

export default function RequirementsPage() {
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const boardId = Number(boardIdParam);
  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const [keyword, setKeyword] = useState("");
  const [columnFilter, setColumnFilter] = useState("ALL");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("ALL");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: isValidBoardId,
    staleTime: 30_000,
  });

  const board = boardQuery.data;

  const columnSignature = useMemo(
    () => board?.columns.map((column) => `${column.id}:${column.position}`).join("|") ?? "",
    [board?.columns],
  );

  const requirementsQuery = useQuery({
    queryKey: ["board", boardId, "requirements", columnSignature],
    queryFn: async (): Promise<RequirementItem[]> => {
      if (!board) {
        return [];
      }

      const results = await Promise.all(
        board.columns.map(async (column) => {
          const cards = await getCardsByColumn(boardId, column.id);

          return cards
            .filter((card) => card.taskType === "REQUIREMENT")
            .map((card) => ({
              ...card,
              columnTitle: column.title,
              columnPosition: column.position,
              completionColumn: column.completionColumn,
            }));
        }),
      );

      return results
        .flat()
        .sort((first, second) => {
          if (first.completionColumn !== second.completionColumn) {
            return first.completionColumn ? 1 : -1;
          }

          if (first.columnPosition !== second.columnPosition) {
            return first.columnPosition - second.columnPosition;
          }

          const firstDue = first.dueDate ? new Date(first.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const secondDue = second.dueDate ? new Date(second.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

          if (firstDue !== secondDue) {
            return firstDue - secondDue;
          }

          return second.updatedAt.localeCompare(first.updatedAt);
        });
    },
    enabled: isValidBoardId && Boolean(board),
    staleTime: 10_000,
  });

  const requirements = requirementsQuery.data ?? [];

  const summary = useMemo(() => {
    const completed = requirements.filter((item) => item.completionColumn).length;
    const overdue = requirements.filter(isOverdue).length;
    const dueSoon = requirements.filter(isDueSoon).length;
    const unscheduled = requirements.filter((item) => !item.startDate && !item.dueDate).length;

    return {
      total: requirements.length,
      active: requirements.length - completed,
      completed,
      overdue,
      dueSoon,
      unscheduled,
    };
  }, [requirements]);

  const filteredRequirements = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);

    return requirements.filter((item) => {
      if (
        normalizedKeyword &&
        !normalizeText(item.title).includes(normalizedKeyword) &&
        !normalizeText(item.description).includes(normalizedKeyword)
      ) {
        return false;
      }

      if (columnFilter !== "ALL" && String(item.columnId) !== columnFilter) {
        return false;
      }

      switch (scheduleFilter) {
        case "OVERDUE":
          return isOverdue(item);
        case "DUE_SOON":
          return isDueSoon(item);
        case "NO_SCHEDULE":
          return !item.startDate && !item.dueDate;
        case "ALL":
          return true;
      }
    });
  }, [columnFilter, keyword, requirements, scheduleFilter]);

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const resetFilters = () => {
    setKeyword("");
    setColumnFilter("ALL");
    setScheduleFilter("ALL");
  };

  const handleCardChanged = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "requirements"] }),
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "cards"] }),
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "schedule"] }),
    ]);
  };

  if (!isValidBoardId) {
    return (
      <div className="p-8">
        <EmptyState title="보드를 찾을 수 없습니다." description="보드 주소를 다시 확인해주세요." />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-[var(--flow-gray-50)]">
        <section className="border-b border-[var(--flow-border)] bg-white px-6 py-6 xl:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">요구사항</h1>
                <span className="rounded-full border border-[var(--flow-primary-100)] bg-[var(--flow-primary-50)] px-2 py-1 text-[9px] font-bold text-[var(--flow-primary-700)]">
                  REQUIREMENT
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-[12px] leading-6 text-[var(--flow-text-muted)]">
                기획·요구사항 카드만 한곳에서 모아 진행 상태와 일정을 확인합니다. 요구사항은 기존 칸반 카드와 같은 데이터를 사용하므로 변경 내용이 즉시 칸반과 일정에도 반영됩니다.
              </p>
            </div>

            {canEdit && (
              <Button onClick={() => navigate(`/boards/${boardId}/kanban`)}>칸반에서 요구사항 추가</Button>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="전체 요구사항" value={summary.total} helper="REQUIREMENT 카드 전체" tone="primary" />
            <SummaryCard label="진행 중" value={summary.active} helper="완료 컬럼에 도달하지 않은 항목" />
            <SummaryCard label="완료" value={summary.completed} helper="완료 컬럼에 있는 요구사항" tone="success" />
            <SummaryCard label="마감 지남" value={summary.overdue} helper="미완료 상태에서 마감일 초과" tone="danger" />
            <SummaryCard label="일정 미정" value={summary.unscheduled} helper={`7일 내 마감 ${summary.dueSoon}개`} tone="warning" />
          </div>
        </section>

        <section className="border-b border-[var(--flow-border)] bg-white px-6 py-4 xl:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1 xl:max-w-[440px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--flow-text-placeholder)]">
                <SearchIcon />
              </span>
              <input
                value={keyword}
                placeholder="요구사항 제목 또는 설명 검색"
                className="h-10 w-full rounded-lg border border-[var(--flow-border-strong)] bg-white pr-3 pl-10 text-[12px] text-[var(--flow-text)] outline-none placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                onChange={(event) => setKeyword(event.currentTarget.value)}
              />
            </div>

            <select
              value={columnFilter}
              aria-label="요구사항 현재 컬럼 필터"
              className="h-10 rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] font-semibold text-[var(--flow-text-secondary)] outline-none focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
              onChange={(event) => setColumnFilter(event.currentTarget.value)}
            >
              <option value="ALL">모든 상태</option>
              {board?.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}{column.completionColumn ? " · 완료" : ""}
                </option>
              ))}
            </select>

            <select
              value={scheduleFilter}
              aria-label="요구사항 일정 필터"
              className="h-10 rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] font-semibold text-[var(--flow-text-secondary)] outline-none focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
              onChange={(event) => setScheduleFilter(event.currentTarget.value as ScheduleFilter)}
            >
              <option value="ALL">모든 일정</option>
              <option value="OVERDUE">마감 지남</option>
              <option value="DUE_SOON">7일 내 마감</option>
              <option value="NO_SCHEDULE">일정 미정</option>
            </select>

            <Button variant="ghost" onClick={resetFilters}>필터 초기화</Button>
          </div>
        </section>

        <main className="px-6 py-6 xl:px-8">
          {boardQuery.isLoading || requirementsQuery.isLoading ? (
            <div className="overflow-hidden rounded-xl border border-[var(--flow-border)] bg-white">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex gap-4 border-b border-[var(--flow-border)] p-4 last:border-b-0">
                  <Skeleton className="h-10 w-14" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-40" />
                </div>
              ))}
            </div>
          ) : boardQuery.isError || requirementsQuery.isError ? (
            <EmptyState
              title="요구사항을 불러오지 못했습니다."
              description="잠시 후 다시 시도해주세요."
              actionLabel="다시 불러오기"
              onAction={() => void requirementsQuery.refetch()}
            />
          ) : filteredRequirements.length === 0 ? (
            <EmptyState
              title={requirements.length === 0 ? "등록된 요구사항이 없습니다." : "조건에 맞는 요구사항이 없습니다."}
              description={
                requirements.length === 0
                  ? "칸반에서 ‘기획 / 요구사항’ 작업 형식으로 카드를 만들면 이곳에 자동으로 모입니다."
                  : "검색어나 필터 조건을 바꿔보세요."
              }
              actionLabel={requirements.length === 0 && canEdit ? "칸반으로 이동" : "필터 초기화"}
              onAction={() => {
                if (requirements.length === 0 && canEdit) {
                  navigate(`/boards/${boardId}/kanban`);
                  return;
                }
                resetFilters();
              }}
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--flow-border)] bg-[var(--flow-gray-50)]">
                        <th className="w-[76px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">ID</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">요구사항</th>
                        <th className="w-[150px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">현재 상태</th>
                        <th className="w-[120px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">일정 상태</th>
                        <th className="w-[130px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">시작일</th>
                        <th className="w-[130px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">마감일</th>
                        <th className="w-[130px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">최근 수정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequirements.map((item) => {
                        const scheduleBadge = getScheduleBadge(item);

                        return (
                          <tr
                            key={item.id}
                            className="cursor-pointer border-b border-[var(--flow-border)] transition-colors last:border-b-0 hover:bg-[var(--flow-primary-50)]/40"
                            onClick={() => setSelectedCardId(item.id)}
                          >
                            <td className="px-4 py-3 text-[11px] font-semibold text-[var(--flow-text-placeholder)]">#{item.id}</td>
                            <td className="px-4 py-3">
                              <p className="max-w-[520px] truncate text-[12px] font-bold text-[var(--flow-text)]">{item.title}</p>
                              <p className="mt-1 max-w-[560px] truncate text-[10px] text-[var(--flow-text-muted)]">
                                {item.description?.trim() || "설명이 없습니다."}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "inline-flex rounded-full border px-2 py-1 text-[9px] font-bold",
                                  item.completionColumn
                                    ? "border-emerald-100 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]"
                                    : "border-[var(--flow-primary-100)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
                                ].join(" ")}
                              >
                                {item.columnTitle}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={["inline-flex rounded-full border px-2 py-1 text-[9px] font-bold", scheduleBadge.className].join(" ")}>
                                {scheduleBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[var(--flow-text-secondary)]">{formatDate(item.startDate)}</td>
                            <td className="px-4 py-3 text-[11px] text-[var(--flow-text-secondary)]">{formatDate(item.dueDate)}</td>
                            <td className="px-4 py-3 text-[10px] text-[var(--flow-text-muted)]">{formatUpdatedAt(item.updatedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-[11px] text-[var(--flow-text-muted)]">
                  전체 요구사항 <strong className="font-bold text-[var(--flow-text)]">{requirements.length}</strong>개 중 <strong className="font-bold text-[var(--flow-text)]">{filteredRequirements.length}</strong>개 표시
                </p>
                <p className="text-[10px] text-[var(--flow-text-placeholder)]">카드를 클릭하면 상세 패널이 열립니다.</p>
              </div>
            </>
          )}
        </main>
      </div>

      <CardDetailModal
        open={selectedCardId !== null}
        cardId={selectedCardId}
        canEdit={Boolean(canEdit)}
        onClose={() => setSelectedCardId(null)}
        onChanged={handleCardChanged}
      />
    </>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { getBoardDetail } from "@/api/board";
import { getCardsByColumn, type CardResponse } from "@/api/card";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

const DAY_MS = 86_400_000;
const TIMELINE_DAYS = 30;
const LEFT_PANEL_WIDTH = 320;
const DAY_WIDTH = 46;
const BAR_INSET = 6;

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, amount: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

const differenceInDays = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthDay = (value: Date) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(value);

const formatWeekday = (value: Date) =>
  new Intl.DateTimeFormat("ko-KR", {
    weekday: "short",
  }).format(value);

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "날짜 확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDueLabel = (dueDate: string) => {
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());
  const diffDays = differenceInDays(today, due);

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}일 지연`;
  }

  if (diffDays === 0) {
    return "오늘 마감";
  }

  return `D-${diffDays}`;
};

interface TimelineCard extends CardResponse {
  columnTitle: string;
  columnPosition: number;
  completionColumn: boolean;
}

function ArrowLeftIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CalendarIcon() {
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
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function StatBox({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-[var(--flow-radius-md)] border border-[var(--flow-border)] bg-white px-4 py-3.5 shadow-[var(--flow-shadow-xs)]">
      <p className="text-[10px] font-semibold text-[var(--flow-text-muted)]">{label}</p>
      <p className="mt-2 text-[22px] leading-none font-bold tracking-[-0.03em] text-[var(--flow-text)]">
        {value}
      </p>
      <p className="mt-2 text-[9px] leading-4 text-[var(--flow-text-placeholder)]">{helper}</p>
    </div>
  );
}

export default function SchedulePage() {
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const boardId = Number(boardIdParam);
  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const today = useMemo(() => startOfDay(new Date()), []);
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -7));

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: isValidBoardId,
    staleTime: 30_000,
  });

  const board = boardQuery.data;
  const columnIds = board?.columns.map((column) => column.id) ?? [];

  const cardsQuery = useQuery({
    queryKey: ["board", boardId, "schedule", "cards", columnIds],
    queryFn: async () => {
      if (!board) {
        return [] as TimelineCard[];
      }

      const entries = await Promise.all(
        board.columns.map(async (column) => {
          const cards = await getCardsByColumn(boardId, column.id);

          return cards.map((card) => ({
            ...card,
            columnTitle: column.title,
            columnPosition: column.position,
            completionColumn: column.completionColumn,
          }));
        }),
      );

      return entries.flat().sort((a, b) => {
        if (a.columnPosition !== b.columnPosition) {
          return a.columnPosition - b.columnPosition;
        }

        return a.rank.localeCompare(b.rank);
      });
    },
    enabled: isValidBoardId && Boolean(board),
  });

  const allCards = cardsQuery.data ?? [];

  const days = useMemo(
    () => Array.from({ length: TIMELINE_DAYS }, (_, index) => addDays(rangeStart, index)),
    [rangeStart],
  );

  const rangeEnd = days.at(-1) ?? rangeStart;
  const rangeStartTime = startOfDay(rangeStart).getTime();
  const rangeEndTime = startOfDay(rangeEnd).getTime();
  const todayKey = toDateKey(today);

  const scheduledCards = useMemo(
    () =>
      allCards.filter((card) => {
        const start = card.startDate ? startOfDay(new Date(card.startDate)) : null;
        const due = card.dueDate ? startOfDay(new Date(card.dueDate)) : null;

        if (start && due) {
          return start.getTime() <= rangeEndTime && due.getTime() >= rangeStartTime;
        }

        const point = due ?? start;

        if (!point) {
          return false;
        }

        return point.getTime() >= rangeStartTime && point.getTime() <= rangeEndTime;
      }),
    [allCards, rangeEndTime, rangeStartTime],
  );

  const scheduleConfiguredCount = useMemo(
    () => allCards.filter((card) => Boolean(card.startDate || card.dueDate)).length,
    [allCards],
  );

  const ganttCount = useMemo(
    () => allCards.filter((card) => Boolean(card.startDate && card.dueDate)).length,
    [allCards],
  );

  const dueOnlyCount = useMemo(
    () => allCards.filter((card) => Boolean(!card.startDate && card.dueDate)).length,
    [allCards],
  );

  const unscheduledCount = useMemo(
    () => allCards.filter((card) => !card.startDate && !card.dueDate).length,
    [allCards],
  );

  const overdueCount = useMemo(
    () =>
      allCards.filter((card) => {
        if (!card.dueDate || card.completionColumn) {
          return false;
        }

        const due = startOfDay(new Date(card.dueDate));
        return due.getTime() < today.getTime();
      }).length,
    [allCards, today],
  );

  const loading = boardQuery.isLoading || cardsQuery.isLoading;

  if (!isValidBoardId) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl">
          <h1 className="text-lg font-bold text-[var(--flow-text)]">보드를 찾을 수 없습니다.</h1>
          <p className="mt-2 text-[12px] text-[var(--flow-text-muted)]">
            올바른 보드 주소인지 확인해주세요.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 xl:p-8">
        <div className="mx-auto max-w-[1600px]">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="mt-3 h-4 w-[520px]" />
          <div className="mt-6 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[108px] rounded-[var(--flow-radius-md)]" />
            ))}
          </div>
          <Skeleton className="mt-4 h-[560px] rounded-[var(--flow-radius-lg)]" />
        </div>
      </div>
    );
  }

  if (boardQuery.isError || cardsQuery.isError || !board) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl">
          <h1 className="text-lg font-bold text-[var(--flow-text)]">일정을 불러오지 못했습니다.</h1>
          <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
            보드 접근 권한과 백엔드 연결 상태를 확인한 뒤 다시 시도해주세요.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--flow-background)] px-5 py-5 xl:px-7 xl:py-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
              <CalendarIcon />
            </span>

            <div>
              <h1 className="text-[24px] font-bold tracking-[-0.035em] text-[var(--flow-text)]">
                일정
              </h1>
              <p className="mt-1 text-[10px] text-[var(--flow-text-muted)]">
                시작일과 마감일이 있으면 기간 막대, 마감일만 있으면 마일스톤으로 표시합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRangeStart((current) => addDays(current, -7))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[10px] font-bold text-[var(--flow-text-secondary)] shadow-[var(--flow-shadow-xs)] transition-colors hover:bg-[var(--flow-gray-50)]"
            >
              <ArrowLeftIcon />
              이전 7일
            </button>

            <button
              type="button"
              onClick={() => setRangeStart(addDays(today, -7))}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] px-3.5 text-[10px] font-bold text-[var(--flow-primary-700)] transition-colors hover:bg-[var(--flow-primary-100)]"
            >
              오늘
            </button>

            <button
              type="button"
              onClick={() => setRangeStart((current) => addDays(current, 7))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[10px] font-bold text-[var(--flow-text-secondary)] shadow-[var(--flow-shadow-xs)] transition-colors hover:bg-[var(--flow-gray-50)]"
            >
              다음 7일
              <ArrowRightIcon />
            </button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-4 gap-3">
          <StatBox
            label="일정 설정 작업"
            value={scheduleConfiguredCount}
            helper="시작일 또는 마감일이 입력된 카드"
          />
          <StatBox
            label="기간 작업"
            value={ganttCount}
            helper="시작일과 마감일이 모두 있어 막대로 표시"
          />
          <StatBox
            label="마감 마일스톤"
            value={dueOnlyCount}
            helper="시작일 없이 마감일만 설정된 카드"
          />
          <StatBox
            label="마감 지연"
            value={overdueCount}
            helper="완료 단계가 아닌 카드 중 마감일이 지난 작업"
          />
        </section>

        <section className="mt-4 rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
          <div className="flex items-start justify-between gap-5 border-b border-[var(--flow-border)] px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[14px] font-bold text-[var(--flow-text)]">30일 일정 · Gantt</h2>

                <span className="rounded-full bg-[var(--flow-primary-50)] px-2 py-1 text-[8px] font-bold text-[var(--flow-primary-700)]">
                  현재 범위 {scheduledCards.length}개
                </span>
              </div>

              <p className="mt-1 text-[10px] leading-5 text-[var(--flow-text-muted)]">
                기간이 정해진 작업은 막대로, 기존 더미처럼 시작일이 없는 작업은 ◆ 마감 마일스톤으로
                함께 표시합니다.
              </p>
            </div>

            <div className="shrink-0 rounded-lg bg-[var(--flow-gray-50)] px-3 py-2 text-right">
              <p className="text-[9px] font-semibold text-[var(--flow-text-placeholder)]">
                현재 표시 범위
              </p>
              <p className="mt-1 text-[10px] font-bold text-[var(--flow-text-secondary)]">
                {formatMonthDay(rangeStart)} ~ {formatMonthDay(rangeEnd)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div style={{ minWidth: LEFT_PANEL_WIDTH + TIMELINE_DAYS * DAY_WIDTH }}>
              <div className="sticky top-0 z-20 flex border-b border-[var(--flow-border)] bg-white">
                <div
                  className="sticky left-0 z-30 flex shrink-0 items-center border-r border-[var(--flow-border)] bg-white px-4"
                  style={{ width: LEFT_PANEL_WIDTH }}
                >
                  <div>
                    <p className="text-[10px] font-bold text-[var(--flow-text-secondary)]">작업</p>
                    <p className="mt-1 text-[9px] text-[var(--flow-text-placeholder)]">
                      기간 {ganttCount} · 마감만 {dueOnlyCount} · 일정 미정 {unscheduledCount}
                    </p>
                  </div>
                </div>

                <div className="flex">
                  {days.map((day) => {
                    const key = toDateKey(day);
                    const isToday = key === todayKey;
                    const weekday = day.getDay();
                    const weekend = weekday === 0 || weekday === 6;

                    return (
                      <div
                        key={key}
                        className={[
                          "flex h-[58px] shrink-0 flex-col items-center justify-center border-r border-[var(--flow-border)]",
                          isToday
                            ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]"
                            : weekend
                              ? "bg-[var(--flow-gray-50)] text-[var(--flow-text-muted)]"
                              : "bg-white text-[var(--flow-text-secondary)]",
                        ].join(" ")}
                        style={{ width: DAY_WIDTH }}
                      >
                        <span className="text-[8px] font-semibold">{formatWeekday(day)}</span>
                        <span className="mt-1 text-[10px] font-bold">{formatMonthDay(day)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {scheduledCards.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
                  <div>
                    <p className="text-[12px] font-bold text-[var(--flow-text-secondary)]">
                      이 기간에 표시할 일정이 없습니다.
                    </p>
                    <p className="mt-2 text-[10px] text-[var(--flow-text-placeholder)]">
                      이전/다음 7일로 범위를 이동하거나 카드에서 시작일·마감일을 지정해보세요.
                    </p>
                  </div>
                </div>
              ) : (
                scheduledCards.map((card) => {
                  const start = card.startDate ? startOfDay(new Date(card.startDate)) : null;
                  const due = card.dueDate ? startOfDay(new Date(card.dueDate)) : null;
                  const hasRange = Boolean(start && due);
                  const isCompleted = card.completionColumn;
                  const isOverdue = Boolean(due && due.getTime() < today.getTime() && !isCompleted);
                  const isTodayDue = Boolean(due && toDateKey(due) === todayKey);

                  let barLeft = 0;
                  let barWidth = 0;

                  if (start && due) {
                    const visibleStart = start.getTime() < rangeStartTime ? rangeStart : start;
                    const visibleEnd = due.getTime() > rangeEndTime ? rangeEnd : due;
                    const startIndex = Math.max(0, differenceInDays(rangeStart, visibleStart));
                    const endIndex = Math.min(
                      TIMELINE_DAYS - 1,
                      differenceInDays(rangeStart, visibleEnd),
                    );

                    barLeft = startIndex * DAY_WIDTH + BAR_INSET;
                    barWidth = Math.max(
                      DAY_WIDTH - BAR_INSET * 2,
                      (endIndex - startIndex + 1) * DAY_WIDTH - BAR_INSET * 2,
                    );
                  }

                  const milestoneDate = due ?? start;
                  const milestoneIndex = milestoneDate
                    ? days.findIndex((day) => toDateKey(day) === toDateKey(milestoneDate))
                    : -1;

                  const scheduleLabel = hasRange
                    ? `${formatMonthDay(start!)} ~ ${formatMonthDay(due!)}`
                    : due
                      ? getDueLabel(card.dueDate!)
                      : start
                        ? `${formatMonthDay(start)} 시작`
                        : "일정 미정";

                  return (
                    <div
                      key={card.id}
                      className="flex min-h-[62px] border-b border-[var(--flow-border)] last:border-b-0"
                    >
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center gap-3 border-r border-[var(--flow-border)] bg-white px-4"
                        style={{ width: LEFT_PANEL_WIDTH }}
                      >
                        <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--flow-primary-50)] px-2 text-[9px] font-bold text-[var(--flow-primary)]">
                          #{card.id}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p
                              className="truncate text-[10px] font-bold text-[var(--flow-text)]"
                              title={card.title}
                            >
                              {card.title}
                            </p>

                            {isCompleted && (
                              <span className="shrink-0 rounded-full bg-[var(--flow-success-soft)] px-1.5 py-0.5 text-[7px] font-bold text-[var(--flow-success-dark)]">
                                완료
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <span className="truncate text-[8px] font-semibold text-[var(--flow-text-muted)]">
                              {card.columnTitle}
                            </span>
                            <span className="text-[var(--flow-gray-300)]">·</span>
                            <span
                              className={[
                                "shrink-0 text-[8px] font-bold",
                                isCompleted
                                  ? "text-[var(--flow-success-dark)]"
                                  : isOverdue
                                    ? "text-[var(--flow-danger)]"
                                    : isTodayDue
                                      ? "text-[var(--flow-warning-dark)]"
                                      : "text-[var(--flow-text-placeholder)]",
                              ].join(" ")}
                            >
                              {scheduleLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="relative flex" style={{ width: TIMELINE_DAYS * DAY_WIDTH }}>
                        {days.map((day) => {
                          const key = toDateKey(day);
                          const weekday = day.getDay();
                          const weekend = weekday === 0 || weekday === 6;
                          const dayIsToday = key === todayKey;

                          return (
                            <div
                              key={key}
                              className={[
                                "h-[62px] shrink-0 border-r border-[var(--flow-border)]",
                                dayIsToday
                                  ? "bg-[var(--flow-primary-50)]/55"
                                  : weekend
                                    ? "bg-[var(--flow-gray-50)]/70"
                                    : "bg-white",
                              ].join(" ")}
                              style={{ width: DAY_WIDTH }}
                            />
                          );
                        })}

                        {hasRange && start && due && (
                          <div
                            className={[
                              "absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 shadow-[var(--flow-shadow-xs)]",
                              isCompleted
                                ? "bg-[var(--flow-success)] text-white"
                                : isOverdue
                                  ? "bg-[var(--flow-danger)] text-white"
                                  : "bg-[var(--flow-primary)] text-white",
                            ].join(" ")}
                            style={{ left: barLeft, width: barWidth }}
                            title={`${card.title} · ${formatDateTime(card.startDate!)} ~ ${formatDateTime(card.dueDate!)}`}
                          >
                            {barWidth >= 88 && (
                              <span className="truncate text-[8px] font-bold">
                                {differenceInDays(start, due) + 1}일
                              </span>
                            )}
                          </div>
                        )}

                        {!hasRange && milestoneIndex >= 0 && milestoneDate && (
                          <div
                            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                            style={{ left: milestoneIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
                            title={
                              due
                                ? `${card.title} · 마감 ${formatDateTime(card.dueDate!)}`
                                : `${card.title} · 시작 ${formatDateTime(card.startDate!)}`
                            }
                          >
                            {due ? (
                              <span
                                className={[
                                  "h-4 w-4 rotate-45 rounded-[4px] border-2 border-white shadow-[var(--flow-shadow-sm)]",
                                  isCompleted
                                    ? "bg-[var(--flow-success)]"
                                    : isOverdue
                                      ? "bg-[var(--flow-danger)]"
                                      : isTodayDue
                                        ? "bg-[var(--flow-warning)]"
                                        : "bg-[var(--flow-primary)]",
                                ].join(" ")}
                              />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--flow-secondary)] shadow-[var(--flow-shadow-sm)]" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--flow-border)] px-5 py-3 text-[8px] font-semibold text-[var(--flow-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-sm bg-[var(--flow-primary)]" />
              시작일 → 마감일
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[var(--flow-primary)]" />
              마감일만 설정
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--flow-secondary)]" />
              시작일만 설정
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-sm bg-[var(--flow-danger)]" />
              지연
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-sm bg-[var(--flow-success)]" />
              완료
            </span>

            <span className="ml-auto text-[var(--flow-text-placeholder)]">
              일정 미정 {unscheduledCount}개
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

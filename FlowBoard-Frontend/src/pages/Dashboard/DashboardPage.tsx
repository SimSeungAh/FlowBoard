import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import { getBoardDetail } from "@/api/board";
import { getCardsByColumn, type CardResponse } from "@/api/card";
import { searchCards } from "@/api/cardSearch";
import { getTestCaseSummary } from "@/api/testCase";
import { getSecurityReviewSummary } from "@/api/securityReview";
import { getBoardActivities, type ActivityType } from "@/api/activity";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

interface DailyDuePoint {
  key: string;
  label: string;
  count: number;
  overdue: boolean;
}

interface WorkloadItem {
  userId: number;
  nickname: string;
  count: number;
}

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);

  next.setHours(0, 0, 0, 0);

  return next;
};

const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);

const formatFullDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "날짜 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDueStatus = (dueDate: string) => {
  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return {
      label: "날짜 확인 필요",
      className: "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
    };
  }

  const today = startOfDay(new Date());
  const target = startOfDay(due);

  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)}일 지연`,
      className: "bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
    };
  }

  if (diffDays === 0) {
    return {
      label: "오늘 마감",
      className: "bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
    };
  }

  return {
    label: `D-${diffDays}`,
    className: "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  };
};

const getActivityLabel = (type: ActivityType) => {
  if (type.startsWith("CARD_")) {
    return "카드";
  }

  if (type.startsWith("COMMENT_")) {
    return "댓글";
  }

  if (type.startsWith("CHECKLIST_")) {
    return "체크리스트";
  }

  if (type.includes("TAG")) {
    return "태그";
  }

  if (type.startsWith("MEMBER_")) {
    return "멤버";
  }

  if (type.startsWith("WHITEBOARD_")) {
    return "화이트보드";
  }

  return "보드";
};

function ArrowIcon() {
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
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: "default" | "primary" | "danger" | "success" | "warning";
}) {
  const dotClassName = {
    default: "bg-[var(--flow-gray-400)]",
    primary: "bg-[var(--flow-primary)]",
    danger: "bg-[var(--flow-danger)]",
    success: "bg-[var(--flow-success)]",
    warning: "bg-[var(--flow-warning)]",
  }[tone];

  return (
    <Card padding="sm" className="min-h-[126px]">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold tracking-[0.02em] text-[var(--flow-text-muted)]">
            {label}
          </p>

          <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
        </div>

        <div>
          <p className="text-[30px] leading-none font-bold tracking-[-0.04em] text-[var(--flow-text)]">
            {value}
          </p>

          <p className="mt-2 text-[10px] leading-5 text-[var(--flow-text-placeholder)]">{helper}</p>
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
  link,
  linkLabel,
}: {
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-5">
      <div>
        <h2 className="text-[15px] font-bold tracking-[-0.02em] text-[var(--flow-text)]">
          {title}
        </h2>

        <p className="mt-1 text-[10px] leading-5 text-[var(--flow-text-muted)]">{description}</p>
      </div>

      {link && linkLabel && (
        <Link
          to={link}
          className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-[var(--flow-primary)] transition-colors hover:text-[var(--flow-primary-700)]"
        >
          {linkLabel}

          <ArrowIcon />
        </Link>
      )}
    </div>
  );
}

function EmptyMiniState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[var(--flow-border-strong)] bg-[var(--flow-gray-50)] px-6 text-center">
      <p className="text-[11px] leading-6 text-[var(--flow-text-placeholder)]">{children}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,

    staleTime: 30_000,
  });

  const board = boardQuery.data;

  const columnIds = board?.columns.map((column) => column.id) ?? [];

  const cardsQuery = useQuery({
    queryKey: ["board", boardId, "dashboard", "cards", columnIds],

    queryFn: async () => {
      if (!board) {
        return {} as Record<number, CardResponse[]>;
      }

      const entries = await Promise.all(
        board.columns.map(async (column) => {
          const cards = await getCardsByColumn(boardId, column.id);

          return [column.id, cards] as const;
        }),
      );

      return Object.fromEntries(entries) as Record<number, CardResponse[]>;
    },

    enabled: isValidBoardId && Boolean(board),
  });

  const searchQuery = useQuery({
    queryKey: ["board", boardId, "dashboard", "search-cards"],

    queryFn: () => searchCards(boardId, {}),

    enabled: isValidBoardId && Boolean(board),
  });

  const testSummaryQuery = useQuery({
    queryKey: ["board", boardId, "dashboard", "test-summary"],

    queryFn: () => getTestCaseSummary(boardId),

    enabled: isValidBoardId && Boolean(board),
  });

  const securitySummaryQuery = useQuery({
    queryKey: ["board", boardId, "dashboard", "security-summary"],

    queryFn: () => getSecurityReviewSummary(boardId),

    enabled: isValidBoardId && Boolean(board),
  });

  const activityQuery = useQuery({
    queryKey: ["board", boardId, "dashboard", "activities"],

    queryFn: () =>
      getBoardActivities(boardId, {
        page: 0,
        size: 8,
      }),

    enabled: isValidBoardId && Boolean(board),
  });

  const cardsByColumn = cardsQuery.data ?? {};

  const allCards = useMemo(() => Object.values(cardsByColumn).flat(), [cardsByColumn]);

  /*
   * 중요:
   *
   * 더 이상 컬럼 제목에
   * "완료", "Done", "Closed" 같은 문자열이 있는지
   * 추측하지 않습니다.
   *
   * OWNER가 워크플로우 설정에서
   * completionColumn=true 로 지정한 컬럼만
   * 실제 완료 단계로 취급합니다.
   */
  const completionColumnIds = useMemo(() => {
    if (!board) {
      return new Set<number>();
    }

    return new Set(
      board.columns.filter((column) => column.completionColumn).map((column) => column.id),
    );
  }, [board]);

  const completionConfigured = completionColumnIds.size > 0;

  const firstColumnId = board?.columns[0]?.id ?? null;

  const stats = useMemo(() => {
    const now = Date.now();

    const overdue = allCards.filter((card) => {
      if (!card.dueDate) {
        return false;
      }

      const dueTime = new Date(card.dueDate).getTime();

      return Number.isFinite(dueTime) && dueTime < now && !completionColumnIds.has(card.columnId);
    }).length;

    const completed = allCards.filter((card) => completionColumnIds.has(card.columnId)).length;

    const inProgress = allCards.filter(
      (card) => card.columnId !== firstColumnId && !completionColumnIds.has(card.columnId),
    ).length;

    const rate = allCards.length === 0 ? 0 : Math.round((completed / allCards.length) * 100);

    return {
      total: allCards.length,

      inProgress,

      overdue,

      completed,

      rate,
    };
  }, [allCards, completionColumnIds, firstColumnId]);

  const columnDistribution = useMemo(() => {
    if (!board) {
      return [];
    }

    return board.columns.map((column) => ({
      ...column,

      count: cardsByColumn[column.id]?.length ?? 0,
    }));
  }, [board, cardsByColumn]);

  const maxColumnCount = Math.max(1, ...columnDistribution.map((item) => item.count));

  const dueTimeline = useMemo<DailyDuePoint[]>(() => {
    const today = startOfDay(new Date());

    const start = new Date(today);

    start.setDate(start.getDate() - 2);

    const points = Array.from(
      {
        length: 15,
      },
      (_, index) => {
        const date = new Date(start);

        date.setDate(start.getDate() + index);

        return {
          key: toDateKey(date),

          label: formatShortDate(date),

          count: 0,

          overdue: date.getTime() < today.getTime(),
        };
      },
    );

    const pointMap = new Map(points.map((point) => [point.key, point]));

    allCards.forEach((card) => {
      if (!card.dueDate) {
        return;
      }

      const date = new Date(card.dueDate);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const point = pointMap.get(toDateKey(date));

      if (point) {
        point.count += 1;
      }
    });

    return points;
  }, [allCards]);

  const maxDueCount = Math.max(1, ...dueTimeline.map((item) => item.count));

  const deadlineCards = useMemo(
    () =>
      allCards
        .filter((card) => card.dueDate && !completionColumnIds.has(card.columnId))
        .sort((a, b) => {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;

          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;

          return aTime - bTime;
        })
        .slice(0, 7),
    [allCards, completionColumnIds],
  );

  const workloads = useMemo<WorkloadItem[]>(() => {
    const cards = searchQuery.data ?? [];

    const map = new Map<number, WorkloadItem>();

    cards.forEach((card) => {
      card.assignees.forEach((assignee) => {
        const current = map.get(assignee.userId);

        if (current) {
          current.count += 1;
        } else {
          map.set(assignee.userId, {
            userId: assignee.userId,

            nickname: assignee.nickname,

            count: 1,
          });
        }
      });
    });

    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 7);
  }, [searchQuery.data]);

  const maxWorkload = Math.max(1, ...workloads.map((item) => item.count));

  const testSummary = testSummaryQuery.data;

  const securitySummary = securitySummaryQuery.data;

  const loading = boardQuery.isLoading || cardsQuery.isLoading;

  const hasCoreError = boardQuery.isError || cardsQuery.isError || !board;

  if (!isValidBoardId) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl">
          <h1 className="text-lg font-bold text-[var(--flow-text)]">보드를 찾을 수 없습니다.</h1>

          <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
            올바른 보드 주소인지 확인해주세요.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 xl:p-8">
        <div className="mx-auto max-w-[1560px]">
          <Skeleton className="h-8 w-72" />

          <Skeleton className="mt-3 h-4 w-[480px]" />

          <div className="mt-7 grid grid-cols-5 gap-3">
            {Array.from({
              length: 5,
            }).map((_, index) => (
              <Skeleton key={index} className="h-[126px] rounded-[var(--flow-radius-lg)]" />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] gap-4">
            <Skeleton className="h-[340px] rounded-[var(--flow-radius-lg)]" />

            <Skeleton className="h-[340px] rounded-[var(--flow-radius-lg)]" />
          </div>
        </div>
      </div>
    );
  }

  if (hasCoreError) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl">
          <h1 className="text-lg font-bold text-[var(--flow-text)]">
            대시보드를 불러오지 못했습니다.
          </h1>

          <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
            보드 접근 권한과 백엔드 연결 상태를 확인한 뒤 다시 시도해주세요.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--flow-background)] px-5 py-5 xl:px-7 xl:py-6">
      <div className="mx-auto max-w-[1560px]">
        <header className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-[26px] font-bold tracking-[-0.035em] text-[var(--flow-text)]">
                {board.title}
              </h1>

              <span className="rounded-full border border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] px-2.5 py-1 text-[9px] font-bold tracking-[0.04em] text-[var(--flow-primary-700)]">
                {board.myRole}
              </span>
            </div>

            <p className="mt-2 max-w-[780px] text-[11px] leading-6 text-[var(--flow-text-muted)]">
              {board.description || "프로젝트 전체 작업 흐름과 품질 상태를 한눈에 확인합니다."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/boards/${boardId}/activities`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--flow-border-strong)] bg-white px-3.5 text-[11px] font-bold text-[var(--flow-text-secondary)] shadow-[var(--flow-shadow-xs)] transition-colors hover:border-[var(--flow-primary-300)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary-700)]"
            >
              활동 기록
            </Link>

            <Link
              to={`/boards/${boardId}/kanban`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--flow-primary)] bg-[var(--flow-primary)] px-4 text-[11px] font-bold !text-white shadow-[var(--flow-shadow-xs)] transition-colors hover:border-[var(--flow-primary-700)] hover:bg-[var(--flow-primary-700)] hover:!text-white"
            >
              칸반 열기
              <ArrowIcon />
            </Link>
          </div>
        </header>

        {!completionConfigured && (
          <div className="mt-5 flex items-start justify-between gap-5 rounded-xl border border-[var(--flow-warning)]/30 bg-[var(--flow-warning-soft)] px-4 py-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80 text-[var(--flow-warning-dark)]">
                <CheckIcon />
              </span>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--flow-warning-dark)]">
                  아직 완료 단계가 지정되지 않았습니다.
                </p>

                <p className="mt-1 text-[10px] leading-5 text-[var(--flow-warning-dark)]/80">
                  정확한 완료 작업 수와 완료율을 보려면 칸반 보드 → 워크플로우 설정에서 실제 완료
                  컬럼의 ‘완료 단계’를 켜주세요.
                </p>
              </div>
            </div>

            <Link
              to={`/boards/${boardId}/kanban`}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white/80 px-3 text-[9px] font-bold text-[var(--flow-warning-dark)] transition-colors hover:bg-white"
            >
              칸반으로 이동
              <ArrowIcon />
            </Link>
          </div>
        )}

        <section className="mt-6 grid grid-cols-5 gap-3">
          <StatCard
            label="전체 작업"
            value={stats.total}
            helper={`${board.columns.length}개 워크플로우 단계`}
            tone="primary"
          />

          <StatCard
            label="진행 작업"
            value={stats.inProgress}
            helper="첫 단계와 완료 단계를 제외한 작업"
          />

          <StatCard
            label="마감 지연"
            value={stats.overdue}
            helper="완료 단계가 아닌 지연 작업"
            tone={stats.overdue > 0 ? "danger" : "success"}
          />

          <StatCard
            label="완료 작업"
            value={stats.completed}
            helper={
              completionConfigured
                ? "완료 단계로 지정된 컬럼의 작업"
                : "워크플로우에서 완료 단계를 지정해주세요"
            }
            tone={completionConfigured ? "success" : "warning"}
          />

          <StatCard
            label="완료율"
            value={`${stats.rate}%`}
            helper={
              completionConfigured
                ? "전체 작업 중 완료 단계 작업 비율"
                : "완료 단계 지정 후 자동 계산됩니다"
            }
            tone={completionConfigured ? "success" : "warning"}
          />
        </section>

        <section className="mt-4 grid grid-cols-[minmax(0,1.6fr)_minmax(330px,0.9fr)] gap-4">
          <Card>
            <SectionHeader
              title="15일 마감 분포"
              description="이틀 전부터 향후 12일까지 마감 예정 작업의 분포입니다."
              link={`/boards/${boardId}/kanban`}
              linkLabel="칸반에서 보기"
            />

            <div className="flex h-[244px] items-end gap-2 rounded-xl bg-[var(--flow-gray-50)] px-4 pt-6 pb-4">
              {dueTimeline.map((point) => {
                const height =
                  point.count === 0
                    ? 4
                    : Math.max(18, Math.round((point.count / maxDueCount) * 172));

                return (
                  <div
                    key={point.key}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-[9px] font-bold text-[var(--flow-text-secondary)]">
                      {point.count > 0 ? point.count : ""}
                    </span>

                    <div className="flex h-[176px] w-full items-end justify-center">
                      <div
                        className={[
                          "w-full max-w-[34px] rounded-t-md transition-[height]",

                          point.overdue
                            ? "bg-[var(--flow-danger)]/70"
                            : "bg-[var(--flow-primary)]/80",
                        ].join(" ")}
                        style={{
                          height,
                        }}
                        title={`${point.label} · ${point.count}개`}
                      />
                    </div>

                    <span className="text-[8px] font-semibold whitespace-nowrap text-[var(--flow-text-placeholder)]">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-[9px] font-semibold text-[var(--flow-text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--flow-danger)]/70" />
                지난 마감일
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--flow-primary)]/80" />
                오늘 이후
              </span>
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="컬럼별 작업량"
              description="현재 워크플로우 어디에 작업이 몰려 있는지 확인합니다."
            />

            <div className="space-y-4">
              {columnDistribution.map((column) => (
                <div key={column.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[10px] font-semibold text-[var(--flow-text-secondary)]">
                        {column.title}
                      </span>

                      {column.completionColumn && (
                        <span className="shrink-0 rounded-full bg-[var(--flow-success-soft)] px-1.5 py-0.5 text-[7px] font-bold text-[var(--flow-success-dark)]">
                          완료
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 text-[10px] font-bold text-[var(--flow-text)]">
                      {column.count}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[var(--flow-gray-100)]">
                    <div
                      className={[
                        "h-full rounded-full",

                        column.completionColumn
                          ? "bg-[var(--flow-success)]"
                          : "bg-[var(--flow-primary)]",
                      ].join(" ")}
                      style={{
                        width: `${Math.max(3, (column.count / maxColumnCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-4">
          <Card>
            <SectionHeader
              title="테스트 케이스 현황"
              description="QA 실행 결과를 한눈에 확인합니다."
              link={`/boards/${boardId}/test-cases`}
              linkLabel="테스트 케이스"
            />

            {testSummaryQuery.isLoading ? (
              <Skeleton className="h-[150px]" />
            ) : testSummaryQuery.isError || !testSummary ? (
              <EmptyMiniState>테스트 케이스 요약을 불러오지 못했습니다.</EmptyMiniState>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {[
                  [
                    "전체",
                    testSummary.total,
                    "bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]",
                  ],

                  [
                    "PASS",
                    testSummary.pass,
                    "bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
                  ],

                  [
                    "FAIL",
                    testSummary.fail,
                    "bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
                  ],

                  [
                    "BLOCKED",
                    testSummary.blocked,
                    "bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
                  ],

                  [
                    "미실행",
                    testSummary.notRun,
                    "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
                  ],
                ].map(([label, value, className]) => (
                  <div
                    key={String(label)}
                    className={`rounded-xl px-3 py-5 text-center ${className}`}
                  >
                    <p className="text-[22px] leading-none font-bold tracking-[-0.04em]">{value}</p>

                    <p className="mt-2 text-[8px] font-bold tracking-[0.02em]">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader
              title="보안 점검 현황"
              description="심각도와 아직 처리해야 할 보안 점검을 요약합니다."
              link={`/boards/${boardId}/security-reviews`}
              linkLabel="보안 점검"
            />

            {securitySummaryQuery.isLoading ? (
              <Skeleton className="h-[150px]" />
            ) : securitySummaryQuery.isError || !securitySummary ? (
              <EmptyMiniState>보안 점검 요약을 불러오지 못했습니다.</EmptyMiniState>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {[
                  [
                    "전체",
                    securitySummary.total,
                    "bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]",
                  ],

                  [
                    "CRITICAL",
                    securitySummary.critical,
                    "bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
                  ],

                  ["HIGH", securitySummary.high, "bg-orange-50 text-orange-700"],

                  [
                    "MEDIUM",
                    securitySummary.medium,
                    "bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
                  ],

                  [
                    "LOW",
                    securitySummary.low,
                    "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
                  ],

                  [
                    "PENDING",
                    securitySummary.pending,
                    "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
                  ],
                ].map(([label, value, className]) => (
                  <div
                    key={String(label)}
                    className={`rounded-xl px-2 py-5 text-center ${className}`}
                  >
                    <p className="text-[21px] leading-none font-bold tracking-[-0.04em]">{value}</p>

                    <p className="mt-2 text-[7px] font-bold tracking-[0.02em]">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] gap-4">
          <Card>
            <SectionHeader
              title="마감 임박 · 지연 작업"
              description="가까운 마감일부터 정렬했습니다. 완료 단계 작업은 제외합니다."
              link={`/boards/${boardId}/kanban`}
              linkLabel="작업 보드"
            />

            {deadlineCards.length === 0 ? (
              <EmptyMiniState>현재 확인할 마감 작업이 없습니다.</EmptyMiniState>
            ) : (
              <div className="divide-y divide-[var(--flow-border)]">
                {deadlineCards.map((card) => {
                  const status = getDueStatus(card.dueDate!);

                  const columnTitle =
                    board.columns.find((column) => column.id === card.columnId)?.title ?? "컬럼";

                  return (
                    <div
                      key={card.id}
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-[var(--flow-text-placeholder)]">
                            #{card.id}
                          </span>

                          <span className="truncate text-[11px] font-bold text-[var(--flow-text)]">
                            {card.title}
                          </span>
                        </div>

                        <p className="mt-1 text-[9px] text-[var(--flow-text-muted)]">
                          {columnTitle} · {formatFullDate(card.dueDate!)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-[8px] font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader
              title="담당자별 작업량"
              description="여러 담당자가 지정된 카드는 각 담당자에게 1건씩 계산됩니다."
            />

            {searchQuery.isLoading ? (
              <Skeleton className="h-[220px]" />
            ) : searchQuery.isError ? (
              <EmptyMiniState>담당자 작업량을 불러오지 못했습니다.</EmptyMiniState>
            ) : workloads.length === 0 ? (
              <EmptyMiniState>아직 담당자가 지정된 작업이 없습니다.</EmptyMiniState>
            ) : (
              <div className="space-y-4">
                {workloads.map((item) => (
                  <div key={item.userId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-800)] text-[8px] font-bold text-white">
                          {item.nickname.charAt(0).toUpperCase()}
                        </span>

                        <span className="truncate text-[10px] font-semibold text-[var(--flow-text-secondary)]">
                          {item.nickname}
                        </span>
                      </div>

                      <span className="shrink-0 text-[10px] font-bold text-[var(--flow-text)]">
                        {item.count}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--flow-gray-100)]">
                      <div
                        className="h-full rounded-full bg-[var(--flow-secondary)]"
                        style={{
                          width: `${Math.max(4, (item.count / maxWorkload) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="mt-4">
          <Card>
            <SectionHeader
              title="최근 활동"
              description="프로젝트에서 발생한 최신 변경을 요약합니다."
              link={`/boards/${boardId}/activities`}
              linkLabel="전체 활동"
            />

            {activityQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <Skeleton key={index} className="h-[68px]" />
                ))}
              </div>
            ) : activityQuery.isError ? (
              <EmptyMiniState>최근 활동을 불러오지 못했습니다.</EmptyMiniState>
            ) : (activityQuery.data?.content.length ?? 0) === 0 ? (
              <EmptyMiniState>아직 기록된 활동이 없습니다.</EmptyMiniState>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {activityQuery.data?.content.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex min-w-0 items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--flow-gray-50)]"
                  >
                    <span className="mt-0.5 rounded-md bg-[var(--flow-primary-50)] px-2 py-1 text-[8px] font-bold text-[var(--flow-primary-700)]">
                      {getActivityLabel(activity.type)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[10px] leading-5 text-[var(--flow-text-secondary)]">
                        {activity.description}
                      </p>

                      <p className="mt-1 text-[8px] text-[var(--flow-text-placeholder)]">
                        {activity.actorNickname} · {formatFullDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

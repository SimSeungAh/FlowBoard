import {
  useEffect,
  useState,
} from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useParams,
} from "react-router";

import {
  getBoardActivities,
  type ActivityLogResponse,
  type ActivityType,
} from "@/api/activity";
import {
  getBoardDetail,
} from "@/api/board";
import {
  getCardDetail,
} from "@/api/card";
import {
  searchCards,
} from "@/api/cardSearch";
import CardDetailModal from "@/components/card/CardDetailModal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";

const PAGE_SIZE = 20;

const directCardTargetActivityTypes = new Set<ActivityType>([
  "CARD_CREATED",
  "CARD_UPDATED",
  "CARD_MOVED",
  "CARD_ASSIGNEE_ADDED",
  "CARD_ASSIGNEE_REMOVED",
  "CARD_TAG_ADDED",
  "CARD_TAG_REMOVED",
  "CHECKLIST_CREATED",
  "CHECKLIST_UPDATED",
  "CHECKLIST_DELETED",
  "CHECKLIST_ITEM_CREATED",
  "CHECKLIST_ITEM_UPDATED",
  "CHECKLIST_ITEM_TOGGLED",
  "CHECKLIST_ITEM_DELETED",
]);

const commentActivityTypes = new Set<ActivityType>([
  "COMMENT_CREATED",
  "COMMENT_UPDATED",
  "COMMENT_DELETED",
]);

const isCardRelatedActivity = (
  type: ActivityType,
) =>
  type === "CARD_DELETED" ||
  directCardTargetActivityTypes.has(type) ||
  commentActivityTypes.has(type);

const canOpenRelatedCard = (
  activity: ActivityLogResponse,
) =>
  activity.type !== "CARD_DELETED" &&
  isCardRelatedActivity(activity.type) &&
  Boolean(activity.targetName);

interface ActivityDisplayInfo {
  label: string;
  category: string;
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger";
}

const activityDisplayMap: Record<
  ActivityType,
  ActivityDisplayInfo
> = {
  BOARD_CREATED: {
    label: "보드 생성",
    category: "보드",
    variant: "success",
  },

  BOARD_UPDATED: {
    label: "보드 수정",
    category: "보드",
    variant: "default",
  },

  MEMBER_INVITED: {
    label: "멤버 초대",
    category: "멤버",
    variant: "success",
  },

  MEMBER_ROLE_CHANGED: {
    label: "권한 변경",
    category: "멤버",
    variant: "warning",
  },

  MEMBER_REMOVED: {
    label: "멤버 제거",
    category: "멤버",
    variant: "danger",
  },

  CARD_CREATED: {
    label: "작업 생성",
    category: "작업",
    variant: "success",
  },

  CARD_UPDATED: {
    label: "작업 수정",
    category: "작업",
    variant: "default",
  },

  CARD_MOVED: {
    label: "작업 이동",
    category: "작업",
    variant: "warning",
  },

  CARD_DELETED: {
    label: "작업 삭제",
    category: "작업",
    variant: "danger",
  },

  CARD_ASSIGNEE_ADDED: {
    label: "담당자 추가",
    category: "담당자",
    variant: "success",
  },

  CARD_ASSIGNEE_REMOVED: {
    label: "담당자 제거",
    category: "담당자",
    variant: "danger",
  },

  COMMENT_CREATED: {
    label: "댓글 작성",
    category: "댓글",
    variant: "success",
  },

  COMMENT_UPDATED: {
    label: "댓글 수정",
    category: "댓글",
    variant: "default",
  },

  COMMENT_DELETED: {
    label: "댓글 삭제",
    category: "댓글",
    variant: "danger",
  },

  TAG_CREATED: {
    label: "태그 생성",
    category: "태그",
    variant: "success",
  },

  TAG_UPDATED: {
    label: "태그 수정",
    category: "태그",
    variant: "default",
  },

  TAG_DELETED: {
    label: "태그 삭제",
    category: "태그",
    variant: "danger",
  },

  CARD_TAG_ADDED: {
    label: "태그 추가",
    category: "태그",
    variant: "success",
  },

  CARD_TAG_REMOVED: {
    label: "태그 제거",
    category: "태그",
    variant: "danger",
  },

  CHECKLIST_CREATED: {
    label: "체크리스트 생성",
    category: "체크리스트",
    variant: "success",
  },

  CHECKLIST_UPDATED: {
    label: "체크리스트 수정",
    category: "체크리스트",
    variant: "default",
  },

  CHECKLIST_DELETED: {
    label: "체크리스트 삭제",
    category: "체크리스트",
    variant: "danger",
  },

  CHECKLIST_ITEM_CREATED: {
    label: "항목 추가",
    category: "체크리스트",
    variant: "success",
  },

  CHECKLIST_ITEM_UPDATED: {
    label: "항목 수정",
    category: "체크리스트",
    variant: "default",
  },

  CHECKLIST_ITEM_TOGGLED: {
    label: "완료 상태 변경",
    category: "체크리스트",
    variant: "warning",
  },

  CHECKLIST_ITEM_DELETED: {
    label: "항목 삭제",
    category: "체크리스트",
    variant: "danger",
  },

  WHITEBOARD_CREATED: {
    label: "화이트보드 생성",
    category: "화이트보드",
    variant: "success",
  },

  WHITEBOARD_UPDATED: {
    label: "화이트보드 수정",
    category: "화이트보드",
    variant: "default",
  },

  WHITEBOARD_DELETED: {
    label: "화이트보드 삭제",
    category: "화이트보드",
    variant: "danger",
  },

  WHITEBOARD_DEFAULT_CHANGED: {
    label: "기본 화이트보드 변경",
    category: "화이트보드",
    variant: "warning",
  },

  WHITEBOARD_STROKE_CREATED: {
    label: "드로잉 추가",
    category: "화이트보드",
    variant: "default",
  },

  WHITEBOARD_CLEARED: {
    label: "전체 초기화",
    category: "화이트보드",
    variant: "danger",
  },
};

const fallbackActivityDisplay: ActivityDisplayInfo = {
  label: "활동",
  category: "기타",
  variant: "default",
};

const getActivityDisplay = (
  type: ActivityType,
): ActivityDisplayInfo =>
  activityDisplayMap[type] ??
  fallbackActivityDisplay;

const formatActivityDateTime = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatRelativeTime = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const now =
    new Date();

  const differenceMilliseconds =
    now.getTime() -
    date.getTime();

  const differenceMinutes =
    Math.floor(
      differenceMilliseconds /
        (1000 * 60),
    );

  if (
    differenceMinutes <
    1
  ) {
    return "방금 전";
  }

  if (
    differenceMinutes <
    60
  ) {
    return `${differenceMinutes}분 전`;
  }

  const differenceHours =
    Math.floor(
      differenceMinutes /
        60,
    );

  if (
    differenceHours <
    24
  ) {
    return `${differenceHours}시간 전`;
  }

  const differenceDays =
    Math.floor(
      differenceHours /
        24,
    );

  if (
    differenceDays <
    7
  ) {
    return `${differenceDays}일 전`;
  }

  return "";
};

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7v5h-5" />

      <path d="M4 17v-5h5" />

      <path d="M6.2 8.4A7 7 0 0 1 18.4 7" />

      <path d="M17.8 15.6A7 7 0 0 1 5.6 17" />
    </svg>
  );
}

function ActivityIcon({
  type,
}: {
  type: ActivityType;
}) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
  };

  if (
    type.startsWith(
      "COMMENT_",
    )
  ) {
    return (
      <svg
        {...commonProps}
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <path d="M5 5h14v10H9l-4 4V5Z" />
      </svg>
    );
  }

  if (
    type.startsWith(
      "MEMBER_",
    )
  ) {
    return (
      <svg
        {...commonProps}
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <circle
          cx="9"
          cy="8"
          r="3"
        />

        <path d="M3.5 18c.7-3.1 2.7-4.7 5.5-4.7 2.1 0 3.8.9 4.8 2.7" />

        <path d="M17 8v6" />
        <path d="M14 11h6" />
      </svg>
    );
  }

  if (
    type.startsWith(
      "CHECKLIST_",
    )
  ) {
    return (
      <svg
        {...commonProps}
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <path d="m5 7 1.5 1.5L9 6" />
        <path d="M11 7h8" />

        <path d="m5 13 1.5 1.5L9 12" />
        <path d="M11 13h8" />

        <path d="m5 19 1.5 1.5L9 18" />
        <path d="M11 19h8" />
      </svg>
    );
  }

  if (
    type.startsWith(
      "WHITEBOARD_",
    )
  ) {
    return (
      <svg
        {...commonProps}
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <rect
          x="3.5"
          y="4"
          width="17"
          height="13"
          rx="2"
        />

        <path d="M8 21h8" />

        <path d="m8 12 2-2 2 1.5 4-4" />
      </svg>
    );
  }

  if (
    type.startsWith(
      "TAG_",
    ) ||
    type.startsWith(
      "CARD_TAG_",
    )
  ) {
    return (
      <svg
        {...commonProps}
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <path d="M4 5h8l8 7-8 8-8-8V5Z" />

        <circle
          cx="8"
          cy="9"
          r="1"
        />
      </svg>
    );
  }

  if (
    type.startsWith(
      "BOARD_",
    )
  ) {
    return (
      <svg
        {...commonProps}
        aria-hidden="true"
        className="h-[18px] w-[18px]"
      >
        <rect
          x="4"
          y="4"
          width="6"
          height="16"
          rx="1.5"
        />

        <rect
          x="14"
          y="4"
          width="6"
          height="11"
          rx="1.5"
        />
      </svg>
    );
  }

  return (
    <svg
      {...commonProps}
      aria-hidden="true"
      className="h-[18px] w-[18px]"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
      />

      <path d="M8 9h8" />
      <path d="M8 13h6" />
      <path d="M8 17h4" />
    </svg>
  );
}

function OpenTargetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
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

export default function ActivityPage() {
  const {
    boardId:
      boardIdParam,
  } = useParams<{
    boardId: string;
  }>();

  const boardId =
    Number(
      boardIdParam,
    );

  const isValidBoardId =
    Number.isInteger(
      boardId,
    ) &&
    boardId > 0;

  const [
    page,
    setPage,
  ] =
    useState(0);

  const [
    selectedCardId,
    setSelectedCardId,
  ] =
    useState<number | null>(null);

  const [
    resolvingActivityId,
    setResolvingActivityId,
  ] =
    useState<number | null>(null);

  const {
    data: board,
  } = useQuery({
    queryKey: [
      "boards",
      boardId,
    ],

    queryFn: () =>
      getBoardDetail(
        boardId,
      ),

    enabled:
      isValidBoardId,
  });

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "boards",
      boardId,
      "activities",
      page,
    ],

    queryFn: () =>
      getBoardActivities(
        boardId,
        {
          page,
          size:
            PAGE_SIZE,
        },
      ),

    enabled:
      isValidBoardId,

    placeholderData: (
      previousData,
    ) =>
      previousData,
  });

  useEffect(() => {
    if (
      !data ||
      data.totalPages ===
        0
    ) {
      return;
    }

    if (
      page >=
      data.totalPages
    ) {
      setPage(
        data.totalPages -
          1,
      );
    }
  }, [
    data,
    page,
  ]);

  const handlePageChange =
    (
      nextPage: number,
    ) => {
      setPage(
        nextPage - 1,
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    };

  const openExistingCard = async (
    cardId: number,
  ) => {
    try {
      await getCardDetail(cardId);

      setSelectedCardId(cardId);
    } catch {
      toast.info(
        "해당 작업은 삭제되었거나 더 이상 확인할 수 없습니다.",
      );
    }
  };

  const handleOpenRelatedTarget = async (
    activity: ActivityLogResponse,
  ) => {
    if (
      resolvingActivityId !== null
    ) {
      return;
    }

    if (
      activity.type ===
      "CARD_DELETED"
    ) {
      toast.info(
        "삭제된 작업의 활동 기록입니다. 카드 상세는 열 수 없습니다.",
      );

      return;
    }

    if (
      !canOpenRelatedCard(activity)
    ) {
      return;
    }

    setResolvingActivityId(
      activity.id,
    );

    try {
      if (
        directCardTargetActivityTypes.has(
          activity.type,
        ) &&
        activity.targetId !== null
      ) {
        await openExistingCard(
          activity.targetId,
        );

        return;
      }

      if (
        commentActivityTypes.has(
          activity.type,
        ) &&
        activity.targetName
      ) {
        const candidates =
          await searchCards(
            boardId,
            {
              keyword:
                activity.targetName,
            },
          );

        const exactMatches =
          candidates.filter(
            (card) =>
              card.title.trim() ===
              activity.targetName?.trim(),
          );

        if (
          exactMatches.length ===
          1
        ) {
          setSelectedCardId(
            exactMatches[0].id,
          );

          return;
        }

        if (
          exactMatches.length >
          1
        ) {
          toast.info(
            "같은 제목의 작업이 여러 개 있어 카드를 자동으로 특정할 수 없습니다.",
          );

          return;
        }

        toast.info(
          "관련 작업이 삭제되었거나 더 이상 검색되지 않습니다.",
        );
      }
    } catch {
      toast.error(
        "관련 작업을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setResolvingActivityId(
        null,
      );
    }
  };

  if (
    !isValidBoardId
  ) {
    return (
      <section className="flow-page">
        <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-xl font-bold text-[var(--flow-text)]">
            활동 기록을 열 수
            없습니다.
          </h1>

          <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
            올바른 보드 주소인지
            확인해주세요.
          </p>
        </div>
      </section>
    );
  }

  const activities =
    data?.content ??
    [];

  return (
    <>
      <CardDetailModal
        open={
          selectedCardId !==
          null
        }
        cardId={
          selectedCardId
        }
        canEdit={
          board?.myRole !==
          "VIEWER"
        }
        onClose={() =>
          setSelectedCardId(
            null,
          )
        }
        onChanged={async () => {
          await refetch();
        }}
      />

      <section className="flow-page">
      {/* Page Header */}
      <div className="flow-page-header">
        <div>
          <p className="text-[12px] font-semibold text-[var(--flow-primary)]">
            {board?.title ??
              `Board #${boardId}`}
          </p>

          <h1 className="mt-2 flow-page-title">
            활동 기록
          </h1>

          <p className="flow-page-description">
            보드에서 누가 무엇을
            변경했는지 시간 순서대로
            확인하세요. 작업 이동,
            댓글, 체크리스트,
            담당자와 화이트보드 변경
            등을 한곳에서 볼 수
            있습니다.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          leftIcon={
            <RefreshIcon />
          }
          loading={
            isFetching &&
            !isLoading
          }
          onClick={() =>
            void refetch()
          }
        >
          새로고침
        </Button>
      </div>

      {/* Summary */}
      {!isLoading &&
        !isError &&
        data && (
          <section className="flow-section">
            <div className="flex items-center justify-between gap-8 rounded-[var(--flow-radius-lg)] bg-white px-6 py-5 shadow-[var(--flow-shadow-xs)]">
              <div>
                <p className="text-[13px] text-[var(--flow-text-muted)]">
                  이 보드에 기록된
                  활동
                </p>

                <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-[var(--flow-text)]">
                  {data.totalElements.toLocaleString()}
                  <span className="ml-1.5 text-[13px] font-medium text-[var(--flow-text-muted)]">
                    개
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                  최신 활동부터 표시
                </p>

                <p className="mt-1 text-[11px] text-[var(--flow-text-placeholder)]">
                  페이지당{" "}
                  {PAGE_SIZE}개
                </p>
              </div>
            </div>
          </section>
        )}

      {/* Activity List */}
      <section className="flow-section">
        <div className="flow-section-header">
          <div>
            <h2 className="flow-section-title">
              최근 활동
            </h2>

            <p className="flow-section-description">
              작업의 흐름과 팀의 변경
              내용을 자연스럽게
              따라갈 수 있습니다.
            </p>
          </div>

          {data &&
            !isLoading &&
            !isError &&
            data.totalPages >
              0 && (
              <span className="whitespace-nowrap text-[12px] font-medium text-[var(--flow-text-muted)]">
                {data.number +
                  1}
                /{data.totalPages}
                페이지
              </span>
            )}
        </div>

        {isLoading ? (
          <div className="rounded-[var(--flow-radius-xl)] bg-white px-7 shadow-[var(--flow-shadow-xs)]">
            {Array.from({
              length: 6,
            }).map(
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="flex gap-5 border-b border-[var(--flow-border)] py-7 last:border-b-0"
                >
                  <Skeleton className="h-11 w-11 shrink-0 rounded-full" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20" />

                      <Skeleton className="h-6 w-16 rounded-lg" />

                      <Skeleton className="h-6 w-24 rounded-lg" />
                    </div>

                    <Skeleton className="mt-4 h-4 w-4/5" />

                    <Skeleton className="mt-3 h-3 w-2/5" />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : isError ? (
          <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
            <h2 className="text-lg font-bold text-[var(--flow-text)]">
              활동 기록을
              불러오지
              못했습니다.
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
              로그인 상태와 보드
              접근 권한을 확인한 뒤
              다시 시도해주세요.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-6"
              onClick={() =>
                void refetch()
              }
            >
              다시 불러오기
            </Button>
          </div>
        ) : activities.length ===
          0 ? (
          <EmptyState
            title="아직 기록된 활동이 없습니다."
            description="작업 생성과 이동, 댓글, 체크리스트, 담당자 변경 등의 활동이 생기면 이곳에서 확인할 수 있습니다."
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-[var(--flow-radius-xl)] bg-white shadow-[var(--flow-shadow-xs)]">
              {activities.map(
                (
                  activity,
                  index,
                ) => {
                  const display =
                    getActivityDisplay(
                      activity.type,
                    );

                  const relativeTime =
                    formatRelativeTime(
                      activity.createdAt,
                    );

                  const isLast =
                    index ===
                    activities.length -
                      1;

                  return (
                    <article
                      key={
                        activity.id
                      }
                      className="group flex gap-5 px-7 py-7 transition-colors hover:bg-[var(--flow-gray-50)]"
                    >
                      {/* Timeline */}
                      <div className="relative flex shrink-0 flex-col items-center">
                        <Avatar
                          name={
                            activity.actorNickname
                          }
                          size="md"
                        />

                        {!isLast && (
                          <span className="absolute top-[48px] bottom-[-28px] w-px bg-[var(--flow-border)]" />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={[
                          "min-w-0 flex-1",
                          !isLast
                            ? "border-b border-[var(--flow-border)] pb-7"
                            : "",
                        ].join(
                          " ",
                        )}
                      >
                        <div className="flex items-start justify-between gap-8">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-[14px] font-bold text-[var(--flow-text)]">
                                {
                                  activity.actorNickname
                                }
                              </span>

                              <Badge>
                                {
                                  display.category
                                }
                              </Badge>

                              <Badge
                                variant={
                                  display.variant
                                }
                              >
                                {
                                  display.label
                                }
                              </Badge>
                            </div>

                            <p className="mt-3 max-w-[820px] break-words text-[13px] leading-7 text-[var(--flow-text-secondary)]">
                              {
                                activity.description
                              }
                            </p>

                            {activity.targetName && (
                              canOpenRelatedCard(
                                activity,
                              ) ? (
                                <button
                                  type="button"
                                  disabled={
                                    resolvingActivityId !==
                                    null
                                  }
                                  title={`관련 작업 열기: ${activity.targetName}`}
                                  className="mt-4 inline-flex max-w-full items-center gap-3 rounded-xl border border-transparent bg-[var(--flow-gray-50)] px-3.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] hover:border-[var(--flow-primary-200)] hover:bg-[var(--flow-primary-50)] hover:shadow-[var(--flow-shadow-xs)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--flow-focus-ring)] disabled:cursor-wait disabled:opacity-60"
                                  onClick={() =>
                                    void handleOpenRelatedTarget(
                                      activity,
                                    )
                                  }
                                >
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--flow-primary)] shadow-[var(--flow-shadow-xs)]">
                                    <ActivityIcon
                                      type={
                                        activity.type
                                      }
                                    />
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                                      관련 대상
                                    </p>

                                    <p className="mt-0.5 max-w-[500px] truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                                      {
                                        activity.targetName
                                      }
                                    </p>
                                  </div>

                                  <span className="ml-1 flex shrink-0 items-center gap-1 text-[9px] font-bold text-[var(--flow-primary)]">
                                    {resolvingActivityId ===
                                    activity.id
                                      ? "확인 중"
                                      : "카드 열기"}

                                    {resolvingActivityId !==
                                      activity.id && (
                                      <OpenTargetIcon />
                                    )}
                                  </span>
                                </button>
                              ) : (
                                <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-xl bg-[var(--flow-gray-50)] px-3.5 py-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--flow-text-muted)] shadow-[var(--flow-shadow-xs)]">
                                    <ActivityIcon
                                      type={
                                        activity.type
                                      }
                                    />
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                                      관련 대상
                                    </p>

                                    <p className="mt-0.5 max-w-[500px] truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                                      {
                                        activity.targetName
                                      }
                                    </p>
                                  </div>

                                  {activity.type ===
                                    "CARD_DELETED" && (
                                    <span className="ml-1 shrink-0 rounded-md bg-[var(--flow-danger-soft)] px-2 py-1 text-[8px] font-bold text-[var(--flow-danger)]">
                                      삭제됨
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>

                          {/* Time */}
                          <div className="w-[170px] shrink-0 text-right">
                            {relativeTime && (
                              <p className="text-[12px] font-semibold text-[var(--flow-primary)]">
                                {
                                  relativeTime
                                }
                              </p>
                            )}

                            <time
                              dateTime={
                                activity.createdAt
                              }
                              title={
                                formatActivityDateTime(
                                  activity.createdAt,
                                )
                              }
                              className="mt-1 block whitespace-nowrap text-[11px] text-[var(--flow-text-placeholder)]"
                            >
                              {formatActivityDateTime(
                                activity.createdAt,
                              )}
                            </time>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {data &&
              data.totalPages >
                1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    page={
                      data.number +
                      1
                    }
                    totalPages={
                      data.totalPages
                    }
                    onChange={
                      handlePageChange
                    }
                  />
                </div>
              )}
          </>
        )}
      </section>
      </section>
    </>
  );
}
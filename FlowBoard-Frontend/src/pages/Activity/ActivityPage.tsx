import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { getBoardActivities, type ActivityType } from "@/api/activity";
import { getBoardDetail } from "@/api/board";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";

const PAGE_SIZE = 20;

interface ActivityDisplayInfo {
  label: string;
  category: string;
  variant: "default" | "success" | "warning" | "danger";
}

const activityDisplayMap: Record<ActivityType, ActivityDisplayInfo> = {
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
    label: "카드 생성",
    category: "카드",
    variant: "success",
  },

  CARD_UPDATED: {
    label: "카드 수정",
    category: "카드",
    variant: "default",
  },

  CARD_MOVED: {
    label: "카드 이동",
    category: "카드",
    variant: "warning",
  },

  CARD_DELETED: {
    label: "카드 삭제",
    category: "카드",
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
    label: "카드 태그 추가",
    category: "태그",
    variant: "success",
  },

  CARD_TAG_REMOVED: {
    label: "카드 태그 제거",
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
    label: "항목 생성",
    category: "체크리스트",
    variant: "success",
  },

  CHECKLIST_ITEM_UPDATED: {
    label: "항목 수정",
    category: "체크리스트",
    variant: "default",
  },

  CHECKLIST_ITEM_TOGGLED: {
    label: "항목 상태 변경",
    category: "체크리스트",
    variant: "warning",
  },

  CHECKLIST_ITEM_DELETED: {
    label: "항목 삭제",
    category: "체크리스트",
    variant: "danger",
  },

  WHITEBOARD_STROKE_CREATED: {
    label: "화이트보드 드로잉",
    category: "화이트보드",
    variant: "default",
  },

  WHITEBOARD_CLEARED: {
    label: "화이트보드 초기화",
    category: "화이트보드",
    variant: "danger",
  },
};

const formatActivityDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const differenceMilliseconds = now.getTime() - date.getTime();

  const differenceMinutes = Math.floor(differenceMilliseconds / (1000 * 60));

  if (differenceMinutes < 1) {
    return "방금 전";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes}분 전`;
  }

  const differenceHours = Math.floor(differenceMinutes / 60);

  if (differenceHours < 24) {
    return `${differenceHours}시간 전`;
  }

  const differenceDays = Math.floor(differenceHours / 24);

  if (differenceDays < 7) {
    return `${differenceDays}일 전`;
  }

  return "";
};

export default function ActivityPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const [page, setPage] = useState(0);

  const { data: board } = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,
  });

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["boards", boardId, "activities", page],

    queryFn: () =>
      getBoardActivities(boardId, {
        page,
        size: PAGE_SIZE,
      }),

    enabled: isValidBoardId,

    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!data || data.totalPages === 0) {
      return;
    }

    if (page >= data.totalPages) {
      setPage(data.totalPages - 1);
    }
  }, [data, page]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage - 1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isValidBoardId) {
    return (
      <section className="w-full max-w-5xl px-6 py-10">
        <Card>
          <h1 className="text-xl font-bold text-slate-900">활동 로그를 열 수 없습니다.</h1>

          <p className="mt-2 text-sm text-slate-500">올바른 보드 ID가 필요합니다.</p>
        </Card>
      </section>
    );
  }

  const activities = data?.content ?? [];

  return (
    <section className="flex w-full max-w-5xl flex-col gap-5 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">{board?.title ?? `Board #${boardId}`}</p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">활동 로그</h1>

          <p className="mt-2 text-sm text-slate-500">
            보드에서 발생한 주요 변경 사항을 최신순으로 확인할 수 있습니다.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          loading={isFetching && !isLoading}
          onClick={() => void refetch()}
        >
          새로고침
        </Button>
      </div>

      {!isLoading && !isError && data && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              전체 활동{" "}
              <strong className="font-semibold text-slate-900">
                {data.totalElements.toLocaleString()}
              </strong>
              개
            </p>

            <p className="text-xs text-slate-400">최신 활동부터 표시됩니다.</p>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div key={index} className="flex gap-4 p-5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>

                  <Skeleton className="mt-3 h-4 w-4/5" />

                  <Skeleton className="mt-2 h-4 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : isError ? (
        <Card>
          <div className="flex flex-col items-start gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                활동 로그를 불러오지 못했습니다.
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                로그인 상태와 보드 접근 권한을 확인한 뒤 다시 시도해주세요.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={() => void refetch()}>
              다시 불러오기
            </Button>
          </div>
        </Card>
      ) : activities.length === 0 ? (
        <EmptyState
          title="아직 기록된 활동이 없습니다."
          description="보드에서 카드 생성, 이동, 댓글 작성 등의 작업이 발생하면 이곳에 활동 기록이 표시됩니다."
        />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-slate-100">
              {activities.map((activity) => {
                const display = activityDisplayMap[activity.type];

                const relativeTime = formatRelativeTime(activity.createdAt);

                return (
                  <article
                    key={activity.id}
                    className="flex gap-4 px-5 py-5 transition-colors hover:bg-slate-50"
                  >
                    <Avatar name={activity.actorNickname} size="md" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {activity.actorNickname}
                        </span>

                        <Badge>{display.category}</Badge>

                        <Badge variant={display.variant}>{display.label}</Badge>
                      </div>

                      <p className="mt-2 text-sm leading-6 break-words text-slate-700">
                        {activity.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <time
                          dateTime={activity.createdAt}
                          title={formatActivityDateTime(activity.createdAt)}
                        >
                          {relativeTime ? `${relativeTime} · ` : ""}
                          {formatActivityDateTime(activity.createdAt)}
                        </time>

                        {activity.targetName && (
                          <span className="max-w-full truncate">
                            대상:{" "}
                            <strong className="font-medium text-slate-500">
                              {activity.targetName}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>

          {data && (
            <Pagination
              page={data.number + 1}
              totalPages={data.totalPages}
              onChange={handlePageChange}
            />
          )}
        </>
      )}
    </section>
  );
}

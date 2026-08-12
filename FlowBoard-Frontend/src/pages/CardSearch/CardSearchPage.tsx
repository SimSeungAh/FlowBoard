import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import {
  getBoardMembers,
  getBoardTags,
  searchCards,
  type CardDueDateFilter,
  type CardSearchParams,
} from "@/api/cardSearch";
import { getBoardDetail } from "@/api/board";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

const KEYWORD_DEBOUNCE_DELAY = 300;

const dueDateOptions: {
  value: CardDueDateFilter;
  label: string;
}[] = [
  {
    value: "OVERDUE",
    label: "마감 지남",
  },
  {
    value: "TODAY",
    label: "오늘 마감",
  },
  {
    value: "UPCOMING",
    label: "마감 예정",
  },
  {
    value: "NO_DUE_DATE",
    label: "마감일 없음",
  },
];

const formatDateTime = (value: string) => {
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

const isSameDate = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const getDueDateBadge = (dueDate: string | null) => {
  if (!dueDate) {
    return {
      label: "마감일 없음",
      variant: "default" as const,
    };
  }

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return {
      label: "마감일 있음",
      variant: "default" as const,
    };
  }

  const now = new Date();

  if (date < now) {
    return {
      label: "마감 지남",
      variant: "danger" as const,
    };
  }

  if (isSameDate(date, now)) {
    return {
      label: "오늘 마감",
      variant: "warning" as const,
    };
  }

  return {
    label: "마감 예정",
    variant: "success" as const,
  };
};

export default function CardSearchPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const [keyword, setKeyword] = useState("");

  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const [assigneeId, setAssigneeId] = useState("");

  const [tagId, setTagId] = useState("");

  const [dueDateFilter, setDueDateFilter] = useState<CardDueDateFilter | "">("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, KEYWORD_DEBOUNCE_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [keyword]);

  const searchParams = useMemo<CardSearchParams>(
    () => ({
      keyword: debouncedKeyword || undefined,

      assigneeId: assigneeId ? Number(assigneeId) : undefined,

      tagId: tagId ? Number(tagId) : undefined,

      dueDateFilter: dueDateFilter || undefined,
    }),
    [debouncedKeyword, assigneeId, tagId, dueDateFilter],
  );

  const { data: board } = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,
  });

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useQuery({
    queryKey: ["boards", boardId, "members"],

    queryFn: () => getBoardMembers(boardId),

    enabled: isValidBoardId,

    staleTime: 30_000,
  });

  const {
    data: tags = [],
    isLoading: isTagsLoading,
    isError: isTagsError,
  } = useQuery({
    queryKey: ["boards", boardId, "tags"],

    queryFn: () => getBoardTags(boardId),

    enabled: isValidBoardId,

    staleTime: 30_000,
  });

  const {
    data: cards = [],
    isLoading: isCardsLoading,
    isFetching: isCardsFetching,
    isError: isCardsError,
    refetch: refetchCards,
  } = useQuery({
    queryKey: ["boards", boardId, "card-search", searchParams],

    queryFn: () => searchCards(boardId, searchParams),

    enabled: isValidBoardId,

    placeholderData: (previousData) => previousData,
  });

  const columnNameById = useMemo(
    () => new Map(board?.columns.map((column) => [column.id, column.title]) ?? []),
    [board?.columns],
  );

  const hasActiveFilters =
    keyword.trim().length > 0 || assigneeId !== "" || tagId !== "" || dueDateFilter !== "";

  const resetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setAssigneeId("");
    setTagId("");
    setDueDateFilter("");
  };

  if (!isValidBoardId) {
    return (
      <section className="w-full max-w-5xl px-6 py-10">
        <Card>
          <h1 className="text-xl font-bold text-slate-900">카드 검색을 열 수 없습니다.</h1>

          <p className="mt-2 text-sm text-slate-500">올바른 보드 ID가 필요합니다.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
      <div>
        <p className="text-sm font-medium text-blue-600">{board?.title ?? `Board #${boardId}`}</p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">카드 검색</h1>

        <p className="mt-2 text-sm text-slate-500">
          제목과 설명을 검색하고 담당자, 태그, 마감일 조건을 함께 적용할 수 있습니다.
        </p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,2fr)_1fr_1fr_1fr]">
          <Input
            label="검색어"
            value={keyword}
            placeholder="카드 제목 또는 설명 검색"
            onChange={(event) => setKeyword(event.target.value)}
          />

          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">담당자</span>

            <select
              value={assigneeId}
              disabled={isMembersLoading}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">전체 담당자</option>

              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.nickname}
                  {" · "}
                  {member.role}
                </option>
              ))}
            </select>
          </label>

          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">태그</span>

            <select
              value={tagId}
              disabled={isTagsLoading}
              onChange={(event) => setTagId(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">전체 태그</option>

              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">마감일</span>

            <select
              value={dueDateFilter}
              onChange={(event) => setDueDateFilter(event.target.value as CardDueDateFilter | "")}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">전체 마감일</option>

              {dueDateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {isCardsFetching && !isCardsLoading ? (
              <span className="text-blue-600">검색 결과 갱신 중...</span>
            ) : (
              <span>
                검색 결과 <strong className="font-semibold text-slate-800">{cards.length}</strong>개
              </span>
            )}

            {(isMembersError || isTagsError) && (
              <span className="text-amber-600">일부 필터 정보를 불러오지 못했습니다.</span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            필터 초기화
          </Button>
        </div>
      </Card>

      {isCardsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <Card key={index}>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-4 h-6 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />

              <div className="mt-5 flex gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : isCardsError ? (
        <Card>
          <div className="flex flex-col items-start gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                카드 검색 결과를 불러오지 못했습니다.
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                로그인 상태와 보드 접근 권한을 확인한 뒤 다시 시도해주세요.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={() => void refetchCards()}>
              다시 불러오기
            </Button>
          </div>
        </Card>
      ) : cards.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "조건에 맞는 카드가 없습니다." : "아직 카드가 없습니다."}
          description={
            hasActiveFilters
              ? "검색어나 필터 조건을 변경해서 다시 찾아보세요."
              : "현재 보드에서 검색할 수 있는 카드가 없습니다."
          }
          actionLabel={hasActiveFilters ? "필터 초기화" : undefined}
          onAction={hasActiveFilters ? resetFilters : undefined}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card) => {
            const dueDateBadge = getDueDateBadge(card.dueDate);

            const columnName = columnNameById.get(card.columnId) ?? `Column #${card.columnId}`;

            return (
              <Card key={card.id} className="flex flex-col gap-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{columnName}</Badge>

                      <span className="text-xs text-slate-400">Card #{card.id}</span>
                    </div>

                    <h2 className="mt-3 text-lg font-semibold break-words text-slate-900">
                      {card.title}
                    </h2>
                  </div>

                  <Badge variant={dueDateBadge.variant}>{dueDateBadge.label}</Badge>
                </div>

                {card.description ? (
                  <p className="line-clamp-3 text-sm leading-6 break-words whitespace-pre-wrap text-slate-600">
                    {card.description}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">설명이 없습니다.</p>
                )}

                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: tag.color,
                          }}
                        />

                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">담당자</p>

                      {card.assignees.length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {card.assignees.map((assignee) => (
                            <div
                              key={assignee.id}
                              className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pr-3"
                            >
                              <Avatar name={assignee.nickname} size="sm" />

                              <span className="max-w-32 truncate text-xs font-medium text-slate-700">
                                {assignee.nickname}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">담당자 없음</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500">마감일</p>

                      <p className="mt-2 text-xs text-slate-700">
                        {card.dueDate ? formatDateTime(card.dueDate) : "설정되지 않음"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">작성자 {card.createdByNickname}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

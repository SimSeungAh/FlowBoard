import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  useParams,
} from "react-router";

import {
  getBoardMembers,
  getBoardTags,
  searchCards,
  type CardDueDateFilter,
  type CardSearchParams,
} from "@/api/cardSearch";
import {
  getBoardDetail,
} from "@/api/board";
import CardDetailModal from "@/components/card/CardDetailModal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";

const KEYWORD_DEBOUNCE_DELAY =
  300;

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

const formatDateTime = (
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
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const isSameDate = (
  first: Date,
  second: Date,
) =>
  first.getFullYear() ===
    second.getFullYear() &&
  first.getMonth() ===
    second.getMonth() &&
  first.getDate() ===
    second.getDate();

const getDueDateBadge = (
  dueDate: string | null,
) => {
  if (!dueDate) {
    return {
      label: "마감일 없음",
      variant:
        "default" as const,
    };
  }

  const date =
    new Date(dueDate);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      label: "마감일 있음",
      variant:
        "default" as const,
    };
  }

  const now =
    new Date();

  if (
    date.getTime() <
    now.getTime()
  ) {
    return {
      label: "마감 지남",
      variant:
        "danger" as const,
    };
  }

  if (
    isSameDate(
      date,
      now,
    )
  ) {
    return {
      label: "오늘 마감",
      variant:
        "warning" as const,
    };
  }

  return {
    label: "마감 예정",
    variant:
      "success" as const,
  };
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="5.5"
      />

      <path d="m15 15 4 4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
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
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14"
        rx="2"
      />

      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M4 9.5h16" />
    </svg>
  );
}

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

export default function CardSearchPage() {
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
    keyword,
    setKeyword,
  ] =
    useState("");

  const [
    debouncedKeyword,
    setDebouncedKeyword,
  ] =
    useState("");

  const [
    assigneeId,
    setAssigneeId,
  ] =
    useState("");

  const [
    tagId,
    setTagId,
  ] =
    useState("");

  const [
    dueDateFilter,
    setDueDateFilter,
  ] =
    useState<
      | CardDueDateFilter
      | ""
    >("");

  const [
    selectedCardId,
    setSelectedCardId,
  ] =
    useState<
      number | null
    >(null);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedKeyword(
            keyword.trim(),
          );
        },
        KEYWORD_DEBOUNCE_DELAY,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [keyword]);

  const searchParams =
    useMemo<CardSearchParams>(
      () => ({
        keyword:
          debouncedKeyword ||
          undefined,

        assigneeId:
          assigneeId
            ? Number(
                assigneeId,
              )
            : undefined,

        tagId:
          tagId
            ? Number(
                tagId,
              )
            : undefined,

        dueDateFilter:
          dueDateFilter ||
          undefined,
      }),
      [
        debouncedKeyword,
        assigneeId,
        tagId,
        dueDateFilter,
      ],
    );

  const {
    data: board,
    isLoading:
      isBoardLoading,
    isError:
      isBoardError,
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
    data:
      members = [],
    isLoading:
      isMembersLoading,
    isError:
      isMembersError,
  } = useQuery({
    queryKey: [
      "boards",
      boardId,
      "members",
    ],

    queryFn: () =>
      getBoardMembers(
        boardId,
      ),

    enabled:
      isValidBoardId,

    staleTime:
      30_000,
  });

  const {
    data: tags = [],
    isLoading:
      isTagsLoading,
    isError:
      isTagsError,
  } = useQuery({
    queryKey: [
      "boards",
      boardId,
      "tags",
    ],

    queryFn: () =>
      getBoardTags(
        boardId,
      ),

    enabled:
      isValidBoardId,

    staleTime:
      30_000,
  });

  const {
    data: cards = [],
    isLoading:
      isCardsLoading,
    isFetching:
      isCardsFetching,
    isError:
      isCardsError,
    refetch:
      refetchCards,
  } = useQuery({
    queryKey: [
      "boards",
      boardId,
      "card-search",
      searchParams,
    ],

    queryFn: () =>
      searchCards(
        boardId,
        searchParams,
      ),

    enabled:
      isValidBoardId,

    placeholderData: (
      previousData,
    ) =>
      previousData,
  });

  const columnNameById =
    useMemo(
      () =>
        new Map(
          board?.columns.map(
            (
              column,
            ) => [
              column.id,
              column.title,
            ],
          ) ?? [],
        ),
      [
        board?.columns,
      ],
    );

  const hasActiveFilters =
    keyword
      .trim()
      .length > 0 ||
    assigneeId !== "" ||
    tagId !== "" ||
    dueDateFilter !== "";

  const activeFilterCount =
    [
      keyword.trim()
        ? true
        : false,
      assigneeId
        ? true
        : false,
      tagId
        ? true
        : false,
      dueDateFilter
        ? true
        : false,
    ].filter(
      Boolean,
    ).length;

  const canEdit =
    board?.myRole ===
      "OWNER" ||
    board?.myRole ===
      "MEMBER";

  const resetFilters =
    () => {
      setKeyword("");

      setDebouncedKeyword(
        "",
      );

      setAssigneeId(
        "",
      );

      setTagId("");

      setDueDateFilter(
        "",
      );
    };

  const handleCardChanged =
    async () => {
      await refetchCards();
    };

  if (
    !isValidBoardId
  ) {
    return (
      <section className="flow-page">
        <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-xl font-bold text-[var(--flow-text)]">
            작업 검색을 열 수
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
          Boolean(
            canEdit,
          )
        }
        onClose={() =>
          setSelectedCardId(
            null,
          )
        }
        onChanged={
          handleCardChanged
        }
      />

      <section className="flow-page">
        {/* Page Header */}
        <div>
          {isBoardLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <p className="text-[12px] font-semibold text-[var(--flow-primary)]">
              {board?.title ??
                `Board #${boardId}`}
            </p>
          )}

          <h1 className="mt-2 flow-page-title">
            작업 검색
          </h1>

          <p className="flow-page-description">
            제목과 설명을 검색하고
            담당자, 태그, 마감일
            조건을 조합해 필요한
            작업을 빠르게
            찾아보세요.
          </p>
        </div>

        {/* Search */}
        <section className="flow-section">
          <div className="rounded-[var(--flow-radius-xl)] bg-white p-7 shadow-[var(--flow-shadow-xs)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
                  <SearchIcon />
                </span>

                <div>
                  <h2 className="text-[15px] font-bold text-[var(--flow-text)]">
                    검색어
                  </h2>

                  <p className="mt-0.5 text-[12px] text-[var(--flow-text-muted)]">
                    작업 제목과 설명을
                    기준으로 검색합니다.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Input
                  value={
                    keyword
                  }
                  placeholder="예: 로그인 오류, 디자인 검토, 테스트 케이스..."
                  leftElement={
                    <SearchIcon />
                  }
                  onChange={(
                    event,
                  ) =>
                    setKeyword(
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>
            </div>

            <div className="my-7 h-px bg-[var(--flow-border)]" />

            {/* Filters */}
            <div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]">
                    <FilterIcon />
                  </span>

                  <div>
                    <h2 className="text-[15px] font-bold text-[var(--flow-text)]">
                      상세 필터
                    </h2>

                    <p className="mt-0.5 text-[12px] text-[var(--flow-text-muted)]">
                      필요한 조건만
                      선택해서 함께
                      적용할 수 있습니다.
                    </p>
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[var(--flow-primary)] transition-colors hover:text-[var(--flow-primary-700)]"
                    onClick={
                      resetFilters
                    }
                  >
                    전체 초기화
                  </button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-5">
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                    담당자
                  </span>

                  <select
                    value={
                      assigneeId
                    }
                    disabled={
                      isMembersLoading
                    }
                    onChange={(
                      event,
                    ) =>
                      setAssigneeId(
                        event
                          .target
                          .value,
                      )
                    }
                    className={[
                      "h-11 w-full min-w-0 rounded-xl",
                      "border border-[var(--flow-border-strong)]",
                      "bg-white px-3.5",
                      "text-[13px] text-[var(--flow-text-secondary)]",
                      "outline-none",
                      "transition-[border-color,box-shadow]",
                      "focus:border-[var(--flow-primary)]",
                      "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                      "disabled:cursor-not-allowed",
                      "disabled:bg-[var(--flow-gray-100)]",
                    ].join(
                      " ",
                    )}
                  >
                    <option value="">
                      전체 담당자
                    </option>

                    {members.map(
                      (
                        member,
                      ) => (
                        <option
                          key={
                            member.id
                          }
                          value={
                            member.userId
                          }
                        >
                          {
                            member.nickname
                          }{" "}
                          ·{" "}
                          {
                            member.role
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                    태그
                  </span>

                  <select
                    value={
                      tagId
                    }
                    disabled={
                      isTagsLoading
                    }
                    onChange={(
                      event,
                    ) =>
                      setTagId(
                        event
                          .target
                          .value,
                      )
                    }
                    className={[
                      "h-11 w-full min-w-0 rounded-xl",
                      "border border-[var(--flow-border-strong)]",
                      "bg-white px-3.5",
                      "text-[13px] text-[var(--flow-text-secondary)]",
                      "outline-none",
                      "transition-[border-color,box-shadow]",
                      "focus:border-[var(--flow-primary)]",
                      "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                      "disabled:cursor-not-allowed",
                      "disabled:bg-[var(--flow-gray-100)]",
                    ].join(
                      " ",
                    )}
                  >
                    <option value="">
                      전체 태그
                    </option>

                    {tags.map(
                      (tag) => (
                        <option
                          key={
                            tag.id
                          }
                          value={
                            tag.id
                          }
                        >
                          {
                            tag.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                    마감일
                  </span>

                  <select
                    value={
                      dueDateFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setDueDateFilter(
                        event
                          .target
                          .value as
                          | CardDueDateFilter
                          | "",
                      )
                    }
                    className={[
                      "h-11 w-full min-w-0 rounded-xl",
                      "border border-[var(--flow-border-strong)]",
                      "bg-white px-3.5",
                      "text-[13px] text-[var(--flow-text-secondary)]",
                      "outline-none",
                      "transition-[border-color,box-shadow]",
                      "focus:border-[var(--flow-primary)]",
                      "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                    ].join(
                      " ",
                    )}
                  >
                    <option value="">
                      전체 마감일
                    </option>

                    {dueDateOptions.map(
                      (
                        option,
                      ) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-[var(--flow-border)] pt-5">
              <div className="flex items-center gap-4">
                {isCardsFetching &&
                !isCardsLoading ? (
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--flow-primary)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                    검색 결과 갱신 중
                  </span>
                ) : (
                  <span className="text-[13px] text-[var(--flow-text-muted)]">
                    검색 결과{" "}
                    <strong className="font-bold text-[var(--flow-text)]">
                      {
                        cards.length
                      }
                    </strong>
                    개
                  </span>
                )}

                {activeFilterCount >
                  0 && (
                  <>
                    <span className="h-4 w-px bg-[var(--flow-border)]" />

                    <span className="text-[12px] text-[var(--flow-text-muted)]">
                      적용된 조건{" "}
                      <strong className="font-semibold text-[var(--flow-primary)]">
                        {
                          activeFilterCount
                        }
                      </strong>
                      개
                    </span>
                  </>
                )}

                {(isMembersError ||
                  isTagsError) && (
                  <span className="text-[12px] font-medium text-[var(--flow-warning-dark)]">
                    일부 필터 정보를
                    불러오지
                    못했습니다.
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={
                  !hasActiveFilters
                }
                onClick={
                  resetFilters
                }
              >
                필터 초기화
              </Button>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="flow-section">
          <div className="flow-section-header">
            <div>
              <h2 className="flow-section-title">
                검색 결과
              </h2>

              <p className="flow-section-description">
                작업을 선택하면
                오른쪽 상세 패널에서
                내용을 바로 확인할 수
                있습니다.
              </p>
            </div>

            {!isCardsLoading &&
              !isCardsError && (
                <span className="whitespace-nowrap text-[13px] font-medium text-[var(--flow-text-muted)]">
                  {
                    cards.length
                  }
                  개
                </span>
              )}
          </div>

          {isBoardError ? (
            <div className="rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--flow-text)]">
                보드 정보를
                불러오지 못했습니다.
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                보드 접근 권한과
                로그인 상태를
                확인해주세요.
              </p>
            </div>
          ) : isCardsLoading ? (
            <div className="space-y-4">
              {Array.from({
                length: 4,
              }).map(
                (
                  _,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className="rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white p-6"
                  >
                    <div className="flex items-start justify-between gap-8">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-28" />

                        <Skeleton className="mt-5 h-6 w-1/2" />

                        <Skeleton className="mt-3 h-4 w-full" />

                        <Skeleton className="mt-2 h-4 w-3/4" />

                        <div className="mt-6 flex gap-2">
                          <Skeleton className="h-7 w-20" />
                          <Skeleton className="h-7 w-24" />
                        </div>
                      </div>

                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : isCardsError ? (
            <div className="rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--flow-text)]">
                작업 검색 결과를
                불러오지 못했습니다.
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
                  void refetchCards()
                }
              >
                다시 불러오기
              </Button>
            </div>
          ) : cards.length ===
            0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? "조건에 맞는 작업이 없습니다."
                  : "아직 작업이 없습니다."
              }
              description={
                hasActiveFilters
                  ? "검색어나 필터 조건을 변경해서 다시 찾아보세요."
                  : "현재 보드에서 검색할 수 있는 작업이 없습니다."
              }
              actionLabel={
                hasActiveFilters
                  ? "필터 초기화"
                  : undefined
              }
              onAction={
                hasActiveFilters
                  ? resetFilters
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {cards.map(
                (card) => {
                  const dueDateBadge =
                    getDueDateBadge(
                      card.dueDate,
                    );

                  const columnName =
                    columnNameById.get(
                      card.columnId,
                    ) ??
                    `Column #${card.columnId}`;

                  return (
                    <article
                      key={
                        card.id
                      }
                      className={[
                        "group cursor-pointer",
                        "rounded-[var(--flow-radius-lg)]",
                        "border border-[var(--flow-border)]",
                        "bg-white p-6",
                        "shadow-[var(--flow-shadow-xs)]",
                        "transition-[border-color,box-shadow,transform]",
                        "duration-150",
                        "hover:-translate-y-px",
                        "hover:border-[var(--flow-primary-200)]",
                        "hover:shadow-[var(--flow-shadow-sm)]",
                      ].join(
                        " ",
                      )}
                      onClick={() =>
                        setSelectedCardId(
                          card.id,
                        )
                      }
                    >
                      <div className="flex items-start justify-between gap-10">
                        <div className="min-w-0 flex-1">
                          {/* Column / id */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <Badge>
                              {
                                columnName
                              }
                            </Badge>

                            <span className="text-[11px] font-medium text-[var(--flow-text-placeholder)]">
                              작업 #
                              {
                                card.id
                              }
                            </span>

                            {card.tags.map(
                              (
                                tag,
                              ) => (
                                <span
                                  key={
                                    tag.id
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--flow-gray-50)] px-2.5 py-1 text-[11px] font-semibold text-[var(--flow-text-secondary)]"
                                >
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        tag.color,
                                    }}
                                  />

                                  {
                                    tag.name
                                  }
                                </span>
                              ),
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="mt-4 break-words text-[18px] font-bold leading-[1.5] tracking-[-0.02em] text-[var(--flow-text)] transition-colors group-hover:text-[var(--flow-primary)]">
                            {
                              card.title
                            }
                          </h3>

                          {/* Description */}
                          {card.description ? (
                            <p className="mt-2.5 line-clamp-2 max-w-[850px] whitespace-pre-wrap break-words text-[13px] leading-7 text-[var(--flow-text-muted)]">
                              {
                                card.description
                              }
                            </p>
                          ) : (
                            <p className="mt-2.5 text-[13px] text-[var(--flow-text-placeholder)]">
                              등록된 설명이
                              없습니다.
                            </p>
                          )}

                          {/* Assignees */}
                          <div className="mt-6 flex flex-wrap items-center gap-3">
                            <span className="text-[12px] font-semibold text-[var(--flow-text-muted)]">
                              담당자
                            </span>

                            {card.assignees.length >
                            0 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {card.assignees.map(
                                  (
                                    assignee,
                                  ) => (
                                    <div
                                      key={
                                        assignee.id
                                      }
                                      className="flex items-center gap-2 rounded-xl bg-[var(--flow-gray-50)] py-1.5 pl-1.5 pr-3"
                                    >
                                      <Avatar
                                        name={
                                          assignee.nickname
                                        }
                                        size="sm"
                                      />

                                      <span className="max-w-[150px] truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                                        {
                                          assignee.nickname
                                        }
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="text-[12px] text-[var(--flow-text-placeholder)]">
                                지정되지 않음
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex w-[180px] shrink-0 flex-col items-end">
                          <Badge
                            variant={
                              dueDateBadge.variant
                            }
                          >
                            {
                              dueDateBadge.label
                            }
                          </Badge>

                          <div className="mt-6 text-right">
                            <p className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
                              마감일
                            </p>

                            <div className="mt-2 flex items-center justify-end gap-1.5 text-[12px] text-[var(--flow-text-secondary)]">
                              <CalendarIcon />

                              <span className="whitespace-nowrap">
                                {card.dueDate
                                  ? formatDateTime(
                                      card.dueDate,
                                    )
                                  : "설정되지 않음"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-auto pt-8">
                            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--flow-primary)]">
                              상세 보기
                              <ArrowIcon />
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-[var(--flow-border)] pt-4">
                        <span className="text-[11px] text-[var(--flow-text-muted)]">
                          작성자{" "}
                          <strong className="font-semibold text-[var(--flow-text-secondary)]">
                            {
                              card.createdByNickname
                            }
                          </strong>
                        </span>

                        <span className="text-[11px] text-[var(--flow-text-placeholder)]">
                          최근 수정{" "}
                          {formatDateTime(
                            card.updatedAt,
                          )}
                        </span>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
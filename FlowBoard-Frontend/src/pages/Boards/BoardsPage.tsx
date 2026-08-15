import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  useNavigate,
} from "react-router";
import { toast } from "sonner";

import {
  createBoard,
  getMyBoards,
  type BoardListResponse,
  type BoardRole,
} from "@/api/board";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";

type BoardFilter =
  | "ALL"
  | BoardRole;

const filterItems: {
  value: BoardFilter;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "전체",
  },
  {
    value: "OWNER",
    label: "내가 만든 보드",
  },
  {
    value: "MEMBER",
    label: "참여 중",
  },
  {
    value: "VIEWER",
    label: "조회 전용",
  },
];

const getRoleVariant = (
  role: BoardListResponse["myRole"],
) => {
  switch (role) {
    case "OWNER":
      return "success" as const;

    case "MEMBER":
      return "default" as const;

    case "VIEWER":
      return "warning" as const;
  }
};

const getRoleLabel = (
  role: BoardListResponse["myRole"],
) => {
  switch (role) {
    case "OWNER":
      return "소유자";

    case "MEMBER":
      return "멤버";

    case "VIEWER":
      return "조회 전용";
  }
};

const formatUpdatedAt = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
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

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />

      <path d="M5 12h14" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="3.5"
        y="4"
        width="5"
        height="16"
        rx="1.5"
      />

      <rect
        x="9.5"
        y="4"
        width="5"
        height="11"
        rx="1.5"
      />

      <rect
        x="15.5"
        y="4"
        width="5"
        height="14"
        rx="1.5"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
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

export default function BoardsPage() {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const [
    searchKeyword,
    setSearchKeyword,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<BoardFilter>(
      "ALL",
    );

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const {
    data: boards = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "boards",
    ],
    queryFn:
      getMyBoards,
  });

  const filteredBoards =
    useMemo(() => {
      const keyword =
        searchKeyword
          .trim()
          .toLowerCase();

      return [...boards]
        .filter(
          (board) => {
            if (
              filter !==
                "ALL" &&
              board.myRole !==
                filter
            ) {
              return false;
            }

            if (!keyword) {
              return true;
            }

            return [
              board.title,
              board.description ??
                "",
              board.ownerNickname,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    keyword,
                  ),
            );
          },
        )
        .sort(
          (
            first,
            second,
          ) =>
            new Date(
              second.updatedAt,
            ).getTime() -
            new Date(
              first.updatedAt,
            ).getTime(),
        );
    }, [
      boards,
      filter,
      searchKeyword,
    ]);

  const createMutation =
    useMutation({
      mutationFn:
        createBoard,

      onSuccess:
        async (
          createdBoard,
        ) => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
              ],
            },
          );

          toast.success(
            "새 보드를 만들었습니다.",
          );

          setCreateOpen(
            false,
          );

          setTitle("");
          setDescription(
            "",
          );

          navigate(
            `/boards/${createdBoard.id}`,
          );
        },

      onError: () => {
        toast.error(
          "보드를 생성하지 못했습니다.",
        );
      },
    });

  const openCreateModal =
    () => {
      setTitle("");

      setDescription(
        "",
      );

      setCreateOpen(
        true,
      );
    };

  const closeCreateModal =
    () => {
      if (
        createMutation.isPending
      ) {
        return;
      }

      setCreateOpen(
        false,
      );
    };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedTitle =
      title.trim();

    const trimmedDescription =
      description.trim();

    if (
      !trimmedTitle
    ) {
      toast.error(
        "보드 제목을 입력해주세요.",
      );

      return;
    }

    createMutation.mutate(
      {
        title:
          trimmedTitle,

        description:
          trimmedDescription ||
          null,
      },
    );
  };

  return (
    <>
      <Modal
        open={createOpen}
        title="새 보드 만들기"
        closeOnBackdrop={
          !createMutation.isPending
        }
        closeOnEsc={
          !createMutation.isPending
        }
        onClose={
          closeCreateModal
        }
      >
        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="space-y-7">
            <Input
              label="보드 제목"
              value={title}
              required
              autoFocus
              maxLength={
                100
              }
              placeholder="예: FlowBoard 개발"
              helperText={`${title.length}/100`}
              disabled={
                createMutation.isPending
              }
              onChange={(
                event,
              ) =>
                setTitle(
                  event
                    .target
                    .value,
                )
              }
            />

            <div>
              <Textarea
                id="board-description"
                label="보드 설명"
                value={
                  description
                }
                maxLength={
                  500
                }
                placeholder="프로젝트의 목적이나 함께 진행할 내용을 간단히 적어주세요."
                disabled={
                  createMutation.isPending
                }
                onChange={(
                  event,
                ) =>
                  setDescription(
                    event
                      .target
                      .value,
                  )
                }
              />

              <p className="mt-2 text-right text-xs text-[var(--flow-text-placeholder)]">
                {
                  description.length
                }
                /500
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-[var(--flow-border)] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={
                createMutation.isPending
              }
              onClick={
                closeCreateModal
              }
            >
              취소
            </Button>

            <Button
              type="submit"
              loading={
                createMutation.isPending
              }
              disabled={
                !title.trim()
              }
            >
              보드 만들기
            </Button>
          </div>
        </form>
      </Modal>

      <section className="flow-page">
        {/* Page header */}
        <div className="flow-page-header">
          <div>
            <h1 className="flow-page-title">
              내 보드
            </h1>

            <p className="flow-page-description">
              참여 중인 프로젝트를
              확인하고 필요한 보드로
              바로 이동하세요.
            </p>
          </div>

          <Button
            type="button"
            leftIcon={
              <PlusIcon />
            }
            onClick={
              openCreateModal
            }
          >
            새 보드 만들기
          </Button>
        </div>

        {/* Filter & Search */}
        <section className="flow-section">
          <div className="flow-board-toolbar">
            <div className="flow-board-filters">
              {filterItems.map(
                (item) => {
                  const active =
                    item.value ===
                    filter;

                  return (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      onClick={() =>
                        setFilter(
                          item.value,
                        )
                      }
                      className={[
                        "min-h-10 whitespace-nowrap rounded-xl px-4 py-2",
                        "text-[13px] font-semibold",
                        "transition-colors",
                        active
                          ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary)]"
                          : "text-[var(--flow-text-muted)] hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        item.label
                      }
                    </button>
                  );
                },
              )}
            </div>

            <div className="flow-board-search relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--flow-text-placeholder)]">
                <SearchIcon />
              </span>

              <input
                type="search"
                value={
                  searchKeyword
                }
                placeholder="제목, 설명, 소유자로 검색"
                className="h-11 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white pl-11 pr-4 text-[13px] text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                onChange={(
                  event,
                ) =>
                  setSearchKeyword(
                    event
                      .target
                      .value,
                  )
                }
              />
            </div>
          </div>

          <div className="mt-7 h-px bg-[var(--flow-border)]" />
        </section>

        {/* Loading */}
        {isLoading ? (
          <section className="flow-section">
            <div className="flow-board-grid">
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
                    className="min-h-[220px] rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white p-7"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-10 w-28" />

                      <Skeleton className="h-4 w-14" />
                    </div>

                    <Skeleton className="mt-6 h-6 w-1/2" />

                    <Skeleton className="mt-3 h-4 w-full" />

                    <Skeleton className="mt-2 h-4 w-4/5" />

                    <div className="mt-8 flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />

                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        ) : isError ? (
          <section className="flow-section">
            <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--flow-text)]">
                보드 목록을
                불러오지 못했습니다.
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                로그인 상태와 백엔드
                연결을 확인한 뒤 다시
                시도해주세요.
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
          </section>
        ) : boards.length ===
          0 ? (
          <section className="flow-section">
            <EmptyState
              title="아직 참여 중인 보드가 없습니다."
              description="첫 보드를 만들고 프로젝트의 다양한 작업을 자유롭게 정리해보세요."
              actionLabel="새 보드 만들기"
              onAction={
                openCreateModal
              }
            />
          </section>
        ) : filteredBoards.length ===
          0 ? (
          <section className="flow-section">
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[var(--flow-radius-lg)] bg-white px-10 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]">
                <SearchIcon />
              </div>

              <h2 className="mt-5 text-base font-bold text-[var(--flow-text)]">
                조건에 맞는 보드가
                없습니다.
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                검색어나 권한 필터를
                변경해보세요.
              </p>
            </div>
          </section>
        ) : (
          <section className="flow-section">
            <div className="flow-section-header">
              <div>
                <h2 className="flow-section-title">
                  {filter ===
                  "ALL"
                    ? "최근 보드"
                    : filterItems.find(
                        (
                          item,
                        ) =>
                          item.value ===
                          filter,
                      )
                        ?.label}
                </h2>

                <p className="flow-section-description">
                  최근 수정된
                  보드부터 표시됩니다.
                </p>
              </div>

              <span className="whitespace-nowrap text-[13px] font-medium text-[var(--flow-text-muted)]">
                {
                  filteredBoards.length
                }
                개
              </span>
            </div>

            <div className="flow-board-grid">
              {filteredBoards.map(
                (board) => (
                  <article
                    key={
                      board.id
                    }
                    className="group relative overflow-hidden rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[var(--flow-primary-200)] hover:shadow-[var(--flow-shadow-sm)]"
                  >
                    <div
                      className="h-[5px] w-full"
                      style={{
                        background:
                          board.backgroundColor ||
                          "var(--flow-primary)",
                      }}
                    />

                    <div className="p-7">
                      {/* Top */}
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
                            <BoardIcon />
                          </span>

                          <Badge
                            variant={getRoleVariant(
                              board.myRole,
                            )}
                          >
                            {getRoleLabel(
                              board.myRole,
                            )}
                          </Badge>
                        </div>

                        <span className="whitespace-nowrap pt-1 text-xs font-medium text-[var(--flow-text-placeholder)]">
                          Board #
                          {
                            board.id
                          }
                        </span>
                      </div>

                      {/* Content */}
                      <Link
                        to={`/boards/${board.id}`}
                        className="mt-5 block rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-[var(--flow-focus-ring)]"
                      >
                        <h3 className="line-clamp-1 text-xl font-bold tracking-[-0.025em] text-[var(--flow-text)] transition-colors group-hover:text-[var(--flow-primary)]">
                          {
                            board.title
                          }
                        </h3>

                        <p className="mt-2.5 line-clamp-2 min-h-[44px] max-w-[760px] text-[13px] leading-[1.75] text-[var(--flow-text-muted)]">
                          {board.description ||
                            "보드 설명이 없습니다."}
                        </p>
                      </Link>

                      {/* Bottom */}
                      <div className="mt-7 flex items-end justify-between gap-8 border-t border-[var(--flow-border)] pt-5">
                        <div className="flex min-w-0 items-center gap-5 text-xs text-[var(--flow-text-muted)]">
                          <span className="whitespace-nowrap">
                            소유자{" "}
                            <strong className="font-semibold text-[var(--flow-text-secondary)]">
                              {
                                board.ownerNickname
                              }
                            </strong>
                          </span>

                          <span className="h-3.5 w-px shrink-0 bg-[var(--flow-border)]" />

                          <span className="whitespace-nowrap">
                            최근 수정{" "}
                            <strong className="font-medium text-[var(--flow-text-secondary)]">
                              {formatUpdatedAt(
                                board.updatedAt,
                              )}
                            </strong>
                          </span>
                        </div>

                        <Link
                          to={`/boards/${board.id}`}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-4 whitespace-nowrap rounded-xl bg-[var(--flow-primary-50)] px-5 text-[13px] font-semibold text-[var(--flow-primary)] transition-colors hover:bg-[var(--flow-primary-100)]"
                        >
                          보드 열기

                          <ArrowIcon />
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}
      </section>
    </>
  );
}
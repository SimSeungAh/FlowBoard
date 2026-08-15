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
      className="h-4 w-4"
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
      className="h-4 w-4"
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
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
            ].some((value) =>
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
          <div className="space-y-5">
            <Input
              label="보드 제목"
              value={title}
              required
              autoFocus
              maxLength={
                100
              }
              placeholder="예: FlowBoard 개발"
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
                placeholder="프로젝트나 보드의 목적을 간단히 적어주세요."
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

              <p className="mt-1.5 text-right text-[11px] text-[var(--flow-text-placeholder)]">
                {
                  description.length
                }
                /500
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-[var(--flow-border)] pt-4">
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

      <section className="mx-auto w-full max-w-[1440px] px-8 py-8">
        {/* 상단 */}
        <div className="flex items-end justify-between gap-8">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
              내 보드
            </h1>

            <p className="mt-1.5 text-sm text-[var(--flow-text-muted)]">
              참여 중인 프로젝트를
              찾고 바로 작업을
              시작하세요.
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

        {/* 검색 / 필터 */}
        <div className="mt-7 flex items-center justify-between gap-6 border-b border-[var(--flow-border)] pb-5">
          <div className="flex items-center gap-2">
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
                      "h-9 rounded-lg px-3.5 text-xs font-semibold transition-colors",
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

          <div className="relative w-[320px]">
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--flow-text-placeholder)]">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={
                searchKeyword
              }
              placeholder="보드 검색"
              className="h-9 w-full rounded-lg border border-[var(--flow-border-strong)] bg-white pl-9 pr-3 text-sm text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
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

        {/* 상태 */}
        {isLoading ? (
          <div className="mt-6 grid grid-cols-3 gap-5">
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
                  className="rounded-xl border border-[var(--flow-border)] bg-white p-5"
                >
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>

                  <Skeleton className="mt-5 h-6 w-2/3" />

                  <Skeleton className="mt-3 h-4 w-full" />

                  <Skeleton className="mt-2 h-4 w-4/5" />

                  <Skeleton className="mt-8 h-9 w-full" />
                </div>
              ),
            )}
          </div>
        ) : isError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-white p-6">
            <h2 className="text-sm font-bold text-[var(--flow-text)]">
              보드 목록을
              불러오지 못했습니다.
            </h2>

            <p className="mt-1 text-xs text-[var(--flow-text-muted)]">
              로그인 상태와 백엔드
              연결을 확인해주세요.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() =>
                void refetch()
              }
            >
              다시 불러오기
            </Button>
          </div>
        ) : boards.length ===
          0 ? (
          <div className="mt-6">
            <EmptyState
              title="아직 참여 중인 보드가 없습니다."
              description="새 보드를 만들어 프로젝트의 작업 흐름을 시작해보세요."
              actionLabel="새 보드 만들기"
              onAction={
                openCreateModal
              }
            />
          </div>
        ) : filteredBoards.length ===
          0 ? (
          <div className="mt-6 flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--flow-border-strong)] bg-white">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]">
              <SearchIcon />
            </div>

            <p className="mt-4 text-sm font-semibold text-[var(--flow-text)]">
              조건에 맞는 보드가
              없습니다.
            </p>

            <p className="mt-1 text-xs text-[var(--flow-text-muted)]">
              검색어나 필터를
              변경해보세요.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--flow-text)]">
                {filter ===
                "ALL"
                  ? "전체 보드"
                  : filterItems.find(
                      (
                        item,
                      ) =>
                        item.value ===
                        filter,
                    )
                      ?.label}
              </h2>

              <p className="text-xs text-[var(--flow-text-muted)]">
                {
                  filteredBoards.length
                }
                개
              </p>
            </div>

            {/* 보드 카드 */}
            <div className="mt-3 grid grid-cols-3 gap-5">
              {filteredBoards.map(
                (board) => (
                  <article
                    key={
                      board.id
                    }
                    className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-xl border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[var(--flow-primary-200)] hover:shadow-[var(--flow-shadow-sm)]"
                  >
                    <div
                      className="h-[4px] w-full"
                      style={{
                        background:
                          board.backgroundColor ||
                          "var(--flow-primary)",
                      }}
                    />

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
                            <BoardIcon />
                          </div>

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

                        <span className="text-[10px] font-medium text-[var(--flow-text-placeholder)]">
                          #
                          {
                            board.id
                          }
                        </span>
                      </div>

                      <Link
                        to={`/boards/${board.id}`}
                        className="mt-4 block rounded-md outline-none focus-visible:ring-4 focus-visible:ring-[var(--flow-focus-ring)]"
                      >
                        <h3 className="line-clamp-1 text-[17px] font-bold tracking-[-0.02em] text-[var(--flow-text)] transition-colors group-hover:text-[var(--flow-primary)]">
                          {
                            board.title
                          }
                        </h3>

                        <p className="mt-2 line-clamp-2 min-h-[40px] text-xs leading-5 text-[var(--flow-text-muted)]">
                          {board.description ||
                            "보드 설명이 없습니다."}
                        </p>
                      </Link>

                      <div className="mt-4 flex items-center justify-between border-t border-[var(--flow-border)] pt-3">
                        <p className="text-[10px] text-[var(--flow-text-muted)]">
                          소유자{" "}
                          <strong className="font-semibold text-[var(--flow-text-secondary)]">
                            {
                              board.ownerNickname
                            }
                          </strong>
                        </p>

                        <p className="text-[10px] text-[var(--flow-text-placeholder)]">
                          {formatUpdatedAt(
                            board.updatedAt,
                          )}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center gap-2 pt-4">
                        <Link
                          to={`/boards/${board.id}`}
                          className="flex h-9 flex-1 items-center justify-between rounded-lg bg-[var(--flow-primary-50)] px-3 text-xs font-semibold text-[var(--flow-primary)] transition-colors hover:bg-[var(--flow-primary-100)]"
                        >
                          <span>
                            보드 열기
                          </span>

                          <ArrowIcon />
                        </Link>

                        <Link
                          to={`/boards/${board.id}/search`}
                          title="카드 검색"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--flow-border)] bg-white text-[var(--flow-text-muted)] transition-colors hover:border-[var(--flow-primary-200)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
                        >
                          <SearchIcon />
                        </Link>

                        <Link
                          to={`/boards/${board.id}/whiteboard`}
                          title="화이트보드"
                          className="flex h-9 items-center justify-center rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[10px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:border-[var(--flow-primary-200)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
                        >
                          화이트보드
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";
import {
  createCard,
  getCardsByColumn,
  type CardCreateRequest,
  type CardResponse,
} from "@/api/card";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";

type CardsByColumn = Record<number, CardResponse[]>;

const formatDueDate = (dueDate: string | null) => {
  if (!dueDate) {
    return null;
  }

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getDueDateClassName = (dueDate: string | null) => {
  if (!dueDate) {
    return "";
  }

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.getTime() < Date.now() ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500";
};

export default function BoardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [createColumnId, setCreateColumnId] = useState<number | null>(null);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,
  });

  const board = boardQuery.data;

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const cardsQuery = useQuery({
    queryKey: ["board", boardId, "cards", board?.columns.map((column) => column.id)],

    queryFn: async (): Promise<CardsByColumn> => {
      if (!board) {
        return {};
      }

      const entries = await Promise.all(
        board.columns.map(async (column) => {
          const cards = await getCardsByColumn(boardId, column.id);

          return [column.id, cards] as const;
        }),
      );

      return Object.fromEntries(entries);
    },

    enabled: isValidBoardId && Boolean(board),
  });

  const cardsByColumn = cardsQuery.data ?? {};

  const createMutation = useMutation({
    mutationFn: ({ columnId, data }: { columnId: number; data: CardCreateRequest }) =>
      createCard(boardId, columnId, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["board", boardId, "cards"],
      });

      toast.success("카드를 만들었습니다.");

      setCreateModalOpen(false);

      setCreateColumnId(null);

      setTitle("");
      setDescription("");
      setDueDate("");
    },

    onError: () => {
      toast.error("카드를 생성하지 못했습니다.");
    },
  });

  const openCreateModal = (columnId: number) => {
    if (!canEdit) {
      return;
    }

    setCreateColumnId(columnId);

    setTitle("");
    setDescription("");
    setDueDate("");

    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) {
      return;
    }

    setCreateModalOpen(false);

    setCreateColumnId(null);
  };

  const handleCreateCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createColumnId) {
      return;
    }

    const trimmedTitle = title.trim();

    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("카드 제목을 입력해주세요.");

      return;
    }

    createMutation.mutate({
      columnId: createColumnId,

      data: {
        title: trimmedTitle,

        description: trimmedDescription || null,

        /*
         * datetime-local 값은
         * yyyy-MM-ddTHH:mm 형식이며
         * Spring LocalDateTime으로 그대로 전달 가능합니다.
         */
        dueDate: dueDate || null,
      },
    });
  };

  if (!isValidBoardId) {
    return (
      <section className="w-full px-6 py-10">
        <Card>
          <h1 className="text-xl font-bold text-slate-900">보드를 열 수 없습니다.</h1>

          <p className="mt-2 text-sm text-slate-500">올바른 보드 ID가 필요합니다.</p>
        </Card>
      </section>
    );
  }

  const isLoading = boardQuery.isLoading || cardsQuery.isLoading;

  const isError = boardQuery.isError || cardsQuery.isError;

  return (
    <>
      <Modal
        open={createModalOpen}
        title="새 카드 만들기"
        closeOnBackdrop={!createMutation.isPending}
        closeOnEsc={!createMutation.isPending}
        onClose={closeCreateModal}
      >
        <form onSubmit={handleCreateCard}>
          <div className="space-y-5">
            <Input
              label="카드 제목"
              value={title}
              required
              autoFocus
              maxLength={100}
              placeholder="예: 로그인 화면 구현"
              helperText={`${title.length}/100`}
              disabled={createMutation.isPending}
              onChange={(event) => setTitle(event.target.value)}
            />

            <div>
              <Textarea
                id="card-description"
                label="설명"
                value={description}
                placeholder="카드에서 진행할 작업을 적어주세요."
                disabled={createMutation.isPending}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <Input
              label="마감일"
              type="datetime-local"
              value={dueDate}
              disabled={createMutation.isPending}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <div className="mt-7 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={closeCreateModal}
            >
              취소
            </Button>

            <Button type="submit" loading={createMutation.isPending} disabled={!title.trim()}>
              카드 만들기
            </Button>
          </div>
        </form>
      </Modal>

      <section className="w-full px-6 py-8">
        {boardQuery.isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-5 w-80" />

            <div className="grid gap-4 lg:grid-cols-3">
              {Array.from({
                length: 3,
              }).map((_, index) => (
                <Skeleton key={index} className="h-96 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : boardQuery.isError || !board ? (
          <Card>
            <h1 className="text-xl font-bold text-slate-900">보드를 불러오지 못했습니다.</h1>

            <p className="mt-2 text-sm text-slate-500">접근 권한과 로그인 상태를 확인해주세요.</p>

            <div className="mt-5">
              <Button type="button" variant="outline" onClick={() => void boardQuery.refetch()}>
                다시 불러오기
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {board.myRole}
                  </span>

                  <span className="text-xs text-slate-400">소유자 {board.ownerNickname}</span>
                </div>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                  {board.title}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 whitespace-pre-wrap text-slate-500">
                  {board.description || "보드 설명이 없습니다."}
                </p>
              </div>

              <div className="text-sm text-slate-400">{board.columns.length}개 컬럼</div>
            </div>

            {isError ? (
              <Card>
                <h2 className="font-semibold text-slate-900">카드 목록을 불러오지 못했습니다.</h2>

                <p className="mt-1 text-sm text-slate-500">잠시 후 다시 시도해주세요.</p>

                <div className="mt-4">
                  <Button type="button" variant="outline" onClick={() => void cardsQuery.refetch()}>
                    다시 불러오기
                  </Button>
                </div>
              </Card>
            ) : isLoading ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {board.columns.map((column) => (
                  <Skeleton key={column.id} className="h-96 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-4 overflow-x-auto pb-5">
                {board.columns.map((column) => {
                  const cards = cardsByColumn[column.id] ?? [];

                  return (
                    <section
                      key={column.id}
                      className="w-[330px] shrink-0 rounded-2xl border border-slate-200 bg-slate-100/80"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-800">{column.title}</h2>

                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-400 shadow-sm">
                            {cards.length}
                          </span>
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            aria-label={`${column.title}에 카드 추가`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-400 transition-colors hover:bg-white hover:text-blue-600"
                            onClick={() => openCreateModal(column.id)}
                          >
                            +
                          </button>
                        )}
                      </div>

                      <div className="min-h-[420px] space-y-3 p-3">
                        {cards.length === 0 ? (
                          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-5 text-center">
                            <p className="text-xs leading-5 text-slate-400">
                              아직 카드가 없습니다.
                              {canEdit && (
                                <>
                                  <br />
                                  아래에서 첫 카드를 만들어보세요.
                                </>
                              )}
                            </p>
                          </div>
                        ) : (
                          cards.map((card) => {
                            const formattedDueDate = formatDueDate(card.dueDate);

                            return (
                              <article
                                key={card.id}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="text-sm leading-5 font-semibold break-words text-slate-900">
                                    {card.title}
                                  </h3>

                                  <button
                                    type="button"
                                    className="shrink-0 text-lg leading-none text-slate-300 hover:text-slate-500"
                                    aria-label={`${card.title} 카드 메뉴`}
                                  >
                                    ···
                                  </button>
                                </div>

                                {card.description && (
                                  <p className="mt-2 line-clamp-3 text-xs leading-5 break-words whitespace-pre-wrap text-slate-500">
                                    {card.description}
                                  </p>
                                )}

                                <div className="mt-4 flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                                      {card.createdByNickname.charAt(0).toUpperCase()}
                                    </span>

                                    <span className="truncate text-[11px] text-slate-400">
                                      {card.createdByNickname}
                                    </span>
                                  </div>

                                  {formattedDueDate && (
                                    <span
                                      className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${getDueDateClassName(
                                        card.dueDate,
                                      )}`}
                                    >
                                      마감 {formattedDueDate}
                                    </span>
                                  )}
                                </div>
                              </article>
                            );
                          })
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 py-3 text-xs font-semibold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => openCreateModal(column.id)}
                          >
                            + 카드 추가
                          </button>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {!canEdit && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-700">VIEWER · 읽기 전용</p>

                <p className="mt-1 text-xs text-slate-500">
                  카드를 확인할 수 있지만 생성이나 수정은 할 수 없습니다.
                </p>
              </div>
            )}

            {board.columns.length === 0 && (
              <div className="mt-5">
                <EmptyState
                  title="컬럼이 없습니다."
                  description="이 보드에는 아직 사용할 수 있는 컬럼이 없습니다."
                />
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

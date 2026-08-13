import { useState, type CSSProperties, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail, type BoardColumnResponse } from "@/api/board";
import {
  createCard,
  getCardsByColumn,
  moveCard,
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

interface CardDragData {
  type: "card";
  cardId: number;
  columnId: number;
}

interface ColumnDragData {
  type: "column";
  columnId: number;
}

interface SortableCardProps {
  card: CardResponse;
  canDrag: boolean;
}

interface KanbanColumnProps {
  column: BoardColumnResponse;
  cards: CardResponse[];
  canEdit: boolean;
  canDrag: boolean;
  onCreateCard: (columnId: number) => void;
}

const getCardDndId = (cardId: number) => `card-${cardId}`;

const getColumnDndId = (columnId: number) => `column-${columnId}`;

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

const insertCardAtIndex = (cards: CardResponse[], card: CardResponse, targetIndex: number) => {
  const safeIndex = Math.max(0, Math.min(targetIndex, cards.length));

  const nextCards = [...cards];

  nextCards.splice(safeIndex, 0, card);

  return nextCards;
};

function CardContent({
  card,
  showDragHandle = false,
  dragHandleProps,
}: {
  card: CardResponse;
  showDragHandle?: boolean;
  dragHandleProps?: {
    ref?: (element: HTMLButtonElement | null) => void;
    attributes?: Record<string, unknown>;
    listeners?: Record<string, unknown>;
  };
}) {
  const formattedDueDate = formatDueDate(card.dueDate);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm leading-5 font-semibold break-words text-slate-900">{card.title}</h3>

        <div className="flex shrink-0 items-center gap-1">
          {showDragHandle && (
            <button
              ref={dragHandleProps?.ref}
              type="button"
              aria-label={`${card.title} 카드 이동`}
              className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-md text-base leading-none text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
              {...dragHandleProps?.attributes}
              {...dragHandleProps?.listeners}
            >
              ⠿
            </button>
          )}

          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
            aria-label={`${card.title} 카드 메뉴`}
          >
            ···
          </button>
        </div>
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

          <span className="truncate text-[11px] text-slate-400">{card.createdByNickname}</span>
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
    </>
  );
}

function SortableCard({ card, canDrag }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getCardDndId(card.id),

    data: {
      type: "card",
      cardId: card.id,
      columnId: card.columnId,
    } satisfies CardDragData,

    disabled: !canDrag,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),

    transition,

    opacity: isDragging ? 0.35 : 1,

    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <CardContent
        card={card}
        showDragHandle={canDrag}
        dragHandleProps={{
          ref: setActivatorNodeRef,

          attributes: attributes as unknown as Record<string, unknown>,

          listeners: listeners as unknown as Record<string, unknown>,
        }}
      />
    </article>
  );
}

function KanbanColumn({ column, cards, canEdit, canDrag, onCreateCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnDndId(column.id),

    data: {
      type: "column",
      columnId: column.id,
    } satisfies ColumnDragData,

    disabled: !canDrag,
  });

  return (
    <section
      ref={setNodeRef}
      className={`w-[330px] shrink-0 rounded-2xl border transition-colors ${
        isOver && canDrag ? "border-blue-300 bg-blue-50/70" : "border-slate-200 bg-slate-100/80"
      }`}
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
            onClick={() => onCreateCard(column.id)}
          >
            +
          </button>
        )}
      </div>

      <SortableContext
        items={cards.map((card) => getCardDndId(card.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[420px] space-y-3 p-3">
          {cards.length === 0 ? (
            <div
              className={`flex min-h-40 items-center justify-center rounded-xl border border-dashed px-5 text-center transition-colors ${
                isOver && canDrag
                  ? "border-blue-300 bg-blue-100/50"
                  : "border-slate-300 bg-white/50"
              }`}
            >
              <p className="text-xs leading-5 text-slate-400">
                {isOver && canDrag ? "여기에 카드를 놓으세요." : "아직 카드가 없습니다."}

                {!isOver && canEdit && (
                  <>
                    <br />
                    아래에서 첫 카드를 만들어보세요.
                  </>
                )}
              </p>
            </div>
          ) : (
            cards.map((card) => <SortableCard key={card.id} card={card} canDrag={canDrag} />)
          )}

          {canEdit && (
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 py-3 text-xs font-semibold text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => onCreateCard(column.id)}
            >
              + 카드 추가
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export default function BoardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [createColumnId, setCreateColumnId] = useState<number | null>(null);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  const [movingCardId, setMovingCardId] = useState<number | null>(null);

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,
  });

  const board = boardQuery.data;

  const columnIds = board?.columns.map((column) => column.id) ?? [];

  const cardsQueryKey = ["board", boardId, "cards", columnIds] as const;

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const cardsQuery = useQuery({
    queryKey: cardsQueryKey,

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

  const activeCard =
    activeCardId === null
      ? null
      : (Object.values(cardsByColumn)
          .flat()
          .find((card) => card.id === activeCardId) ?? null);

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

        dueDate: dueDate || null,
      },
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as CardDragData | undefined;

    if (!canEdit || !data || data.type !== "card") {
      return;
    }

    setActiveCardId(data.cardId);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCardId(null);

    if (!canEdit || movingCardId !== null) {
      return;
    }

    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeData = active.data.current as CardDragData | undefined;

    const overData = over.data.current as CardDragData | ColumnDragData | undefined;

    if (!activeData || activeData.type !== "card" || !overData) {
      return;
    }

    const cardId = activeData.cardId;

    const sourceColumnId = activeData.columnId;

    const targetColumnId = overData.columnId;

    const sourceCards = cardsByColumn[sourceColumnId] ?? [];

    const targetCards = cardsByColumn[targetColumnId] ?? [];

    const activeCard = sourceCards.find((card) => card.id === cardId);

    if (!activeCard) {
      return;
    }

    const sourceIndex = sourceCards.findIndex((card) => card.id === cardId);

    let targetIndex: number;

    if (overData.type === "card") {
      const overIndex = targetCards.findIndex((card) => card.id === overData.cardId);

      targetIndex = overIndex >= 0 ? overIndex : targetCards.length;
    } else if (sourceColumnId === targetColumnId) {
      /*
       * 같은 컬럼의 빈 영역으로 드롭하면
       * 맨 마지막 위치로 이동합니다.
       *
       * 백엔드는 이동하는 카드 자신을 제외한 뒤
       * targetIndex를 검사하기 때문에
       * 현재 길이 - 1이 마지막 유효 인덱스입니다.
       */
      targetIndex = Math.max(0, targetCards.length - 1);
    } else {
      /*
       * 다른 컬럼의 빈 영역으로 드롭하면
       * 해당 컬럼 맨 마지막에 넣습니다.
       */
      targetIndex = targetCards.length;
    }

    if (sourceColumnId === targetColumnId && sourceIndex === targetIndex) {
      return;
    }

    const previousCardsByColumn: CardsByColumn = Object.fromEntries(
      Object.entries(cardsByColumn).map(([columnId, cards]) => [Number(columnId), [...cards]]),
    );

    const nextCardsByColumn: CardsByColumn = Object.fromEntries(
      Object.entries(cardsByColumn).map(([columnId, cards]) => [Number(columnId), [...cards]]),
    );

    const sourceWithoutActive = sourceCards.filter((card) => card.id !== cardId);

    const movedCard: CardResponse = {
      ...activeCard,

      columnId: targetColumnId,
    };

    if (sourceColumnId === targetColumnId) {
      nextCardsByColumn[sourceColumnId] = insertCardAtIndex(
        sourceWithoutActive,
        movedCard,
        targetIndex,
      );
    } else {
      nextCardsByColumn[sourceColumnId] = sourceWithoutActive;

      nextCardsByColumn[targetColumnId] = insertCardAtIndex(targetCards, movedCard, targetIndex);
    }

    /*
     * 서버 응답을 기다리지 않고 먼저 화면을 이동시킵니다.
     * API 실패 시 아래 catch에서 원래 상태로 되돌립니다.
     */
    queryClient.setQueryData<CardsByColumn>(cardsQueryKey, nextCardsByColumn);

    setMovingCardId(cardId);

    try {
      await moveCard(cardId, {
        targetColumnId,
        targetIndex,
      });

      /*
       * 서버에서 새 LexoRank가 계산되었으므로
       * 최종 정렬 순서를 다시 받아옵니다.
       */
      await queryClient.invalidateQueries({
        queryKey: ["board", boardId, "cards"],
      });
    } catch {
      /*
       * API 실패 시 화면도 이동 전 상태로 복구합니다.
       */
      queryClient.setQueryData<CardsByColumn>(cardsQueryKey, previousCardsByColumn);

      toast.error("카드를 이동하지 못했습니다.");
    } finally {
      setMovingCardId(null);
    }
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

  const canDrag = Boolean(canEdit) && movingCardId === null;

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

            <Textarea
              id="card-description"
              label="설명"
              value={description}
              placeholder="카드에서 진행할 작업을 적어주세요."
              disabled={createMutation.isPending}
              onChange={(event) => setDescription(event.target.value)}
            />

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

              <div className="flex items-center gap-3">
                {movingCardId !== null && (
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600">
                    이동 저장 중...
                  </span>
                )}

                <span className="text-sm text-slate-400">{board.columns.length}개 컬럼</span>
              </div>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="flex items-start gap-4 overflow-x-auto pb-5">
                  {board.columns.map((column) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      cards={cardsByColumn[column.id] ?? []}
                      canEdit={Boolean(canEdit)}
                      canDrag={canDrag}
                      onCreateCard={openCreateModal}
                    />
                  ))}
                </div>

                <DragOverlay>
                  {activeCard ? (
                    <div className="w-[306px] rotate-2 rounded-xl border border-blue-200 bg-white p-4 shadow-2xl">
                      <CardContent card={activeCard} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {!canEdit && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-700">VIEWER · 읽기 전용</p>

                <p className="mt-1 text-xs text-slate-500">
                  카드를 확인할 수 있지만 생성하거나 이동할 수 없습니다.
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

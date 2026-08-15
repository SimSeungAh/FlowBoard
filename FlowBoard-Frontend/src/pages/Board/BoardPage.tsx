import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
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
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  useParams,
} from "react-router";
import { toast } from "sonner";

import {
  getBoardDetail,
  type BoardColumnResponse,
} from "@/api/board";
import {
  createCard,
  getCardsByColumn,
  moveCard,
  type CardCreateRequest,
  type CardResponse,
} from "@/api/card";
import CardDetailModal from "@/components/card/CardDetailModal";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";

type CardsByColumn =
  Record<number, CardResponse[]>;

interface CardDragData {
  type: "card";
  cardId: number;
  columnId: number;
}

interface ColumnDragData {
  type: "column";
  columnId: number;
}

interface SortableTaskProps {
  card: CardResponse;
  canDrag: boolean;
  onOpenCard: (
    cardId: number,
  ) => void;
}

interface KanbanColumnProps {
  column: BoardColumnResponse;
  cards: CardResponse[];
  canEdit: boolean;
  canDrag: boolean;
  onCreateCard: (
    columnId: number,
  ) => void;
  onOpenCard: (
    cardId: number,
  ) => void;
}

const getCardDndId = (
  cardId: number,
) => `card-${cardId}`;

const getColumnDndId = (
  columnId: number,
) => `column-${columnId}`;

const formatDueDate = (
  dueDate: string | null,
) => {
  if (!dueDate) {
    return null;
  }

  const date =
    new Date(dueDate);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
    },
  ).format(date);
};

const isOverdue = (
  dueDate: string | null,
) => {
  if (!dueDate) {
    return false;
  }

  const date =
    new Date(dueDate);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return false;
  }

  return (
    date.getTime() <
    Date.now()
  );
};

const getRoleLabel = (
  role:
    | "OWNER"
    | "MEMBER"
    | "VIEWER",
) => {
  switch (role) {
    case "OWNER":
      return "OWNER";

    case "MEMBER":
      return "MEMBER";

    case "VIEWER":
      return "VIEWER";
  }
};

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
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

function ActivityIcon() {
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
      <path d="M4 12h3l2-5 4 10 2-5h5" />
    </svg>
  );
}

function WhiteboardIcon() {
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

function DragIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4"
      fill="currentColor"
    >
      <circle
        cx="7"
        cy="5"
        r="1.1"
      />
      <circle
        cx="13"
        cy="5"
        r="1.1"
      />
      <circle
        cx="7"
        cy="10"
        r="1.1"
      />
      <circle
        cx="13"
        cy="10"
        r="1.1"
      />
      <circle
        cx="7"
        cy="15"
        r="1.1"
      />
      <circle
        cx="13"
        cy="15"
        r="1.1"
      />
    </svg>
  );
}

function TaskContent({
  card,
  showDragHandle = false,
  dragHandleProps,
  onOpenCard,
}: {
  card: CardResponse;
  showDragHandle?: boolean;
  dragHandleProps?: {
    ref?: (
      element:
        | HTMLButtonElement
        | null,
    ) => void;
    attributes?: Record<
      string,
      unknown
    >;
    listeners?: Record<
      string,
      unknown
    >;
  };
  onOpenCard?: () => void;
}) {
  const formattedDueDate =
    formatDueDate(
      card.dueDate,
    );

  const overdue =
    isOverdue(
      card.dueDate,
    );

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-[1.55] text-[var(--flow-text)]">
          {card.title}
        </h3>

        <div className="flex shrink-0 items-center gap-0.5">
          {showDragHandle && (
            <button
              ref={
                dragHandleProps?.ref
              }
              type="button"
              aria-label={`${card.title} 작업 이동`}
              className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded-md text-[var(--flow-gray-300)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)] active:cursor-grabbing"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
              {...dragHandleProps?.attributes}
              {...dragHandleProps?.listeners}
            >
              <DragIcon />
            </button>
          )}

          {onOpenCard && (
            <button
              type="button"
              aria-label={`${card.title} 작업 상세`}
              className="flex h-6 w-6 items-center justify-center rounded-md text-sm font-bold leading-none text-[var(--flow-gray-300)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)]"
              onClick={(
                event,
              ) => {
                event.stopPropagation();

                onOpenCard();
              }}
            >
              ···
            </button>
          )}
        </div>
      </div>

      {card.description && (
        <p className="mt-2 line-clamp-2 break-words whitespace-pre-wrap text-[11px] leading-5 text-[var(--flow-text-muted)]">
          {card.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-800)] text-[9px] font-bold text-white">
            {card.createdByNickname
              .charAt(0)
              .toUpperCase()}
          </span>

          <span className="max-w-[110px] truncate text-[10px] text-[var(--flow-text-muted)]">
            {
              card.createdByNickname
            }
          </span>
        </div>

        {formattedDueDate && (
          <span
            className={[
              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-semibold",
              overdue
                ? "bg-[var(--flow-danger-soft)] text-[var(--flow-danger)]"
                : "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
            ].join(" ")}
          >
            <CalendarIcon />

            {formattedDueDate}
          </span>
        )}
      </div>
    </>
  );
}

function SortableTask({
  card,
  canDrag,
  onOpenCard,
}: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getCardDndId(
      card.id,
    ),

    data: {
      type: "card",
      cardId: card.id,
      columnId:
        card.columnId,
    } satisfies CardDragData,

    disabled: !canDrag,
  });

  const style: CSSProperties =
    {
      transform:
        CSS.Transform.toString(
          transform,
        ),

      transition,

      opacity:
        isDragging
          ? 0.3
          : 1,

      zIndex:
        isDragging
          ? 10
          : undefined,
    };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[
        "group cursor-pointer rounded-lg border bg-white p-3.5",
        "border-[var(--flow-border)]",
        "shadow-[var(--flow-shadow-xs)]",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:-translate-y-px",
        "hover:border-[var(--flow-primary-200)]",
        "hover:shadow-[var(--flow-shadow-sm)]",
      ].join(" ")}
      onClick={() =>
        onOpenCard(
          card.id,
        )
      }
    >
      <TaskContent
        card={card}
        showDragHandle={
          canDrag
        }
        onOpenCard={() =>
          onOpenCard(
            card.id,
          )
        }
        dragHandleProps={{
          ref:
            setActivatorNodeRef,

          attributes:
            attributes as unknown as Record<
              string,
              unknown
            >,

          listeners:
            listeners as unknown as Record<
              string,
              unknown
            >,
        }}
      />
    </article>
  );
}

function KanbanColumn({
  column,
  cards,
  canEdit,
  canDrag,
  onCreateCard,
  onOpenCard,
}: KanbanColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: getColumnDndId(
      column.id,
    ),

    data: {
      type: "column",
      columnId:
        column.id,
    } satisfies ColumnDragData,

    disabled: !canDrag,
  });

  return (
    <section
      ref={setNodeRef}
      className={[
        "flex w-[304px] shrink-0 flex-col overflow-hidden rounded-xl border",
        "transition-[border-color,background-color] duration-150",
        isOver &&
        canDrag
          ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)]"
          : "border-[var(--flow-border)] bg-[var(--flow-gray-100)]",
      ].join(" ")}
    >
      <header className="flex h-[48px] shrink-0 items-center justify-between gap-3 border-b border-[var(--flow-border)] bg-white/80 px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--flow-primary)]" />

          <h2 className="truncate text-[12px] font-bold text-[var(--flow-text)]">
            {column.title}
          </h2>

          <span className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
            {cards.length}
          </span>
        </div>

        {canEdit && (
          <button
            type="button"
            aria-label={`${column.title}에 작업 추가`}
            title="새 작업"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
            onClick={() =>
              onCreateCard(
                column.id,
              )
            }
          >
            <PlusIcon />
          </button>
        )}
      </header>

      <SortableContext
        items={cards.map(
          (card) =>
            getCardDndId(
              card.id,
            ),
        )}
        strategy={
          verticalListSortingStrategy
        }
      >
        <div className="flex min-h-[520px] flex-1 flex-col gap-2.5 p-2.5">
          {cards.length ===
          0 ? (
            <div
              className={[
                "flex min-h-[120px] items-center justify-center rounded-lg border border-dashed px-5 text-center",
                "transition-colors",
                isOver &&
                canDrag
                  ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-100)]"
                  : "border-[var(--flow-gray-300)] bg-white/50",
              ].join(
                " ",
              )}
            >
              <p className="text-[10px] leading-5 text-[var(--flow-text-placeholder)]">
                {isOver &&
                canDrag
                  ? "여기에 작업을 놓으세요."
                  : "아직 작업이 없습니다."}
              </p>
            </div>
          ) : (
            cards.map(
              (card) => (
                <SortableTask
                  key={
                    card.id
                  }
                  card={
                    card
                  }
                  canDrag={
                    canDrag
                  }
                  onOpenCard={
                    onOpenCard
                  }
                />
              ),
            )
          )}

          {canEdit && (
            <button
              type="button"
              className="mt-auto flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--flow-gray-300)] bg-white/60 text-[10px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:border-[var(--flow-primary-300)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
              onClick={() =>
                onCreateCard(
                  column.id,
                )
              }
            >
              <PlusIcon />
              새 작업
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export default function BoardPage() {
  const {
    boardId: boardIdParam,
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

  const queryClient =
    useQueryClient();

  const sensors =
    useSensors(
      useSensor(
        PointerSensor,
        {
          activationConstraint:
            {
              distance: 6,
            },
        },
      ),

      useSensor(
        KeyboardSensor,
        {
          coordinateGetter:
            sortableKeyboardCoordinates,
        },
      ),
    );

  const [
    createModalOpen,
    setCreateModalOpen,
  ] =
    useState(false);

  const [
    createColumnId,
    setCreateColumnId,
  ] =
    useState<
      number | null
    >(null);

  const [
    selectedCardId,
    setSelectedCardId,
  ] =
    useState<
      number | null
    >(null);

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    dueDate,
    setDueDate,
  ] =
    useState("");

  const [
    activeCardId,
    setActiveCardId,
  ] =
    useState<
      number | null
    >(null);

  const [
    movingCardId,
    setMovingCardId,
  ] =
    useState<
      number | null
    >(null);

  const boardQuery =
    useQuery({
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

  const board =
    boardQuery.data;

  const columnIds =
    board?.columns.map(
      (column) =>
        column.id,
    ) ?? [];

  const cardsQueryKey =
    [
      "board",
      boardId,
      "cards",
      columnIds,
    ] as const;

  const canEdit =
    board?.myRole ===
      "OWNER" ||
    board?.myRole ===
      "MEMBER";

  const cardsQuery =
    useQuery({
      queryKey:
        cardsQueryKey,

      queryFn:
        async (): Promise<CardsByColumn> => {
          if (!board) {
            return {};
          }

          const entries =
            await Promise.all(
              board.columns.map(
                async (
                  column,
                ) => {
                  const cards =
                    await getCardsByColumn(
                      boardId,
                      column.id,
                    );

                  return [
                    column.id,
                    cards,
                  ] as const;
                },
              ),
            );

          return Object.fromEntries(
            entries,
          );
        },

      enabled:
        isValidBoardId &&
        Boolean(board),
    });

  const cardsByColumn =
    cardsQuery.data ??
    {};

  const allCards =
    useMemo(
      () =>
        Object.values(
          cardsByColumn,
        ).flat(),
      [
        cardsByColumn,
      ],
    );

  const activeCard =
    activeCardId ===
    null
      ? null
      : allCards.find(
          (card) =>
            card.id ===
            activeCardId,
        ) ?? null;

  const createMutation =
    useMutation({
      mutationFn: ({
        columnId,
        data,
      }: {
        columnId: number;
        data: CardCreateRequest;
      }) =>
        createCard(
          boardId,
          columnId,
          data,
        ),

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "board",
                boardId,
                "cards",
              ],
            },
          );

          toast.success(
            "작업을 만들었습니다.",
          );

          setCreateModalOpen(
            false,
          );

          setCreateColumnId(
            null,
          );

          setTitle("");
          setDescription(
            "",
          );
          setDueDate("");
        },

      onError: () => {
        toast.error(
          "작업을 생성하지 못했습니다.",
        );
      },
    });

  const openCreateModal =
    (
      columnId: number,
    ) => {
      if (!canEdit) {
        return;
      }

      setCreateColumnId(
        columnId,
      );

      setTitle("");
      setDescription(
        "",
      );
      setDueDate("");

      setCreateModalOpen(
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

      setCreateModalOpen(
        false,
      );

      setCreateColumnId(
        null,
      );
    };

  const handleCreateCard =
    (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        !createColumnId
      ) {
        return;
      }

      const trimmedTitle =
        title.trim();

      const trimmedDescription =
        description.trim();

      if (
        !trimmedTitle
      ) {
        toast.error(
          "작업 제목을 입력해주세요.",
        );

        return;
      }

      createMutation.mutate(
        {
          columnId:
            createColumnId,

          data: {
            title:
              trimmedTitle,

            description:
              trimmedDescription ||
              null,

            dueDate:
              dueDate ||
              null,
          },
        },
      );
    };

  const handleCardChanged =
    async () => {
      await queryClient.invalidateQueries(
        {
          queryKey: [
            "board",
            boardId,
            "cards",
          ],
        },
      );
    };

  const handleDragStart =
    (
      event: DragStartEvent,
    ) => {
      const data =
        event.active.data
          .current as
          | CardDragData
          | undefined;

      if (
        !canEdit ||
        !data ||
        data.type !==
          "card"
      ) {
        return;
      }

      setActiveCardId(
        data.cardId,
      );
    };

  const handleDragCancel =
    () => {
      setActiveCardId(
        null,
      );
    };

  const handleDragEnd =
    async (
      event: DragEndEvent,
    ) => {
      setActiveCardId(
        null,
      );

      if (
        !canEdit ||
        movingCardId !==
          null
      ) {
        return;
      }

      const {
        active,
        over,
      } = event;

      if (!over) {
        return;
      }

      const activeData =
        active.data
          .current as
          | CardDragData
          | undefined;

      const overData =
        over.data
          .current as
          | CardDragData
          | ColumnDragData
          | undefined;

      if (
        !activeData ||
        activeData.type !==
          "card" ||
        !overData
      ) {
        return;
      }

      const cardId =
        activeData.cardId;

      const sourceColumnId =
        activeData.columnId;

      const targetColumnId =
        overData.columnId;

      const sourceCards =
        cardsByColumn[
          sourceColumnId
        ] ?? [];

      const targetCards =
        cardsByColumn[
          targetColumnId
        ] ?? [];

      const activeCard =
        sourceCards.find(
          (card) =>
            card.id ===
            cardId,
        );

      if (!activeCard) {
        return;
      }

      const sourceIndex =
        sourceCards.findIndex(
          (card) =>
            card.id ===
            cardId,
        );

      let targetIndex:
        number;

      if (
        overData.type ===
        "card"
      ) {
        const overIndex =
          targetCards.findIndex(
            (card) =>
              card.id ===
              overData.cardId,
          );

        targetIndex =
          overIndex >= 0
            ? overIndex
            : targetCards.length;
      } else if (
        sourceColumnId ===
        targetColumnId
      ) {
        targetIndex =
          Math.max(
            0,
            targetCards.length -
              1,
          );
      } else {
        targetIndex =
          targetCards.length;
      }

      if (
        sourceColumnId ===
          targetColumnId &&
        sourceIndex ===
          targetIndex
      ) {
        return;
      }

      const previousCardsByColumn: CardsByColumn =
        Object.fromEntries(
          Object.entries(
            cardsByColumn,
          ).map(
            ([
              columnId,
              cards,
            ]) => [
              Number(
                columnId,
              ),
              [
                ...cards,
              ],
            ],
          ),
        );

      const nextCardsByColumn: CardsByColumn =
        Object.fromEntries(
          Object.entries(
            cardsByColumn,
          ).map(
            ([
              columnId,
              cards,
            ]) => [
              Number(
                columnId,
              ),
              [
                ...cards,
              ],
            ],
          ),
        );

      const sourceWithoutActive =
        sourceCards.filter(
          (card) =>
            card.id !==
            cardId,
        );

      const movedCard: CardResponse =
        {
          ...activeCard,

          columnId:
            targetColumnId,
        };

      if (
        sourceColumnId ===
        targetColumnId
      ) {
        nextCardsByColumn[
          sourceColumnId
        ] =
          insertCardAtIndex(
            sourceWithoutActive,
            movedCard,
            targetIndex,
          );
      } else {
        nextCardsByColumn[
          sourceColumnId
        ] =
          sourceWithoutActive;

        nextCardsByColumn[
          targetColumnId
        ] =
          insertCardAtIndex(
            targetCards,
            movedCard,
            targetIndex,
          );
      }

      queryClient.setQueryData<CardsByColumn>(
        cardsQueryKey,
        nextCardsByColumn,
      );

      setMovingCardId(
        cardId,
      );

      try {
        await moveCard(
          cardId,
          {
            targetColumnId,
            targetIndex,
          },
        );

        await queryClient.invalidateQueries(
          {
            queryKey: [
              "board",
              boardId,
              "cards",
            ],
          },
        );
      } catch {
        queryClient.setQueryData<CardsByColumn>(
          cardsQueryKey,
          previousCardsByColumn,
        );

        toast.error(
          "작업을 이동하지 못했습니다.",
        );
      } finally {
        setMovingCardId(
          null,
        );
      }
    };

  const insertCardAtIndex =
    (
      cards: CardResponse[],
      card: CardResponse,
      targetIndex: number,
    ) => {
      const safeIndex =
        Math.max(
          0,
          Math.min(
            targetIndex,
            cards.length,
          ),
        );

      const nextCards = [
        ...cards,
      ];

      nextCards.splice(
        safeIndex,
        0,
        card,
      );

      return nextCards;
    };

  if (
    !isValidBoardId
  ) {
    return (
      <section className="p-8">
        <div className="rounded-xl border border-[var(--flow-border)] bg-white p-6">
          <h1 className="text-lg font-bold text-[var(--flow-text)]">
            보드를 열 수
            없습니다.
          </h1>

          <p className="mt-2 text-sm text-[var(--flow-text-muted)]">
            올바른 보드 ID가
            필요합니다.
          </p>
        </div>
      </section>
    );
  }

  const isLoading =
    boardQuery.isLoading ||
    cardsQuery.isLoading;

  const isError =
    boardQuery.isError ||
    cardsQuery.isError;

  const canDrag =
    Boolean(canEdit) &&
    movingCardId ===
      null;

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
          Boolean(canEdit)
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

      <Modal
        open={
          createModalOpen
        }
        title="새 작업 만들기"
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
            handleCreateCard
          }
        >
          <div className="space-y-5">
            <Input
              label="작업 제목"
              value={
                title
              }
              required
              autoFocus
              maxLength={
                100
              }
              placeholder="예: 회원가입 플로우 검토"
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

            <Textarea
              id="card-description"
              label="설명"
              value={
                description
              }
              placeholder="기획, 디자인, 구현, 테스트, 보안 점검 등 진행할 내용을 적어주세요."
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

            <Input
              label="마감일"
              type="datetime-local"
              value={
                dueDate
              }
              disabled={
                createMutation.isPending
              }
              onChange={(
                event,
              ) =>
                setDueDate(
                  event
                    .target
                    .value,
                )
              }
            />
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
              작업 만들기
            </Button>
          </div>
        </form>
      </Modal>

      <section className="flex h-[calc(100vh-var(--flow-header-height)-48px)] min-h-[620px] flex-col overflow-hidden">
        {boardQuery.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-7 w-56" />

            <Skeleton className="mt-3 h-4 w-96" />

            <div className="mt-6 flex gap-3">
              {Array.from({
                length: 4,
              }).map(
                (
                  _,
                  index,
                ) => (
                  <Skeleton
                    key={
                      index
                    }
                    className="h-[560px] w-[304px] shrink-0 rounded-xl"
                  />
                ),
              )}
            </div>
          </div>
        ) : boardQuery.isError ||
          !board ? (
          <div className="p-6">
            <div className="rounded-xl border border-[var(--flow-border)] bg-white p-6">
              <h1 className="text-lg font-bold text-[var(--flow-text)]">
                보드를 불러오지
                못했습니다.
              </h1>

              <p className="mt-2 text-sm text-[var(--flow-text-muted)]">
                접근 권한과 로그인
                상태를 확인해주세요.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-5"
                onClick={() =>
                  void boardQuery.refetch()
                }
              >
                다시 불러오기
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Board header */}
            <header className="shrink-0 border-b border-[var(--flow-border)] bg-white px-6 py-4">
              <div className="flex items-center justify-between gap-8">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-[18px] font-bold tracking-[-0.02em] text-[var(--flow-text)]">
                      {
                        board.title
                      }
                    </h1>

                    <span className="rounded-md bg-[var(--flow-primary-50)] px-2 py-1 text-[9px] font-bold text-[var(--flow-primary)]">
                      {getRoleLabel(
                        board.myRole,
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    <p className="max-w-[640px] truncate text-[11px] text-[var(--flow-text-muted)]">
                      {board.description ||
                        "보드 설명이 없습니다."}
                    </p>

                    <span className="h-3 w-px bg-[var(--flow-border)]" />

                    <p className="text-[10px] text-[var(--flow-text-placeholder)]">
                      소유자{" "}
                      <strong className="font-semibold text-[var(--flow-text-secondary)]">
                        {
                          board.ownerNickname
                        }
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {movingCardId !==
                    null && (
                    <span className="mr-2 inline-flex items-center gap-2 rounded-md bg-[var(--flow-primary-50)] px-2.5 py-2 text-[10px] font-semibold text-[var(--flow-primary)]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                      이동 저장 중
                    </span>
                  )}

                  <Link
                    to={`/boards/${boardId}/search`}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[11px] font-semibold text-[var(--flow-text-secondary)] transition-colors hover:border-[var(--flow-primary-200)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
                  >
                    <SearchIcon />
                    작업 검색
                  </Link>

                  <Link
                    to={`/boards/${boardId}/whiteboard`}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[11px] font-semibold text-[var(--flow-text-secondary)] transition-colors hover:border-[var(--flow-primary-200)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
                  >
                    <WhiteboardIcon />
                    화이트보드
                  </Link>

                  <Link
                    to={`/boards/${boardId}/activities`}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[11px] font-semibold text-[var(--flow-text-secondary)] transition-colors hover:border-[var(--flow-primary-200)] hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)]"
                  >
                    <ActivityIcon />
                    활동
                  </Link>
                </div>
              </div>
            </header>

            {/* Board status */}
            <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-6">
              <div className="flex items-center gap-5 text-[10px]">
                <span className="text-[var(--flow-text-muted)]">
                  컬럼{" "}
                  <strong className="font-bold text-[var(--flow-text)]">
                    {
                      board.columns
                        .length
                    }
                  </strong>
                </span>

                <span className="text-[var(--flow-text-muted)]">
                  전체 작업{" "}
                  <strong className="font-bold text-[var(--flow-text)]">
                    {
                      allCards.length
                    }
                  </strong>
                </span>
              </div>

              {!canEdit && (
                <span className="rounded-md bg-[var(--flow-warning-soft)] px-2 py-1 text-[9px] font-bold text-[var(--flow-warning-dark)]">
                  VIEWER · 읽기 전용
                </span>
              )}
            </div>

            {/* Kanban */}
            <main className="min-h-0 flex-1 overflow-hidden">
              {isError ? (
                <div className="p-6">
                  <div className="rounded-xl border border-[var(--flow-border)] bg-white p-6">
                    <h2 className="text-sm font-bold text-[var(--flow-text)]">
                      작업 목록을
                      불러오지
                      못했습니다.
                    </h2>

                    <p className="mt-1 text-xs text-[var(--flow-text-muted)]">
                      잠시 후 다시
                      시도해주세요.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        void cardsQuery.refetch()
                      }
                    >
                      다시 불러오기
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex gap-3 overflow-hidden p-4">
                  {board.columns.map(
                    (
                      column,
                    ) => (
                      <Skeleton
                        key={
                          column.id
                        }
                        className="h-full min-h-[520px] w-[304px] shrink-0 rounded-xl"
                      />
                    ),
                  )}
                </div>
              ) : board
                  .columns
                  .length ===
                0 ? (
                <div className="p-6">
                  <EmptyState
                    title="컬럼이 없습니다."
                    description="이 보드에는 아직 사용할 수 있는 컬럼이 없습니다."
                  />
                </div>
              ) : (
                <DndContext
                  sensors={
                    sensors
                  }
                  collisionDetection={
                    closestCenter
                  }
                  onDragStart={
                    handleDragStart
                  }
                  onDragEnd={
                    handleDragEnd
                  }
                  onDragCancel={
                    handleDragCancel
                  }
                >
                  <div className="flex h-full items-start gap-3 overflow-x-auto overflow-y-hidden p-4">
                    {board.columns.map(
                      (
                        column,
                      ) => (
                        <KanbanColumn
                          key={
                            column.id
                          }
                          column={
                            column
                          }
                          cards={
                            cardsByColumn[
                              column.id
                            ] ??
                            []
                          }
                          canEdit={
                            Boolean(
                              canEdit,
                            )
                          }
                          canDrag={
                            canDrag
                          }
                          onCreateCard={
                            openCreateModal
                          }
                          onOpenCard={
                            setSelectedCardId
                          }
                        />
                      ),
                    )}
                  </div>

                  <DragOverlay>
                    {activeCard ? (
                      <div className="w-[280px] rotate-[1.5deg] rounded-lg border border-[var(--flow-primary-200)] bg-white p-3.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                        <TaskContent
                          card={
                            activeCard
                          }
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </main>
          </>
        )}
      </section>
    </>
  );
}
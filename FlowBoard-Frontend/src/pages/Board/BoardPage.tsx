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
import { useParams } from "react-router";
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
import { getBoardMembers } from "@/api/cardAssignee";
import { getBoardTags } from "@/api/tag";
import CardDetailModal from "@/components/card/CardDetailModal";
import TaskCreateMetadataFields from "@/components/card/TaskCreateMetadataFields";
import TaskTemplateSelector from "@/components/card/TaskTemplateSelector";
import TestCaseTypeSelector from "@/components/card/TestCaseTypeSelector";
import ColumnSettingsModal from "@/components/board/ColumnSettingsModal";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";
import { applyTaskCreationRelations } from "@/features/card/applyTaskCreationRelations";
import { createTaskTemplateChecklists } from "@/features/card/createTaskTemplateChecklists";
import {
  DEFAULT_TASK_TEMPLATE_ID,
  DEFAULT_TEST_CASE_TYPE_ID,
  getTaskDescriptionTemplate,
  getTestCaseType,
  type TaskTemplateId,
  type TestCaseTypeId,
} from "@/features/card/taskTemplates";

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

interface SortableTaskProps {
  card: CardResponse;
  canDrag: boolean;
  onOpenCard: (cardId: number) => void;
}

interface KanbanColumnProps {
  column: BoardColumnResponse;
  cards: CardResponse[];
  canEdit: boolean;
  canDrag: boolean;
  onCreateCard: (columnId: number) => void;
  onOpenCard: (cardId: number) => void;
}

const getCardDndId = (cardId: number) => `card-${cardId}`;
const getColumnDndId = (columnId: number) => `column-${columnId}`;

const insertCardAtIndex = (
  cards: CardResponse[],
  card: CardResponse,
  targetIndex: number,
) => {
  const safeIndex = Math.max(
    0,
    Math.min(targetIndex, cards.length),
  );

  const nextCards = [...cards];
  nextCards.splice(safeIndex, 0, card);

  return nextCards;
};

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

const isOverdue = (dueDate: string | null) => {
  if (!dueDate) {
    return false;
  }

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() < Date.now();
};

const getRoleLabel = (
  role: "OWNER" | "MEMBER" | "VIEWER",
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

function SettingsIcon() {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

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
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M4 9.5h16" />
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
      <circle cx="7" cy="5" r="1.1" />
      <circle cx="13" cy="5" r="1.1" />
      <circle cx="7" cy="10" r="1.1" />
      <circle cx="13" cy="10" r="1.1" />
      <circle cx="7" cy="15" r="1.1" />
      <circle cx="13" cy="15" r="1.1" />
    </svg>
  );
}

function TaskContent({
  card,
  showDragHandle = false,
  dragHandle,
  onOpenCard,
}: {
  card: CardResponse;
  showDragHandle?: boolean;
  dragHandle?: {
    setActivatorNodeRef: (node: HTMLElement | null) => void;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  };
  onOpenCard?: () => void;
}) {
  const dueDate = formatDueDate(card.dueDate);
  const overdue = isOverdue(card.dueDate);

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[14px] font-semibold leading-[1.55] tracking-[-0.01em] text-[var(--flow-text)]">
            {card.title}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {showDragHandle && dragHandle && (
            <button
              ref={dragHandle.setActivatorNodeRef}
              type="button"
              aria-label={`${card.title} 이동`}
              className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-lg text-[var(--flow-gray-400)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)] active:cursor-grabbing"
              onClick={(event) => {
                event.stopPropagation();
              }}
              {...dragHandle.attributes}
              {...dragHandle.listeners}
            >
              <DragIcon />
            </button>
          )}

          {onOpenCard && (
            <button
              type="button"
              aria-label={`${card.title} 상세 보기`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-base font-bold leading-none text-[var(--flow-gray-400)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)]"
              onClick={(event) => {
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
        <p className="mt-3 line-clamp-2 whitespace-pre-wrap break-words text-[12px] leading-[1.7] text-[var(--flow-text-muted)]">
          {card.description}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-800)] text-[10px] font-bold text-white">
            {card.createdByNickname.charAt(0).toUpperCase()}
          </span>

          <span className="max-w-[120px] truncate text-[11px] text-[var(--flow-text-muted)]">
            {card.createdByNickname}
          </span>
        </div>

        {dueDate && (
          <span
            className={[
              "inline-flex shrink-0 items-center gap-1.5",
              "rounded-lg px-2 py-1.5",
              "text-[10px] font-semibold",
              overdue
                ? "bg-[var(--flow-danger-soft)] text-[var(--flow-danger)]"
                : "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
            ].join(" ")}
          >
            <CalendarIcon />
            {dueDate}
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
    opacity: isDragging ? 0.28 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[
        "group cursor-pointer",
        "rounded-[var(--flow-radius-md)]",
        "border border-[var(--flow-border)]",
        "bg-white p-4",
        "shadow-[var(--flow-shadow-xs)]",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:-translate-y-px",
        "hover:border-[var(--flow-primary-200)]",
        "hover:shadow-[var(--flow-shadow-sm)]",
      ].join(" ")}
      onClick={() => onOpenCard(card.id)}
    >
      <TaskContent
        card={card}
        showDragHandle={canDrag}
        onOpenCard={() => onOpenCard(card.id)}
        dragHandle={{
          setActivatorNodeRef,
          attributes,
          listeners,
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
      className={[
        "flex w-[320px] min-w-[320px] shrink-0 flex-col",
        "rounded-[var(--flow-radius-lg)]",
        "border",
        "transition-[border-color,background-color] duration-150",
        isOver && canDrag
          ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)]"
          : "border-[var(--flow-border)] bg-[var(--flow-surface-muted)]",
      ].join(" ")}
    >
      <header className="flex min-h-[58px] shrink-0 items-center justify-between gap-4 border-b border-[var(--flow-border)] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--flow-primary)]" />

          <h2 className="truncate text-[14px] font-bold tracking-[-0.01em] text-[var(--flow-text)]">
            {column.title}
          </h2>

          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-[var(--flow-text-muted)]">
            {cards.length}
          </span>
        </div>

        {canEdit && (
          <button
            type="button"
            title="새 작업"
            aria-label={`${column.title}에 작업 추가`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--flow-text-muted)] transition-colors hover:bg-white hover:text-[var(--flow-primary)]"
            onClick={() => onCreateCard(column.id)}
          >
            <PlusIcon />
          </button>
        )}
      </header>

      <SortableContext
        items={cards.map((card) => getCardDndId(card.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[500px] flex-1 flex-col gap-3 p-3">
          {cards.length === 0 ? (
            <div
              className={[
                "flex min-h-[150px] items-center justify-center",
                "rounded-[var(--flow-radius-md)]",
                "border border-dashed px-6 text-center",
                isOver && canDrag
                  ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-100)]"
                  : "border-[var(--flow-gray-300)] bg-white/60",
              ].join(" ")}
            >
              <p className="text-[12px] leading-6 text-[var(--flow-text-placeholder)]">
                {isOver && canDrag
                  ? "여기에 작업을 놓으세요."
                  : "아직 등록된 작업이 없습니다."}
              </p>
            </div>
          ) : (
            cards.map((card) => (
              <SortableTask
                key={card.id}
                card={card}
                canDrag={canDrag}
                onOpenCard={onOpenCard}
              />
            ))
          )}

          {canEdit && (
            <button
              type="button"
              className={[
                "mt-1 flex min-h-11 w-full shrink-0 items-center justify-center gap-2",
                "rounded-[var(--flow-radius-md)]",
                "border border-dashed border-[var(--flow-gray-300)]",
                "bg-white/60",
                "text-[12px] font-semibold text-[var(--flow-text-muted)]",
                "transition-colors",
                "hover:border-[var(--flow-primary-300)]",
                "hover:bg-[var(--flow-primary-50)]",
                "hover:text-[var(--flow-primary)]",
              ].join(" ")}
              onClick={() => onCreateCard(column.id)}
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
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId =
    Number.isInteger(boardId) && boardId > 0;

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
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taskTemplateId, setTaskTemplateId] =
    useState<TaskTemplateId>(DEFAULT_TASK_TEMPLATE_ID);
  const [testCaseTypeId, setTestCaseTypeId] =
    useState<TestCaseTypeId>(DEFAULT_TEST_CASE_TYPE_ID);
  const [selectedAssigneeUserIds, setSelectedAssigneeUserIds] =
    useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [movingCardId, setMovingCardId] = useState<number | null>(null);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: isValidBoardId,
  });

  const board = boardQuery.data;

  const columnIds = board?.columns.map((column) => column.id) ?? [];

  const cardsQueryKey = [
    "board",
    boardId,
    "cards",
    columnIds,
  ] as const;

  const canEdit =
    board?.myRole === "OWNER" ||
    board?.myRole === "MEMBER";

  const canManageColumns = board?.myRole === "OWNER";

  const createMembersQuery = useQuery({
    queryKey: ["boards", boardId, "members"],
    queryFn: () => getBoardMembers(boardId),
    enabled: createModalOpen && isValidBoardId && Boolean(canEdit),
  });

  const createTagsQuery = useQuery({
    queryKey: ["boards", boardId, "tags"],
    queryFn: () => getBoardTags(boardId),
    enabled: createModalOpen && isValidBoardId && Boolean(canEdit),
  });

  const cardsQuery = useQuery({
    queryKey: cardsQueryKey,
    queryFn: async (): Promise<CardsByColumn> => {
      if (!board) {
        return {};
      }

      const entries = await Promise.all(
        board.columns.map(async (column) => {
          const cards = await getCardsByColumn(
            boardId,
            column.id,
          );

          return [column.id, cards] as const;
        }),
      );

      return Object.fromEntries(entries);
    },
    enabled: isValidBoardId && Boolean(board),
  });

  const cardsByColumn = cardsQuery.data ?? {};

  const allCards = useMemo(
    () => Object.values(cardsByColumn).flat(),
    [cardsByColumn],
  );

  const activeCard =
    activeCardId === null
      ? null
      : allCards.find((card) => card.id === activeCardId) ?? null;

  const createMutation = useMutation({
    mutationFn: ({
      columnId,
      data,
    }: {
      columnId: number;
      data: CardCreateRequest;
      templateId: TaskTemplateId;
      assigneeUserIds: number[];
      tagIds: number[];
    }) => createCard(boardId, columnId, data),

    onSuccess: async (createdCard, variables) => {
      let checklistFailed = false;

      try {
        await createTaskTemplateChecklists(
          createdCard.id,
          variables.templateId,
        );
      } catch {
        checklistFailed = true;
      }

      const relationsResult = await applyTaskCreationRelations(
        createdCard.id,
        variables.assigneeUserIds,
        variables.tagIds,
      );

      await queryClient.invalidateQueries({
        queryKey: ["board", boardId, "cards"],
      });

      const failedParts: string[] = [];

      if (checklistFailed) {
        failedParts.push("체크리스트");
      }

      if (relationsResult.assigneeFailureCount > 0) {
        failedParts.push("담당자");
      }

      if (relationsResult.tagFailureCount > 0) {
        failedParts.push("태그");
      }

      if (failedParts.length === 0) {
        toast.success("작업을 만들었습니다.");
      } else {
        toast.warning(
          `작업은 만들었지만 ${failedParts.join(", ")} 일부를 반영하지 못했습니다.`,
        );
      }

      setCreateModalOpen(false);
      setCreateColumnId(null);
      setTitle("");
      setDescription("");
      setDueDate("");
      setTaskTemplateId(DEFAULT_TASK_TEMPLATE_ID);
      setTestCaseTypeId(DEFAULT_TEST_CASE_TYPE_ID);
      setSelectedAssigneeUserIds([]);
      setSelectedTagIds([]);
    },

    onError: () => {
      toast.error("작업을 생성하지 못했습니다.");
    },
  });

  const openCreateModal = (columnId: number) => {
    if (!canEdit) {
      return;
    }

    setCreateColumnId(columnId);

    setTitle("");
    setTaskTemplateId(DEFAULT_TASK_TEMPLATE_ID);
    setTestCaseTypeId(DEFAULT_TEST_CASE_TYPE_ID);
    setDescription(
      getTaskDescriptionTemplate(
        DEFAULT_TASK_TEMPLATE_ID,
        DEFAULT_TEST_CASE_TYPE_ID,
      ),
    );
    setDueDate("");
    setSelectedAssigneeUserIds([]);
    setSelectedTagIds([]);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) {
      return;
    }

    setCreateModalOpen(false);
    setCreateColumnId(null);
    setTaskTemplateId(DEFAULT_TASK_TEMPLATE_ID);
    setTestCaseTypeId(DEFAULT_TEST_CASE_TYPE_ID);
    setSelectedAssigneeUserIds([]);
    setSelectedTagIds([]);
  };

  const handleTaskTemplateChange = (templateId: TaskTemplateId) => {
    setTaskTemplateId(templateId);

    if (templateId === "test-case") {
      setTestCaseTypeId(DEFAULT_TEST_CASE_TYPE_ID);
      setDescription(
        getTaskDescriptionTemplate(
          templateId,
          DEFAULT_TEST_CASE_TYPE_ID,
        ),
      );
      return;
    }

    setDescription(
      getTaskDescriptionTemplate(templateId),
    );
  };

  const handleTestCaseTypeChange = (
    nextTestCaseTypeId: TestCaseTypeId,
  ) => {
    setTestCaseTypeId(nextTestCaseTypeId);
    setDescription(
      getTaskDescriptionTemplate(
        "test-case",
        nextTestCaseTypeId,
      ),
    );
  };

  const handleCreateCard = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (createColumnId === null) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("작업 제목을 입력해주세요.");
      return;
    }

    createMutation.mutate({
      columnId: createColumnId,
      templateId: taskTemplateId,
      assigneeUserIds: selectedAssigneeUserIds,
      tagIds: selectedTagIds,
      data: {
        title: trimmedTitle,
        description: trimmedDescription || null,
        dueDate: dueDate || null,
      },
    });
  };

  const handleCardChanged = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["board", boardId, "cards"],
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | CardDragData
      | undefined;

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

    const activeData = active.data.current as
      | CardDragData
      | undefined;

    const overData = over.data.current as
      | CardDragData
      | ColumnDragData
      | undefined;

    if (
      !activeData ||
      activeData.type !== "card" ||
      !overData
    ) {
      return;
    }

    const cardId = activeData.cardId;
    const sourceColumnId = activeData.columnId;
    const targetColumnId = overData.columnId;

    const sourceCards = cardsByColumn[sourceColumnId] ?? [];
    const targetCards = cardsByColumn[targetColumnId] ?? [];

    const movingCard = sourceCards.find(
      (card) => card.id === cardId,
    );

    if (!movingCard) {
      return;
    }

    const sourceIndex = sourceCards.findIndex(
      (card) => card.id === cardId,
    );

    let targetIndex: number;

    if (overData.type === "card") {
      const overIndex = targetCards.findIndex(
        (card) => card.id === overData.cardId,
      );

      targetIndex =
        overIndex >= 0
          ? overIndex
          : targetCards.length;
    } else if (sourceColumnId === targetColumnId) {
      targetIndex = Math.max(
        0,
        targetCards.length - 1,
      );
    } else {
      targetIndex = targetCards.length;
    }

    if (
      sourceColumnId === targetColumnId &&
      sourceIndex === targetIndex
    ) {
      return;
    }

    const previousCardsByColumn: CardsByColumn =
      Object.fromEntries(
        Object.entries(cardsByColumn).map(
          ([columnId, cards]) => [
            Number(columnId),
            [...cards],
          ],
        ),
      );

    const nextCardsByColumn: CardsByColumn =
      Object.fromEntries(
        Object.entries(cardsByColumn).map(
          ([columnId, cards]) => [
            Number(columnId),
            [...cards],
          ],
        ),
      );

    const sourceWithoutMovingCard = sourceCards.filter(
      (card) => card.id !== cardId,
    );

    const movedCard: CardResponse = {
      ...movingCard,
      columnId: targetColumnId,
    };

    if (sourceColumnId === targetColumnId) {
      nextCardsByColumn[sourceColumnId] = insertCardAtIndex(
        sourceWithoutMovingCard,
        movedCard,
        targetIndex,
      );
    } else {
      nextCardsByColumn[sourceColumnId] =
        sourceWithoutMovingCard;

      nextCardsByColumn[targetColumnId] = insertCardAtIndex(
        targetCards,
        movedCard,
        targetIndex,
      );
    }

    queryClient.setQueryData<CardsByColumn>(
      cardsQueryKey,
      nextCardsByColumn,
    );

    setMovingCardId(cardId);

    try {
      await moveCard(cardId, {
        targetColumnId,
        targetIndex,
      });

      await queryClient.invalidateQueries({
        queryKey: ["board", boardId, "cards"],
      });
    } catch {
      queryClient.setQueryData<CardsByColumn>(
        cardsQueryKey,
        previousCardsByColumn,
      );

      toast.error("작업을 이동하지 못했습니다.");
    } finally {
      setMovingCardId(null);
    }
  };

  if (!isValidBoardId) {
    return (
      <section className="p-8">
        <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-xl font-bold text-[var(--flow-text)]">
            보드를 열 수 없습니다.
          </h1>

          <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
            올바른 보드 주소인지 확인해주세요.
          </p>
        </div>
      </section>
    );
  }

  const isLoading =
    boardQuery.isLoading || cardsQuery.isLoading;

  const canDrag = Boolean(canEdit) && movingCardId === null;

  const createTitlePlaceholder =
    taskTemplateId === "test-case"
      ? getTestCaseType(testCaseTypeId).titleExample
      : "예: 회원가입 플로우 검토";

  return (
    <>
      <CardDetailModal
        open={selectedCardId !== null}
        cardId={selectedCardId}
        canEdit={Boolean(canEdit)}
        onClose={() => setSelectedCardId(null)}
        onChanged={handleCardChanged}
      />

      {board && canManageColumns && (
        <ColumnSettingsModal
          open={columnSettingsOpen}
          boardId={boardId}
          columns={board.columns}
          onClose={() => setColumnSettingsOpen(false)}
        />
      )}

      <Modal
        open={createModalOpen}
        title="새 작업 만들기"
        size="lg"
        closeOnBackdrop={!createMutation.isPending}
        closeOnEsc={!createMutation.isPending}
        onClose={closeCreateModal}
      >
        <form onSubmit={handleCreateCard}>
          <div className="space-y-7">
            <TaskTemplateSelector
              value={taskTemplateId}
              disabled={createMutation.isPending}
              onChange={handleTaskTemplateChange}
            />

            {taskTemplateId === "test-case" && (
              <TestCaseTypeSelector
                value={testCaseTypeId}
                disabled={createMutation.isPending}
                onChange={handleTestCaseTypeChange}
              />
            )}

            <Input
              label="작업 제목"
              value={title}
              required
              autoFocus
              maxLength={100}
              placeholder={createTitlePlaceholder}
              helperText={`${title.length}/100`}
              disabled={createMutation.isPending}
              onChange={(event) =>
                setTitle(event.target.value)
              }
            />

            <Textarea
              id="card-description"
              label="설명"
              value={description}
              placeholder="기획, 디자인, 구현, 테스트, 보안 점검 등 진행할 내용을 적어주세요."
              disabled={createMutation.isPending}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />

            <Input
              label="마감일"
              type="datetime-local"
              value={dueDate}
              disabled={createMutation.isPending}
              onChange={(event) =>
                setDueDate(event.target.value)
              }
            />

            <TaskCreateMetadataFields
              members={createMembersQuery.data ?? []}
              tags={createTagsQuery.data ?? []}
              selectedAssigneeUserIds={selectedAssigneeUserIds}
              selectedTagIds={selectedTagIds}
              membersLoading={createMembersQuery.isLoading}
              membersError={createMembersQuery.isError}
              tagsLoading={createTagsQuery.isLoading}
              tagsError={createTagsQuery.isError}
              disabled={createMutation.isPending}
              onAssigneeUserIdsChange={setSelectedAssigneeUserIds}
              onTagIdsChange={setSelectedTagIds}
              onRetryMembers={() => {
                void createMembersQuery.refetch();
              }}
              onRetryTags={() => {
                void createTagsQuery.refetch();
              }}
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-[var(--flow-border)] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={closeCreateModal}
            >
              취소
            </Button>

            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={!title.trim()}
            >
              작업 만들기
            </Button>
          </div>
        </form>
      </Modal>

      {/*
       * 중요:
       * min-height가 아니라 실제 viewport 높이를 고정한다.
       * 그래야 칸반의 가로 스크롤바가 현재 화면의 맨 아래에 보인다.
       */}
      <section className="flex h-[calc(100vh-var(--flow-header-height)-48px)] min-h-0 flex-col overflow-hidden">
        {boardQuery.isLoading ? (
          <div className="p-8">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="mt-3 h-4 w-[420px]" />

            <div className="mt-8 flex gap-5 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-[560px] w-[320px] shrink-0 rounded-[var(--flow-radius-lg)]"
                />
              ))}
            </div>
          </div>
        ) : boardQuery.isError || !board ? (
          <div className="p-8">
            <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
              <h1 className="text-xl font-bold text-[var(--flow-text)]">
                보드를 불러오지 못했습니다.
              </h1>

              <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                접근 권한과 로그인 상태를 확인해주세요.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => void boardQuery.refetch()}
              >
                다시 불러오기
              </Button>
            </div>
          </div>
        ) : (
          <>
            <header className="shrink-0 bg-white px-8 py-6">
              <div className="flex items-center justify-between gap-10">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h1 className="truncate text-[22px] font-bold tracking-[-0.025em] text-[var(--flow-text)]">
                      {board.title}
                    </h1>

                    <span className="shrink-0 rounded-lg bg-[var(--flow-primary-50)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--flow-primary)]">
                      {getRoleLabel(board.myRole)}
                    </span>
                  </div>

                  <div className="mt-2 flex min-w-0 items-center gap-4">
                    <p className="max-w-[620px] truncate text-[13px] text-[var(--flow-text-muted)]">
                      {board.description || "보드 설명이 없습니다."}
                    </p>

                    <span className="h-4 w-px shrink-0 bg-[var(--flow-border)]" />

                    <span className="shrink-0 text-[12px] text-[var(--flow-text-muted)]">
                      소유자{" "}
                      <strong className="font-semibold text-[var(--flow-text-secondary)]">
                        {board.ownerNickname}
                      </strong>
                    </span>
                  </div>
                </div>

                {canManageColumns && (
                  <div className="shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      leftIcon={<SettingsIcon />}
                      onClick={() => setColumnSettingsOpen(true)}
                    >
                      워크플로우 설정
                    </Button>
                  </div>
                )}
              </div>
            </header>

            <div className="flex min-h-[48px] shrink-0 items-center justify-between border-y border-[var(--flow-border)] bg-[var(--flow-surface-subtle)] px-8">
              <div className="flex items-center gap-6 text-[12px] text-[var(--flow-text-muted)]">
                <span className="whitespace-nowrap">
                  컬럼{" "}
                  <strong className="font-bold text-[var(--flow-text)]">
                    {board.columns.length}
                  </strong>
                </span>

                <span className="whitespace-nowrap">
                  전체 작업{" "}
                  <strong className="font-bold text-[var(--flow-text)]">
                    {allCards.length}
                  </strong>
                </span>

                {movingCardId !== null && (
                  <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-[var(--flow-primary)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                    이동 저장 중
                  </span>
                )}
              </div>

              {!canEdit && (
                <span className="whitespace-nowrap rounded-lg bg-[var(--flow-warning-soft)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--flow-warning-dark)]">
                  읽기 전용
                </span>
              )}
            </div>

            {/*
             * min-h-0가 핵심이다.
             * flex 자식이 부모 높이 밖으로 커지는 것을 막는다.
             */}
            <main className="min-h-0 flex-1 overflow-hidden bg-[var(--flow-background)]">
              {cardsQuery.isError ? (
                <div className="p-8">
                  <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
                    <h2 className="text-lg font-bold text-[var(--flow-text)]">
                      작업 목록을 불러오지 못했습니다.
                    </h2>

                    <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                      잠시 후 다시 시도해주세요.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-6"
                      onClick={() => void cardsQuery.refetch()}
                    >
                      다시 불러오기
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex h-full gap-5 overflow-hidden p-6">
                  {board.columns.map((column) => (
                    <Skeleton
                      key={column.id}
                      className="h-[560px] w-[320px] shrink-0 rounded-[var(--flow-radius-lg)]"
                    />
                  ))}
                </div>
              ) : board.columns.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="컬럼이 없습니다."
                    description="이 보드에는 아직 사용할 수 있는 컬럼이 없습니다."
                  />
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  {/*
                   * 가로/세로 스크롤은 이 한 영역이 전담한다.
                   * 따라서 현재 노트북 화면에서도 오른쪽 컬럼이 잘리면
                   * 화면 아래에 바로 가로 스크롤바가 나타난다.
                   */}
                  <div className="h-full min-h-0 overflow-x-auto overflow-y-auto overscroll-contain">
                    <div className="flex min-h-full w-max min-w-full items-start gap-5 p-6 pb-8">
                      {board.columns.map((column) => (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          cards={cardsByColumn[column.id] ?? []}
                          canEdit={Boolean(canEdit)}
                          canDrag={canDrag}
                          onCreateCard={openCreateModal}
                          onOpenCard={setSelectedCardId}
                        />
                      ))}
                    </div>
                  </div>

                  <DragOverlay>
                    {activeCard ? (
                      <div className="w-[320px] rotate-[1deg] rounded-[var(--flow-radius-md)] border border-[var(--flow-primary-200)] bg-white p-4 shadow-[var(--flow-shadow-lg)]">
                        <TaskContent card={activeCard} />
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
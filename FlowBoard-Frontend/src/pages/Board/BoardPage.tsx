import { useMemo, useState, type CSSProperties, type SubmitEvent } from "react";

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

import { useNavigate, useParams } from "react-router";

import { toast } from "sonner";

import { getBoardDetail, type BoardColumnResponse } from "@/api/board";

import { searchCards, type CardDueDateFilter } from "@/api/cardSearch";

import {
  createCard,
  getCardsByColumn,
  moveCard,
  type CardCreateRequest,
  type CardResponse,
  type CardTaskType,
  type TestCaseResult,
} from "@/api/card";

import { getBoardMembers } from "@/api/cardAssignee";

import { getBoardTags } from "@/api/tag";

import CardDetailModal from "@/components/card/CardDetailModal";

import TaskCreateMetadataFields from "@/components/card/TaskCreateMetadataFields";

import TaskTemplateSelector from "@/components/card/TaskTemplateSelector";

import TestCaseTypeSelector from "@/components/card/TestCaseTypeSelector";

import ColumnSettingsModal from "@/components/board/ColumnSettingsModal";

import KanbanBoardHeader from "@/components/board/KanbanBoardHeader";

import KanbanFilterBar from "@/components/board/KanbanFilterBar";

import Button from "@/components/ui/Button";

import EmptyState from "@/components/ui/EmptyState";

import Input from "@/components/ui/Input";

import Modal from "@/components/ui/Modal";

import Skeleton from "@/components/ui/Skeleton";

import Textarea from "@/components/ui/Textarea";

import { applyTaskCreationRelations } from "@/features/card/applyTaskCreationRelations";

import { createTaskTemplateChecklists } from "@/features/card/createTaskTemplateChecklists";

import { getApiTestCaseType, getCardTaskType } from "@/features/card/taskTypeMapping";

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

  totalCardCount: number;

  filtersActive: boolean;

  canEdit: boolean;

  canDrag: boolean;

  onCreateCard: (columnId: number) => void;

  onOpenCard: (cardId: number) => void;
}

const getCardDndId = (cardId: number) => `card-${cardId}`;

const getColumnDndId = (columnId: number) => `column-${columnId}`;

const getTemplateIdForTaskType = (taskType: CardTaskType | ""): TaskTemplateId => {
  switch (taskType) {
    case "BUG":
      return "bug";

    case "TEST_CASE":
      return "test-case";

    case "DESIGN_REVIEW":
      return "design-review";

    case "REQUIREMENT":
      return "requirements";

    case "SECURITY_REVIEW":
      return "security-review";

    case "RELEASE_CHECK":
      return "release-check";

    case "GENERAL":
    case "":
      return DEFAULT_TASK_TEMPLATE_ID;
  }
};

const insertCardAtIndex = (
  cards: CardResponse[],

  card: CardResponse,

  targetIndex: number,
) => {
  const safeIndex = Math.max(0, Math.min(targetIndex, cards.length));

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

const TASK_TYPE_META: Record<
  CardTaskType,
  {
    label: string;
    className: string;
  }
> = {
  GENERAL: {
    label: "일반",

    className:
      "border-[var(--flow-border-strong)] bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]",
  },

  BUG: {
    label: "버그",

    className: "border-red-200 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
  },

  TEST_CASE: {
    label: "테스트",

    className: "border-emerald-200 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
  },

  DESIGN_REVIEW: {
    label: "디자인 리뷰",

    className:
      "border-[var(--flow-border-strong)] bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]",
  },

  REQUIREMENT: {
    label: "요구사항",

    className:
      "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  },

  SECURITY_REVIEW: {
    label: "보안 점검",

    className: "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
  },

  RELEASE_CHECK: {
    label: "릴리즈",

    className:
      "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  },
};

const TEST_CASE_RESULT_META: Record<
  TestCaseResult,
  {
    label: string;
    className: string;
  }
> = {
  NOT_RUN: {
    label: "미실행",

    className: "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
  },

  PASS: {
    label: "PASS",

    className: "bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
  },

  FAIL: {
    label: "FAIL",

    className: "bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
  },

  BLOCKED: {
    label: "BLOCKED",

    className: "bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
  },
};

function TaskTypeBadge({ taskType }: { taskType: CardTaskType }) {
  const meta = TASK_TYPE_META[taskType];

  return (
    <span
      className={[
        "inline-flex h-[18px] items-center rounded-md border px-1.5",
        "text-[8px] leading-none font-bold tracking-[-0.01em]",
        meta.className,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}

function TestCaseResultBadge({ result }: { result: TestCaseResult }) {
  const meta = TEST_CASE_RESULT_META[result];

  return (
    <span
      className={[
        "inline-flex h-[18px] items-center rounded-md px-1.5",
        "text-[8px] leading-none font-bold tracking-[0.01em]",
        meta.className,
      ].join(" ")}
    >
      {meta.label}
    </span>
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

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3 w-3"
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
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
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
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[9px] font-semibold tracking-[0.03em] text-[var(--flow-text-placeholder)]">
            #{card.id}
          </span>

          <TaskTypeBadge taskType={card.taskType} />

          {card.taskType === "TEST_CASE" && card.testCaseResult && (
            <TestCaseResultBadge result={card.testCaseResult} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {showDragHandle && dragHandle && (
            <button
              ref={dragHandle.setActivatorNodeRef}
              type="button"
              aria-label={`${card.title} 이동`}
              className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded-md text-[var(--flow-gray-400)] opacity-0 transition-[opacity,background-color,color] group-hover:opacity-100 hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)] focus-visible:opacity-100 active:cursor-grabbing"
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
              className="flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none font-bold text-[var(--flow-gray-400)] opacity-0 transition-[opacity,background-color,color] group-hover:opacity-100 hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)] focus-visible:opacity-100"
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

      <h3 className="line-clamp-2 min-h-[38px] text-[13px] leading-[1.45] font-semibold tracking-[-0.015em] break-words text-[var(--flow-text)]">
        {card.title}
      </h3>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--flow-border)] pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-800)] text-[9px] font-bold text-white">
            {card.createdByNickname.charAt(0).toUpperCase()}
          </span>

          <span className="max-w-[90px] truncate text-[9px] font-semibold text-[var(--flow-text-muted)]">
            {card.createdByNickname}
          </span>
        </div>

        {dueDate && (
          <span
            className={[
              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1",
              "text-[9px] font-semibold",

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

function SortableTask({ card, canDrag, onOpenCard }: SortableTaskProps) {
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
        "rounded-xl border border-[var(--flow-border)]",
        "bg-white px-3 py-3",
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
  totalCardCount,
  filtersActive,
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
        "flex h-full w-[288px] min-w-[288px] shrink-0 flex-col overflow-hidden",
        "rounded-xl border",
        "transition-[border-color,background-color] duration-150",

        isOver && canDrag
          ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)]"
          : "border-[var(--flow-border)] bg-[var(--flow-gray-50)]",
      ].join(" ")}
    >
      <div className="h-[3px] shrink-0 bg-[var(--flow-primary)]" />

      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--flow-border)] bg-white px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--flow-primary)]" />

          <h2 className="truncate text-[13px] font-bold tracking-[-0.01em] text-[var(--flow-text)]">
            {column.title}
          </h2>

          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-100)] px-1.5 text-[9px] font-semibold text-[var(--flow-text-muted)]">
            {filtersActive ? `${cards.length}/${totalCardCount}` : cards.length}
          </span>
        </div>

        {canEdit && (
          <button
            type="button"
            title="새 작업"
            aria-label={`${column.title}에 작업 추가`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-primary)]"
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
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5"
          style={{
            scrollbarGutter: "stable",
          }}
        >
          <div className="flex min-h-full flex-col gap-2.5">
            {cards.length === 0 ? (
              <div
                className={[
                  "flex min-h-[120px] items-center justify-center",
                  "rounded-lg border border-dashed px-4 text-center",

                  isOver && canDrag
                    ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-100)]"
                    : "border-[var(--flow-gray-300)] bg-white/60",
                ].join(" ")}
              >
                <p className="text-[11px] leading-5 text-[var(--flow-text-placeholder)]">
                  {isOver && canDrag
                    ? "여기에 작업을 놓으세요."
                    : filtersActive && totalCardCount > 0
                      ? "현재 필터에 맞는 작업이 없습니다."
                      : "아직 등록된 작업이 없습니다."}
                </p>
              </div>
            ) : (
              cards.map((card) => (
                <SortableTask key={card.id} card={card} canDrag={canDrag} onOpenCard={onOpenCard} />
              ))
            )}

            {canEdit && (
              <button
                type="button"
                className="flex min-h-8 w-full shrink-0 items-center justify-start gap-1.5 rounded-md px-2 text-[10px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-white hover:text-[var(--flow-primary)]"
                onClick={() => onCreateCard(column.id)}
              >
                <PlusIcon />
                작업 추가
              </button>
            )}
          </div>
        </div>
      </SortableContext>
    </section>
  );
}

export default function BoardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const navigate = useNavigate();

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

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [taskTemplateId, setTaskTemplateId] = useState<TaskTemplateId>(DEFAULT_TASK_TEMPLATE_ID);

  const [testCaseTypeId, setTestCaseTypeId] = useState<TestCaseTypeId>(DEFAULT_TEST_CASE_TYPE_ID);

  const [selectedAssigneeUserIds, setSelectedAssigneeUserIds] = useState<number[]>([]);

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  const [movingCardId, setMovingCardId] = useState<number | null>(null);

  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const [taskTypeFilter, setTaskTypeFilter] = useState<CardTaskType | "">("");

  const [assigneeFilter, setAssigneeFilter] = useState("");

  const [tagFilter, setTagFilter] = useState("");

  const [dueDateFilter, setDueDateFilter] = useState<CardDueDateFilter | "">("");

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,
  });

  const board = boardQuery.data;

  const columnIds = board?.columns.map((column) => column.id) ?? [];

  const cardsQueryKey = ["board", boardId, "cards", columnIds] as const;

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const canManageColumns = board?.myRole === "OWNER";

  const boardMembersQuery = useQuery({
    queryKey: ["boards", boardId, "members"],

    queryFn: () => getBoardMembers(boardId),

    enabled: isValidBoardId && Boolean(board),

    staleTime: 30_000,
  });

  const boardTagsQuery = useQuery({
    queryKey: ["boards", boardId, "tags"],

    queryFn: () => getBoardTags(boardId),

    enabled: isValidBoardId && Boolean(board),

    staleTime: 30_000,
  });

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

  const cardsByColumn: CardsByColumn = cardsQuery.data ?? {};

  const allCards = useMemo(
    () => Object.values(cardsByColumn).flat(),

    [cardsByColumn],
  );

  const metadataFiltersActive = assigneeFilter !== "" || tagFilter !== "" || dueDateFilter !== "";

  const filtersActive = taskTypeFilter !== "" || metadataFiltersActive;

  const filterSearchQuery = useQuery({
    queryKey: [
      "boards",
      boardId,
      "card-search",
      "kanban-filter",
      assigneeFilter,
      tagFilter,
      dueDateFilter,
    ],

    queryFn: () =>
      searchCards(boardId, {
        assigneeId: assigneeFilter ? Number(assigneeFilter) : undefined,

        tagId: tagFilter ? Number(tagFilter) : undefined,

        dueDateFilter: dueDateFilter || undefined,
      }),

    enabled: isValidBoardId && Boolean(board) && metadataFiltersActive,

    placeholderData: (previousData) => previousData,
  });

  const matchingCardIds = useMemo(() => {
    if (!metadataFiltersActive) {
      return null;
    }

    return new Set((filterSearchQuery.data ?? []).map((card) => card.id));
  }, [metadataFiltersActive, filterSearchQuery.data]);

  const filteredCardsByColumn = useMemo<CardsByColumn>(() => {
    const entries = Object.entries(cardsByColumn).map(([columnId, cards]) => {
      const filteredCards = cards.filter((card) => {
        if (taskTypeFilter && card.taskType !== taskTypeFilter) {
          return false;
        }

        if (matchingCardIds && !matchingCardIds.has(card.id)) {
          return false;
        }

        return true;
      });

      return [Number(columnId), filteredCards] as const;
    });

    return Object.fromEntries(entries);
  }, [cardsByColumn, matchingCardIds, taskTypeFilter]);

  const filteredCardCount = useMemo(
    () => Object.values(filteredCardsByColumn).reduce((count, cards) => count + cards.length, 0),

    [filteredCardsByColumn],
  );

  const activeCard =
    activeCardId === null ? null : (allCards.find((card) => card.id === activeCardId) ?? null);

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
        await createTaskTemplateChecklists(createdCard.id, variables.templateId);
      } catch {
        checklistFailed = true;
      }

      const relationsResult = await applyTaskCreationRelations(
        createdCard.id,
        variables.assigneeUserIds,
        variables.tagIds,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "cards"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "card-search"],
        }),
      ]);

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
        toast.warning(`작업은 만들었지만 ${failedParts.join(", ")} 일부를 반영하지 못했습니다.`);
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

    const initialTemplateId = getTemplateIdForTaskType(taskTypeFilter);

    setCreateColumnId(columnId);

    setTitle("");

    setTaskTemplateId(initialTemplateId);

    setTestCaseTypeId(DEFAULT_TEST_CASE_TYPE_ID);

    setDescription(getTaskDescriptionTemplate(initialTemplateId, DEFAULT_TEST_CASE_TYPE_ID));

    setDueDate("");

    setSelectedAssigneeUserIds(assigneeFilter ? [Number(assigneeFilter)] : []);

    setSelectedTagIds(tagFilter ? [Number(tagFilter)] : []);

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

      setDescription(getTaskDescriptionTemplate(templateId, DEFAULT_TEST_CASE_TYPE_ID));

      return;
    }

    setDescription(getTaskDescriptionTemplate(templateId));
  };

  const handleTestCaseTypeChange = (nextTestCaseTypeId: TestCaseTypeId) => {
    setTestCaseTypeId(nextTestCaseTypeId);

    setDescription(getTaskDescriptionTemplate("test-case", nextTestCaseTypeId));
  };

  const handleCreateCard = (event: SubmitEvent<HTMLFormElement>) => {
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

        taskType: getCardTaskType(taskTemplateId),

        testCaseType: taskTemplateId === "test-case" ? getApiTestCaseType(testCaseTypeId) : null,
      },
    });
  };

  const handleCardChanged = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["board", boardId, "cards"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["boards", boardId, "card-search"],
      }),
    ]);
  };

  const resetFilters = () => {
    setTaskTypeFilter("");

    setAssigneeFilter("");

    setTagFilter("");

    setDueDateFilter("");
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

    /*
     * 필터를 적용했더라도 순서 계산은
     * 반드시 전체 카드 목록을 기준으로 합니다.
     *
     * 따라서 담당자 / 태그 / 작업 유형 필터를
     * 사용하는 중에도 DnD가 가능하며,
     * 변경 결과는 전체 보드의 LexoRank에 반영됩니다.
     */
    const sourceCards = cardsByColumn[sourceColumnId] ?? [];

    const targetCards = cardsByColumn[targetColumnId] ?? [];

    const movingCard = sourceCards.find((card) => card.id === cardId);

    if (!movingCard) {
      return;
    }

    const sourceIndex = sourceCards.findIndex((card) => card.id === cardId);

    let targetIndex: number;

    if (overData.type === "card") {
      const overIndex = targetCards.findIndex((card) => card.id === overData.cardId);

      targetIndex = overIndex >= 0 ? overIndex : targetCards.length;
    } else if (sourceColumnId === targetColumnId) {
      targetIndex = Math.max(0, targetCards.length - 1);
    } else {
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

    const sourceWithoutMovingCard = sourceCards.filter((card) => card.id !== cardId);

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
      nextCardsByColumn[sourceColumnId] = sourceWithoutMovingCard;

      nextCardsByColumn[targetColumnId] = insertCardAtIndex(targetCards, movedCard, targetIndex);
    }

    queryClient.setQueryData<CardsByColumn>(cardsQueryKey, nextCardsByColumn);

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
      queryClient.setQueryData<CardsByColumn>(cardsQueryKey, previousCardsByColumn);

      toast.error("작업을 이동하지 못했습니다.");
    } finally {
      setMovingCardId(null);
    }
  };

  if (!isValidBoardId) {
    return (
      <section className="p-8">
        <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-xl font-bold text-[var(--flow-text)]">보드를 열 수 없습니다.</h1>

          <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
            올바른 보드 주소인지 확인해주세요.
          </p>
        </div>
      </section>
    );
  }

  const isLoading = boardQuery.isLoading || cardsQuery.isLoading;

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
        onClose={() => {
          setSelectedCardId(null);

          void queryClient.invalidateQueries({
            queryKey: ["boards", boardId, "card-search"],
          });
        }}
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
          <div className="space-y-8">
            <section>
              <TaskTemplateSelector
                value={taskTemplateId}
                disabled={createMutation.isPending}
                onChange={handleTaskTemplateChange}
              />

              {taskTemplateId === "test-case" && (
                <div className="mt-5 rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-4">
                  <TestCaseTypeSelector
                    value={testCaseTypeId}
                    disabled={createMutation.isPending}
                    onChange={handleTestCaseTypeChange}
                  />
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--flow-primary-50)] text-[10px] font-bold text-[var(--flow-primary)]">
                  1
                </span>

                <div>
                  <h3 className="text-[13px] font-bold text-[var(--flow-text)]">작업 내용</h3>

                  <p className="mt-0.5 text-[10px] text-[var(--flow-text-muted)]">
                    제목과 설명은 생성 후에도 언제든 수정할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="space-y-5 pl-9">
                <Input
                  label="작업 제목"
                  value={title}
                  required
                  autoFocus
                  maxLength={100}
                  placeholder={createTitlePlaceholder}
                  helperText={`${title.length}/100`}
                  disabled={createMutation.isPending}
                  onChange={(event) => setTitle(event.target.value)}
                />

                <Textarea
                  id="card-description"
                  label="설명"
                  value={description}
                  placeholder="작업에 필요한 내용을 자유롭게 작성해주세요."
                  disabled={createMutation.isPending}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--flow-primary-50)] text-[10px] font-bold text-[var(--flow-primary)]">
                  2
                </span>

                <div>
                  <h3 className="text-[13px] font-bold text-[var(--flow-text)]">일정</h3>

                  <p className="mt-0.5 text-[10px] text-[var(--flow-text-muted)]">
                    필요할 때만 마감일을 지정하세요.
                  </p>
                </div>
              </div>

              <div className="pl-9">
                <Input
                  label="마감일"
                  type="datetime-local"
                  value={dueDate}
                  disabled={createMutation.isPending}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--flow-primary-50)] text-[10px] font-bold text-[var(--flow-primary)]">
                  3
                </span>

                <div>
                  <h3 className="text-[13px] font-bold text-[var(--flow-text)]">협업 정보</h3>

                  <p className="mt-0.5 text-[10px] text-[var(--flow-text-muted)]">
                    담당자와 보드 태그는 선택 사항입니다.
                  </p>
                </div>
              </div>

              <div className="pl-9">
                <TaskCreateMetadataFields
                  members={boardMembersQuery.data ?? []}
                  tags={boardTagsQuery.data ?? []}
                  selectedAssigneeUserIds={selectedAssigneeUserIds}
                  selectedTagIds={selectedTagIds}
                  membersLoading={boardMembersQuery.isLoading}
                  membersError={boardMembersQuery.isError}
                  tagsLoading={boardTagsQuery.isLoading}
                  tagsError={boardTagsQuery.isError}
                  disabled={createMutation.isPending}
                  onAssigneeUserIdsChange={setSelectedAssigneeUserIds}
                  onTagIdsChange={setSelectedTagIds}
                  onRetryMembers={() => {
                    void boardMembersQuery.refetch();
                  }}
                  onRetryTags={() => {
                    void boardTagsQuery.refetch();
                  }}
                />
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 -mx-1 mt-8 flex items-center justify-between gap-4 border-t border-[var(--flow-border)] bg-white px-1 pt-5">
            <p className="text-[10px] text-[var(--flow-text-placeholder)]">
              * 작업 제목만 필수입니다.
            </p>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={createMutation.isPending}
                onClick={closeCreateModal}
              >
                취소
              </Button>

              <Button type="submit" loading={createMutation.isPending} disabled={!title.trim()}>
                작업 만들기
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <section className="flex h-[calc(100vh-var(--flow-header-height)-48px)] min-h-0 flex-col overflow-hidden">
        {boardQuery.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-7 w-64" />

            <Skeleton className="mt-2 h-4 w-80" />

            <div className="mt-5 flex gap-3 overflow-hidden">
              {Array.from({
                length: 5,
              }).map((_, index) => (
                <Skeleton key={index} className="h-[620px] w-[288px] shrink-0 rounded-xl" />
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
            <KanbanBoardHeader
              boardTitle={board.title}
              boardDescription={board.description}
              ownerNickname={board.ownerNickname}
              role={board.myRole}
              columnCount={board.columns.length}
              cardCount={allCards.length}
              moving={movingCardId !== null}
              canManageColumns={Boolean(canManageColumns)}
              readOnly={!canEdit}
              onOpenSearch={() => navigate(`/boards/${boardId}/search`)}
              onOpenWorkflowSettings={() => setColumnSettingsOpen(true)}
            />

            <KanbanFilterBar
              taskType={taskTypeFilter}
              assigneeId={assigneeFilter}
              tagId={tagFilter}
              dueDateFilter={dueDateFilter}
              members={boardMembersQuery.data ?? []}
              tags={boardTagsQuery.data ?? []}
              totalCount={allCards.length}
              filteredCount={filteredCardCount}
              active={filtersActive}
              loading={metadataFiltersActive && filterSearchQuery.isFetching}
              error={metadataFiltersActive && filterSearchQuery.isError}
              onTaskTypeChange={setTaskTypeFilter}
              onAssigneeIdChange={setAssigneeFilter}
              onTagIdChange={setTagFilter}
              onDueDateFilterChange={setDueDateFilter}
              onReset={resetFilters}
            />

            <main className="min-h-0 flex-1 overflow-hidden bg-[var(--flow-background)]">
              {cardsQuery.isError ? (
                <div className="p-6">
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
                <div className="flex h-full gap-3 overflow-hidden p-3.5">
                  {board.columns.map((column) => (
                    <Skeleton key={column.id} className="h-full w-[288px] shrink-0 rounded-xl" />
                  ))}
                </div>
              ) : board.columns.length === 0 ? (
                <div className="p-6">
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
                  <div className="h-full min-h-0 overflow-x-auto overflow-y-hidden overscroll-x-contain">
                    <div className="flex h-full min-w-max items-stretch gap-3 p-3.5 pb-4">
                      {board.columns.map((column) => (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          cards={filteredCardsByColumn[column.id] ?? []}
                          totalCardCount={(cardsByColumn[column.id] ?? []).length}
                          filtersActive={filtersActive}
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
                      <div className="w-[288px] rotate-[1deg] rounded-xl border border-[var(--flow-primary-200)] bg-white px-3 py-3 shadow-[var(--flow-shadow-lg)]">
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

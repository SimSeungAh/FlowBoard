import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BoardColumnResponse } from "@/api/board";
import {
  createBoardColumn,
  deleteBoardColumn,
  reorderBoardColumns,
  updateBoardColumn,
} from "@/api/boardColumn";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

interface ColumnSettingsModalProps {
  open: boolean;
  boardId: number;
  columns: BoardColumnResponse[];
  onClose: () => void;
}

interface SortableColumnRowProps {
  column: BoardColumnResponse;
  index: number;
  disabled: boolean;
  editing: boolean;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

const getColumnSortableId = (columnId: number) =>
  `workflow-column-${columnId}`;

function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="currentColor"
    >
      <circle cx="7" cy="5" r="1.15" />
      <circle cx="13" cy="5" r="1.15" />
      <circle cx="7" cy="10" r="1.15" />
      <circle cx="13" cy="10" r="1.15" />
      <circle cx="7" cy="15" r="1.15" />
      <circle cx="13" cy="15" r="1.15" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <path d="m14.5 6.7 2.8 2.8" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M4 7h16" />
      <path d="M9 3h6" />
      <path d="m6 7 1 14h10l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function SortableColumnRow({
  column,
  index,
  disabled,
  editing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getColumnSortableId(column.id),
    disabled: disabled || editing,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex min-h-[72px] items-center gap-3",
        "rounded-[var(--flow-radius-md)]",
        "border border-[var(--flow-border)]",
        "bg-white px-3.5 py-3",
        "shadow-[var(--flow-shadow-xs)]",
        isDragging ? "border-[var(--flow-primary-300)]" : "",
      ].join(" ")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`${column.title} 순서 이동`}
        disabled={disabled || editing}
        className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-[var(--flow-gray-400)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text-secondary)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-35"
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--flow-primary-50)] px-2 text-[11px] font-bold text-[var(--flow-primary)]">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={editTitle}
              maxLength={50}
              autoFocus
              disabled={disabled}
              className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[13px] font-semibold text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
              onChange={(event) => onEditTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSaveEdit();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelEdit();
                }
              }}
            />

            <Button
              type="button"
              size="sm"
              disabled={!editTitle.trim() || disabled}
              onClick={onSaveEdit}
            >
              저장
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={onCancelEdit}
            >
              취소
            </Button>
          </div>
        ) : (
          <>
            <p className="truncate text-[13px] font-bold text-[var(--flow-text)]">
              {column.title}
            </p>
            <p className="mt-1 text-[11px] text-[var(--flow-text-muted)]">
              워크플로우 {index + 1}단계
            </p>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`${column.title} 이름 변경`}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-primary)] disabled:cursor-not-allowed disabled:opacity-35"
            onClick={onStartEdit}
          >
            <EditIcon />
          </button>

          <button
            type="button"
            aria-label={`${column.title} 삭제`}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)] disabled:cursor-not-allowed disabled:opacity-35"
            onClick={onDelete}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ColumnSettingsModal({
  open,
  boardId,
  columns,
  onClose,
}: ColumnSettingsModalProps) {
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

  const orderedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  const [localColumns, setLocalColumns] =
    useState<BoardColumnResponse[]>(orderedColumns);
  const [newTitle, setNewTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BoardColumnResponse | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLocalColumns(orderedColumns);
    setNewTitle("");
    setEditingColumnId(null);
    setEditTitle("");
    setDeleteTarget(null);
  }, [open, orderedColumns]);

  const refreshBoard = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["boards", boardId],
    });
  };

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      createBoardColumn(boardId, {
        title,
      }),
    onSuccess: async () => {
      setNewTitle("");
      await refreshBoard();
      toast.success("새 컬럼을 추가했습니다.");
    },
    onError: () => {
      toast.error("컬럼을 추가하지 못했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      columnId,
      title,
    }: {
      columnId: number;
      title: string;
    }) =>
      updateBoardColumn(boardId, columnId, {
        title,
      }),
    onSuccess: async () => {
      setEditingColumnId(null);
      setEditTitle("");
      await refreshBoard();
      toast.success("컬럼 이름을 변경했습니다.");
    },
    onError: () => {
      toast.error("컬럼 이름을 변경하지 못했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (columnId: number) => deleteBoardColumn(boardId, columnId),
    onSuccess: async () => {
      setDeleteTarget(null);
      await refreshBoard();
      toast.success("컬럼을 삭제했습니다.");
    },
    onError: () => {
      toast.error(
        "컬럼을 삭제하지 못했습니다. 작업이 남아 있거나 마지막 컬럼인지 확인해주세요.",
      );
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (columnIds: number[]) =>
      reorderBoardColumns(boardId, {
        columnIds,
      }),
    onSuccess: async () => {
      await refreshBoard();
      toast.success("컬럼 순서를 변경했습니다.");
    },
    onError: () => {
      toast.error("컬럼 순서를 저장하지 못했습니다.");
    },
  });

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newTitle.trim();

    if (!title || isBusy) {
      return;
    }

    createMutation.mutate(title);
  };

  const startEdit = (column: BoardColumnResponse) => {
    if (isBusy) {
      return;
    }

    setEditingColumnId(column.id);
    setEditTitle(column.title);
  };

  const saveEdit = () => {
    if (editingColumnId === null || isBusy) {
      return;
    }

    const title = editTitle.trim();

    if (!title) {
      toast.error("컬럼 이름을 입력해주세요.");
      return;
    }

    const current = localColumns.find((column) => column.id === editingColumnId);

    if (current?.title === title) {
      setEditingColumnId(null);
      setEditTitle("");
      return;
    }

    updateMutation.mutate({
      columnId: editingColumnId,
      title,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isBusy) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localColumns.findIndex(
      (column) => getColumnSortableId(column.id) === active.id,
    );
    const newIndex = localColumns.findIndex(
      (column) => getColumnSortableId(column.id) === over.id,
    );

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousColumns = localColumns;
    const nextColumns = arrayMove(localColumns, oldIndex, newIndex).map(
      (column, index) => ({
        ...column,
        position: index,
      }),
    );

    setLocalColumns(nextColumns);

    reorderMutation.mutate(
      nextColumns.map((column) => column.id),
      {
        onError: () => {
          setLocalColumns(previousColumns);
        },
      },
    );
  };

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        title="워크플로우 설정"
        size="lg"
        closeOnBackdrop={!isBusy}
        closeOnEsc={!isBusy}
        onClose={handleClose}
      >
        <div>
          <div className="rounded-[var(--flow-radius-md)] bg-[var(--flow-gray-50)] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[var(--flow-text-secondary)]">
              컬럼이 개발 흐름의 단계가 됩니다.
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--flow-text-muted)]">
              기획 → 디자인 → 개발 → QA → 배포처럼 자유롭게 구성할 수 있습니다.
              왼쪽 드래그 핸들을 잡아 순서를 바꾸세요.
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--flow-text)]">
                  현재 컬럼
                </h3>
                <p className="mt-1 text-[11px] text-[var(--flow-text-muted)]">
                  총 {localColumns.length}개
                </p>
              </div>

              {reorderMutation.isPending && (
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--flow-primary)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                  순서 저장 중
                </span>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localColumns.map((column) => getColumnSortableId(column.id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-4 space-y-2.5">
                  {localColumns.map((column, index) => (
                    <SortableColumnRow
                      key={column.id}
                      column={column}
                      index={index}
                      disabled={isBusy}
                      editing={editingColumnId === column.id}
                      editTitle={editTitle}
                      onEditTitleChange={setEditTitle}
                      onStartEdit={() => startEdit(column)}
                      onCancelEdit={() => {
                        setEditingColumnId(null);
                        setEditTitle("");
                      }}
                      onSaveEdit={saveEdit}
                      onDelete={() => setDeleteTarget(column)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="mt-7 border-t border-[var(--flow-border)] pt-6">
            <h3 className="text-[14px] font-bold text-[var(--flow-text)]">
              새 컬럼 추가
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-[var(--flow-text-muted)]">
              새 컬럼은 현재 워크플로우의 마지막 단계에 추가됩니다.
            </p>

            <form className="mt-4 flex items-end gap-3" onSubmit={handleCreate}>
              <div className="min-w-0 flex-1">
                <Input
                  label="컬럼 이름"
                  value={newTitle}
                  maxLength={50}
                  placeholder="예: 코드 리뷰, QA, 배포"
                  helperText={`${newTitle.length}/50`}
                  disabled={isBusy}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                loading={createMutation.isPending}
                disabled={!newTitle.trim() || isBusy}
              >
                컬럼 추가
              </Button>
            </form>
          </div>

          <div className="mt-6 rounded-[var(--flow-radius-md)] border border-[var(--flow-border)] px-4 py-3.5">
            <p className="text-[11px] font-semibold text-[var(--flow-text-secondary)]">
              삭제 안전장치
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--flow-text-muted)]">
              작업이 들어 있는 컬럼은 삭제할 수 없습니다. 먼저 작업을 다른 컬럼으로
              이동해주세요. 보드에는 최소 1개의 컬럼이 유지됩니다.
            </p>
          </div>

          <div className="mt-7 flex justify-end border-t border-[var(--flow-border)] pt-5">
            <Button type="button" variant="outline" disabled={isBusy} onClick={handleClose}>
              닫기
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="컬럼 삭제"
        description={
          deleteTarget
            ? `\"${deleteTarget.title}\" 컬럼을 삭제할까요? 작업이 들어 있는 컬럼은 삭제되지 않습니다.`
            : undefined
        }
        confirmText="컬럼 삭제"
        cancelText="취소"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
          } catch {
            // mutation onError에서 안내합니다.
          }
        }}
        onCancel={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
import {
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createChecklist,
  createChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  getChecklists,
  toggleChecklistItem,
  updateChecklist,
  updateChecklistItem,
  type ChecklistResponse,
} from "@/api/checklist";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";

interface ChecklistSectionProps {
  cardId: number;
  canEdit: boolean;
}

interface EditingItemState {
  itemId: number;
  content: string;
}

const getProgress = (
  checklist: ChecklistResponse,
) => {
  const total =
    checklist.items.length;

  const completed =
    checklist.items.filter(
      (item) =>
        item.checked,
    ).length;

  const percent =
    total === 0
      ? 0
      : Math.round(
          (completed / total) *
            100,
        );

  return {
    total,
    completed,
    percent,
  };
};

export default function ChecklistSection({
  cardId,
  canEdit,
}: ChecklistSectionProps) {
  const queryClient =
    useQueryClient();

  const queryKey = [
    "cards",
    cardId,
    "checklists",
  ] as const;

  const [
    newChecklistTitle,
    setNewChecklistTitle,
  ] =
    useState("");

  const [
    newItemContents,
    setNewItemContents,
  ] =
    useState<
      Record<number, string>
    >({});

  const [
    editingChecklistId,
    setEditingChecklistId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    editingChecklistTitle,
    setEditingChecklistTitle,
  ] =
    useState("");

  const [
    editingItem,
    setEditingItem,
  ] =
    useState<EditingItemState | null>(
      null,
    );

  const [
    deletingChecklist,
    setDeletingChecklist,
  ] =
    useState<ChecklistResponse | null>(
      null,
    );

  const {
    data: checklists = [],
    isLoading,
    isError,
    refetch,
  } =
    useQuery({
      queryKey,

      queryFn: () =>
        getChecklists(
          cardId,
        ),
    });

  const invalidate =
    async () => {
      await queryClient.invalidateQueries({
        queryKey,
      });
    };

  const createChecklistMutation =
    useMutation({
      mutationFn:
        async () => {
          const title =
            newChecklistTitle.trim();

          if (!title) {
            throw new Error(
              "체크리스트 제목이 없습니다.",
            );
          }

          return createChecklist(
            cardId,
            {
              title,
            },
          );
        },

      onSuccess:
        async () => {
          await invalidate();

          setNewChecklistTitle(
            "",
          );

          toast.success(
            "체크리스트를 만들었습니다.",
          );
        },

      onError: () => {
        toast.error(
          "체크리스트를 만들지 못했습니다.",
        );
      },
    });

  const updateChecklistMutation =
    useMutation({
      mutationFn:
        async ({
          checklistId,
          title,
        }: {
          checklistId: number;
          title: string;
        }) =>
          updateChecklist(
            checklistId,
            {
              title,
            },
          ),

      onSuccess:
        async () => {
          await invalidate();

          setEditingChecklistId(
            null,
          );

          setEditingChecklistTitle(
            "",
          );

          toast.success(
            "체크리스트 제목을 수정했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "체크리스트를 수정하지 못했습니다.",
        );
      },
    });

  const deleteChecklistMutation =
    useMutation({
      mutationFn:
        async (
          checklistId: number,
        ) => {
          await deleteChecklist(
            checklistId,
          );
        },

      onSuccess:
        async () => {
          await invalidate();

          setDeletingChecklist(
            null,
          );

          toast.success(
            "체크리스트를 삭제했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "체크리스트를 삭제하지 못했습니다.",
        );
      },
    });

  const createItemMutation =
    useMutation({
      mutationFn:
        async ({
          checklistId,
          content,
        }: {
          checklistId: number;
          content: string;
        }) =>
          createChecklistItem(
            checklistId,
            {
              content,
            },
          ),

      onSuccess:
        async (
          _,
          variables,
        ) => {
          await invalidate();

          setNewItemContents(
            (current) => ({
              ...current,

              [variables.checklistId]:
                "",
            }),
          );
        },

      onError: () => {
        toast.error(
          "체크리스트 항목을 추가하지 못했습니다.",
        );
      },
    });

  const toggleItemMutation =
    useMutation({
      mutationFn:
        (
          itemId: number,
        ) =>
          toggleChecklistItem(
            itemId,
          ),

      onSuccess:
        async () => {
          await invalidate();
        },

      onError: () => {
        toast.error(
          "체크 상태를 변경하지 못했습니다.",
        );
      },
    });

  const updateItemMutation =
    useMutation({
      mutationFn:
        async ({
          itemId,
          content,
        }: {
          itemId: number;
          content: string;
        }) =>
          updateChecklistItem(
            itemId,
            {
              content,
            },
          ),

      onSuccess:
        async () => {
          await invalidate();

          setEditingItem(
            null,
          );

          toast.success(
            "체크리스트 항목을 수정했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "체크리스트 항목을 수정하지 못했습니다.",
        );
      },
    });

  const deleteItemMutation =
    useMutation({
      mutationFn:
        async (
          itemId: number,
        ) => {
          await deleteChecklistItem(
            itemId,
          );
        },

      onSuccess:
        async () => {
          await invalidate();
        },

      onError: () => {
        toast.error(
          "체크리스트 항목을 삭제하지 못했습니다.",
        );
      },
    });

  const handleCreateChecklist =
    () => {
      if (!canEdit) {
        return;
      }

      const title =
        newChecklistTitle.trim();

      if (!title) {
        toast.error(
          "체크리스트 제목을 입력해주세요.",
        );

        return;
      }

      if (
        title.length > 100
      ) {
        toast.error(
          "체크리스트 제목은 100자 이하로 입력해주세요.",
        );

        return;
      }

      createChecklistMutation.mutate();
    };

  const startChecklistEdit =
    (
      checklist: ChecklistResponse,
    ) => {
      setEditingChecklistId(
        checklist.id,
      );

      setEditingChecklistTitle(
        checklist.title,
      );
    };

  const saveChecklistTitle =
    (
      checklistId: number,
    ) => {
      const title =
        editingChecklistTitle.trim();

      if (!title) {
        toast.error(
          "체크리스트 제목을 입력해주세요.",
        );

        return;
      }

      if (
        title.length > 100
      ) {
        toast.error(
          "체크리스트 제목은 100자 이하로 입력해주세요.",
        );

        return;
      }

      updateChecklistMutation.mutate({
        checklistId,
        title,
      });
    };

  const handleAddItem =
    (
      checklistId: number,
    ) => {
      if (!canEdit) {
        return;
      }

      const content =
        (
          newItemContents[
            checklistId
          ] ?? ""
        ).trim();

      if (!content) {
        toast.error(
          "체크리스트 항목을 입력해주세요.",
        );

        return;
      }

      if (
        content.length > 255
      ) {
        toast.error(
          "체크리스트 항목은 255자 이하로 입력해주세요.",
        );

        return;
      }

      createItemMutation.mutate({
        checklistId,
        content,
      });
    };

  const saveItem =
    () => {
      if (!editingItem) {
        return;
      }

      const content =
        editingItem.content.trim();

      if (!content) {
        toast.error(
          "체크리스트 항목을 입력해주세요.",
        );

        return;
      }

      if (
        content.length > 255
      ) {
        toast.error(
          "체크리스트 항목은 255자 이하로 입력해주세요.",
        );

        return;
      }

      updateItemMutation.mutate({
        itemId:
          editingItem.itemId,

        content,
      });
    };

  const isBusy =
    createChecklistMutation.isPending ||
    updateChecklistMutation.isPending ||
    deleteChecklistMutation.isPending ||
    createItemMutation.isPending ||
    toggleItemMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending;

  return (
    <>
      <ConfirmDialog
        open={
          deletingChecklist !==
          null
        }
        title="체크리스트 삭제"
        description={
          deletingChecklist
            ? `'${deletingChecklist.title}' 체크리스트와 포함된 모든 항목을 삭제합니다. 되돌릴 수 없습니다.`
            : "체크리스트를 삭제합니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={
          deleteChecklistMutation.isPending
        }
        onConfirm={async () => {
          if (
            !deletingChecklist
          ) {
            return;
          }

          await deleteChecklistMutation.mutateAsync(
            deletingChecklist.id,
          );
        }}
        onCancel={() =>
          setDeletingChecklist(
            null,
          )
        }
      />

      <section className="mt-5 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              체크리스트
            </h4>

            <p className="mt-0.5 text-xs text-slate-400">
              작업을 작은 항목으로 나누고 완료 여부를 관리합니다.
            </p>
          </div>

          {!isLoading && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {checklists.length}개
            </span>
          )}
        </div>

        <div className="p-4">
          {isLoading ? (
            <p className="text-sm text-slate-400">
              체크리스트를 불러오는 중...
            </p>
          ) : isError ? (
            <div>
              <p className="text-sm text-red-500">
                체크리스트를 불러오지 못했습니다.
              </p>

              <button
                type="button"
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                onClick={() =>
                  void refetch()
                }
              >
                다시 불러오기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {checklists.length ===
                0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm text-slate-500">
                    아직 체크리스트가 없습니다.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    해야 할 일을 작은 단계로 나눠보세요.
                  </p>
                </div>
              )}

              {checklists.map(
                (
                  checklist,
                ) => {
                  const {
                    total,
                    completed,
                    percent,
                  } =
                    getProgress(
                      checklist,
                    );

                  const newItemContent =
                    newItemContents[
                      checklist.id
                    ] ?? "";

                  return (
                    <div
                      key={
                        checklist.id
                      }
                      className="rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="border-b border-slate-100 px-4 py-3">
                        {editingChecklistId ===
                        checklist.id ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              value={
                                editingChecklistTitle
                              }
                              maxLength={
                                100
                              }
                              disabled={
                                updateChecklistMutation.isPending
                              }
                              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              onChange={(
                                event,
                              ) =>
                                setEditingChecklistTitle(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              onKeyDown={(
                                event,
                              ) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  event.preventDefault();

                                  saveChecklistTitle(
                                    checklist.id,
                                  );
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  setEditingChecklistId(
                                    null,
                                  );
                                }
                              }}
                            />

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={
                                  updateChecklistMutation.isPending
                                }
                                onClick={() =>
                                  setEditingChecklistId(
                                    null,
                                  )
                                }
                              >
                                취소
                              </Button>

                              <Button
                                type="button"
                                loading={
                                  updateChecklistMutation.isPending
                                }
                                onClick={() =>
                                  saveChecklistTitle(
                                    checklist.id,
                                  )
                                }
                              >
                                저장
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h5 className="break-words text-sm font-semibold text-slate-800">
                                {
                                  checklist.title
                                }
                              </h5>

                              <div className="mt-2 flex items-center gap-3">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-blue-600 transition-all"
                                    style={{
                                      width:
                                        `${percent}%`,
                                    }}
                                  />
                                </div>

                                <span className="shrink-0 text-[11px] font-medium text-slate-400">
                                  {completed}/
                                  {total} ·{" "}
                                  {percent}%
                                </span>
                              </div>
                            </div>

                            {canEdit && (
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  disabled={
                                    isBusy
                                  }
                                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                                  onClick={() =>
                                    startChecklistEdit(
                                      checklist,
                                    )
                                  }
                                >
                                  수정
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isBusy
                                  }
                                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                  onClick={() =>
                                    setDeletingChecklist(
                                      checklist,
                                    )
                                  }
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        {checklist.items
                          .length ===
                        0 ? (
                          <p className="px-1 py-3 text-center text-xs text-slate-400">
                            아직 항목이 없습니다.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {checklist.items.map(
                              (
                                item,
                              ) => {
                                const isEditing =
                                  editingItem?.itemId ===
                                  item.id;

                                return (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="group flex min-h-9 items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        item.checked
                                      }
                                      disabled={
                                        !canEdit ||
                                        isBusy
                                      }
                                      aria-label={`${item.content} 완료 여부`}
                                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600 disabled:cursor-not-allowed"
                                      onChange={() =>
                                        toggleItemMutation.mutate(
                                          item.id,
                                        )
                                      }
                                    />

                                    {isEditing ? (
                                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                                        <input
                                          type="text"
                                          value={
                                            editingItem.content
                                          }
                                          maxLength={
                                            255
                                          }
                                          autoFocus
                                          disabled={
                                            updateItemMutation.isPending
                                          }
                                          className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                          onChange={(
                                            event,
                                          ) =>
                                            setEditingItem(
                                              {
                                                ...editingItem,

                                                content:
                                                  event
                                                    .target
                                                    .value,
                                              },
                                            )
                                          }
                                          onKeyDown={(
                                            event,
                                          ) => {
                                            if (
                                              event.key ===
                                              "Enter"
                                            ) {
                                              event.preventDefault();

                                              saveItem();
                                            }

                                            if (
                                              event.key ===
                                              "Escape"
                                            ) {
                                              setEditingItem(
                                                null,
                                              );
                                            }
                                          }}
                                        />

                                        <div className="flex shrink-0 gap-1">
                                          <button
                                            type="button"
                                            disabled={
                                              updateItemMutation.isPending
                                            }
                                            className="rounded-md px-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            onClick={() =>
                                              setEditingItem(
                                                null,
                                              )
                                            }
                                          >
                                            취소
                                          </button>

                                          <button
                                            type="button"
                                            disabled={
                                              updateItemMutation.isPending
                                            }
                                            className="rounded-md px-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                            onClick={
                                              saveItem
                                            }
                                          >
                                            저장
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <span
                                          className={`min-w-0 flex-1 break-words text-sm leading-5 ${
                                            item.checked
                                              ? "text-slate-400 line-through"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {
                                            item.content
                                          }
                                        </span>

                                        {canEdit && (
                                          <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                              type="button"
                                              disabled={
                                                isBusy
                                              }
                                              aria-label={`${item.content} 수정`}
                                              className="flex h-6 w-6 items-center justify-center rounded text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                                              onClick={() =>
                                                setEditingItem(
                                                  {
                                                    itemId:
                                                      item.id,

                                                    content:
                                                      item.content,
                                                  },
                                                )
                                              }
                                            >
                                              ✎
                                            </button>

                                            <button
                                              type="button"
                                              disabled={
                                                isBusy
                                              }
                                              aria-label={`${item.content} 삭제`}
                                              className="flex h-6 w-6 items-center justify-center rounded text-sm text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                              onClick={() =>
                                                deleteItemMutation.mutate(
                                                  item.id,
                                                )
                                              }
                                            >
                                              ×
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}

                        {canEdit && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                type="text"
                                value={
                                  newItemContent
                                }
                                maxLength={
                                  255
                                }
                                disabled={
                                  isBusy
                                }
                                placeholder="새 항목 추가..."
                                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                onChange={(
                                  event,
                                ) =>
                                  setNewItemContents(
                                    (
                                      current,
                                    ) => ({
                                      ...current,

                                      [checklist.id]:
                                        event
                                          .target
                                          .value,
                                    }),
                                  )
                                }
                                onKeyDown={(
                                  event,
                                ) => {
                                  if (
                                    event.key ===
                                    "Enter"
                                  ) {
                                    event.preventDefault();

                                    handleAddItem(
                                      checklist.id,
                                    );
                                  }
                                }}
                              />

                              <Button
                                type="button"
                                disabled={
                                  !newItemContent.trim() ||
                                  isBusy
                                }
                                loading={
                                  createItemMutation.isPending
                                }
                                onClick={() =>
                                  handleAddItem(
                                    checklist.id,
                                  )
                                }
                              >
                                항목 추가
                              </Button>
                            </div>

                            <p className="mt-1 text-right text-[10px] text-slate-400">
                              {
                                newItemContent.length
                              }
                              /255
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}

              {canEdit && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">
                    새 체크리스트
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <Input
                        label="체크리스트 제목"
                        value={
                          newChecklistTitle
                        }
                        maxLength={
                          100
                        }
                        placeholder="예: 배포 전 확인"
                        disabled={
                          isBusy
                        }
                        onChange={(
                          event,
                        ) =>
                          setNewChecklistTitle(
                            event.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        disabled={
                          !newChecklistTitle.trim() ||
                          isBusy
                        }
                        loading={
                          createChecklistMutation.isPending
                        }
                        onClick={
                          handleCreateChecklist
                        }
                      >
                        체크리스트 추가
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!canEdit && (
                <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                  VIEWER 권한에서는 체크리스트를 조회만 할 수 있습니다.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
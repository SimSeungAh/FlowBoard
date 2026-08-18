import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import {
  deleteCard,
  getCardDetail,
  updateCard,
  type CardUpdateRequest,
} from "@/api/card";
import {
  addCardAssignee,
  getBoardMembers,
  getCardAssignees,
  removeCardAssignee,
} from "@/api/cardAssignee";
import {
  addTagToCard,
  createTag,
  getBoardTags,
  getCardTags,
  removeTagFromCard,
} from "@/api/tag";
import Button from "@/components/ui/Button";
import ChecklistSection from "@/components/card/ChecklistSection";
import CommentSection from "@/components/card/CommentSection";
import StructuredDescription from "@/components/card/StructuredDescription";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

interface CardDetailModalProps {
  open: boolean;
  cardId: number | null;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}

const DEFAULT_TAG_COLOR =
  "#3B82F6";

const toDateTimeInputValue = (
  value: string | null,
) => {
  if (!value) {
    return "";
  }

  return value.slice(
    0,
    16,
  );
};

const formatDateTime = (
  value: string | null,
) => {
  if (!value) {
    return "-";
  }

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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
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

export default function CardDetailModal({
  open,
  cardId,
  canEdit,
  onClose,
  onChanged,
}: CardDetailModalProps) {
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

  const [
    editMode,
    setEditMode,
  ] =
    useState(false);

  const [
    descriptionEditMode,
    setDescriptionEditMode,
  ] =
    useState(false);

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] =
    useState(false);

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
    selectedAssigneeUserId,
    setSelectedAssigneeUserId,
  ] =
    useState("");

  const [
    selectedTagId,
    setSelectedTagId,
  ] =
    useState("");

  const [
    newTagName,
    setNewTagName,
  ] =
    useState("");

  const [
    newTagColor,
    setNewTagColor,
  ] =
    useState(
      DEFAULT_TAG_COLOR,
    );

  const cardQuery =
    useQuery({
      queryKey: [
        "cards",
        cardId,
      ],

      queryFn: () =>
        getCardDetail(
          cardId as number,
        ),

      enabled:
        open &&
        cardId !== null,
    });

  const membersQuery =
    useQuery({
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
        open &&
        cardId !== null &&
        isValidBoardId,
    });

  const assigneesQuery =
    useQuery({
      queryKey: [
        "cards",
        cardId,
        "assignees",
      ],

      queryFn: () =>
        getCardAssignees(
          cardId as number,
        ),

      enabled:
        open &&
        cardId !== null,
    });

  const boardTagsQuery =
    useQuery({
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
        open &&
        cardId !== null &&
        isValidBoardId,
    });

  const cardTagsQuery =
    useQuery({
      queryKey: [
        "cards",
        cardId,
        "tags",
      ],

      queryFn: () =>
        getCardTags(
          cardId as number,
        ),

      enabled:
        open &&
        cardId !== null,
    });

  const card =
    cardQuery.data;

  const members =
    membersQuery.data ??
    [];

  const assignees =
    assigneesQuery.data ??
    [];

  const boardTags =
    boardTagsQuery.data ??
    [];

  const cardTags =
    cardTagsQuery.data ??
    [];

  const availableMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            !assignees.some(
              (assignee) =>
                assignee.userId ===
                member.userId,
            ),
        ),
      [
        assignees,
        members,
      ],
    );

  const availableTags =
    useMemo(
      () =>
        boardTags.filter(
          (tag) =>
            !cardTags.some(
              (cardTag) =>
                cardTag.id ===
                tag.id,
            ),
        ),
      [
        boardTags,
        cardTags,
      ],
    );

  useEffect(() => {
    if (
      !open ||
      !card
    ) {
      return;
    }

    setTitle(
      card.title,
    );

    setDescription(
      card.description ??
        "",
    );

    setDueDate(
      toDateTimeInputValue(
        card.dueDate,
      ),
    );

    setEditMode(
      false,
    );

    setDescriptionEditMode(
      false,
    );

    setSelectedAssigneeUserId(
      "",
    );

    setSelectedTagId(
      "",
    );

    setNewTagName(
      "",
    );

    setNewTagColor(
      DEFAULT_TAG_COLOR,
    );
  }, [
    card,
    open,
  ]);

  useEffect(() => {
    if (open) {
      return;
    }

    setEditMode(
      false,
    );

    setDescriptionEditMode(
      false,
    );

    setDeleteDialogOpen(
      false,
    );

    setSelectedAssigneeUserId(
      "",
    );

    setSelectedTagId(
      "",
    );

    setNewTagName(
      "",
    );

    setNewTagColor(
      DEFAULT_TAG_COLOR,
    );
  }, [
    open,
  ]);

  const updateMutation =
    useMutation({
      mutationFn: (
        data: CardUpdateRequest,
      ) => {
        if (
          cardId === null
        ) {
          throw new Error(
            "카드 ID가 없습니다.",
          );
        }

        return updateCard(
          cardId,
          data,
        );
      },

      onSuccess:
        async (
          updatedCard,
        ) => {
          queryClient.setQueryData(
            [
              "cards",
              updatedCard.id,
            ],
            updatedCard,
          );

          await onChanged();

          setEditMode(
            false,
          );

          toast.success(
            "카드를 수정했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "카드를 수정하지 못했습니다.",
        );
      },
    });

  const descriptionUpdateMutation =
    useMutation({
      mutationFn: (
        nextDescription: string,
      ) => {
        if (
          cardId === null ||
          !card
        ) {
          throw new Error(
            "카드 정보를 확인할 수 없습니다.",
          );
        }

        return updateCard(
          cardId,
          {
            title: card.title,
            description:
              nextDescription.trim() ||
              null,
            dueDate: card.dueDate,
          },
        );
      },

      onSuccess:
        async (
          updatedCard,
        ) => {
          queryClient.setQueryData(
            [
              "cards",
              updatedCard.id,
            ],
            updatedCard,
          );

          setDescription(
            updatedCard.description ??
              "",
          );

          setDescriptionEditMode(
            false,
          );

          await onChanged();

          toast.success(
            "설명을 수정했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "설명을 수정하지 못했습니다.",
        );
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        async () => {
          if (
            cardId === null
          ) {
            throw new Error(
              "카드 ID가 없습니다.",
            );
          }

          await deleteCard(
            cardId,
          );
        },

      onSuccess:
        async () => {
          if (
            cardId !== null
          ) {
            queryClient.removeQueries({
              queryKey: [
                "cards",
                cardId,
              ],
            });
          }

          await onChanged();

          setDeleteDialogOpen(
            false,
          );

          toast.success(
            "카드를 삭제했습니다.",
          );

          onClose();
        },

      onError: () => {
        toast.error(
          "카드를 삭제하지 못했습니다.",
        );
      },
    });

  const addAssigneeMutation =
    useMutation({
      mutationFn:
        async (
          userId: number,
        ) => {
          if (
            cardId === null
          ) {
            throw new Error(
              "카드 ID가 없습니다.",
            );
          }

          return addCardAssignee(
            cardId,
            {
              userId,
            },
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "cards",
              cardId,
              "assignees",
            ],
          });

          setSelectedAssigneeUserId(
            "",
          );

          toast.success(
            "담당자를 추가했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "담당자를 추가하지 못했습니다.",
        );
      },
    });

  const removeAssigneeMutation =
    useMutation({
      mutationFn:
        async (
          userId: number,
        ) => {
          if (
            cardId === null
          ) {
            throw new Error(
              "카드 ID가 없습니다.",
            );
          }

          await removeCardAssignee(
            cardId,
            userId,
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "cards",
              cardId,
              "assignees",
            ],
          });

          toast.success(
            "담당자를 제거했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "담당자를 제거하지 못했습니다.",
        );
      },
    });

  const addTagMutation =
    useMutation({
      mutationFn:
        async (
          tagId: number,
        ) => {
          if (
            cardId === null
          ) {
            throw new Error(
              "카드 ID가 없습니다.",
            );
          }

          return addTagToCard(
            cardId,
            tagId,
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "cards",
              cardId,
              "tags",
            ],
          });

          setSelectedTagId(
            "",
          );

          toast.success(
            "태그를 추가했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "태그를 추가하지 못했습니다.",
        );
      },
    });

  const removeTagMutation =
    useMutation({
      mutationFn:
        async (
          tagId: number,
        ) => {
          if (
            cardId === null
          ) {
            throw new Error(
              "카드 ID가 없습니다.",
            );
          }

          await removeTagFromCard(
            cardId,
            tagId,
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "cards",
              cardId,
              "tags",
            ],
          });

          toast.success(
            "태그를 제거했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "태그를 제거하지 못했습니다.",
        );
      },
    });

  const createTagMutation =
    useMutation({
      mutationFn:
        async () => {
          if (
            cardId === null
          ) {
            throw new Error(
              "카드 ID가 없습니다.",
            );
          }

          const name =
            newTagName.trim();

          if (!name) {
            throw new Error(
              "태그 이름이 없습니다.",
            );
          }

          /*
           * 새 태그를 보드에 만든 뒤
           * 현재 카드에도 바로 연결합니다.
           */
          const tag =
            await createTag(
              boardId,
              {
                name,
                color:
                  newTagColor,
              },
            );

          await addTagToCard(
            cardId,
            tag.id,
          );

          return tag;
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "boards",
                boardId,
                "tags",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "cards",
                cardId,
                "tags",
              ],
            }),
          ]);

          setNewTagName(
            "",
          );

          setNewTagColor(
            DEFAULT_TAG_COLOR,
          );

          toast.success(
            "새 태그를 만들고 카드에 추가했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "태그를 생성하지 못했습니다. 같은 이름의 태그가 있는지 확인해주세요.",
        );
      },
    });

  const startEdit =
    () => {
      if (
        !card ||
        !canEdit
      ) {
        return;
      }

      setTitle(
        card.title,
      );

      setDescription(
        card.description ??
          "",
      );

      setDueDate(
        toDateTimeInputValue(
          card.dueDate,
        ),
      );

      setDescriptionEditMode(
        false,
      );

      setEditMode(
        true,
      );
    };

  const cancelEdit =
    () => {
      if (!card) {
        return;
      }

      setTitle(
        card.title,
      );

      setDescription(
        card.description ??
          "",
      );

      setDueDate(
        toDateTimeInputValue(
          card.dueDate,
        ),
      );

      setEditMode(
        false,
      );
    };

  const startDescriptionEdit =
    () => {
      if (
        !card ||
        !canEdit
      ) {
        return;
      }

      setDescription(
        card.description ??
          "",
      );

      setDescriptionEditMode(
        true,
      );
    };

  const cancelDescriptionEdit =
    () => {
      if (!card) {
        return;
      }

      setDescription(
        card.description ??
          "",
      );

      setDescriptionEditMode(
        false,
      );
    };

  const saveDescription =
    () => {
      if (
        !card ||
        !canEdit
      ) {
        return;
      }

      descriptionUpdateMutation.mutate(
        description,
      );
    };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !canEdit ||
      !card
    ) {
      return;
    }

    const trimmedTitle =
      title.trim();

    const trimmedDescription =
      description.trim();

    if (!trimmedTitle) {
      toast.error(
        "카드 제목을 입력해주세요.",
      );

      return;
    }

    updateMutation.mutate({
      title:
        trimmedTitle,

      description:
        trimmedDescription ||
        null,

      dueDate:
        dueDate ||
        null,
    });
  };

  const handleAddAssignee =
    () => {
      if (
        !canEdit
      ) {
        return;
      }

      if (
        !selectedAssigneeUserId
      ) {
        toast.error(
          "추가할 담당자를 선택해주세요.",
        );

        return;
      }

      const userId =
        Number(
          selectedAssigneeUserId,
        );

      if (
        !Number.isInteger(
          userId,
        ) ||
        userId <= 0
      ) {
        toast.error(
          "담당자 정보를 확인할 수 없습니다.",
        );

        return;
      }

      addAssigneeMutation.mutate(
        userId,
      );
    };

  const handleAddTag =
    () => {
      if (!canEdit) {
        return;
      }

      if (
        !selectedTagId
      ) {
        toast.error(
          "추가할 태그를 선택해주세요.",
        );

        return;
      }

      const tagId =
        Number(
          selectedTagId,
        );

      if (
        !Number.isInteger(
          tagId,
        ) ||
        tagId <= 0
      ) {
        toast.error(
          "태그 정보를 확인할 수 없습니다.",
        );

        return;
      }

      addTagMutation.mutate(
        tagId,
      );
    };

  const handleCreateTag =
    () => {
      if (!canEdit) {
        return;
      }

      const name =
        newTagName.trim();

      if (!name) {
        toast.error(
          "새 태그 이름을 입력해주세요.",
        );

        return;
      }

      if (
        name.length > 30
      ) {
        toast.error(
          "태그 이름은 30자 이하로 입력해주세요.",
        );

        return;
      }

      createTagMutation.mutate();
    };

  const isAssigneeBusy =
    addAssigneeMutation.isPending ||
    removeAssigneeMutation.isPending;

  const isTagBusy =
    addTagMutation.isPending ||
    removeTagMutation.isPending ||
    createTagMutation.isPending;

  const handleClose =
    () => {
      if (
        updateMutation.isPending ||
        descriptionUpdateMutation.isPending ||
        deleteMutation.isPending ||
        isAssigneeBusy ||
        isTagBusy
      ) {
        return;
      }

      setEditMode(
        false,
      );

      onClose();
    };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        if (descriptionEditMode) {
          cancelDescriptionEdit();
          return;
        }

        handleClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    updateMutation.isPending,
    descriptionUpdateMutation.isPending,
    deleteMutation.isPending,
    descriptionEditMode,
    isAssigneeBusy,
    isTagBusy,
  ]);

  if (!open) {
    return (
      <ConfirmDialog
        open={deleteDialogOpen}
        title="작업 삭제"
        description={
          card
            ? `'${card.title}' 작업을 삭제합니다. 연결된 데이터도 함께 삭제될 수 있으며 되돌릴 수 없습니다.`
            : "작업을 삭제합니다. 되돌릴 수 없습니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onCancel={() =>
          setDeleteDialogOpen(false)
        }
      />
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/10"
        role="presentation"
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            handleClose();
          }
        }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={
            editMode
              ? "작업 수정"
              : "작업 상세"
          }
          className="absolute inset-y-0 right-0 flex w-[700px] max-w-[calc(100vw-var(--flow-sidebar-width)-32px)] flex-col border-l border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-panel)]"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* Panel header */}
          <header className="flex h-[72px] shrink-0 items-center justify-between gap-5 border-b border-[var(--flow-border)] px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-[13px] font-bold text-[var(--flow-primary)]">
                {editMode
                  ? "작업 수정"
                  : "작업 상세"}
              </span>

              {card && (
                <span className="rounded-lg bg-[var(--flow-gray-100)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                  #{card.id}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!editMode &&
                canEdit &&
                card && (
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-[13px] font-semibold text-[var(--flow-text-secondary)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]"
                    onClick={startEdit}
                  >
                    수정
                  </button>
                )}

              <button
                type="button"
                aria-label="작업 상세 닫기"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl leading-none text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]"
                onClick={handleClose}
              >
                ×
              </button>
            </div>
          </header>

          {/* Panel content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cardQuery.isLoading ? (
              <div className="flex min-h-[460px] items-center justify-center px-8">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--flow-gray-200)] border-t-[var(--flow-primary)]" />

                  <p className="mt-4 text-[13px] text-[var(--flow-text-muted)]">
                    작업 정보를 불러오는 중...
                  </p>
                </div>
              </div>
            ) : cardQuery.isError ||
              !card ? (
              <div className="p-8">
                <div className="rounded-[var(--flow-radius-lg)] border border-red-200 bg-red-50 px-6 py-10 text-center">
                  <h3 className="text-base font-bold text-[var(--flow-text)]">
                    작업 정보를 불러오지 못했습니다.
                  </h3>

                  <p className="mt-2 text-[13px] text-[var(--flow-text-muted)]">
                    잠시 후 다시 시도해주세요.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={() =>
                      void cardQuery.refetch()
                    }
                  >
                    다시 불러오기
                  </Button>
                </div>
              </div>
            ) : editMode ? (
              <form
                className="flex min-h-full flex-col"
                onSubmit={handleSubmit}
              >
                <div className="space-y-8 p-8">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--flow-primary)]">
                      Basic information
                    </p>

                    <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[var(--flow-text)]">
                      작업 기본 정보 수정
                    </h2>

                    <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                      제목, 설명, 마감일을 수정합니다. 담당자와 태그, 체크리스트는 상세 화면에서 관리합니다.
                    </p>
                  </div>

                  <div className="space-y-6 rounded-[var(--flow-radius-lg)] bg-[var(--flow-gray-50)] p-6">
                    <Input
                      label="작업 제목"
                      value={title}
                      required
                      maxLength={100}
                      helperText={`${title.length}/100`}
                      disabled={updateMutation.isPending}
                      onChange={(event) =>
                        setTitle(
                          event.target.value,
                        )
                      }
                    />

                    <Textarea
                      id="card-detail-description"
                      label="설명"
                      value={description}
                      placeholder="기획, 디자인, 구현, 테스트, 보안 검토 등 작업 내용을 정리해주세요."
                      disabled={updateMutation.isPending}
                      onChange={(event) =>
                        setDescription(
                          event.target.value,
                        )
                      }
                    />

                    <Input
                      label="마감일"
                      type="datetime-local"
                      value={dueDate}
                      disabled={updateMutation.isPending}
                      onChange={(event) =>
                        setDueDate(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 mt-auto flex shrink-0 items-center justify-end gap-3 border-t border-[var(--flow-border)] bg-white/95 px-8 py-5 backdrop-blur">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={cancelEdit}
                  >
                    취소
                  </Button>

                  <Button
                    type="submit"
                    loading={updateMutation.isPending}
                    disabled={!title.trim()}
                  >
                    저장
                  </Button>
                </div>
              </form>
            ) : (
              <>
                {/* Title */}
                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {cardTagsQuery.isLoading ? (
                      <span className="h-6 w-20 animate-pulse rounded-md bg-[var(--flow-gray-100)]" />
                    ) : (
                      cardTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex h-7 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-white px-2.5 text-[11px] font-semibold text-[var(--flow-text-secondary)]"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                tag.color,
                            }}
                          />

                          {tag.name}
                        </span>
                      ))
                    )}

                    {cardTags.length === 0 &&
                      !cardTagsQuery.isLoading && (
                        <span className="rounded-lg bg-[var(--flow-gray-100)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--flow-text-muted)]">
                          태그 없음
                        </span>
                      )}
                  </div>

                  <h2 className="mt-5 break-words text-[26px] font-bold leading-[1.4] tracking-[-0.025em] text-[var(--flow-text)]">
                    {card.title}
                  </h2>

                  <div className="mt-7 grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4">
                      <p className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                        작성자
                      </p>

                      <p className="mt-1.5 truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                        {card.createdByNickname}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4">
                      <p className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                        마감일
                      </p>

                      <p className="mt-1.5 truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                        {formatDateTime(
                          card.dueDate,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4">
                      <p className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                        최근 수정
                      </p>

                      <p className="mt-1.5 truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                        {formatDateTime(
                          card.updatedAt,
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Description */}
                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="mb-5 flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-base font-bold text-[var(--flow-text)]">
                        설명
                      </h3>

                      <p className="mt-1.5 text-[12px] leading-5 text-[var(--flow-text-muted)]">
                        작업의 배경, 요구사항, 참고 내용을 자유롭게 정리합니다.
                      </p>
                    </div>

                    {canEdit &&
                      !descriptionEditMode && (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold text-[var(--flow-primary)] transition-colors hover:bg-[var(--flow-primary-50)]"
                          onClick={startDescriptionEdit}
                        >
                          설명 수정
                        </button>
                      )}
                  </div>

                  {descriptionEditMode ? (
                    <div className="rounded-xl bg-[var(--flow-gray-50)] p-5">
                      <Textarea
                        id="card-quick-description"
                        value={description}
                        autoFocus
                        className="min-h-64"
                        placeholder="작업의 배경, 요구사항, 테스트 내용, 참고 사항 등을 자유롭게 작성해주세요."
                        disabled={descriptionUpdateMutation.isPending}
                        onChange={(event) =>
                          setDescription(
                            event.target.value,
                          )
                        }
                      />

                      <div className="mt-4 flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={descriptionUpdateMutation.isPending}
                          onClick={cancelDescriptionEdit}
                        >
                          취소
                        </Button>

                        <Button
                          type="button"
                          loading={descriptionUpdateMutation.isPending}
                          onClick={saveDescription}
                        >
                          설명 저장
                        </Button>
                      </div>
                    </div>
                  ) : card.description ? (
                    <div className="rounded-xl bg-[var(--flow-gray-50)] px-5 py-5">
                      <StructuredDescription description={card.description} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--flow-border-strong)] bg-[var(--flow-gray-50)] px-5 py-8 text-center">
                      <p className="text-[13px] text-[var(--flow-text-muted)]">
                        등록된 설명이 없습니다.
                      </p>

                      {canEdit && (
                        <button
                          type="button"
                          className="mt-3 text-[13px] font-semibold text-[var(--flow-primary)] hover:underline"
                          onClick={startDescriptionEdit}
                        >
                          설명 추가하기
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* Assignees */}
                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-base font-bold text-[var(--flow-text)]">
                        담당자
                      </h3>

                      <p className="mt-1.5 text-[12px] leading-5 text-[var(--flow-text-muted)]">
                        현재 작업을 함께 진행하는 멤버입니다.
                      </p>
                    </div>

                    {!assigneesQuery.isLoading && (
                      <span className="rounded-lg bg-[var(--flow-primary-50)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--flow-primary)]">
                        {assignees.length}명
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    {assigneesQuery.isLoading ? (
                      <p className="py-3 text-[13px] text-[var(--flow-text-muted)]">
                        담당자를 불러오는 중...
                      </p>
                    ) : assigneesQuery.isError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                        <p className="text-[13px] text-red-600">
                          담당자 정보를 불러오지 못했습니다.
                        </p>

                        <button
                          type="button"
                          className="mt-3 text-[13px] font-semibold text-[var(--flow-primary)]"
                          onClick={() =>
                            void assigneesQuery.refetch()
                          }
                        >
                          다시 불러오기
                        </button>
                      </div>
                    ) : assignees.length === 0 ? (
                      <p className="rounded-xl bg-[var(--flow-gray-50)] px-5 py-5 text-[13px] text-[var(--flow-text-muted)]">
                        아직 지정된 담당자가 없습니다.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {assignees.map(
                          (assignee) => (
                            <div
                              key={assignee.id}
                              className="flex items-center gap-3.5 rounded-xl border border-[var(--flow-border)] bg-white py-2 pl-2 pr-3"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--flow-primary)] text-[11px] font-bold text-white">
                                {assignee.nickname
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div className="min-w-0">
                                <p className="max-w-36 truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                                  {assignee.nickname}
                                </p>

                                <p className="max-w-36 truncate text-[10px] text-[var(--flow-text-placeholder)]">
                                  {assignee.email}
                                </p>
                              </div>

                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={isAssigneeBusy}
                                  aria-label={`${assignee.nickname} 담당자 제거`}
                                  className="ml-1 flex h-6 w-6 items-center justify-center rounded text-sm text-[var(--flow-text-placeholder)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)] disabled:opacity-40"
                                  onClick={() =>
                                    removeAssigneeMutation.mutate(
                                      assignee.userId,
                                    )
                                  }
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {canEdit && (
                      <div className="mt-5 flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          {membersQuery.isLoading ? (
                            <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                              보드 멤버를 불러오는 중...
                            </p>
                          ) : membersQuery.isError ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-[var(--flow-primary)]"
                              onClick={() =>
                                void membersQuery.refetch()
                              }
                            >
                              보드 멤버 다시 불러오기
                            </button>
                          ) : availableMembers.length === 0 ? (
                            <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                              추가할 수 있는 멤버가 없습니다.
                            </p>
                          ) : (
                            <select
                              value={selectedAssigneeUserId}
                              disabled={isAssigneeBusy}
                              className="h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3.5 text-[13px] text-[var(--flow-text-secondary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                              onChange={(event) =>
                                setSelectedAssigneeUserId(
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">
                                담당자 선택
                              </option>

                              {availableMembers.map(
                                (member) => (
                                  <option
                                    key={member.id}
                                    value={member.userId}
                                  >
                                    {member.nickname} · {getRoleLabel(member.role)}
                                  </option>
                                ),
                              )}
                            </select>
                          )}
                        </div>

                        {availableMembers.length > 0 &&
                          !membersQuery.isLoading &&
                          !membersQuery.isError && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                !selectedAssigneeUserId ||
                                isAssigneeBusy
                              }
                              loading={addAssigneeMutation.isPending}
                              onClick={handleAddAssignee}
                            >
                              추가
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Tags */}
                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-base font-bold text-[var(--flow-text)]">
                        태그
                      </h3>

                      <p className="mt-1.5 text-[12px] leading-5 text-[var(--flow-text-muted)]">
                        작업 종류, 분야, 우선순위 등을 자유롭게 구분합니다.
                      </p>
                    </div>

                    {!cardTagsQuery.isLoading && (
                      <span className="rounded-lg bg-[var(--flow-gray-100)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--flow-text-muted)]">
                        {cardTags.length}개
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    {cardTagsQuery.isLoading ? (
                      <p className="py-3 text-[13px] text-[var(--flow-text-muted)]">
                        태그를 불러오는 중...
                      </p>
                    ) : cardTagsQuery.isError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                        <p className="text-[13px] text-red-600">
                          태그를 불러오지 못했습니다.
                        </p>

                        <button
                          type="button"
                          className="mt-3 text-[13px] font-semibold text-[var(--flow-primary)]"
                          onClick={() =>
                            void cardTagsQuery.refetch()
                          }
                        >
                          다시 불러오기
                        </button>
                      </div>
                    ) : cardTags.length === 0 ? (
                      <p className="rounded-xl bg-[var(--flow-gray-50)] px-5 py-5 text-[13px] text-[var(--flow-text-muted)]">
                        아직 등록된 태그가 없습니다.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {cardTags.map(
                          (tag) => (
                            <div
                              key={tag.id}
                              className="inline-flex items-center gap-3 rounded-md border border-[var(--flow-border)] bg-white py-1.5 pl-2 pr-1.5"
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    tag.color,
                                }}
                              />

                              <span className="max-w-40 truncate text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                                {tag.name}
                              </span>

                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={isTagBusy}
                                  aria-label={`${tag.name} 태그 제거`}
                                  className="flex h-6 w-6 items-center justify-center rounded text-sm text-[var(--flow-text-placeholder)] hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)] disabled:opacity-40"
                                  onClick={() =>
                                    removeTagMutation.mutate(
                                      tag.id,
                                    )
                                  }
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {canEdit && (
                      <div className="mt-5 space-y-4 rounded-xl bg-[var(--flow-gray-50)] p-5">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            {boardTagsQuery.isLoading ? (
                              <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                                보드 태그를 불러오는 중...
                              </p>
                            ) : boardTagsQuery.isError ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--flow-primary)]"
                                onClick={() =>
                                  void boardTagsQuery.refetch()
                                }
                              >
                                보드 태그 다시 불러오기
                              </button>
                            ) : availableTags.length === 0 ? (
                              <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                                추가 가능한 기존 태그가 없습니다.
                              </p>
                            ) : (
                              <select
                                value={selectedTagId}
                                disabled={isTagBusy}
                                className="h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3.5 text-[13px] text-[var(--flow-text-secondary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                                onChange={(event) =>
                                  setSelectedTagId(
                                    event.target.value,
                                  )
                                }
                              >
                                <option value="">
                                  기존 태그 선택
                                </option>

                                {availableTags.map(
                                  (tag) => (
                                    <option
                                      key={tag.id}
                                      value={tag.id}
                                    >
                                      {tag.name}
                                    </option>
                                  ),
                                )}
                              </select>
                            )}
                          </div>

                          {availableTags.length > 0 &&
                            !boardTagsQuery.isLoading &&
                            !boardTagsQuery.isError && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  !selectedTagId ||
                                  isTagBusy
                                }
                                loading={addTagMutation.isPending}
                                onClick={handleAddTag}
                              >
                                추가
                              </Button>
                            )}
                        </div>

                        <div className="border-t border-[var(--flow-border)] pt-4">
                          <p className="mb-3 text-[11px] font-semibold text-[var(--flow-text-muted)]">
                            새 태그 만들기
                          </p>

                          <div className="grid grid-cols-[1fr_48px_auto] gap-3">
                            <input
                              type="text"
                              value={newTagName}
                              maxLength={30}
                              placeholder="예: QA, 보안, 디자인"
                              disabled={isTagBusy}
                              className="h-10 min-w-0 rounded-xl border border-[var(--flow-border-strong)] bg-white px-3.5 text-[13px] text-[var(--flow-text)] outline-none placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                              onChange={(event) =>
                                setNewTagName(
                                  event.target.value,
                                )
                              }
                            />

                            <input
                              type="color"
                              value={newTagColor}
                              disabled={isTagBusy}
                              aria-label="새 태그 색상"
                              className="h-10 w-12 cursor-pointer rounded-xl border border-[var(--flow-border-strong)] bg-white p-1"
                              onChange={(event) =>
                                setNewTagColor(
                                  event.target.value,
                                )
                              }
                            />

                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                !newTagName.trim() ||
                                isTagBusy
                              }
                              loading={createTagMutation.isPending}
                              onClick={handleCreateTag}
                            >
                              만들기
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Checklist */}
                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-[var(--flow-text)]">
                      체크리스트
                    </h3>

                    <p className="mt-1.5 text-[12px] leading-5 text-[var(--flow-text-muted)]">
                      테스트 절차, 구현 단계, 검토 항목 등 필요한 단계를 관리합니다.
                    </p>
                  </div>

                  <ChecklistSection
                    cardId={card.id}
                    canEdit={canEdit}
                  />
                </section>

                {/* Comments */}
                <section className="px-6 py-6">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-[var(--flow-text)]">
                      댓글
                    </h3>

                    <p className="mt-1.5 text-[12px] leading-5 text-[var(--flow-text-muted)]">
                      작업에 대한 의견, 리뷰 결과, 진행 상황을 실시간으로 공유합니다.
                    </p>
                  </div>

                  <CommentSection
                    boardId={boardId}
                    cardId={card.id}
                    canEdit={canEdit}
                  />
                </section>
              </>
            )}
          </div>

          {/* Panel footer */}
          {!editMode &&
            card && (
              <footer className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-t border-[var(--flow-border)] bg-white px-8">
                <div>
                  {canEdit && (
                    <button
                      type="button"
                      className="inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-semibold text-[var(--flow-danger)] transition-colors hover:bg-[var(--flow-danger-soft)]"
                      onClick={() =>
                        setDeleteDialogOpen(true)
                      }
                    >
                      작업 삭제
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                  >
                    닫기
                  </Button>

                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={startEdit}
                    >
                      수정
                    </Button>
                  )}
                </div>
              </footer>
            )}
        </aside>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="작업 삭제"
        description={
          card
            ? `'${card.title}' 작업을 삭제합니다. 연결된 데이터도 함께 삭제될 수 있으며 되돌릴 수 없습니다.`
            : "작업을 삭제합니다. 되돌릴 수 없습니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onCancel={() =>
          setDeleteDialogOpen(false)
        }
      />
    </>
  );
}
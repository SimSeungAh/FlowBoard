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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
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

  return (
    <>
      <Modal
        open={open}
        title={
          editMode
            ? "카드 수정"
            : "카드 상세"
        }
        size="lg"
        closeOnBackdrop={
          !updateMutation.isPending &&
          !deleteMutation.isPending &&
          !isAssigneeBusy &&
          !isTagBusy
        }
        closeOnEsc={
          !updateMutation.isPending &&
          !deleteMutation.isPending &&
          !isAssigneeBusy &&
          !isTagBusy
        }
        onClose={
          handleClose
        }
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {cardQuery.isLoading ? (
            <div className="flex min-h-52 items-center justify-center">
              <p className="text-sm text-slate-400">
                카드 정보를 불러오는 중...
              </p>
            </div>
          ) : cardQuery.isError ||
            !card ? (
            <div className="py-8">
              <h3 className="font-semibold text-slate-900">
                카드 정보를 불러오지 못했습니다.
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                잠시 후 다시 시도해주세요.
              </p>

              <div className="mt-5">
                <Button
                  type="button"
                  variant="outline"
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
              onSubmit={
                handleSubmit
              }
            >
              <div className="space-y-5">
                <Input
                  label="카드 제목"
                  value={title}
                  required
                  maxLength={100}
                  helperText={`${title.length}/100`}
                  disabled={
                    updateMutation.isPending
                  }
                  onChange={(
                    event,
                  ) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                />

                <Textarea
                  id="card-detail-description"
                  label="설명"
                  value={
                    description
                  }
                  placeholder="카드 설명을 입력해주세요."
                  disabled={
                    updateMutation.isPending
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target.value,
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
                    updateMutation.isPending
                  }
                  onChange={(
                    event,
                  ) =>
                    setDueDate(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="mt-7 flex justify-end gap-2 border-t border-slate-100 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    updateMutation.isPending
                  }
                  onClick={
                    cancelEdit
                  }
                >
                  취소
                </Button>

                <Button
                  type="submit"
                  loading={
                    updateMutation.isPending
                  }
                  disabled={
                    !title.trim()
                  }
                >
                  저장
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-blue-600">
                      Card #{card.id}
                    </p>

                    <h3 className="mt-2 text-2xl font-bold leading-tight text-slate-950">
                      {card.title}
                    </h3>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Column #{card.columnId}
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    설명
                  </p>

                  {card.description ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {card.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">
                      등록된 설명이 없습니다.
                    </p>
                  )}
                </div>

                <div className="mt-7 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      작성자
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {card.createdByNickname}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      마감일
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDateTime(
                        card.dueDate,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      생성일
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime(
                        card.createdAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      최근 수정
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime(
                        card.updatedAt,
                      )}
                    </p>
                  </div>
                </div>

                {/* 담당자 */}
                <section className="mt-7 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        담당자
                      </h4>

                      <p className="mt-0.5 text-xs text-slate-400">
                        이 카드의 작업 담당자를 지정합니다.
                      </p>
                    </div>

                    {!assigneesQuery.isLoading && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        {assignees.length}명
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    {assigneesQuery.isLoading ? (
                      <p className="text-sm text-slate-400">
                        담당자를 불러오는 중...
                      </p>
                    ) : assigneesQuery.isError ? (
                      <div>
                        <p className="text-sm text-red-500">
                          담당자 정보를 불러오지 못했습니다.
                        </p>

                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                          onClick={() =>
                            void assigneesQuery.refetch()
                          }
                        >
                          다시 불러오기
                        </button>
                      </div>
                    ) : assignees.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                        <p className="text-sm text-slate-500">
                          지정된 담당자가 없습니다.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assignees.map(
                          (assignee) => (
                            <div
                              key={assignee.id}
                              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-2.5"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                                {assignee.nickname
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div className="min-w-0">
                                <p className="max-w-28 truncate text-xs font-semibold text-slate-700">
                                  {assignee.nickname}
                                </p>

                                <p className="max-w-28 truncate text-[10px] text-slate-400">
                                  {assignee.email}
                                </p>
                              </div>

                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={
                                    isAssigneeBusy
                                  }
                                  aria-label={`${assignee.nickname} 담당자 제거`}
                                  className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-sm text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {membersQuery.isLoading ? (
                          <p className="text-xs text-slate-400">
                            보드 멤버를 불러오는 중...
                          </p>
                        ) : membersQuery.isError ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-blue-600"
                            onClick={() =>
                              void membersQuery.refetch()
                            }
                          >
                            보드 멤버 다시 불러오기
                          </button>
                        ) : availableMembers.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            추가할 수 있는 보드 멤버가 없습니다.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                              value={
                                selectedAssigneeUserId
                              }
                              disabled={
                                isAssigneeBusy
                              }
                              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                              onChange={(
                                event,
                              ) =>
                                setSelectedAssigneeUserId(
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">
                                담당자를 선택하세요
                              </option>

                              {availableMembers.map(
                                (member) => (
                                  <option
                                    key={member.id}
                                    value={
                                      member.userId
                                    }
                                  >
                                    {member.nickname} ·{" "}
                                    {getRoleLabel(
                                      member.role,
                                    )}
                                  </option>
                                ),
                              )}
                            </select>

                            <Button
                              type="button"
                              disabled={
                                !selectedAssigneeUserId ||
                                isAssigneeBusy
                              }
                              loading={
                                addAssigneeMutation.isPending
                              }
                              onClick={
                                handleAddAssignee
                              }
                            >
                              담당자 추가
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* 태그 */}
                <section className="mt-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">
                        태그
                      </h4>

                      <p className="mt-0.5 text-xs text-slate-400">
                        카드의 종류나 우선순위를 태그로 구분합니다.
                      </p>
                    </div>

                    {!cardTagsQuery.isLoading && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        {cardTags.length}개
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    {cardTagsQuery.isLoading ? (
                      <p className="text-sm text-slate-400">
                        태그를 불러오는 중...
                      </p>
                    ) : cardTagsQuery.isError ? (
                      <div>
                        <p className="text-sm text-red-500">
                          카드 태그를 불러오지 못했습니다.
                        </p>

                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-blue-600"
                          onClick={() =>
                            void cardTagsQuery.refetch()
                          }
                        >
                          다시 불러오기
                        </button>
                      </div>
                    ) : cardTags.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                        <p className="text-sm text-slate-500">
                          등록된 태그가 없습니다.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {cardTags.map(
                          (tag) => (
                            <div
                              key={tag.id}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2.5 pr-2"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    tag.color,
                                }}
                              />

                              <span className="text-xs font-semibold text-slate-700">
                                {tag.name}
                              </span>

                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={
                                    isTagBusy
                                  }
                                  aria-label={`${tag.name} 태그 제거`}
                                  className="flex h-5 w-5 items-center justify-center rounded-full text-sm text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
                      <>
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          {boardTagsQuery.isLoading ? (
                            <p className="text-xs text-slate-400">
                              보드 태그를 불러오는 중...
                            </p>
                          ) : boardTagsQuery.isError ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-blue-600"
                              onClick={() =>
                                void boardTagsQuery.refetch()
                              }
                            >
                              보드 태그 다시 불러오기
                            </button>
                          ) : availableTags.length === 0 ? (
                            <p className="text-xs text-slate-400">
                              추가할 수 있는 기존 태그가 없습니다.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <select
                                value={
                                  selectedTagId
                                }
                                disabled={
                                  isTagBusy
                                }
                                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                                onChange={(
                                  event,
                                ) =>
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

                              <Button
                                type="button"
                                disabled={
                                  !selectedTagId ||
                                  isTagBusy
                                }
                                loading={
                                  addTagMutation.isPending
                                }
                                onClick={
                                  handleAddTag
                                }
                              >
                                태그 추가
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 rounded-lg bg-slate-50 p-3">
                          <p className="mb-3 text-xs font-semibold text-slate-600">
                            새 태그 만들기
                          </p>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                              <Input
                                label="태그 이름"
                                value={
                                  newTagName
                                }
                                maxLength={
                                  30
                                }
                                placeholder="예: 긴급"
                                disabled={
                                  isTagBusy
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setNewTagName(
                                    event.target.value,
                                  )
                                }
                              />
                            </div>

                            <label className="flex shrink-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                              색상

                              <input
                                type="color"
                                value={
                                  newTagColor
                                }
                                disabled={
                                  isTagBusy
                                }
                                aria-label="새 태그 색상"
                                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                                onChange={(
                                  event,
                                ) =>
                                  setNewTagColor(
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <Button
                              type="button"
                              disabled={
                                !newTagName.trim() ||
                                isTagBusy
                              }
                              loading={
                                createTagMutation.isPending
                              }
                              onClick={
                                handleCreateTag
                              }
                            >
                              만들고 추가
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {!canEdit && (
                      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                        VIEWER 권한에서는 태그를 조회만 할 수 있습니다.
                      </p>
                    )}
                  </div>
                </section>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      체크리스트
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      다음 작업에서 연결
                    </p>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      댓글
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      이후 실시간 댓글 연결
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
                <div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() =>
                        setDeleteDialogOpen(
                          true,
                        )
                      }
                    >
                      카드 삭제
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      handleClose
                    }
                  >
                    닫기
                  </Button>

                  {canEdit && (
                    <Button
                      type="button"
                      onClick={
                        startEdit
                      }
                    >
                      수정
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={
          deleteDialogOpen
        }
        title="카드 삭제"
        description={
          card
            ? `'${card.title}' 카드를 삭제합니다. 연결된 데이터도 함께 삭제될 수 있으며 되돌릴 수 없습니다.`
            : "카드를 삭제합니다. 되돌릴 수 없습니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={
          deleteMutation.isPending
        }
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onCancel={() =>
          setDeleteDialogOpen(
            false,
          )
        }
      />
    </>
  );
}
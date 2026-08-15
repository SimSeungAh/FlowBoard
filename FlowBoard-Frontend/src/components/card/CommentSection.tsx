import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getMyInfo,
  type MyInfoResponse,
} from "@/api/auth";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
  type CommentResponse,
} from "@/api/comment";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  connectCommentWebSocket,
  type CommentConnectionState,
  type CommentWebSocketEvent,
} from "@/services/commentWebSocket";

interface CommentSectionProps {
  boardId: number;
  cardId: number;
  canEdit: boolean;
}

interface EditingComment {
  commentId: number;
  content: string;
}

const MAX_COMMENT_LENGTH = 1000;

const formatDateTime = (
  value: string,
) => {
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const upsertComment = (
  comments: CommentResponse[],
  comment: CommentResponse,
) => {
  const exists =
    comments.some(
      (current) =>
        current.id ===
        comment.id,
    );

  if (!exists) {
    return [
      ...comments,
      comment,
    ];
  }

  return comments.map(
    (current) =>
      current.id ===
      comment.id
        ? comment
        : current,
  );
};

export default function CommentSection({
  boardId,
  cardId,
  canEdit,
}: CommentSectionProps) {
  const queryClient =
    useQueryClient();

  const commentQueryKey = [
    "cards",
    cardId,
    "comments",
  ] as const;

  const [
    content,
    setContent,
  ] =
    useState("");

  const [
    editingComment,
    setEditingComment,
  ] =
    useState<EditingComment | null>(
      null,
    );

  const [
    deletingComment,
    setDeletingComment,
  ] =
    useState<CommentResponse | null>(
      null,
    );

  const [
    connectionState,
    setConnectionState,
  ] =
    useState<CommentConnectionState>(
      "connecting",
    );

  const myInfoQuery =
    useQuery({
      queryKey: [
        "users",
        "me",
      ],

      queryFn:
        async (): Promise<MyInfoResponse> =>
          getMyInfo(),
    });

  const commentsQuery =
    useQuery({
      queryKey:
        commentQueryKey,

      queryFn: () =>
        getComments(
          cardId,
        ),
    });

  const comments =
    commentsQuery.data ??
    [];

  const currentUser =
    myInfoQuery.data;

  const updateCommentCache =
    useCallback(
      (
        updater: (
          comments: CommentResponse[],
        ) => CommentResponse[],
      ) => {
        queryClient.setQueryData<CommentResponse[]>(
          commentQueryKey,
          (
            current = [],
          ) =>
            updater(
              current,
            ),
        );
      },
      [
        cardId,
        queryClient,
      ],
    );

  /*
   * 보드 단위 댓글 WebSocket을 구독합니다.
   * 현재 열어둔 카드의 이벤트만 반영합니다.
   */
  useEffect(() => {
    const disconnect =
      connectCommentWebSocket({
        boardId,

        onConnectionStateChange:
          setConnectionState,

        onEvent: (
          event: CommentWebSocketEvent,
        ) => {
          if (
            event.cardId !==
            cardId
          ) {
            return;
          }

          switch (
            event.type
          ) {
            case "CREATED":
            case "UPDATED": {
              if (
                !event.comment
              ) {
                return;
              }

              updateCommentCache(
                (
                  current,
                ) =>
                  upsertComment(
                    current,
                    event.comment as CommentResponse,
                  ),
              );

              break;
            }

            case "DELETED": {
              updateCommentCache(
                (
                  current,
                ) =>
                  current.filter(
                    (
                      comment,
                    ) =>
                      comment.id !==
                      event.commentId,
                  ),
              );

              break;
            }
          }
        },

        onError: (
          error,
        ) => {
          console.error(
            "[Comment WebSocket]",
            error,
          );
        },
      });

    return disconnect;
  }, [
    boardId,
    cardId,
    updateCommentCache,
  ]);

  const createMutation =
    useMutation({
      mutationFn:
        async () => {
          const trimmedContent =
            content.trim();

          return createComment(
            cardId,
            {
              content:
                trimmedContent,
            },
          );
        },

      onSuccess: (
        createdComment,
      ) => {
        /*
         * WebSocket 연결 상태와 무관하게
         * 작성한 사용자 화면에는 바로 반영합니다.
         *
         * 이후 CREATED 이벤트가 다시 와도
         * upsert라 중복되지 않습니다.
         */
        updateCommentCache(
          (
            current,
          ) =>
            upsertComment(
              current,
              createdComment,
            ),
        );

        setContent("");

        toast.success(
          "댓글을 등록했습니다.",
        );
      },

      onError: () => {
        toast.error(
          "댓글을 등록하지 못했습니다.",
        );
      },
    });

  const updateMutation =
    useMutation({
      mutationFn:
        ({
          commentId,
          content,
        }: EditingComment) =>
          updateComment(
            commentId,
            {
              content,
            },
          ),

      onSuccess: (
        updatedComment,
      ) => {
        updateCommentCache(
          (
            current,
          ) =>
            upsertComment(
              current,
              updatedComment,
            ),
        );

        setEditingComment(
          null,
        );

        toast.success(
          "댓글을 수정했습니다.",
        );
      },

      onError: () => {
        toast.error(
          "댓글을 수정하지 못했습니다.",
        );
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        async (
          commentId: number,
        ) => {
          await deleteComment(
            commentId,
          );

          return commentId;
        },

      onSuccess: (
        deletedCommentId,
      ) => {
        updateCommentCache(
          (
            current,
          ) =>
            current.filter(
              (
                comment,
              ) =>
                comment.id !==
                deletedCommentId,
            ),
        );

        setDeletingComment(
          null,
        );

        toast.success(
          "댓글을 삭제했습니다.",
        );
      },

      onError: () => {
        toast.error(
          "댓글을 삭제하지 못했습니다.",
        );
      },
    });

  const handleCreateComment =
    () => {
      if (!canEdit) {
        return;
      }

      const trimmedContent =
        content.trim();

      if (!trimmedContent) {
        toast.error(
          "댓글 내용을 입력해주세요.",
        );

        return;
      }

      if (
        trimmedContent.length >
        MAX_COMMENT_LENGTH
      ) {
        toast.error(
          "댓글은 1000자 이하로 입력해주세요.",
        );

        return;
      }

      createMutation.mutate();
    };

  const startEdit = (
    comment: CommentResponse,
  ) => {
    if (
      !canEdit ||
      currentUser?.id !==
        comment.userId
    ) {
      return;
    }

    setEditingComment({
      commentId:
        comment.id,

      content:
        comment.content,
    });
  };

  const handleSaveEdit =
    () => {
      if (
        !editingComment
      ) {
        return;
      }

      const trimmedContent =
        editingComment.content.trim();

      if (!trimmedContent) {
        toast.error(
          "댓글 내용을 입력해주세요.",
        );

        return;
      }

      if (
        trimmedContent.length >
        MAX_COMMENT_LENGTH
      ) {
        toast.error(
          "댓글은 1000자 이하로 입력해주세요.",
        );

        return;
      }

      updateMutation.mutate({
        commentId:
          editingComment.commentId,

        content:
          trimmedContent,
      });
    };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const connectionLabel =
    connectionState ===
    "connected"
      ? "실시간 연결"
      : connectionState ===
          "connecting"
        ? "연결 중"
        : "재연결 중";

  const connectionClassName =
    connectionState ===
    "connected"
      ? "bg-emerald-50 text-emerald-600"
      : connectionState ===
          "connecting"
        ? "bg-amber-50 text-amber-600"
        : "bg-red-50 text-red-500";

  return (
    <>
      <ConfirmDialog
        open={
          deletingComment !==
          null
        }
        title="댓글 삭제"
        description="이 댓글을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        loading={
          deleteMutation.isPending
        }
        onConfirm={async () => {
          if (
            !deletingComment
          ) {
            return;
          }

          await deleteMutation.mutateAsync(
            deletingComment.id,
          );
        }}
        onCancel={() =>
          setDeletingComment(
            null,
          )
        }
      />

      <section className="mt-5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              댓글
            </h4>

            <p className="mt-0.5 text-xs text-slate-400">
              카드에 대한 의견과 진행 상황을 공유합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!commentsQuery.isLoading && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {comments.length}개
              </span>
            )}

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${connectionClassName}`}
            >
              {connectionLabel}
            </span>
          </div>
        </div>

        <div className="p-4">
          {commentsQuery.isLoading ? (
            <p className="py-4 text-center text-sm text-slate-400">
              댓글을 불러오는 중...
            </p>
          ) : commentsQuery.isError ? (
            <div className="py-4 text-center">
              <p className="text-sm text-red-500">
                댓글을 불러오지 못했습니다.
              </p>

              <button
                type="button"
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                onClick={() =>
                  void commentsQuery.refetch()
                }
              >
                다시 불러오기
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm text-slate-500">
                아직 댓글이 없습니다.
              </p>

              {canEdit && (
                <p className="mt-1 text-xs text-slate-400">
                  첫 댓글을 작성해보세요.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {comments.map(
                (
                  comment: CommentResponse,
                ) => {
                  const isMine =
                    currentUser?.id ===
                    comment.userId;

                  const isEditing =
                    editingComment?.commentId ===
                    comment.id;

                  const wasEdited =
                    comment.updatedAt !==
                    comment.createdAt;

                  return (
                    <article
                      key={
                        comment.id
                      }
                      className="flex gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                        {comment.userNickname
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {
                              comment.userNickname
                            }
                          </span>

                          {isMine && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">
                              나
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(
                              comment.createdAt,
                            )}

                            {wasEdited &&
                              " · 수정됨"}
                          </span>
                        </div>

                        {isEditing &&
                        editingComment ? (
                          <div className="mt-2">
                            <textarea
                              value={
                                editingComment.content
                              }
                              rows={3}
                              maxLength={
                                MAX_COMMENT_LENGTH
                              }
                              autoFocus
                              disabled={
                                updateMutation.isPending
                              }
                              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                              onChange={(
                                event,
                              ) =>
                                setEditingComment({
                                  ...editingComment,

                                  content:
                                    event.target.value,
                                })
                              }
                              onKeyDown={(
                                event,
                              ) => {
                                if (
                                  event.key ===
                                    "Enter" &&
                                  (event.ctrlKey ||
                                    event.metaKey)
                                ) {
                                  event.preventDefault();

                                  handleSaveEdit();
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  setEditingComment(
                                    null,
                                  );
                                }
                              }}
                            />

                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-400">
                                {
                                  editingComment
                                    .content
                                    .length
                                }
                                /1000
                              </span>

                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={
                                    updateMutation.isPending
                                  }
                                  className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                                  onClick={() =>
                                    setEditingComment(
                                      null,
                                    )
                                  }
                                >
                                  취소
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    !editingComment.content.trim() ||
                                    updateMutation.isPending
                                  }
                                  className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={
                                    handleSaveEdit
                                  }
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {
                              comment.content
                            }
                          </p>
                        )}

                        {!isEditing &&
                          canEdit &&
                          isMine && (
                            <div className="mt-1 flex items-center gap-1">
                              <button
                                type="button"
                                disabled={
                                  isBusy
                                }
                                className="rounded px-1.5 py-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                                onClick={() =>
                                  startEdit(
                                    comment,
                                  )
                                }
                              >
                                수정
                              </button>

                              <span className="text-[10px] text-slate-300">
                                ·
                              </span>

                              <button
                                type="button"
                                disabled={
                                  isBusy
                                }
                                className="rounded px-1.5 py-1 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                onClick={() =>
                                  setDeletingComment(
                                    comment,
                                  )
                                }
                              >
                                삭제
                              </button>
                            </div>
                          )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}

          {canEdit ? (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <textarea
                value={
                  content
                }
                rows={3}
                maxLength={
                  MAX_COMMENT_LENGTH
                }
                disabled={
                  createMutation.isPending
                }
                placeholder="댓글을 입력해주세요..."
                className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                onChange={(
                  event,
                ) =>
                  setContent(
                    event.target.value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    (event.ctrlKey ||
                      event.metaKey)
                  ) {
                    event.preventDefault();

                    handleCreateComment();
                  }
                }}
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] text-slate-400">
                    Ctrl + Enter로 등록
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {content.length}/1000
                  </p>
                </div>

                <Button
                  type="button"
                  loading={
                    createMutation.isPending
                  }
                  disabled={
                    !content.trim() ||
                    isBusy
                  }
                  onClick={
                    handleCreateComment
                  }
                >
                  댓글 등록
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-400">
              VIEWER 권한에서는 댓글을 조회만 할 수 있습니다.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
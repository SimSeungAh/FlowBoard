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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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
  const exists = comments.some(
    (current) => current.id === comment.id,
  );

  if (!exists) {
    return [...comments, comment];
  }

  return comments.map((current) =>
    current.id === comment.id
      ? comment
      : current,
  );
};

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z" />
      <path d="m10.3 13.7 4.8-4.8" />
    </svg>
  );
}

function ConnectionStatus({
  state,
}: {
  state: CommentConnectionState;
}) {
  const label =
    state === "connected"
      ? "실시간 연결"
      : state === "connecting"
        ? "연결 중"
        : "재연결 중";

  const dotClassName =
    state === "connected"
      ? "bg-[var(--flow-success)]"
      : state === "connecting"
        ? "bg-[var(--flow-warning)]"
        : "bg-[var(--flow-danger)]";

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-[var(--flow-text-muted)]">
      <span
        className={`h-2 w-2 rounded-full ${dotClassName}`}
      />
      {label}
    </span>
  );
}

export default function CommentSection({
  boardId,
  cardId,
  canEdit,
}: CommentSectionProps) {
  const queryClient = useQueryClient();

  const commentQueryKey = [
    "cards",
    cardId,
    "comments",
  ] as const;

  const [content, setContent] =
    useState("");

  const [
    editingComment,
    setEditingComment,
  ] = useState<EditingComment | null>(
    null,
  );

  const [
    deletingComment,
    setDeletingComment,
  ] = useState<CommentResponse | null>(
    null,
  );

  const [
    connectionState,
    setConnectionState,
  ] =
    useState<CommentConnectionState>(
      "connecting",
    );

  const myInfoQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn:
      async (): Promise<MyInfoResponse> =>
        getMyInfo(),
  });

  const commentsQuery = useQuery({
    queryKey: commentQueryKey,
    queryFn: () => getComments(cardId),
  });

  const comments =
    commentsQuery.data ?? [];

  const currentUser = myInfoQuery.data;

  const updateCommentCache =
    useCallback(
      (
        updater: (
          comments: CommentResponse[],
        ) => CommentResponse[],
      ) => {
        queryClient.setQueryData<CommentResponse[]>(
          ["cards", cardId, "comments"],
          (current = []) =>
            updater(current),
        );
      },
      [cardId, queryClient],
    );

  useEffect(() => {
    const disconnect =
      connectCommentWebSocket({
        boardId,

        onConnectionStateChange:
          setConnectionState,

        onEvent: (
          event: CommentWebSocketEvent,
        ) => {
          if (event.cardId !== cardId) {
            return;
          }

          switch (event.type) {
            case "CREATED":
            case "UPDATED": {
              if (!event.comment) {
                return;
              }

              updateCommentCache(
                (current) =>
                  upsertComment(
                    current,
                    event.comment as CommentResponse,
                  ),
              );

              break;
            }

            case "DELETED": {
              updateCommentCache(
                (current) =>
                  current.filter(
                    (comment) =>
                      comment.id !==
                      event.commentId,
                  ),
              );

              break;
            }
          }
        },

        onError: (error) => {
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
      mutationFn: async () => {
        const trimmedContent =
          content.trim();

        return createComment(cardId, {
          content: trimmedContent,
        });
      },

      onSuccess: (createdComment) => {
        updateCommentCache(
          (current) =>
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
      mutationFn: ({
        commentId,
        content,
      }: EditingComment) =>
        updateComment(commentId, {
          content,
        }),

      onSuccess: (updatedComment) => {
        updateCommentCache(
          (current) =>
            upsertComment(
              current,
              updatedComment,
            ),
        );

        setEditingComment(null);

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
      mutationFn: async (
        commentId: number,
      ) => {
        await deleteComment(commentId);
        return commentId;
      },

      onSuccess: (
        deletedCommentId,
      ) => {
        updateCommentCache(
          (current) =>
            current.filter(
              (comment) =>
                comment.id !==
                deletedCommentId,
            ),
        );

        setDeletingComment(null);

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

  const handleCreateComment = () => {
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
      commentId: comment.id,
      content: comment.content,
    });
  };

  const handleSaveEdit = () => {
    if (!editingComment) {
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
      content: trimmedContent,
    });
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      <ConfirmDialog
        open={deletingComment !== null}
        title="댓글 삭제"
        description="이 댓글을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        loading={
          deleteMutation.isPending
        }
        onConfirm={async () => {
          if (!deletingComment) {
            return;
          }

          await deleteMutation.mutateAsync(
            deletingComment.id,
          );
        }}
        onCancel={() =>
          setDeletingComment(null)
        }
      />

      <section>
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
              <CommentIcon />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[17px] font-bold tracking-[-0.015em] text-[var(--flow-text)]">
                  댓글
                </h3>

                {!commentsQuery.isLoading && (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--flow-gray-100)] px-2 py-1 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                    {comments.length}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                작업에 대한 의견, 검토 내용과 진행 상황을 함께 공유합니다.
              </p>
            </div>
          </div>

          <ConnectionStatus
            state={connectionState}
          />
        </div>

        <div className="mt-7">
          {commentsQuery.isLoading ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-[var(--flow-radius-lg)] bg-[var(--flow-surface-subtle)] px-6">
              <p className="text-[13px] text-[var(--flow-text-muted)]">
                댓글을 불러오는 중입니다.
              </p>
            </div>
          ) : commentsQuery.isError ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-[var(--flow-radius-lg)] bg-[var(--flow-danger-soft)] px-6 text-center">
              <p className="text-[13px] font-semibold text-[var(--flow-danger)]">
                댓글을 불러오지 못했습니다.
              </p>

              <button
                type="button"
                className="mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold text-[var(--flow-primary)] transition-colors hover:bg-white/70"
                onClick={() =>
                  void commentsQuery.refetch()
                }
              >
                다시 불러오기
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-[var(--flow-radius-lg)] border border-dashed border-[var(--flow-border-strong)] bg-[var(--flow-surface-subtle)] px-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--flow-text-placeholder)] shadow-[var(--flow-shadow-xs)]">
                <CommentIcon />
              </span>

              <p className="mt-4 text-[13px] font-semibold text-[var(--flow-text-secondary)]">
                아직 댓글이 없습니다.
              </p>

              <p className="mt-1.5 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                검토 의견이나 작업 진행 상황을 남겨보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {comments.map((comment) => {
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
                    key={comment.id}
                    className="group flex gap-4 rounded-[var(--flow-radius-lg)] px-3 py-5 transition-colors hover:bg-[var(--flow-surface-subtle)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-800)] text-[12px] font-bold text-white">
                      {comment.userNickname
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="truncate text-[13px] font-bold text-[var(--flow-text)]">
                            {comment.userNickname}
                          </span>

                          {isMine && (
                            <span className="shrink-0 rounded-md bg-[var(--flow-primary-50)] px-2 py-1 text-[10px] font-semibold text-[var(--flow-primary)]">
                              나
                            </span>
                          )}

                          <span className="shrink-0 text-[11px] text-[var(--flow-text-placeholder)]">
                            {formatDateTime(
                              comment.createdAt,
                            )}
                            {wasEdited &&
                              " · 수정됨"}
                          </span>
                        </div>

                        {!isEditing &&
                          canEdit &&
                          isMine && (
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <button
                                type="button"
                                disabled={isBusy}
                                className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-white hover:text-[var(--flow-text)] disabled:opacity-40"
                                onClick={() =>
                                  startEdit(comment)
                                }
                              >
                                수정
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)] disabled:opacity-40"
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

                      {isEditing &&
                      editingComment ? (
                        <div className="mt-3">
                          <textarea
                            value={
                              editingComment.content
                            }
                            rows={4}
                            maxLength={
                              MAX_COMMENT_LENGTH
                            }
                            autoFocus
                            disabled={
                              updateMutation.isPending
                            }
                            className="w-full resize-y rounded-[var(--flow-radius-md)] border border-[var(--flow-border-strong)] bg-white px-4 py-3 text-[13px] leading-6 text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:bg-[var(--flow-gray-100)]"
                            onChange={(event) =>
                              setEditingComment({
                                ...editingComment,
                                content:
                                  event.target.value,
                              })
                            }
                            onKeyDown={(event) => {
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
                                event.key === "Escape"
                              ) {
                                setEditingComment(null);
                              }
                            }}
                          />

                          <div className="mt-3 flex items-center justify-between gap-4">
                            <span className="text-[11px] text-[var(--flow-text-placeholder)]">
                              {editingComment.content.length}/1000
                            </span>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={
                                  updateMutation.isPending
                                }
                                onClick={() =>
                                  setEditingComment(null)
                                }
                              >
                                취소
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                loading={
                                  updateMutation.isPending
                                }
                                disabled={
                                  !editingComment.content.trim() ||
                                  updateMutation.isPending
                                }
                                onClick={
                                  handleSaveEdit
                                }
                              >
                                저장
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-7 text-[var(--flow-text-secondary)]">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {canEdit ? (
          <div className="mt-8 border-t border-[var(--flow-border)] pt-7">
            <div className="rounded-[var(--flow-radius-lg)] bg-[var(--flow-surface-subtle)] p-4">
              <textarea
                value={content}
                rows={4}
                maxLength={
                  MAX_COMMENT_LENGTH
                }
                disabled={
                  createMutation.isPending
                }
                placeholder="의견이나 진행 상황을 입력해주세요."
                className="w-full resize-y rounded-[var(--flow-radius-md)] border border-[var(--flow-border-strong)] bg-white px-4 py-3.5 text-[13px] leading-7 text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:bg-[var(--flow-gray-100)]"
                onChange={(event) =>
                  setContent(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey ||
                      event.metaKey)
                  ) {
                    event.preventDefault();
                    handleCreateComment();
                  }
                }}
              />

              <div className="mt-3 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-[11px] text-[var(--flow-text-placeholder)]">
                  <span>
                    Ctrl/Cmd + Enter로 등록
                  </span>

                  <span className="h-3 w-px bg-[var(--flow-border)]" />

                  <span>
                    {content.length}/1000
                  </span>
                </div>

                <Button
                  type="button"
                  leftIcon={<SendIcon />}
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
          </div>
        ) : (
          <div className="mt-8 border-t border-[var(--flow-border)] pt-6">
            <p className="rounded-[var(--flow-radius-md)] bg-[var(--flow-surface-subtle)] px-4 py-3 text-[12px] leading-6 text-[var(--flow-text-muted)]">
              VIEWER 권한에서는 댓글을 조회만 할 수 있습니다.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
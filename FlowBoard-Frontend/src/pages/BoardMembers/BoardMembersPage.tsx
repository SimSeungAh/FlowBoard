import {
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
  getBoardMembers,
  inviteBoardMember,
  removeBoardMember,
  updateBoardMemberRole,
  type BoardAssignableRole,
  type BoardMemberResponse,
  type BoardRole,
} from "@/api/cardAssignee";
import { getBoardDetail } from "@/api/board";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";

const getRoleLabel = (
  role: BoardRole,
) => {
  switch (role) {
    case "OWNER":
      return "소유자";

    case "MEMBER":
      return "멤버";

    case "VIEWER":
      return "조회 전용";
  }
};

const getRoleBadgeVariant = (
  role: BoardRole,
) => {
  switch (role) {
    case "OWNER":
      return "success" as const;

    case "MEMBER":
      return "default" as const;

    case "VIEWER":
      return "warning" as const;
  }
};

const getJoinedDate = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
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

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="9"
        cy="8"
        r="3"
      />

      <path d="M3.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5" />

      <circle
        cx="17"
        cy="9"
        r="2.3"
      />

      <path d="M15.5 14.5c2.9 0 4.8 1.3 5.2 4" />
    </svg>
  );
}

function ShieldIcon() {
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
      <path d="M12 3 19 6v5c0 4.6-2.8 7.9-7 10-4.2-2.1-7-5.4-7-10V6l7-3Z" />

      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function LockIcon() {
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
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
      />

      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
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

export default function BoardMembersPage() {
  const {
    boardId: boardIdParam,
  } = useParams<{
    boardId: string;
  }>();

  const boardId =
    Number(boardIdParam);

  const isValidBoardId =
    Number.isInteger(
      boardId,
    ) &&
    boardId > 0;

  const queryClient =
    useQueryClient();

  const [
    inviteOpen,
    setInviteOpen,
  ] = useState(false);

  const [
    inviteEmail,
    setInviteEmail,
  ] = useState("");

  const [
    inviteRole,
    setInviteRole,
  ] =
    useState<BoardAssignableRole>(
      "MEMBER",
    );

  const [
    removeTarget,
    setRemoveTarget,
  ] =
    useState<BoardMemberResponse | null>(
      null,
    );

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
        isValidBoardId,

      staleTime:
        30_000,
    });

  const board =
    boardQuery.data;

  const members =
    membersQuery.data ??
    [];

  const canManage =
    board?.myRole ===
    "OWNER";

  const inviteMutation =
    useMutation({
      mutationFn: () =>
        inviteBoardMember(
          boardId,
          {
            email:
              inviteEmail.trim(),

            role:
              inviteRole,
          },
        ),

      onSuccess:
        async (
          member,
        ) => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
                boardId,
                "members",
              ],
            },
          );

          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
                boardId,
                "activities",
              ],
            },
          );

          toast.success(
            `${member.nickname}님을 보드에 추가했습니다.`,
          );

          setInviteOpen(
            false,
          );

          setInviteEmail(
            "",
          );

          setInviteRole(
            "MEMBER",
          );
        },

      onError: () => {
        toast.error(
          "팀원을 추가하지 못했습니다. 가입된 이메일인지, 이미 참여 중인지 확인해주세요.",
        );
      },
    });

  const roleMutation =
    useMutation({
      mutationFn: ({
        memberId,
        role,
      }: {
        memberId: number;
        role: BoardAssignableRole;
      }) =>
        updateBoardMemberRole(
          boardId,
          memberId,
          {
            role,
          },
        ),

      onSuccess:
        async (
          member,
        ) => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
                boardId,
                "members",
              ],
            },
          );

          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
                boardId,
                "activities",
              ],
            },
          );

          toast.success(
            `${member.nickname}님의 권한을 ${getRoleLabel(member.role)}로 변경했습니다.`,
          );
        },

      onError: () => {
        toast.error(
          "팀원 권한을 변경하지 못했습니다.",
        );
      },
    });

  const removeMutation =
    useMutation({
      mutationFn: (
        memberId: number,
      ) =>
        removeBoardMember(
          boardId,
          memberId,
        ),

      onSuccess:
        async () => {
          const nickname =
            removeTarget?.nickname;

          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
                boardId,
                "members",
              ],
            },
          );

          await queryClient.invalidateQueries(
            {
              queryKey: [
                "boards",
                boardId,
                "activities",
              ],
            },
          );

          setRemoveTarget(
            null,
          );

          toast.success(
            nickname
              ? `${nickname}님을 보드에서 제거했습니다.`
              : "팀원을 보드에서 제거했습니다.",
          );
        },

      onError: () => {
        toast.error(
          "팀원을 제거하지 못했습니다.",
        );
      },
    });

  const handleInviteSubmit =
    (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        !canManage ||
        inviteMutation.isPending
      ) {
        return;
      }

      const email =
        inviteEmail.trim();

      if (!email) {
        toast.error(
          "초대할 이메일을 입력해주세요.",
        );

        return;
      }

      inviteMutation.mutate();
    };

  const handleRoleChange =
    (
      member: BoardMemberResponse,
      role: BoardAssignableRole,
    ) => {
      if (
        !canManage ||
        member.role ===
          "OWNER" ||
        member.role ===
          role
      ) {
        return;
      }

      roleMutation.mutate(
        {
          memberId:
            member.id,

          role,
        },
      );
    };

  const handleRemove =
    async () => {
      if (
        !removeTarget ||
        !canManage
      ) {
        return;
      }

      await removeMutation.mutateAsync(
        removeTarget.id,
      );
    };

  const closeInviteModal =
    () => {
      if (
        inviteMutation.isPending
      ) {
        return;
      }

      setInviteOpen(
        false,
      );
    };

  if (
    !isValidBoardId
  ) {
    return (
      <section className="flow-page">
        <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-xl font-bold text-[var(--flow-text)]">
            팀원 관리를 열 수
            없습니다.
          </h1>

          <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
            올바른 보드 주소인지
            확인해주세요.
          </p>
        </div>
      </section>
    );
  }

  const isLoading =
    boardQuery.isLoading ||
    membersQuery.isLoading;

  const isError =
    boardQuery.isError ||
    membersQuery.isError;

  return (
    <>
      <Modal
        open={
          inviteOpen
        }
        title="팀원 추가"
        size="md"
        closeOnBackdrop={
          !inviteMutation.isPending
        }
        closeOnEsc={
          !inviteMutation.isPending
        }
        onClose={
          closeInviteModal
        }
      >
        <form
          onSubmit={
            handleInviteSubmit
          }
        >
          <div>
            <p className="text-[13px] leading-6 text-[var(--flow-text-muted)]">
              FlowBoard에 이미 가입된
              사용자의 이메일을
              입력해주세요.
            </p>

            <div className="mt-6">
              <Input
                label="이메일"
                type="email"
                value={
                  inviteEmail
                }
                required
                autoFocus
                placeholder="member@example.com"
                disabled={
                  inviteMutation.isPending
                }
                onChange={(
                  event,
                ) =>
                  setInviteEmail(
                    event
                      .target
                      .value,
                  )
                }
              />
            </div>

            <div className="mt-6">
              <label className="text-xs font-semibold text-[var(--flow-text-secondary)]">
                권한
              </label>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={
                    inviteMutation.isPending
                  }
                  className={[
                    "rounded-[var(--flow-radius-md)] border p-4 text-left",
                    "transition-[border-color,background-color,box-shadow]",
                    inviteRole ===
                    "MEMBER"
                      ? [
                          "border-[var(--flow-primary-300)]",
                          "bg-[var(--flow-primary-50)]",
                          "shadow-[var(--flow-shadow-xs)]",
                        ].join(
                          " ",
                        )
                      : [
                          "border-[var(--flow-border)]",
                          "bg-white",
                          "hover:border-[var(--flow-gray-400)]",
                        ].join(
                          " ",
                        ),
                  ].join(
                    " ",
                  )}
                  onClick={() =>
                    setInviteRole(
                      "MEMBER",
                    )
                  }
                >
                  <p className="text-[13px] font-bold text-[var(--flow-text)]">
                    MEMBER
                  </p>

                  <p className="mt-1.5 text-[11px] leading-5 text-[var(--flow-text-muted)]">
                    작업 생성·수정,
                    댓글, 체크리스트,
                    화이트보드 사용
                  </p>
                </button>

                <button
                  type="button"
                  disabled={
                    inviteMutation.isPending
                  }
                  className={[
                    "rounded-[var(--flow-radius-md)] border p-4 text-left",
                    "transition-[border-color,background-color,box-shadow]",
                    inviteRole ===
                    "VIEWER"
                      ? [
                          "border-[var(--flow-primary-300)]",
                          "bg-[var(--flow-primary-50)]",
                          "shadow-[var(--flow-shadow-xs)]",
                        ].join(
                          " ",
                        )
                      : [
                          "border-[var(--flow-border)]",
                          "bg-white",
                          "hover:border-[var(--flow-gray-400)]",
                        ].join(
                          " ",
                        ),
                  ].join(
                    " ",
                  )}
                  onClick={() =>
                    setInviteRole(
                      "VIEWER",
                    )
                  }
                >
                  <p className="text-[13px] font-bold text-[var(--flow-text)]">
                    VIEWER
                  </p>

                  <p className="mt-1.5 text-[11px] leading-5 text-[var(--flow-text-muted)]">
                    보드와 작업,
                    활동 기록을
                    조회만 가능
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-[var(--flow-border)] pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={
                inviteMutation.isPending
              }
              onClick={
                closeInviteModal
              }
            >
              취소
            </Button>

            <Button
              type="submit"
              loading={
                inviteMutation.isPending
              }
              disabled={
                !inviteEmail.trim()
              }
            >
              팀원 추가
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={
          removeTarget !==
          null
        }
        title="팀원 제거"
        description={
          removeTarget
            ? `${removeTarget.nickname}님을 이 보드에서 제거할까요? 제거된 사용자는 더 이상 보드에 접근할 수 없습니다.`
            : undefined
        }
        confirmText="제거"
        cancelText="취소"
        loading={
          removeMutation.isPending
        }
        onConfirm={
          handleRemove
        }
        onCancel={() => {
          if (
            !removeMutation.isPending
          ) {
            setRemoveTarget(
              null,
            );
          }
        }}
      />

      <section className="flow-page">
        {/* Header */}
        <div className="flow-page-header">
          <div>
            <p className="text-[12px] font-semibold text-[var(--flow-primary)]">
              {board?.title ??
                `Board #${boardId}`}
            </p>

            <h1 className="mt-2 flow-page-title">
              팀원 및 권한
            </h1>

            <p className="flow-page-description">
              이 보드에 참여하는
              사람과 접근 권한을
              확인하고 관리합니다.
            </p>
          </div>

          {canManage && (
            <Button
              type="button"
              size="lg"
              leftIcon={
                <PlusIcon />
              }
              onClick={() => {
                setInviteEmail(
                  "",
                );

                setInviteRole(
                  "MEMBER",
                );

                setInviteOpen(
                  true,
                );
              }}
            >
              팀원 추가
            </Button>
          )}
        </div>

        {/* Permission notice */}
        {!isLoading &&
          board &&
          !canManage && (
            <section className="flow-section">
              <div className="flex items-start gap-4 rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]">
                  <LockIcon />
                </span>

                <div>
                  <p className="text-[13px] font-bold text-[var(--flow-text)]">
                    팀원 정보 조회
                  </p>

                  <p className="mt-1 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                    현재{" "}
                    <strong className="font-semibold text-[var(--flow-text-secondary)]">
                      {getRoleLabel(
                        board.myRole,
                      )}
                    </strong>{" "}
                    권한으로 참여
                    중입니다. 팀원 추가,
                    권한 변경과 제거는
                    보드 소유자만 할 수
                    있습니다.
                  </p>
                </div>
              </div>
            </section>
          )}

        {/* Members */}
        <section className="flow-section">
          <div className="flow-section-header">
            <div>
              <h2 className="flow-section-title">
                참여 중인 팀원
              </h2>

              <p className="flow-section-description">
                보드에서 함께 작업하고
                있는 사용자를
                확인합니다.
              </p>
            </div>

            {!isLoading &&
              !isError && (
                <span className="whitespace-nowrap text-[13px] text-[var(--flow-text-muted)]">
                  총{" "}
                  <strong className="font-bold text-[var(--flow-text)]">
                    {members.length}
                  </strong>
                  명
                </span>
              )}
          </div>

          {isLoading ? (
            <div className="overflow-hidden rounded-[var(--flow-radius-xl)] bg-white shadow-[var(--flow-shadow-xs)]">
              {Array.from({
                length: 4,
              }).map(
                (
                  _,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className="flex items-center gap-5 border-b border-[var(--flow-border)] px-7 py-5 last:border-b-0"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />

                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-32" />

                      <Skeleton className="mt-2 h-3 w-56" />
                    </div>

                    <Skeleton className="h-8 w-24" />

                    <Skeleton className="h-8 w-28" />
                  </div>
                ),
              )}
            </div>
          ) : isError ? (
            <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
              <h2 className="text-lg font-bold text-[var(--flow-text)]">
                팀원 정보를 불러오지
                못했습니다.
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                로그인 상태와 보드
                접근 권한을 확인한 뒤
                다시 시도해주세요.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() =>
                  void Promise.all([
                    boardQuery.refetch(),
                    membersQuery.refetch(),
                  ])
                }
              >
                다시 불러오기
              </Button>
            </div>
          ) : members.length ===
            0 ? (
            <EmptyState
              title="참여 중인 팀원이 없습니다."
              description="현재 보드에 등록된 멤버가 없습니다."
            />
          ) : (
            <div className="overflow-hidden rounded-[var(--flow-radius-xl)] border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
              {/* Header */}
              <div className="grid grid-cols-[minmax(280px,1.5fr)_minmax(180px,0.8fr)_180px_160px] items-center gap-5 border-b border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-7 py-3.5">
                <span className="text-[11px] font-bold text-[var(--flow-text-muted)]">
                  팀원
                </span>

                <span className="text-[11px] font-bold text-[var(--flow-text-muted)]">
                  참여일
                </span>

                <span className="text-[11px] font-bold text-[var(--flow-text-muted)]">
                  권한
                </span>

                <span className="text-right text-[11px] font-bold text-[var(--flow-text-muted)]">
                  관리
                </span>
              </div>

              {/* Rows */}
              {members.map(
                (member) => {
                  const isOwner =
                    member.role ===
                    "OWNER";

                  const isUpdatingThisMember =
                    roleMutation.isPending &&
                    roleMutation.variables
                      ?.memberId ===
                      member.id;

                  return (
                    <div
                      key={
                        member.id
                      }
                      className="grid min-h-[86px] grid-cols-[minmax(280px,1.5fr)_minmax(180px,0.8fr)_180px_160px] items-center gap-5 border-b border-[var(--flow-border)] px-7 py-4 last:border-b-0"
                    >
                      {/* User */}
                      <div className="flex min-w-0 items-center gap-3.5">
                        <Avatar
                          name={
                            member.nickname
                          }
                          size="md"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-bold text-[var(--flow-text)]">
                              {
                                member.nickname
                              }
                            </p>

                            {member.userId ===
                              board?.ownerId && (
                              <Badge variant="success">
                                OWNER
                              </Badge>
                            )}
                          </div>

                          <p className="mt-1 truncate text-[12px] text-[var(--flow-text-muted)]">
                            {
                              member.email
                            }
                          </p>
                        </div>
                      </div>

                      {/* Joined */}
                      <span className="text-[12px] text-[var(--flow-text-muted)]">
                        {getJoinedDate(
                          member.createAt,
                        )}
                      </span>

                      {/* Role */}
                      <div>
                        {canManage &&
                        !isOwner ? (
                          <select
                            value={
                              member.role
                            }
                            disabled={
                              isUpdatingThisMember ||
                              removeMutation.isPending
                            }
                            aria-label={`${member.nickname} 권한`}
                            className={[
                              "h-9 w-[140px] rounded-lg",
                              "border border-[var(--flow-border-strong)]",
                              "bg-white px-3",
                              "text-[12px] font-semibold text-[var(--flow-text-secondary)]",
                              "outline-none",
                              "transition-[border-color,box-shadow]",
                              "focus:border-[var(--flow-primary)]",
                              "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                              "disabled:cursor-not-allowed disabled:bg-[var(--flow-gray-100)]",
                            ].join(
                              " ",
                            )}
                            onChange={(
                              event,
                            ) =>
                              handleRoleChange(
                                member,
                                event
                                  .target
                                  .value as BoardAssignableRole,
                              )
                            }
                          >
                            <option value="MEMBER">
                              MEMBER
                            </option>

                            <option value="VIEWER">
                              VIEWER
                            </option>
                          </select>
                        ) : (
                          <Badge
                            variant={
                              getRoleBadgeVariant(
                                member.role,
                              )
                            }
                          >
                            {getRoleLabel(
                              member.role,
                            )}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        {canManage &&
                        !isOwner ? (
                          <button
                            type="button"
                            disabled={
                              removeMutation.isPending ||
                              roleMutation.isPending
                            }
                            className={[
                              "inline-flex h-9 items-center gap-2 rounded-lg px-3",
                              "text-[12px] font-semibold",
                              "text-[var(--flow-danger)]",
                              "transition-colors",
                              "hover:bg-[var(--flow-danger-soft)]",
                              "disabled:cursor-not-allowed disabled:opacity-40",
                            ].join(
                              " ",
                            )}
                            onClick={() =>
                              setRemoveTarget(
                                member,
                              )
                            }
                          >
                            <TrashIcon />
                            제거
                          </button>
                        ) : isOwner ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--flow-text-placeholder)]">
                            <ShieldIcon />
                            보드 소유자
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--flow-text-placeholder)]">
                            조회만 가능
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* Role Guide */}
        <section className="flow-section">
          <div className="flow-section-header">
            <div>
              <h2 className="flow-section-title">
                권한 안내
              </h2>

              <p className="flow-section-description">
                역할에 따라 보드에서
                사용할 수 있는 기능이
                달라집니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]">
                  <ShieldIcon />
                </span>

                <Badge variant="success">
                  OWNER
                </Badge>
              </div>

              <h3 className="mt-5 text-[15px] font-bold text-[var(--flow-text)]">
                보드 소유자
              </h3>

              <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                보드의 모든 작업을
                관리하고 팀원을
                추가하거나 권한을
                변경·제거할 수
                있습니다.
              </p>
            </div>

            <div className="rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
                  <PeopleIcon />
                </span>

                <Badge>
                  MEMBER
                </Badge>
              </div>

              <h3 className="mt-5 text-[15px] font-bold text-[var(--flow-text)]">
                작업 참여자
              </h3>

              <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                작업 생성·수정과
                카드 이동, 댓글,
                체크리스트,
                화이트보드 등의 협업
                기능을 사용할 수
                있습니다.
              </p>
            </div>

            <div className="rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]">
                  <LockIcon />
                </span>

                <Badge variant="warning">
                  VIEWER
                </Badge>
              </div>

              <h3 className="mt-5 text-[15px] font-bold text-[var(--flow-text)]">
                조회 참여자
              </h3>

              <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                보드의 작업과
                화이트보드, 활동
                기록을 확인할 수
                있지만 내용을
                수정할 수는 없습니다.
              </p>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
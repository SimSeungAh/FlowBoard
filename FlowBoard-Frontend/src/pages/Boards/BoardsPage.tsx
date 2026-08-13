import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { createBoard, getMyBoards, type BoardListResponse } from "@/api/board";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Textarea from "@/components/ui/Textarea";

const getRoleVariant = (role: BoardListResponse["myRole"]) => {
  switch (role) {
    case "OWNER":
      return "success" as const;

    case "MEMBER":
      return "default" as const;

    case "VIEWER":
      return "warning" as const;
  }
};

const getRoleLabel = (role: BoardListResponse["myRole"]) => {
  switch (role) {
    case "OWNER":
      return "소유자";

    case "MEMBER":
      return "멤버";

    case "VIEWER":
      return "조회 전용";
  }
};

export default function BoardsPage() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const {
    data: boards = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["boards"],
    queryFn: getMyBoards,
  });

  const createMutation = useMutation({
    mutationFn: createBoard,

    onSuccess: async (createdBoard) => {
      await queryClient.invalidateQueries({
        queryKey: ["boards"],
      });

      toast.success("새 보드를 만들었습니다.");

      setCreateOpen(false);
      setTitle("");
      setDescription("");

      /*
       * 생성 직후 보드 목록에 머무르지 않고
       * 방금 생성한 실제 칸반 보드로 이동합니다.
       */
      navigate(`/boards/${createdBoard.id}`);
    },

    onError: () => {
      toast.error("보드를 생성하지 못했습니다.");
    },
  });

  const openCreateModal = () => {
    setTitle("");
    setDescription("");
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) {
      return;
    }

    setCreateOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("보드 제목을 입력해주세요.");

      return;
    }

    createMutation.mutate({
      title: trimmedTitle,

      description: trimmedDescription || null,
    });
  };

  return (
    <>
      <Modal
        open={createOpen}
        title="새 보드 만들기"
        closeOnBackdrop={!createMutation.isPending}
        closeOnEsc={!createMutation.isPending}
        onClose={closeCreateModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <Input
              label="보드 제목"
              value={title}
              required
              autoFocus
              maxLength={100}
              placeholder="예: FlowBoard 개발"
              helperText={`${title.length}/100`}
              disabled={createMutation.isPending}
              onChange={(event) => setTitle(event.target.value)}
            />

            <div>
              <Textarea
                id="board-description"
                label="보드 설명"
                value={description}
                maxLength={500}
                placeholder="이 보드에서 진행할 작업을 간단히 적어주세요."
                disabled={createMutation.isPending}
                onChange={(event) => setDescription(event.target.value)}
              />

              <p className="mt-1 text-right text-xs text-slate-400">{description.length}/500</p>
            </div>
          </div>

          <div className="mt-7 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={closeCreateModal}
            >
              취소
            </Button>

            <Button type="submit" loading={createMutation.isPending} disabled={!title.trim()}>
              보드 만들기
            </Button>
          </div>
        </form>
      </Modal>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">WORKSPACE</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">내 보드</h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              직접 만든 보드와 초대받은 보드를 한곳에서 관리하세요.
            </p>
          </div>

          <Button type="button" onClick={openCreateModal}>
            + 새 보드
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-5 w-20 rounded-full" />

                <Skeleton className="mt-5 h-7 w-2/3" />

                <Skeleton className="mt-3 h-4 w-full" />

                <Skeleton className="mt-2 h-4 w-4/5" />

                <Skeleton className="mt-8 h-10 w-full rounded-lg" />
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card>
            <div className="flex flex-col items-start gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  보드 목록을 불러오지 못했습니다.
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  로그인 상태와 백엔드 연결을 확인한 뒤 다시 시도해주세요.
                </p>
              </div>

              <Button type="button" variant="outline" onClick={() => void refetch()}>
                다시 불러오기
              </Button>
            </div>
          </Card>
        ) : boards.length === 0 ? (
          <EmptyState
            title="아직 참여 중인 보드가 없습니다."
            description="첫 보드를 만들면 할 일, 진행 중, 완료 컬럼이 자동으로 생성됩니다."
            actionLabel="첫 보드 만들기"
            onAction={openCreateModal}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                참여 중인 보드{" "}
                <strong className="font-semibold text-slate-900">{boards.length}</strong>개
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {boards.map((board) => (
                <Card
                  key={board.id}
                  className="group flex min-h-[280px] flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant={getRoleVariant(board.myRole)}>
                      {getRoleLabel(board.myRole)}
                    </Badge>

                    <span className="text-xs text-slate-400">Board #{board.id}</span>
                  </div>

                  {/*
                   * 보드 제목/설명 영역 자체를 클릭해도
                   * 실제 칸반 보드로 들어갑니다.
                   */}
                  <Link
                    to={`/boards/${board.id}`}
                    className="mt-5 flex flex-1 flex-col rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <h2 className="text-xl font-bold break-words text-slate-900 transition-colors group-hover:text-blue-600">
                      {board.title}
                    </h2>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 break-words whitespace-pre-wrap text-slate-500">
                      {board.description || "보드 설명이 없습니다."}
                    </p>

                    <div className="mt-auto pt-5">
                      <p className="text-xs text-slate-400">
                        소유자{" "}
                        <span className="font-medium text-slate-600">{board.ownerNickname}</span>
                      </p>
                    </div>
                  </Link>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <Link
                      to={`/boards/${board.id}`}
                      className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      보드 열기
                      <span className="ml-2" aria-hidden="true">
                        →
                      </span>
                    </Link>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Link
                        to={`/boards/${board.id}/search`}
                        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      >
                        카드 검색
                      </Link>

                      <Link
                        to={`/boards/${board.id}/whiteboard`}
                        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      >
                        화이트보드
                      </Link>

                      <Link
                        to={`/boards/${board.id}/activities`}
                        className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      >
                        활동 로그
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

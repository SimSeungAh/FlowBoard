import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { deleteCard, getCardDetail, updateCard, type CardUpdateRequest } from "@/api/card";
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

const toDateTimeInputValue = (value: string | null) => {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function CardDetailModal({
  open,
  cardId,
  canEdit,
  onClose,
  onChanged,
}: CardDetailModalProps) {
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [dueDate, setDueDate] = useState("");

  const cardQuery = useQuery({
    queryKey: ["cards", cardId],

    queryFn: () => getCardDetail(cardId as number),

    enabled: open && cardId !== null,
  });

  const card = cardQuery.data;

  useEffect(() => {
    if (!open || !card) {
      return;
    }

    setTitle(card.title);

    setDescription(card.description ?? "");

    setDueDate(toDateTimeInputValue(card.dueDate));

    setEditMode(false);
  }, [card, open]);

  useEffect(() => {
    if (open) {
      return;
    }

    setEditMode(false);

    setDeleteDialogOpen(false);
  }, [open]);

  const updateMutation = useMutation({
    mutationFn: (data: CardUpdateRequest) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return updateCard(cardId, data);
    },

    onSuccess: async (updatedCard) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      await onChanged();

      setEditMode(false);

      toast.success("카드를 수정했습니다.");
    },

    onError: () => {
      toast.error("카드를 수정하지 못했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      await deleteCard(cardId);
    },

    onSuccess: async () => {
      if (cardId !== null) {
        queryClient.removeQueries({
          queryKey: ["cards", cardId],
        });
      }

      await onChanged();

      setDeleteDialogOpen(false);

      toast.success("카드를 삭제했습니다.");

      onClose();
    },

    onError: () => {
      toast.error("카드를 삭제하지 못했습니다.");
    },
  });

  const startEdit = () => {
    if (!card || !canEdit) {
      return;
    }

    setTitle(card.title);

    setDescription(card.description ?? "");

    setDueDate(toDateTimeInputValue(card.dueDate));

    setEditMode(true);
  };

  const cancelEdit = () => {
    if (!card) {
      return;
    }

    setTitle(card.title);

    setDescription(card.description ?? "");

    setDueDate(toDateTimeInputValue(card.dueDate));

    setEditMode(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEdit || !card) {
      return;
    }

    const trimmedTitle = title.trim();

    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("카드 제목을 입력해주세요.");

      return;
    }

    updateMutation.mutate({
      title: trimmedTitle,

      description: trimmedDescription || null,

      dueDate: dueDate || null,
    });
  };

  const handleClose = () => {
    if (updateMutation.isPending || deleteMutation.isPending) {
      return;
    }

    setEditMode(false);

    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        title={editMode ? "카드 수정" : "카드 상세"}
        size="lg"
        closeOnBackdrop={!updateMutation.isPending && !deleteMutation.isPending}
        closeOnEsc={!updateMutation.isPending && !deleteMutation.isPending}
        onClose={handleClose}
      >
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {cardQuery.isLoading ? (
            <div className="flex min-h-52 items-center justify-center">
              <p className="text-sm text-slate-400">카드 정보를 불러오는 중...</p>
            </div>
          ) : cardQuery.isError || !card ? (
            <div className="py-8">
              <h3 className="font-semibold text-slate-900">카드 정보를 불러오지 못했습니다.</h3>

              <p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해주세요.</p>

              <div className="mt-5">
                <Button type="button" variant="outline" onClick={() => void cardQuery.refetch()}>
                  다시 불러오기
                </Button>
              </div>
            </div>
          ) : editMode ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <Input
                  label="카드 제목"
                  value={title}
                  required
                  maxLength={100}
                  helperText={`${title.length}/100`}
                  disabled={updateMutation.isPending}
                  onChange={(event) => setTitle(event.target.value)}
                />

                <Textarea
                  id="card-detail-description"
                  label="설명"
                  value={description}
                  placeholder="카드 설명을 입력해주세요."
                  disabled={updateMutation.isPending}
                  onChange={(event) => setDescription(event.target.value)}
                />

                <Input
                  label="마감일"
                  type="datetime-local"
                  value={dueDate}
                  disabled={updateMutation.isPending}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>

              <div className="mt-7 flex justify-end gap-2 border-t border-slate-100 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateMutation.isPending}
                  onClick={cancelEdit}
                >
                  취소
                </Button>

                <Button type="submit" loading={updateMutation.isPending} disabled={!title.trim()}>
                  저장
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-blue-600">Card #{card.id}</p>

                    <h3 className="mt-2 text-2xl leading-tight font-bold text-slate-950">
                      {card.title}
                    </h3>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Column #{card.columnId}
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    설명
                  </p>

                  {card.description ? (
                    <p className="mt-2 text-sm leading-7 break-words whitespace-pre-wrap text-slate-700">
                      {card.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400">등록된 설명이 없습니다.</p>
                  )}
                </div>

                <div className="mt-7 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400">작성자</p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {card.createdByNickname}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">마감일</p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDateTime(card.dueDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">생성일</p>

                    <p className="mt-1 text-sm text-slate-600">{formatDateTime(card.createdAt)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">최근 수정</p>

                    <p className="mt-1 text-sm text-slate-600">{formatDateTime(card.updatedAt)}</p>
                  </div>
                </div>

                <div className="mt-7 rounded-xl border border-dashed border-slate-200 px-4 py-5">
                  <p className="text-sm font-semibold text-slate-700">카드 상세 기능</p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    담당자, 태그, 체크리스트, 댓글은 다음 단계에서 이 영역에 연결합니다.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
                <div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      카드 삭제
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    닫기
                  </Button>

                  {canEdit && (
                    <Button type="button" onClick={startEdit}>
                      수정
                    </Button>
                  )}
                </div>
              </div>

              {!canEdit && (
                <p className="mt-4 text-right text-xs text-slate-400">
                  VIEWER 권한에서는 카드 조회만 가능합니다.
                </p>
              )}
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="카드 삭제"
        description={
          card
            ? `'${card.title}' 카드를 삭제합니다. 담당자, 태그, 체크리스트, 댓글 등 연결된 데이터도 함께 삭제될 수 있으며 되돌릴 수 없습니다.`
            : "카드를 삭제합니다. 되돌릴 수 없습니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getDesignReview,
  updateDesignReview,
  type DesignReviewStatus,
} from "@/api/designReview";
import Button from "@/components/ui/Button";

const statusLabel: Record<DesignReviewStatus, string> = {
  PENDING: "검토 대기",
  IN_REVIEW: "검토 중",
  CHANGES_REQUESTED: "수정 요청",
  APPROVED: "승인",
};

const statusClassName: Record<DesignReviewStatus, string> = {
  PENDING: "border-[var(--flow-border-strong)] bg-white text-[var(--flow-text-secondary)]",
  IN_REVIEW: "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  CHANGES_REQUESTED: "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
  APPROVED: "border-emerald-200 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
};

const isOpenableUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export default function DesignReviewCardSection({
  cardId,
  canEdit,
}: {
  cardId: number;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["cards", cardId, "design-review"],
    queryFn: () => getDesignReview(cardId),
  });

  const [designUrl, setDesignUrl] = useState("");
  const [reviewScope, setReviewScope] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setDesignUrl(query.data.designUrl ?? "");
    setReviewScope(query.data.reviewScope ?? "");
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateDesignReview>[1]) =>
      updateDesignReview(cardId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cards", cardId, "design-review"] }),
        queryClient.invalidateQueries({ queryKey: ["cards", cardId] }),
        queryClient.invalidateQueries({ queryKey: ["board"] }),
      ]);
      toast.success("디자인 리뷰 정보를 저장했습니다.");
    },
    onError: () => toast.error("디자인 리뷰 정보를 저장하지 못했습니다."),
  });

  if (query.isLoading) {
    return (
      <section className="border-b border-[var(--flow-border)] px-8 py-6">
        <p className="text-[12px] text-[var(--flow-text-muted)]">디자인 리뷰 정보를 불러오는 중...</p>
      </section>
    );
  }

  if (!query.data || query.isError) {
    return (
      <section className="border-b border-[var(--flow-border)] px-8 py-6">
        <p className="text-[12px] text-[var(--flow-danger)]">디자인 리뷰 정보를 불러오지 못했습니다.</p>
      </section>
    );
  }

  const item = query.data;

  return (
    <section className="border-b border-[var(--flow-border)] px-8 py-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-[var(--flow-text)]">디자인 리뷰</h3>
            <span className="rounded-md bg-[var(--flow-gray-100)] px-2 py-1 text-[9px] font-bold tracking-[0.05em] text-[var(--flow-text-secondary)]">
              DESIGN
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-[var(--flow-text-muted)]">
            디자인 링크와 검토 범위, 현재 승인 상태를 카드에서 관리합니다.
          </p>
        </div>

        <span
          className={[
            "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold",
            statusClassName[item.reviewStatus],
          ].join(" ")}
        >
          {statusLabel[item.reviewStatus]}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          리뷰 상태
          {canEdit ? (
            <select
              value={item.reviewStatus}
              disabled={mutation.isPending}
              onChange={(event) =>
                mutation.mutate({ reviewStatus: event.target.value as DesignReviewStatus })
              }
              className={[
                "mt-1.5 h-10 w-full rounded-xl border px-3 text-[12px] font-semibold outline-none",
                "transition-[border-color,box-shadow,opacity] focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                statusClassName[item.reviewStatus],
                mutation.isPending ? "cursor-wait opacity-50" : "cursor-pointer",
              ].join(" ")}
            >
              <option value="PENDING">검토 대기</option>
              <option value="IN_REVIEW">검토 중</option>
              <option value="CHANGES_REQUESTED">수정 요청</option>
              <option value="APPROVED">승인</option>
            </select>
          ) : (
            <div
              className={[
                "mt-1.5 flex h-10 items-center rounded-xl border px-3 text-[12px] font-semibold",
                statusClassName[item.reviewStatus],
              ].join(" ")}
            >
              {statusLabel[item.reviewStatus]}
            </div>
          )}
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          디자인 링크
          <div className="mt-1.5 flex gap-2">
            <input
              value={designUrl}
              disabled={!canEdit || mutation.isPending}
              onChange={(event) => setDesignUrl(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:bg-[var(--flow-gray-50)]"
              placeholder="https://www.figma.com/..."
            />
            {isOpenableUrl(designUrl) && (
              <a
                href={designUrl.trim()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 shrink-0 items-center rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[11px] font-bold text-[var(--flow-text-secondary)] transition-colors hover:border-[var(--flow-primary-200)] hover:text-[var(--flow-primary)]"
              >
                열기
              </a>
            )}
          </div>
        </label>
      </div>

      <label className="mt-4 block text-[11px] font-semibold text-[var(--flow-text-muted)]">
        검토 범위
        <textarea
          value={reviewScope}
          disabled={!canEdit || mutation.isPending}
          onChange={(event) => setReviewScope(event.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-[12px] leading-5 text-[var(--flow-text)] outline-none transition-[border-color,box-shadow] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:bg-[var(--flow-gray-50)]"
          placeholder="예: 로그인 화면 데스크톱 UI, 오류 상태, 키보드 접근성"
        />
      </label>

      {canEdit && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate({ designUrl, reviewScope })}
          >
            디자인 리뷰 저장
          </Button>
        </div>
      )}
    </section>
  );
}

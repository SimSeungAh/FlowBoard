import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getRequirement,
  updateRequirement,
  type RequirementApprovalStatus,
  type RequirementPriority,
} from "@/api/requirement";
import Button from "@/components/ui/Button";

const priorityLabel: Record<RequirementPriority, string> = {
  CRITICAL: "긴급",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

const approvalLabel: Record<RequirementApprovalStatus, string> = {
  DRAFT: "초안",
  IN_REVIEW: "검토 중",
  APPROVED: "승인",
  CHANGES_REQUESTED: "수정 요청",
  REJECTED: "반려",
};

export default function RequirementCardSection({
  cardId,
  canEdit,
}: {
  cardId: number;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["cards", cardId, "requirement"],
    queryFn: () => getRequirement(cardId),
  });

  const [source, setSource] = useState("");
  const [targetVersion, setTargetVersion] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setSource(query.data.source ?? "");
    setTargetVersion(query.data.targetVersion ?? "");
    setAcceptanceCriteria(query.data.acceptanceCriteria ?? "");
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateRequirement>[1]) => updateRequirement(cardId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cards", cardId, "requirement"] }),
        queryClient.invalidateQueries({ queryKey: ["board"] }),
      ]);
      toast.success("요구사항 정보를 저장했습니다.");
    },
    onError: () => toast.error("요구사항 정보를 저장하지 못했습니다."),
  });

  if (query.isLoading) {
    return (
      <section className="border-b border-[var(--flow-border)] px-7 py-6">
        <p className="text-[13px] text-[var(--flow-text-muted)]">요구사항 정보를 불러오는 중...</p>
      </section>
    );
  }

  if (!query.data || query.isError) {
    return (
      <section className="border-b border-[var(--flow-border)] px-7 py-6">
        <p className="text-[13px] text-[var(--flow-danger)]">요구사항 정보를 불러오지 못했습니다.</p>
      </section>
    );
  }

  const item = query.data;

  return (
    <section className="border-b border-[var(--flow-border)] px-7 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--flow-text)]">기획 / 요구사항</h3>
          <p className="mt-1 text-[11px] text-[var(--flow-text-muted)]">승인 상태와 완료 기준을 카드와 함께 관리합니다.</p>
        </div>
        <span className="rounded-lg bg-[var(--flow-primary-50)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--flow-primary)]">
          REQ-{cardId}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          우선순위
          <select
            value={item.priority}
            disabled={!canEdit || mutation.isPending}
            onChange={(event) => mutation.mutate({ priority: event.target.value as RequirementPriority })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] text-[var(--flow-text)] outline-none"
          >
            {Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          승인 상태
          <select
            value={item.approvalStatus}
            disabled={!canEdit || mutation.isPending}
            onChange={(event) => mutation.mutate({ approvalStatus: event.target.value as RequirementApprovalStatus })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] text-[var(--flow-text)] outline-none"
          >
            {Object.entries(approvalLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          출처
          <input value={source} disabled={!canEdit || mutation.isPending} onChange={(e) => setSource(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] outline-none" placeholder="예: 사용자 피드백" />
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          목표 버전
          <input value={targetVersion} disabled={!canEdit || mutation.isPending} onChange={(e) => setTargetVersion(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] outline-none" placeholder="예: v1.2.0" />
        </label>
      </div>

      <label className="mt-4 block text-[11px] font-semibold text-[var(--flow-text-muted)]">
        인수 조건
        <textarea value={acceptanceCriteria} disabled={!canEdit || mutation.isPending} onChange={(e) => setAcceptanceCriteria(e.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-[12px] leading-5 outline-none" placeholder="완료로 인정할 수 있는 조건을 적어주세요." />
      </label>

      {canEdit && (
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" loading={mutation.isPending} onClick={() => mutation.mutate({ source, targetVersion, acceptanceCriteria })}>
            요구사항 저장
          </Button>
        </div>
      )}
    </section>
  );
}

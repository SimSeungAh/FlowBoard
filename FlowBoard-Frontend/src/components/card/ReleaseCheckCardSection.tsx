import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getReleaseCheck,
  updateReleaseCheck,
  type ReleaseEnvironment,
  type ReleaseStatus,
  type SmokeTestStatus,
} from "@/api/releaseCheck";
import Button from "@/components/ui/Button";

const releaseStatusLabel: Record<ReleaseStatus, string> = {
  PREPARING: "준비 중",
  READY: "배포 준비 완료",
  DEPLOYING: "배포 중",
  RELEASED: "배포 완료",
  BLOCKED: "차단됨",
  ROLLED_BACK: "롤백됨",
};

const environmentLabel: Record<ReleaseEnvironment, string> = {
  DEVELOPMENT: "Development",
  STAGING: "Staging",
  PRODUCTION: "Production",
};

const smokeStatusLabel: Record<SmokeTestStatus, string> = {
  PENDING: "미실행",
  PASS: "PASS",
  FAIL: "FAIL",
};

const releaseStatusClassName: Record<ReleaseStatus, string> = {
  PREPARING: "border-[var(--flow-border-strong)] bg-white text-[var(--flow-text-secondary)]",
  READY: "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  DEPLOYING: "border-blue-200 bg-blue-50 text-blue-700",
  RELEASED: "border-emerald-200 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
  BLOCKED: "border-red-200 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
  ROLLED_BACK: "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
};

export default function ReleaseCheckCardSection({
  cardId,
  canEdit,
}: {
  cardId: number;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["cards", cardId, "release-check"],
    queryFn: () => getReleaseCheck(cardId),
  });

  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setVersion(query.data.version ?? "");
    setReleaseNotes(query.data.releaseNotes ?? "");
    setRollbackPlan(query.data.rollbackPlan ?? "");
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateReleaseCheck>[1]) =>
      updateReleaseCheck(cardId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cards", cardId, "release-check"] }),
        queryClient.invalidateQueries({ queryKey: ["cards", cardId] }),
        queryClient.invalidateQueries({ queryKey: ["board"] }),
      ]);
      toast.success("릴리즈 체크 정보를 저장했습니다.");
    },
    onError: () => toast.error("릴리즈 체크 정보를 저장하지 못했습니다."),
  });

  if (query.isLoading) {
    return (
      <section className="border-b border-[var(--flow-border)] px-7 py-6">
        <p className="text-[13px] text-[var(--flow-text-muted)]">릴리즈 체크 정보를 불러오는 중...</p>
      </section>
    );
  }

  if (!query.data || query.isError) {
    return (
      <section className="border-b border-[var(--flow-border)] px-7 py-6">
        <p className="text-[13px] text-[var(--flow-danger)]">릴리즈 체크 정보를 불러오지 못했습니다.</p>
      </section>
    );
  }

  const item = query.data;

  return (
    <section className="border-b border-[var(--flow-border)] px-7 py-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-[var(--flow-text)]">릴리즈 체크</h3>
            <span className="rounded-md bg-[var(--flow-gray-100)] px-2 py-1 text-[9px] font-bold tracking-[0.05em] text-[var(--flow-text-secondary)]">
              RELEASE
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-[var(--flow-text-muted)]">
            배포 버전과 환경, 스모크 테스트, 롤백 계획을 한 카드에서 확인합니다.
          </p>
        </div>

        <span
          className={[
            "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold",
            releaseStatusClassName[item.releaseStatus],
          ].join(" ")}
        >
          {releaseStatusLabel[item.releaseStatus]}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          릴리즈 상태
          <select
            value={item.releaseStatus}
            disabled={!canEdit || mutation.isPending}
            onChange={(event) =>
              mutation.mutate({ releaseStatus: event.target.value as ReleaseStatus })
            }
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] font-semibold text-[var(--flow-text)] outline-none disabled:bg-[var(--flow-gray-50)]"
          >
            {Object.entries(releaseStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          대상 환경
          <select
            value={item.targetEnvironment}
            disabled={!canEdit || mutation.isPending}
            onChange={(event) =>
              mutation.mutate({ targetEnvironment: event.target.value as ReleaseEnvironment })
            }
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] text-[var(--flow-text)] outline-none disabled:bg-[var(--flow-gray-50)]"
          >
            {Object.entries(environmentLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          버전
          <input
            value={version}
            disabled={!canEdit || mutation.isPending}
            onChange={(event) => setVersion(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] text-[var(--flow-text)] outline-none disabled:bg-[var(--flow-gray-50)]"
            placeholder="예: v1.0.0"
          />
        </label>

        <label className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
          스모크 테스트
          <select
            value={item.smokeTestStatus}
            disabled={!canEdit || mutation.isPending}
            onChange={(event) =>
              mutation.mutate({ smokeTestStatus: event.target.value as SmokeTestStatus })
            }
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] font-semibold text-[var(--flow-text)] outline-none disabled:bg-[var(--flow-gray-50)]"
          >
            {Object.entries(smokeStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-[11px] font-semibold text-[var(--flow-text-muted)]">
        릴리즈 노트
        <textarea
          value={releaseNotes}
          disabled={!canEdit || mutation.isPending}
          onChange={(event) => setReleaseNotes(event.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-[12px] leading-5 text-[var(--flow-text)] outline-none disabled:bg-[var(--flow-gray-50)]"
          placeholder="이번 릴리즈에서 변경되는 핵심 내용을 적어주세요."
        />
      </label>

      <label className="mt-4 block text-[11px] font-semibold text-[var(--flow-text-muted)]">
        롤백 계획
        <textarea
          value={rollbackPlan}
          disabled={!canEdit || mutation.isPending}
          onChange={(event) => setRollbackPlan(event.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-[12px] leading-5 text-[var(--flow-text)] outline-none disabled:bg-[var(--flow-gray-50)]"
          placeholder="배포 실패 시 되돌리는 기준과 순서를 적어주세요."
        />
      </label>

      {canEdit && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate({ version, releaseNotes, rollbackPlan })}
          >
            릴리즈 정보 저장
          </Button>
        </div>
      )}
    </section>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";

import { getBoardDetail } from "@/api/board";
import { getCardsByColumn, type CardResponse } from "@/api/card";
import {
  getReleaseCheck,
  type ReleaseCheckResponse,
  type ReleaseEnvironment,
  type ReleaseStatus,
} from "@/api/releaseCheck";
import CardDetailModal from "@/components/card/CardDetailModal";

interface ReleaseCheckItem extends CardResponse {
  columnTitle: string;
  completionColumn: boolean;
  release: ReleaseCheckResponse;
}

type StatusFilter = "ALL" | ReleaseStatus;
type EnvironmentFilter = "ALL" | ReleaseEnvironment;

const statusLabel: Record<ReleaseStatus, string> = {
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

const statusClassName: Record<ReleaseStatus, string> = {
  PREPARING: "border-[var(--flow-border)] bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
  READY: "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]",
  DEPLOYING: "border-blue-200 bg-blue-50 text-blue-700",
  RELEASED: "border-emerald-200 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]",
  BLOCKED: "border-red-200 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]",
  ROLLED_BACK: "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]",
};

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-xl border border-[var(--flow-border)] bg-white p-4 shadow-[var(--flow-shadow-xs)]">
      <p className="text-[11px] font-semibold text-[var(--flow-text-muted)]">{label}</p>
      <strong className="mt-1 block text-[24px] font-bold tracking-[-0.04em] text-[var(--flow-text)]">{value}</strong>
      <p className="mt-2 text-[10px] leading-5 text-[var(--flow-text-placeholder)]">{helper}</p>
    </div>
  );
}

export default function ReleaseChecksPage() {
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const boardId = Number(boardIdParam);
  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>("ALL");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: isValidBoardId,
    staleTime: 30_000,
  });

  const board = boardQuery.data;
  const columnSignature = useMemo(
    () => board?.columns.map((column) => `${column.id}:${column.position}`).join("|") ?? "",
    [board?.columns],
  );

  const releaseChecksQuery = useQuery({
    queryKey: ["board", boardId, "release-checks", columnSignature],
    queryFn: async (): Promise<ReleaseCheckItem[]> => {
      if (!board) return [];

      const cardsByColumn = await Promise.all(
        board.columns.map(async (column) => {
          const cards = await getCardsByColumn(boardId, column.id);
          return cards
            .filter((card) => card.taskType === "RELEASE_CHECK")
            .map((card) => ({ card, column }));
        }),
      );

      const releaseCards = cardsByColumn.flat();
      return Promise.all(
        releaseCards.map(async ({ card, column }) => ({
          ...card,
          columnTitle: column.title,
          completionColumn: column.completionColumn,
          release: await getReleaseCheck(card.id),
        })),
      );
    },
    enabled: isValidBoardId && Boolean(board),
    staleTime: 10_000,
  });

  const items = releaseChecksQuery.data ?? [];
  const normalizedKeyword = keyword.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (statusFilter !== "ALL" && item.release.releaseStatus !== statusFilter) return false;
        if (environmentFilter !== "ALL" && item.release.targetEnvironment !== environmentFilter) return false;
        if (!normalizedKeyword) return true;

        return [
          item.title,
          item.description ?? "",
          item.release.version ?? "",
          item.release.releaseNotes ?? "",
          item.release.rollbackPlan ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedKeyword));
      }),
    [environmentFilter, items, normalizedKeyword, statusFilter],
  );

  const summary = useMemo(
    () => ({
      total: items.length,
      ready: items.filter((item) => item.release.releaseStatus === "READY").length,
      released: items.filter((item) => item.release.releaseStatus === "RELEASED").length,
      blocked: items.filter((item) => item.release.releaseStatus === "BLOCKED").length,
      smokePending: items.filter((item) => item.release.smokeTestStatus === "PENDING").length,
    }),
    [items],
  );

  if (!isValidBoardId) {
    return <div className="p-8 text-sm text-[var(--flow-danger)]">잘못된 보드 주소입니다.</div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.08em] text-[var(--flow-primary)]">RELEASE CONTROL</p>
            <h1 className="mt-1 text-[24px] font-bold tracking-[-0.04em] text-[var(--flow-text)]">릴리즈 체크</h1>
            <p className="mt-2 text-[12px] leading-6 text-[var(--flow-text-muted)]">
              배포 대상 카드의 준비 상태, 환경, 버전, 스모크 테스트와 롤백 계획을 한 화면에서 확인합니다.
            </p>
          </div>
          {board && (
            <span className="rounded-lg bg-[var(--flow-gray-100)] px-3 py-2 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
              {board.title} · {board.myRole}
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard label="전체" value={summary.total} helper="RELEASE_CHECK 카드" />
          <SummaryCard label="준비 완료" value={summary.ready} helper="배포 가능한 상태" />
          <SummaryCard label="배포 완료" value={summary.released} helper="릴리즈 완료" />
          <SummaryCard label="차단" value={summary.blocked} helper="해결이 필요한 항목" />
          <SummaryCard label="스모크 미실행" value={summary.smokePending} helper="배포 후 검증 필요" />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 rounded-xl border border-[var(--flow-border)] bg-white p-4 shadow-[var(--flow-shadow-xs)]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목, 버전, 릴리즈 노트 검색"
            className="h-10 min-w-[260px] flex-1 rounded-xl border border-[var(--flow-border-strong)] px-3 text-[12px] outline-none focus:border-[var(--flow-primary)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-10 rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] outline-none"
          >
            <option value="ALL">모든 상태</option>
            {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            value={environmentFilter}
            onChange={(event) => setEnvironmentFilter(event.target.value as EnvironmentFilter)}
            className="h-10 rounded-xl border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] outline-none"
          >
            <option value="ALL">모든 환경</option>
            {Object.entries(environmentLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
          {releaseChecksQuery.isLoading || boardQuery.isLoading ? (
            <p className="px-5 py-10 text-center text-[12px] text-[var(--flow-text-muted)]">릴리즈 체크를 불러오는 중...</p>
          ) : releaseChecksQuery.isError || boardQuery.isError ? (
            <p className="px-5 py-10 text-center text-[12px] text-[var(--flow-danger)]">릴리즈 체크를 불러오지 못했습니다.</p>
          ) : filteredItems.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] font-semibold text-[var(--flow-text-secondary)]">조건에 맞는 릴리즈 카드가 없습니다.</p>
              <p className="mt-2 text-[11px] text-[var(--flow-text-placeholder)]">칸반에서 릴리즈 체크 템플릿으로 카드를 만들어보세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--flow-border)]">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCardId(item.id)}
                  className="grid w-full grid-cols-[minmax(0,1.6fr)_130px_150px_120px_130px] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--flow-gray-50)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[var(--flow-primary-50)] px-2 py-1 text-[9px] font-bold text-[var(--flow-primary)]">REL-{item.id}</span>
                      <strong className="truncate text-[13px] font-bold text-[var(--flow-text)]">{item.title}</strong>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[var(--flow-text-placeholder)]">{item.columnTitle}</p>
                  </div>
                  <span className="truncate text-[11px] font-semibold text-[var(--flow-text-secondary)]">{item.release.version || "버전 미정"}</span>
                  <span className="text-[11px] text-[var(--flow-text-muted)]">{environmentLabel[item.release.targetEnvironment]}</span>
                  <span className={["w-fit rounded-lg border px-2.5 py-1.5 text-[10px] font-bold", statusClassName[item.release.releaseStatus]].join(" ")}>{statusLabel[item.release.releaseStatus]}</span>
                  <span className={[
                    "w-fit rounded-lg px-2.5 py-1.5 text-[10px] font-bold",
                    item.release.smokeTestStatus === "PASS"
                      ? "bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]"
                      : item.release.smokeTestStatus === "FAIL"
                        ? "bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]"
                        : "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]",
                  ].join(" ")}>Smoke {item.release.smokeTestStatus}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CardDetailModal
        open={selectedCardId !== null}
        cardId={selectedCardId}
        canEdit={board?.myRole !== "VIEWER"}
        onClose={() => setSelectedCardId(null)}
        onChanged={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["board", boardId, "release-checks"] }),
            queryClient.invalidateQueries({ queryKey: ["board", boardId, "cards"] }),
          ]);
        }}
      />
    </div>
  );
}

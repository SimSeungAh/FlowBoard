import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";
import {
  getSecurityReviews,
  getSecurityReviewSummary,
  updateSecurityReview,
  type SecurityReviewPageItem,
  type SecuritySeverity,
  type SecurityVerificationStatus,
} from "@/api/securityReview";
import CardDetailModal from "@/components/card/CardDetailModal";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";

const PAGE_SIZE = 20;

type SeverityFilter = "ALL" | SecuritySeverity;

type VerificationFilter = "ALL" | SecurityVerificationStatus;

const severityOptions: Array<{
  value: SeverityFilter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "전체 심각도",
  },
  {
    value: "CRITICAL",
    label: "긴급",
  },
  {
    value: "HIGH",
    label: "높음",
  },
  {
    value: "MEDIUM",
    label: "보통",
  },
  {
    value: "LOW",
    label: "낮음",
  },
];

const verificationOptions: Array<{
  value: VerificationFilter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "전체 검증 상태",
  },
  {
    value: "PENDING",
    label: "검증 대기",
  },
  {
    value: "IN_PROGRESS",
    label: "검증 중",
  },
  {
    value: "RETEST_REQUIRED",
    label: "재검증 필요",
  },
  {
    value: "VERIFIED",
    label: "검증 완료",
  },
];

const isSecuritySeverity = (value: string): value is SecuritySeverity => {
  return value === "CRITICAL" || value === "HIGH" || value === "MEDIUM" || value === "LOW";
};

const isSecurityVerificationStatus = (value: string): value is SecurityVerificationStatus => {
  return (
    value === "PENDING" ||
    value === "IN_PROGRESS" ||
    value === "RETEST_REQUIRED" ||
    value === "VERIFIED"
  );
};

const isSeverityFilter = (value: string): value is SeverityFilter => {
  return value === "ALL" || isSecuritySeverity(value);
};

const isVerificationFilter = (value: string): value is VerificationFilter => {
  return value === "ALL" || isSecurityVerificationStatus(value);
};

const getSeverityLabel = (severity: SecuritySeverity) => {
  switch (severity) {
    case "CRITICAL":
      return "긴급";

    case "HIGH":
      return "높음";

    case "MEDIUM":
      return "보통";

    case "LOW":
      return "낮음";
  }
};

const getVerificationLabel = (status: SecurityVerificationStatus) => {
  switch (status) {
    case "PENDING":
      return "검증 대기";

    case "IN_PROGRESS":
      return "검증 중";

    case "RETEST_REQUIRED":
      return "재검증 필요";

    case "VERIFIED":
      return "검증 완료";
  }
};

const getSeverityClassName = (severity: SecuritySeverity) => {
  switch (severity) {
    case "CRITICAL":
      return [
        "border-red-200",
        "bg-[var(--flow-danger-soft)]",
        "text-[var(--flow-danger-dark)]",
      ].join(" ");

    case "HIGH":
      return ["border-orange-200", "bg-orange-50", "text-orange-700"].join(" ");

    case "MEDIUM":
      return ["border-amber-200", "bg-amber-50", "text-amber-700"].join(" ");

    case "LOW":
      return [
        "border-[var(--flow-primary-100)]",
        "bg-[var(--flow-primary-50)]",
        "text-[var(--flow-primary-700)]",
      ].join(" ");
  }
};

const getVerificationClassName = (status: SecurityVerificationStatus) => {
  switch (status) {
    case "PENDING":
      return [
        "border-[var(--flow-border)]",
        "bg-[var(--flow-gray-100)]",
        "text-[var(--flow-text-muted)]",
      ].join(" ");

    case "IN_PROGRESS":
      return [
        "border-[var(--flow-primary-100)]",
        "bg-[var(--flow-primary-50)]",
        "text-[var(--flow-primary-700)]",
      ].join(" ");

    case "RETEST_REQUIRED":
      return ["border-orange-200", "bg-orange-50", "text-orange-700"].join(" ");

    case "VERIFIED":
      return [
        "border-emerald-100",
        "bg-[var(--flow-success-soft)]",
        "text-[var(--flow-success-dark)]",
      ].join(" ");
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="10.5" cy="10.5" r="5.5" />

      <path d="m15 15 4 4" />
    </svg>
  );
}

function SecuritySummaryCard({
  label,
  value,
  active,
  tone,
  onClick,
}: {
  label: string;
  value: number | string;
  active: boolean;

  tone: "primary" | "danger" | "high" | "medium" | "low" | "pending";

  onClick: () => void;
}) {
  const toneClassName = {
    primary: active
      ? ["border-[var(--flow-primary-300)]", "bg-[var(--flow-primary-50)]"].join(" ")
      : ["border-[var(--flow-border)]", "bg-white", "hover:border-[var(--flow-primary-200)]"].join(
          " ",
        ),

    danger: active
      ? ["border-red-200", "bg-[var(--flow-danger-soft)]"].join(" ")
      : ["border-[var(--flow-border)]", "bg-white", "hover:bg-[var(--flow-danger-soft)]"].join(" "),

    high: active
      ? ["border-orange-200", "bg-orange-50"].join(" ")
      : ["border-[var(--flow-border)]", "bg-white", "hover:bg-orange-50"].join(" "),

    medium: active
      ? ["border-amber-200", "bg-amber-50"].join(" ")
      : ["border-[var(--flow-border)]", "bg-white", "hover:bg-amber-50"].join(" "),

    low: active
      ? ["border-[var(--flow-primary-200)]", "bg-[var(--flow-primary-50)]"].join(" ")
      : ["border-[var(--flow-border)]", "bg-white", "hover:bg-[var(--flow-primary-50)]"].join(" "),

    pending: active
      ? ["border-[var(--flow-border-strong)]", "bg-[var(--flow-gray-100)]"].join(" ")
      : ["border-[var(--flow-border)]", "bg-white", "hover:bg-[var(--flow-gray-50)]"].join(" "),
  }[tone];

  const dotClassName = {
    primary: "bg-[var(--flow-primary)]",

    danger: "bg-[var(--flow-danger)]",

    high: "bg-orange-500",

    medium: "bg-amber-500",

    low: "bg-[var(--flow-primary-400)]",

    pending: "bg-[var(--flow-text-placeholder)]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl",
        "border",
        "p-4",
        "text-left",
        "shadow-[var(--flow-shadow-xs)]",
        "transition-[border-color,background-color]",
        toneClassName,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-[var(--flow-text-muted)]">{label}</span>

        <span className={["h-2 w-2", "rounded-full", dotClassName].join(" ")} />
      </div>

      <strong className="mt-2 block text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
        {value}
      </strong>
    </button>
  );
}

function ImpactScopeEditor({
  item,
  canEdit,
  saving,
  onSave,
}: {
  item: SecurityReviewPageItem;
  canEdit: boolean;
  saving: boolean;

  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(item.securityImpactScope ?? "");

  useEffect(() => {
    setValue(item.securityImpactScope ?? "");
  }, [item.securityImpactScope]);

  const saveIfChanged = () => {
    const normalized = value.trim();

    const current = item.securityImpactScope?.trim() ?? "";

    if (normalized === current) {
      return;
    }

    onSave(normalized);
  };

  if (!canEdit) {
    return (
      <span className="block max-w-[210px] truncate text-[11px] text-[var(--flow-text-secondary)]">
        {item.securityImpactScope || "미지정"}
      </span>
    );
  }

  return (
    <input
      value={value}
      disabled={saving}
      aria-label={`${item.title} 영향 범위`}
      placeholder="예: /api/auth/login"
      className={[
        "h-8",
        "w-[210px]",
        "rounded-md",
        "border",
        "border-[var(--flow-border)]",
        "bg-white",
        "px-2.5",
        "text-[10px]",
        "text-[var(--flow-text-secondary)]",
        "outline-none",
        "transition-[border-color,box-shadow,opacity]",
        "placeholder:text-[var(--flow-text-placeholder)]",
        "focus:border-[var(--flow-primary)]",
        "focus:ring-2",
        "focus:ring-[var(--flow-focus-ring)]",
        "disabled:cursor-wait",
        "disabled:opacity-50",
      ].join(" ")}
      onChange={(event) => {
        setValue(event.currentTarget.value);
      }}
      onBlur={saveIfChanged}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export default function SecurityReviewsPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const queryClient = useQueryClient();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const [severity, setSeverity] = useState<SeverityFilter>("ALL");

  const [verificationStatus, setVerificationStatus] = useState<VerificationFilter>("ALL");

  const [keywordInput, setKeywordInput] = useState("");

  const [keyword, setKeyword] = useState("");

  const [page, setPage] = useState(1);

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,

    staleTime: 30_000,
  });

  const summaryQuery = useQuery({
    queryKey: ["board", boardId, "security-reviews", "summary"],

    queryFn: () => getSecurityReviewSummary(boardId),

    enabled: isValidBoardId,

    staleTime: 15_000,
  });

  const securityReviewsQuery = useQuery({
    queryKey: [
      "board",
      boardId,
      "security-reviews",
      {
        severity,
        verificationStatus,
        keyword,
        page,
      },
    ],

    queryFn: () =>
      getSecurityReviews(boardId, {
        securitySeverity: severity === "ALL" ? undefined : severity,

        verificationStatus: verificationStatus === "ALL" ? undefined : verificationStatus,

        keyword: keyword || undefined,

        page: page - 1,

        size: PAGE_SIZE,
      }),

    enabled: isValidBoardId,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      cardId,
      data,
    }: {
      cardId: number;

      data: Parameters<typeof updateSecurityReview>[1];
    }) => updateSecurityReview(cardId, data),

    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "security-reviews"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["cards", variables.cardId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "cards"],
        }),
      ]);

      toast.success("보안 점검 정보를 변경했습니다.");
    },

    onError: () => {
      toast.error("보안 점검 정보를 변경하지 못했습니다.");
    },
  });

  const board = boardQuery.data;

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const data = securityReviewsQuery.data;

  const securityReviews = data?.content ?? [];

  const handleSearch = () => {
    setKeyword(keywordInput.trim());

    setPage(1);
  };

  const resetFilters = () => {
    setSeverity("ALL");

    setVerificationStatus("ALL");

    setKeywordInput("");

    setKeyword("");

    setPage(1);
  };

  const handleCardChanged = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["board", boardId, "security-reviews"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["board", boardId, "cards"],
      }),
    ]);
  };

  if (!isValidBoardId) {
    return (
      <div className="p-8">
        <EmptyState title="보드를 찾을 수 없습니다." description="보드 주소를 다시 확인해주세요." />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-[var(--flow-background)]">
        <header className="border-b border-[var(--flow-border)] bg-white px-6 py-6 xl:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                  보안 점검
                </h1>

                {data && (
                  <span className="inline-flex h-7 items-center rounded-full bg-[var(--flow-primary-50)] px-2.5 text-[11px] font-bold text-[var(--flow-primary)]">
                    {data.totalElements}
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--flow-text-muted)]">
                보안 점검 카드만 모아서 심각도, 영향 범위, 검증 상태를 한곳에서 관리합니다.
              </p>
            </div>

            {!canEdit && board && (
              <span className="rounded-full border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-3 py-1.5 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                VIEWER · 읽기 전용
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
            <SecuritySummaryCard
              label="전체"
              value={summaryQuery.isLoading ? "-" : (summaryQuery.data?.total ?? 0)}
              active={severity === "ALL" && verificationStatus === "ALL"}
              tone="primary"
              onClick={() => {
                setSeverity("ALL");

                setVerificationStatus("ALL");

                setPage(1);
              }}
            />

            <SecuritySummaryCard
              label="긴급"
              value={summaryQuery.isLoading ? "-" : (summaryQuery.data?.critical ?? 0)}
              active={severity === "CRITICAL"}
              tone="danger"
              onClick={() => {
                setSeverity("CRITICAL");

                setVerificationStatus("ALL");

                setPage(1);
              }}
            />

            <SecuritySummaryCard
              label="높음"
              value={summaryQuery.isLoading ? "-" : (summaryQuery.data?.high ?? 0)}
              active={severity === "HIGH"}
              tone="high"
              onClick={() => {
                setSeverity("HIGH");

                setVerificationStatus("ALL");

                setPage(1);
              }}
            />

            <SecuritySummaryCard
              label="보통"
              value={summaryQuery.isLoading ? "-" : (summaryQuery.data?.medium ?? 0)}
              active={severity === "MEDIUM"}
              tone="medium"
              onClick={() => {
                setSeverity("MEDIUM");

                setVerificationStatus("ALL");

                setPage(1);
              }}
            />

            <SecuritySummaryCard
              label="낮음"
              value={summaryQuery.isLoading ? "-" : (summaryQuery.data?.low ?? 0)}
              active={severity === "LOW"}
              tone="low"
              onClick={() => {
                setSeverity("LOW");

                setVerificationStatus("ALL");

                setPage(1);
              }}
            />

            <SecuritySummaryCard
              label="검증 대기"
              value={summaryQuery.isLoading ? "-" : (summaryQuery.data?.pending ?? 0)}
              active={verificationStatus === "PENDING" && severity === "ALL"}
              tone="pending"
              onClick={() => {
                setSeverity("ALL");

                setVerificationStatus("PENDING");

                setPage(1);
              }}
            />
          </div>
        </header>

        <main className="px-6 py-6 xl:px-8">
          <section className="rounded-[var(--flow-radius-lg)] border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--flow-border)] p-4">
              <div className="relative min-w-[240px] flex-1 xl:max-w-[420px]">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--flow-text-placeholder)]">
                  <SearchIcon />
                </span>

                <input
                  value={keywordInput}
                  placeholder="제목, 설명, 영향 범위 검색"
                  className={[
                    "h-9",
                    "w-full",
                    "rounded-lg",
                    "border",
                    "border-[var(--flow-border-strong)]",
                    "bg-white",
                    "pr-3",
                    "pl-9",
                    "text-[12px]",
                    "text-[var(--flow-text)]",
                    "outline-none",
                    "transition-[border-color,box-shadow]",
                    "placeholder:text-[var(--flow-text-placeholder)]",
                    "focus:border-[var(--flow-primary)]",
                    "focus:ring-2",
                    "focus:ring-[var(--flow-focus-ring)]",
                  ].join(" ")}
                  onChange={(event) => {
                    setKeywordInput(event.currentTarget.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
              </div>

              <Button variant="outline" size="md" onClick={handleSearch}>
                검색
              </Button>

              <select
                value={severity}
                aria-label="보안 심각도 필터"
                className={[
                  "h-9",
                  "min-w-[130px]",
                  "rounded-lg",
                  "border",
                  "border-[var(--flow-border-strong)]",
                  "bg-white",
                  "px-3",
                  "text-[11px]",
                  "font-semibold",
                  "text-[var(--flow-text-secondary)]",
                  "outline-none",
                  "focus:border-[var(--flow-primary)]",
                  "focus:ring-2",
                  "focus:ring-[var(--flow-focus-ring)]",
                ].join(" ")}
                onChange={(event) => {
                  const value = event.currentTarget.value;

                  if (!isSeverityFilter(value)) {
                    return;
                  }

                  setSeverity(value);

                  setPage(1);
                }}
              >
                {severityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={verificationStatus}
                aria-label="보안 검증 상태 필터"
                className={[
                  "h-9",
                  "min-w-[145px]",
                  "rounded-lg",
                  "border",
                  "border-[var(--flow-border-strong)]",
                  "bg-white",
                  "px-3",
                  "text-[11px]",
                  "font-semibold",
                  "text-[var(--flow-text-secondary)]",
                  "outline-none",
                  "focus:border-[var(--flow-primary)]",
                  "focus:ring-2",
                  "focus:ring-[var(--flow-focus-ring)]",
                ].join(" ")}
                onChange={(event) => {
                  const value = event.currentTarget.value;

                  if (!isVerificationFilter(value)) {
                    return;
                  }

                  setVerificationStatus(value);

                  setPage(1);
                }}
              >
                {verificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button variant="ghost" size="md" onClick={resetFilters}>
                필터 초기화
              </Button>
            </div>

            {securityReviewsQuery.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({
                  length: 7,
                }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : securityReviewsQuery.isError ? (
              <div className="p-6">
                <EmptyState
                  title="보안 점검을 불러오지 못했습니다."
                  description="잠시 후 다시 시도해주세요."
                />
              </div>
            ) : securityReviews.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="조건에 맞는 보안 점검이 없습니다."
                  description="보안 점검 템플릿으로 작업을 만들면 이곳에 자동으로 모입니다."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] table-fixed border-collapse">
                  <thead className="bg-[var(--flow-gray-50)]">
                    <tr className="border-b border-[var(--flow-border)]">
                      <th className="w-[90px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        ID
                      </th>

                      <th className="w-[250px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        제목
                      </th>

                      <th className="w-[110px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        심각도
                      </th>

                      <th className="w-[240px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        영향 범위
                      </th>

                      <th className="w-[135px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        검증 상태
                      </th>

                      <th className="w-[130px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        담당자
                      </th>

                      <th className="w-[130px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        컬럼
                      </th>

                      <th className="w-[110px] px-4 py-3 text-left text-[10px] font-bold text-[var(--flow-text-placeholder)]">
                        최종 수정
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {securityReviews.map((item) => {
                      const changing =
                        updateMutation.isPending && updateMutation.variables?.cardId === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={[
                            "cursor-pointer",
                            "border-b",
                            "border-[var(--flow-border)]",
                            "transition-colors",
                            "last:border-b-0",
                            "hover:bg-[var(--flow-gray-50)]",
                          ].join(" ")}
                          onClick={() => {
                            setSelectedCardId(item.id);
                          }}
                        >
                          <td className="px-4 py-4 align-middle">
                            <span className="text-[11px] font-bold text-[var(--flow-text-placeholder)]">
                              SEC-
                              {item.id}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <p className="truncate text-[13px] font-semibold text-[var(--flow-text)]">
                              {item.title}
                            </p>

                            <p className="mt-1 truncate text-[10px] text-[var(--flow-text-placeholder)]">
                              작성자 {item.createdByNickname}
                            </p>
                          </td>

                          <td
                            className="px-4 py-4 align-middle"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            {canEdit ? (
                              <select
                                value={item.securitySeverity}
                                disabled={changing}
                                aria-label={`${item.title} 심각도`}
                                className={[
                                  "h-8",
                                  "w-[94px]",
                                  "rounded-md",
                                  "border",
                                  "px-2",
                                  "text-[10px]",
                                  "font-bold",
                                  "outline-none",
                                  "transition-opacity",
                                  getSeverityClassName(item.securitySeverity),
                                  changing ? "cursor-wait opacity-50" : "cursor-pointer",
                                ].join(" ")}
                                onChange={(event) => {
                                  const value = event.currentTarget.value;

                                  if (!isSecuritySeverity(value)) {
                                    return;
                                  }

                                  updateMutation.mutate({
                                    cardId: item.id,

                                    data: {
                                      securitySeverity: value,
                                    },
                                  });
                                }}
                              >
                                <option value="CRITICAL">긴급</option>

                                <option value="HIGH">높음</option>

                                <option value="MEDIUM">보통</option>

                                <option value="LOW">낮음</option>
                              </select>
                            ) : (
                              <span
                                className={[
                                  "inline-flex",
                                  "h-7",
                                  "items-center",
                                  "rounded-md",
                                  "border",
                                  "px-2.5",
                                  "text-[10px]",
                                  "font-bold",
                                  getSeverityClassName(item.securitySeverity),
                                ].join(" ")}
                              >
                                {getSeverityLabel(item.securitySeverity)}
                              </span>
                            )}
                          </td>

                          <td
                            className="px-4 py-4 align-middle"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <ImpactScopeEditor
                              item={item}
                              canEdit={Boolean(canEdit)}
                              saving={changing}
                              onSave={(securityImpactScope) => {
                                updateMutation.mutate({
                                  cardId: item.id,

                                  data: {
                                    securityImpactScope,
                                  },
                                });
                              }}
                            />
                          </td>

                          <td
                            className="px-4 py-4 align-middle"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            {canEdit ? (
                              <select
                                value={item.securityVerificationStatus}
                                disabled={changing}
                                aria-label={`${item.title} 검증 상태`}
                                className={[
                                  "h-8",
                                  "w-[118px]",
                                  "rounded-md",
                                  "border",
                                  "px-2",
                                  "text-[10px]",
                                  "font-bold",
                                  "outline-none",
                                  "transition-opacity",
                                  getVerificationClassName(item.securityVerificationStatus),
                                  changing ? "cursor-wait opacity-50" : "cursor-pointer",
                                ].join(" ")}
                                onChange={(event) => {
                                  const value = event.currentTarget.value;

                                  if (!isSecurityVerificationStatus(value)) {
                                    return;
                                  }

                                  updateMutation.mutate({
                                    cardId: item.id,

                                    data: {
                                      securityVerificationStatus: value,
                                    },
                                  });
                                }}
                              >
                                <option value="PENDING">검증 대기</option>

                                <option value="IN_PROGRESS">검증 중</option>

                                <option value="RETEST_REQUIRED">재검증 필요</option>

                                <option value="VERIFIED">검증 완료</option>
                              </select>
                            ) : (
                              <span
                                className={[
                                  "inline-flex",
                                  "h-7",
                                  "items-center",
                                  "rounded-md",
                                  "border",
                                  "px-2.5",
                                  "text-[10px]",
                                  "font-bold",
                                  getVerificationClassName(item.securityVerificationStatus),
                                ].join(" ")}
                              >
                                {getVerificationLabel(item.securityVerificationStatus)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 align-middle">
                            {item.assignees.length === 0 ? (
                              <span className="text-[10px] text-[var(--flow-text-placeholder)]">
                                미지정
                              </span>
                            ) : (
                              <div className="flex items-center">
                                {item.assignees.slice(0, 2).map((assignee, index) => (
                                  <span
                                    key={assignee.id}
                                    title={assignee.nickname}
                                    className={[
                                      "flex",
                                      "h-7",
                                      "w-7",
                                      "items-center",
                                      "justify-center",
                                      "rounded-full",
                                      "border-2",
                                      "border-white",
                                      "bg-[var(--flow-gray-800)]",
                                      "text-[9px]",
                                      "font-bold",
                                      "text-white",
                                      index > 0 ? "-ml-1.5" : "",
                                    ].join(" ")}
                                  >
                                    {assignee.nickname.charAt(0).toUpperCase()}
                                  </span>
                                ))}

                                {item.assignees.length > 2 && (
                                  <span className="ml-2 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                                    +{item.assignees.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <span className="inline-flex max-w-[110px] truncate rounded-md bg-[var(--flow-gray-100)] px-2 py-1 text-[10px] font-semibold text-[var(--flow-text-secondary)]">
                              {item.columnTitle}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <span className="text-[10px] text-[var(--flow-text-placeholder)]">
                              {formatDate(item.updatedAt)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data && data.totalPages > 1 && (
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
          )}
        </main>
      </div>

      <CardDetailModal
        open={selectedCardId !== null}
        cardId={selectedCardId}
        canEdit={Boolean(canEdit)}
        onClose={() => {
          setSelectedCardId(null);
        }}
        onChanged={handleCardChanged}
      />
    </>
  );
}

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useParams } from "react-router";

import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";

import {
  getTestCases,
  getTestCaseSummary,
  updateTestCaseResult,
  updateTestCaseType,
  type TestCaseResult,
  type TestCaseType,
} from "@/api/testCase";

import CardDetailModal from "@/components/card/CardDetailModal";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";

const PAGE_SIZE = 20;

type TestCaseTypeFilter = "ALL" | TestCaseType;

type TestCaseResultFilter = "ALL" | TestCaseResult;

const testCaseTypeOptions: Array<{
  value: TestCaseTypeFilter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "전체",
  },
  {
    value: "NORMAL",
    label: "정상",
  },
  {
    value: "EXCEPTION",
    label: "예외",
  },
  {
    value: "BOUNDARY",
    label: "경계값",
  },
  {
    value: "PERMISSION",
    label: "권한",
  },
  {
    value: "SECURITY",
    label: "보안",
  },
  {
    value: "RECOVERY",
    label: "복구",
  },
  {
    value: "INTEGRATION",
    label: "통합",
  },
  {
    value: "E2E",
    label: "E2E",
  },
];

const getTestCaseTypeLabel = (type: TestCaseType) => {
  switch (type) {
    case "NORMAL":
      return "정상";

    case "EXCEPTION":
      return "예외";

    case "BOUNDARY":
      return "경계값";

    case "PERMISSION":
      return "권한";

    case "SECURITY":
      return "보안";

    case "RECOVERY":
      return "복구";

    case "INTEGRATION":
      return "통합";

    case "E2E":
      return "E2E";
  }
};

const getTestCaseResultLabel = (result: TestCaseResult) => {
  switch (result) {
    case "NOT_RUN":
      return "미실행";

    case "PASS":
      return "PASS";

    case "FAIL":
      return "FAIL";

    case "BLOCKED":
      return "BLOCKED";
  }
};

const getResultClassName = (result: TestCaseResult) => {
  switch (result) {
    case "NOT_RUN":
      return [
        "border-[var(--flow-border)]",
        "bg-[var(--flow-gray-100)]",
        "text-[var(--flow-text-muted)]",
      ].join(" ");

    case "PASS":
      return [
        "border-emerald-100",
        "bg-[var(--flow-success-soft)]",
        "text-[var(--flow-success-dark)]",
      ].join(" ");

    case "FAIL":
      return [
        "border-red-100",
        "bg-[var(--flow-danger-soft)]",
        "text-[var(--flow-danger-dark)]",
      ].join(" ");

    case "BLOCKED":
      return ["border-violet-100", "bg-violet-50", "text-violet-700"].join(" ");
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default function TestCasesPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const queryClient = useQueryClient();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const [testCaseType, setTestCaseType] = useState<TestCaseTypeFilter>("ALL");

  const [testCaseResult, setTestCaseResult] = useState<TestCaseResultFilter>("ALL");

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
    queryKey: ["board", boardId, "test-cases", "summary"],

    queryFn: () => getTestCaseSummary(boardId),

    enabled: isValidBoardId,

    staleTime: 15_000,
  });

  const testCasesQuery = useQuery({
    queryKey: [
      "board",
      boardId,
      "test-cases",
      {
        testCaseType,
        testCaseResult,
        keyword,
        page,
      },
    ],

    queryFn: () =>
      getTestCases(boardId, {
        testCaseType: testCaseType === "ALL" ? undefined : testCaseType,

        testCaseResult: testCaseResult === "ALL" ? undefined : testCaseResult,

        keyword: keyword || undefined,

        page: page - 1,

        size: PAGE_SIZE,
      }),

    enabled: isValidBoardId,
  });

  const resultMutation = useMutation({
    mutationFn: ({ cardId, result }: { cardId: number; result: TestCaseResult }) =>
      updateTestCaseResult(cardId, result),

    onSuccess: async (card) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "test-cases"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["cards", card.id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "cards"],
        }),
      ]);

      toast.success("테스트 결과를 변경했습니다.");
    },

    onError: () => {
      toast.error("테스트 결과를 변경하지 못했습니다.");
    },
  });

  const typeMutation = useMutation({
    mutationFn: ({ cardId, type }: { cardId: number; type: TestCaseType }) =>
      updateTestCaseType(cardId, type),

    onSuccess: async (card) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "test-cases"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["cards", card.id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "cards"],
        }),
      ]);

      toast.success("테스트 유형을 변경했습니다.");
    },

    onError: () => {
      toast.error("테스트 유형을 변경하지 못했습니다.");
    },
  });

  const board = boardQuery.data;

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const data = testCasesQuery.data;

  const testCases = data?.content ?? [];

  const handleSearch = () => {
    setKeyword(keywordInput.trim());

    setPage(1);
  };

  const resetFilters = () => {
    setTestCaseType("ALL");

    setTestCaseResult("ALL");

    setKeywordInput("");
    setKeyword("");
    setPage(1);
  };

  const handleCardChanged = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["board", boardId, "test-cases"],
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
        {/* Header */}
        <header className="border-b border-[var(--flow-border)] bg-white px-6 py-6 xl:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                  테스트 케이스
                </h1>

                {data && (
                  <span className="inline-flex h-7 items-center rounded-full bg-[var(--flow-primary-50)] px-2.5 text-[11px] font-bold text-[var(--flow-primary)]">
                    {data.totalElements}
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--flow-text-muted)]">
                테스트 케이스 카드만 모아서 유형과 실행 결과를 관리합니다.
              </p>
            </div>

            {!canEdit && board && (
              <span className="rounded-full border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-3 py-1.5 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                VIEWER · 읽기 전용
              </span>
            )}
          </div>

          {/* Result summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <button
              type="button"
              className={[
                "rounded-xl border p-4 text-left",
                "transition-[border-color,background-color,box-shadow]",
                testCaseResult === "ALL"
                  ? [
                      "border-[var(--flow-primary-300)]",
                      "bg-[var(--flow-primary-50)]",
                      "shadow-[var(--flow-shadow-xs)]",
                    ].join(" ")
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "hover:border-[var(--flow-primary-200)]",
                      "hover:bg-[var(--flow-gray-50)]",
                    ].join(" "),
              ].join(" ")}
              onClick={() => {
                setTestCaseResult("ALL");
                setPage(1);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
                  전체
                </span>

                <span className="h-2 w-2 rounded-full bg-[var(--flow-primary)]" />
              </div>

              <strong className="mt-2 block text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                {summaryQuery.isLoading ? "-" : (summaryQuery.data?.total ?? 0)}
              </strong>
            </button>

            <button
              type="button"
              className={[
                "rounded-xl border p-4 text-left",
                "transition-[border-color,background-color,box-shadow]",
                testCaseResult === "NOT_RUN"
                  ? [
                      "border-[var(--flow-border-strong)]",
                      "bg-[var(--flow-gray-100)]",
                      "shadow-[var(--flow-shadow-xs)]",
                    ].join(" ")
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "hover:bg-[var(--flow-gray-50)]",
                    ].join(" "),
              ].join(" ")}
              onClick={() => {
                setTestCaseResult("NOT_RUN");
                setPage(1);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[var(--flow-text-muted)]">
                  미실행
                </span>

                <span className="h-2 w-2 rounded-full bg-[var(--flow-text-placeholder)]" />
              </div>

              <strong className="mt-2 block text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                {summaryQuery.isLoading ? "-" : (summaryQuery.data?.notRun ?? 0)}
              </strong>
            </button>

            <button
              type="button"
              className={[
                "rounded-xl border p-4 text-left",
                "transition-[border-color,background-color,box-shadow]",
                testCaseResult === "PASS"
                  ? [
                      "border-emerald-200",
                      "bg-[var(--flow-success-soft)]",
                      "shadow-[var(--flow-shadow-xs)]",
                    ].join(" ")
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "hover:bg-[var(--flow-success-soft)]",
                    ].join(" "),
              ].join(" ")}
              onClick={() => {
                setTestCaseResult("PASS");
                setPage(1);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[var(--flow-success-dark)]">
                  PASS
                </span>

                <span className="h-2 w-2 rounded-full bg-[var(--flow-success)]" />
              </div>

              <strong className="mt-2 block text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                {summaryQuery.isLoading ? "-" : (summaryQuery.data?.pass ?? 0)}
              </strong>
            </button>

            <button
              type="button"
              className={[
                "rounded-xl border p-4 text-left",
                "transition-[border-color,background-color,box-shadow]",
                testCaseResult === "FAIL"
                  ? [
                      "border-red-200",
                      "bg-[var(--flow-danger-soft)]",
                      "shadow-[var(--flow-shadow-xs)]",
                    ].join(" ")
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "hover:bg-[var(--flow-danger-soft)]",
                    ].join(" "),
              ].join(" ")}
              onClick={() => {
                setTestCaseResult("FAIL");
                setPage(1);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[var(--flow-danger-dark)]">
                  FAIL
                </span>

                <span className="h-2 w-2 rounded-full bg-[var(--flow-danger)]" />
              </div>

              <strong className="mt-2 block text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                {summaryQuery.isLoading ? "-" : (summaryQuery.data?.fail ?? 0)}
              </strong>
            </button>

            <button
              type="button"
              className={[
                "rounded-xl border p-4 text-left",
                "transition-[border-color,background-color,box-shadow]",
                testCaseResult === "BLOCKED"
                  ? [
                      "border-amber-200",
                      "bg-[var(--flow-warning-soft)]",
                      "shadow-[var(--flow-shadow-xs)]",
                    ].join(" ")
                  : [
                      "border-[var(--flow-border)]",
                      "bg-white",
                      "hover:bg-[var(--flow-warning-soft)]",
                    ].join(" "),
              ].join(" ")}
              onClick={() => {
                setTestCaseResult("BLOCKED");
                setPage(1);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-[var(--flow-warning-dark)]">
                  BLOCKED
                </span>

                <span className="h-2 w-2 rounded-full bg-[var(--flow-warning)]" />
              </div>

              <strong className="mt-2 block text-[22px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                {summaryQuery.isLoading ? "-" : (summaryQuery.data?.blocked ?? 0)}
              </strong>
            </button>
          </div>

          {/* Type tabs */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {testCaseTypeOptions.map((option) => {
              const active = option.value === testCaseType;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    "min-h-9 rounded-lg border px-3.5",
                    "text-[11px] font-semibold",
                    "transition-colors",
                    active
                      ? [
                          "border-[var(--flow-primary)]",
                          "bg-[var(--flow-primary-50)]",
                          "text-[var(--flow-primary-700)]",
                        ].join(" ")
                      : [
                          "border-[var(--flow-border)]",
                          "bg-white",
                          "text-[var(--flow-text-muted)]",
                          "hover:border-[var(--flow-primary-200)]",
                          "hover:text-[var(--flow-text)]",
                        ].join(" "),
                  ].join(" ")}
                  onClick={() => {
                    setTestCaseType(option.value);

                    setPage(1);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Filters */}
        <div className="border-b border-[var(--flow-border)] bg-white px-6 py-4 xl:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <form
              className="flex min-w-[280px] flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleSearch();
              }}
            >
              <div className="relative max-w-[460px] min-w-[220px] flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--flow-text-placeholder)]">
                  <SearchIcon />
                </span>

                <input
                  type="search"
                  value={keywordInput}
                  placeholder="테스트 제목 또는 설명 검색"
                  className={[
                    "h-10 w-full rounded-lg",
                    "border border-[var(--flow-border-strong)]",
                    "bg-white pr-3 pl-10",
                    "text-[12px] text-[var(--flow-text)]",
                    "outline-none",
                    "transition-[border-color,box-shadow]",
                    "placeholder:text-[var(--flow-text-placeholder)]",
                    "focus:border-[var(--flow-primary)]",
                    "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                  ].join(" ")}
                  onChange={(event) => setKeywordInput(event.target.value)}
                />
              </div>

              <Button type="submit" variant="outline">
                검색
              </Button>
            </form>

            <select
              value={testCaseResult}
              aria-label="테스트 결과 필터"
              className={[
                "h-10 rounded-lg",
                "border border-[var(--flow-border-strong)]",
                "bg-white px-3",
                "text-[12px] font-semibold",
                "text-[var(--flow-text-secondary)]",
                "outline-none",
                "focus:border-[var(--flow-primary)]",
                "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
              ].join(" ")}
              onChange={(event) => {
                setTestCaseResult(event.target.value as TestCaseResultFilter);

                setPage(1);
              }}
            >
              <option value="ALL">모든 결과</option>

              <option value="NOT_RUN">미실행</option>

              <option value="PASS">PASS</option>

              <option value="FAIL">FAIL</option>

              <option value="BLOCKED">BLOCKED</option>
            </select>

            <Button type="button" variant="ghost" onClick={resetFilters}>
              필터 초기화
            </Button>
          </div>
        </div>

        {/* Contents */}
        <main className="px-6 py-6 xl:px-8">
          {testCasesQuery.isLoading ? (
            <div className="overflow-hidden rounded-xl border border-[var(--flow-border)] bg-white">
              {Array.from({
                length: 8,
              }).map((_, index) => (
                <div
                  key={index}
                  className="flex gap-4 border-b border-[var(--flow-border)] p-4 last:border-b-0"
                >
                  <Skeleton className="h-10 w-16" />

                  <Skeleton className="h-10 flex-1" />

                  <Skeleton className="h-10 w-24" />

                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </div>
          ) : testCasesQuery.isError ? (
            <EmptyState
              title="테스트 케이스를 불러오지 못했습니다."
              description="잠시 후 다시 시도해주세요."
              actionLabel="다시 불러오기"
              onAction={() => void testCasesQuery.refetch()}
            />
          ) : testCases.length === 0 ? (
            <EmptyState
              title="조건에 맞는 테스트 케이스가 없습니다."
              description="테스트 케이스 템플릿으로 작업을 만들면 이곳에 자동으로 모입니다."
              actionLabel="필터 초기화"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--flow-border)] bg-[var(--flow-gray-50)]">
                        <th className="w-[82px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          ID
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          테스트 케이스
                        </th>

                        <th className="w-[110px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          유형
                        </th>

                        <th className="w-[135px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          결과
                        </th>

                        <th className="w-[135px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          현재 컬럼
                        </th>

                        <th className="w-[170px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          담당자
                        </th>

                        <th className="w-[180px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          태그
                        </th>

                        <th className="w-[130px] px-4 py-3 text-left text-[10px] font-bold tracking-[0.04em] text-[var(--flow-text-placeholder)]">
                          최근 수정
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {testCases.map((testCase) => {
                        const changing =
                          resultMutation.isPending &&
                          resultMutation.variables?.cardId === testCase.id;

                        return (
                          <tr
                            key={testCase.id}
                            className={[
                              "cursor-pointer",
                              "border-b border-[var(--flow-border)]",
                              "transition-colors",
                              "last:border-b-0",
                              "hover:bg-[var(--flow-gray-50)]",
                            ].join(" ")}
                            onClick={() => setSelectedCardId(testCase.id)}
                          >
                            <td className="px-4 py-4 align-middle">
                              <span className="text-[11px] font-bold text-[var(--flow-text-placeholder)]">
                                TC-
                                {testCase.id}
                              </span>
                            </td>

                            <td className="px-4 py-4 align-middle">
                              <p className="max-w-[420px] truncate text-[13px] font-semibold text-[var(--flow-text)]">
                                {testCase.title}
                              </p>

                              <p className="mt-1 text-[10px] text-[var(--flow-text-placeholder)]">
                                작성자 {testCase.createdByNickname}
                              </p>
                            </td>

                            <td
                              className="px-4 py-4 align-middle"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {canEdit ? (
                                <select
                                  value={testCase.testCaseType}
                                  disabled={
                                    typeMutation.isPending &&
                                    typeMutation.variables?.cardId === testCase.id
                                  }
                                  aria-label={`${testCase.title} 테스트 유형`}
                                  className={[
                                    "h-8 w-[96px] rounded-md",
                                    "border border-[var(--flow-primary-100)]",
                                    "bg-[var(--flow-primary-50)]",
                                    "px-2",
                                    "text-[10px] font-semibold",
                                    "text-[var(--flow-primary-700)]",
                                    "outline-none",
                                    "transition-opacity",
                                    "focus:border-[var(--flow-primary)]",
                                    "focus:ring-2 focus:ring-[var(--flow-focus-ring)]",
                                    typeMutation.isPending &&
                                    typeMutation.variables?.cardId === testCase.id
                                      ? "cursor-wait opacity-50"
                                      : "cursor-pointer",
                                  ].join(" ")}
                                  onChange={(event) =>
                                    typeMutation.mutate({
                                      cardId: testCase.id,

                                      type: event.target.value as TestCaseType,
                                    })
                                  }
                                >
                                  <option value="NORMAL">정상</option>

                                  <option value="EXCEPTION">예외</option>

                                  <option value="BOUNDARY">경계값</option>

                                  <option value="PERMISSION">권한</option>

                                  <option value="SECURITY">보안</option>

                                  <option value="RECOVERY">복구</option>

                                  <option value="INTEGRATION">통합</option>

                                  <option value="E2E">E2E</option>
                                </select>
                              ) : (
                                <span className="inline-flex rounded-md border border-[var(--flow-primary-100)] bg-[var(--flow-primary-50)] px-2 py-1 text-[10px] font-semibold text-[var(--flow-primary-700)]">
                                  {getTestCaseTypeLabel(testCase.testCaseType)}
                                </span>
                              )}
                            </td>

                            <td
                              className="px-4 py-4 align-middle"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {canEdit ? (
                                <select
                                  value={testCase.testCaseResult}
                                  disabled={changing}
                                  aria-label={`${testCase.title} 테스트 결과`}
                                  className={[
                                    "h-8 w-[110px] rounded-md border px-2",
                                    "text-[10px] font-bold",
                                    "outline-none",
                                    "transition-opacity",
                                    getResultClassName(testCase.testCaseResult),
                                    changing ? "cursor-wait opacity-50" : "cursor-pointer",
                                  ].join(" ")}
                                  onChange={(event) =>
                                    resultMutation.mutate({
                                      cardId: testCase.id,

                                      result: event.target.value as TestCaseResult,
                                    })
                                  }
                                >
                                  <option value="NOT_RUN">미실행</option>

                                  <option value="PASS">PASS</option>

                                  <option value="FAIL">FAIL</option>

                                  <option value="BLOCKED">BLOCKED</option>
                                </select>
                              ) : (
                                <span
                                  className={[
                                    "inline-flex h-7 items-center rounded-md border px-2.5",
                                    "text-[10px] font-bold",
                                    getResultClassName(testCase.testCaseResult),
                                  ].join(" ")}
                                >
                                  {getTestCaseResultLabel(testCase.testCaseResult)}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 align-middle">
                              <span className="inline-flex max-w-[120px] truncate rounded-md bg-[var(--flow-gray-100)] px-2 py-1 text-[10px] font-semibold text-[var(--flow-text-secondary)]">
                                {testCase.columnTitle}
                              </span>
                            </td>

                            <td className="px-4 py-4 align-middle">
                              {testCase.assignees.length === 0 ? (
                                <span className="text-[10px] text-[var(--flow-text-placeholder)]">
                                  미지정
                                </span>
                              ) : (
                                <div className="flex items-center">
                                  {testCase.assignees.slice(0, 2).map((assignee, index) => (
                                    <span
                                      key={assignee.id}
                                      title={assignee.nickname}
                                      className={[
                                        "flex h-7 w-7 items-center justify-center rounded-full",
                                        "border-2 border-white",
                                        "bg-[var(--flow-gray-800)]",
                                        "text-[9px] font-bold text-white",
                                        index > 0 ? "-ml-1.5" : "",
                                      ].join(" ")}
                                    >
                                      {assignee.nickname.charAt(0).toUpperCase()}
                                    </span>
                                  ))}

                                  {testCase.assignees.length > 2 && (
                                    <span className="ml-2 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                                      +{testCase.assignees.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4 align-middle">
                              {testCase.tags.length === 0 ? (
                                <span className="text-[10px] text-[var(--flow-text-placeholder)]">
                                  -
                                </span>
                              ) : (
                                <div className="flex max-w-[170px] items-center gap-1.5 overflow-hidden">
                                  {testCase.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--flow-border)] bg-white px-2 py-1 text-[9px] font-semibold text-[var(--flow-text-secondary)]"
                                    >
                                      <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{
                                          backgroundColor: tag.color,
                                        }}
                                      />

                                      <span className="truncate">{tag.name}</span>
                                    </span>
                                  ))}

                                  {testCase.tags.length > 2 && (
                                    <span className="shrink-0 text-[9px] font-semibold text-[var(--flow-text-placeholder)]">
                                      +{testCase.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4 align-middle">
                              <span className="text-[10px] whitespace-nowrap text-[var(--flow-text-muted)]">
                                {formatDate(testCase.updatedAt)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-[11px] text-[var(--flow-text-muted)]">
                  전체{" "}
                  <strong className="font-bold text-[var(--flow-text)]">
                    {data?.totalElements ?? 0}
                  </strong>
                  개
                </p>

                <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />
              </div>
            </>
          )}
        </main>
      </div>

      <CardDetailModal
        open={selectedCardId !== null}
        cardId={selectedCardId}
        canEdit={Boolean(canEdit)}
        onClose={() => setSelectedCardId(null)}
        onChanged={handleCardChanged}
      />
    </>
  );
}

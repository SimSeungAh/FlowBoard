import { api } from "@/api/axios";
import type { CardResponse } from "@/api/card";
import type { CardAssigneeResponse } from "@/api/cardAssignee";
import type { TagResponse } from "@/api/tag";

export type TestCaseType =
  | "NORMAL"
  | "EXCEPTION"
  | "BOUNDARY"
  | "PERMISSION"
  | "SECURITY"
  | "RECOVERY"
  | "INTEGRATION"
  | "E2E";

export type TestCaseResult = "NOT_RUN" | "PASS" | "FAIL" | "BLOCKED";

export interface TestCasePageItem {
  id: number;

  columnId: number;
  columnTitle: string;

  createdById: number;
  createdByNickname: string;

  title: string;
  description: string | null;
  dueDate: string | null;

  testCaseType: TestCaseType;
  testCaseResult: TestCaseResult;

  assignees: CardAssigneeResponse[];
  tags: TagResponse[];

  createdAt: string;
  updatedAt: string;
}

export interface TestCasePageResponse {
  content: TestCasePageItem[];

  page: number;
  size: number;

  totalElements: number;
  totalPages: number;

  first: boolean;
  last: boolean;
}

export interface TestCaseSummaryResponse {
  total: number;
  notRun: number;
  pass: number;
  fail: number;
  blocked: number;
}

export interface GetTestCasesParams {
  testCaseType?: TestCaseType;
  testCaseResult?: TestCaseResult;
  keyword?: string;
  page?: number;
  size?: number;
}

export const getTestCases = async (
  boardId: number,
  params: GetTestCasesParams = {},
): Promise<TestCasePageResponse> => {
  const response = await api.get(`/boards/${boardId}/test-cases`, {
    params: {
      testCaseType: params.testCaseType,
      testCaseResult: params.testCaseResult,
      keyword: params.keyword,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });

  return response.data.data;
};

export const getTestCaseSummary = async (boardId: number): Promise<TestCaseSummaryResponse> => {
  const response = await api.get(`/boards/${boardId}/test-cases/summary`);

  return response.data.data;
};

export const updateTestCaseResult = async (
  cardId: number,
  testCaseResult: TestCaseResult,
): Promise<CardResponse> => {
  const response = await api.patch(`/cards/${cardId}/test-case/result`, {
    testCaseResult,
  });

  return response.data.data;
};

export const updateTestCaseType = async (
  cardId: number,
  testCaseType: TestCaseType,
): Promise<CardResponse> => {
  const response = await api.patch(`/cards/${cardId}/test-case/type`, {
    testCaseType,
  });

  return response.data.data;
};
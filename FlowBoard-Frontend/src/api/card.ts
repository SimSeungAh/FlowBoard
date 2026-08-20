import { api } from "@/api/axios";

export type CardTaskType =
  | "GENERAL"
  | "BUG"
  | "TEST_CASE"
  | "DESIGN_REVIEW"
  | "REQUIREMENT"
  | "SECURITY_REVIEW"
  | "RELEASE_CHECK";

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

export interface CardResponse {
  id: number;
  columnId: number;
  createdById: number;
  createdByNickname: string;
  title: string;
  description: string | null;
  rank: string;
  dueDate: string | null;

  /**
   * 카드의 작업 형식.
   *
   * Frontend / Backend 같은 직군 분류가 아니라
   * 일반 작업 / 버그 / 테스트 케이스 등의
   * 카드 사용 목적을 나타냅니다.
   */
  taskType: CardTaskType;

  /**
   * TEST_CASE 카드에서만 값이 존재합니다.
   */
  testCaseType: TestCaseType | null;

  /**
   * TEST_CASE 카드에서만 값이 존재합니다.
   */
  testCaseResult: TestCaseResult | null;

  createdAt: string;
  updatedAt: string;
}

export interface CardCreateRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;

  /**
   * 생략하면 백엔드에서 GENERAL로 처리됩니다.
   */
  taskType?: CardTaskType | null;

  /**
   * TEST_CASE 생성 시에만 전달합니다.
   */
  testCaseType?: TestCaseType | null;
}

export interface CardUpdateRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface CardMoveRequest {
  targetColumnId: number;
  targetIndex: number;
}

export const getCardsByColumn = async (
  boardId: number,
  columnId: number,
): Promise<CardResponse[]> => {
  const response = await api.get(`/boards/${boardId}/columns/${columnId}/cards`);

  return response.data.data;
};

export const getCardDetail = async (cardId: number): Promise<CardResponse> => {
  const response = await api.get(`/cards/${cardId}`);

  return response.data.data;
};

export const createCard = async (
  boardId: number,
  columnId: number,
  data: CardCreateRequest,
): Promise<CardResponse> => {
  const response = await api.post(`/boards/${boardId}/columns/${columnId}/cards`, data);

  return response.data.data;
};

export const updateCard = async (
  cardId: number,
  data: CardUpdateRequest,
): Promise<CardResponse> => {
  const response = await api.patch(`/cards/${cardId}`, data);

  return response.data.data;
};

export const moveCard = async (cardId: number, data: CardMoveRequest): Promise<CardResponse> => {
  const response = await api.patch(`/cards/${cardId}/move`, data);

  return response.data.data;
};

export const deleteCard = async (cardId: number): Promise<void> => {
  await api.delete(`/cards/${cardId}`);
};

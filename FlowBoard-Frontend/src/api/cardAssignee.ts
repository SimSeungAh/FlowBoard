import { api } from "@/api/axios";

export type BoardRole =
  | "OWNER"
  | "MEMBER"
  | "VIEWER";

export type BoardAssignableRole =
  | "MEMBER"
  | "VIEWER";

export interface BoardMemberResponse {
  id: number;
  boardId: number;
  userId: number;
  email: string;
  nickname: string;
  role: BoardRole;
  createAt: string;
  updateAt: string;
}

export interface BoardMemberInviteRequest {
  email: string;
  role: BoardAssignableRole;
}

export interface BoardMemberRoleUpdateRequest {
  role: BoardAssignableRole;
}

export interface CardAssigneeResponse {
  id: number;
  cardId: number;
  userId: number;
  email: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardAssigneeAddRequest {
  userId: number;
}

/*
 * =========================================================
 * 보드 멤버
 * =========================================================
 */

/**
 * 보드 멤버 목록 조회
 *
 * OWNER / MEMBER / VIEWER 모두 조회할 수 있습니다.
 */
export const getBoardMembers = async (
  boardId: number,
): Promise<BoardMemberResponse[]> => {
  const response = await api.get(
    `/boards/${boardId}/members`,
  );

  return response.data.data;
};

/**
 * 보드에 새 멤버를 추가합니다.
 *
 * 백엔드 정책:
 * - OWNER만 가능
 * - 이미 가입되어 있는 FlowBoard 사용자의 이메일을 사용
 * - MEMBER 또는 VIEWER만 지정 가능
 */
export const inviteBoardMember = async (
  boardId: number,
  data: BoardMemberInviteRequest,
): Promise<BoardMemberResponse> => {
  const response = await api.post(
    `/boards/${boardId}/members`,
    data,
  );

  return response.data.data;
};

/**
 * 보드 멤버의 권한을 변경합니다.
 *
 * 백엔드 정책:
 * - OWNER만 가능
 * - MEMBER / VIEWER 사이에서 변경
 * - OWNER 권한은 변경할 수 없음
 */
export const updateBoardMemberRole = async (
  boardId: number,
  memberId: number,
  data: BoardMemberRoleUpdateRequest,
): Promise<BoardMemberResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/members/${memberId}`,
    data,
  );

  return response.data.data;
};

/**
 * 보드에서 멤버를 제거합니다.
 *
 * 백엔드 정책:
 * - OWNER만 가능
 * - OWNER 본인은 제거할 수 없음
 */
export const removeBoardMember = async (
  boardId: number,
  memberId: number,
): Promise<void> => {
  await api.delete(
    `/boards/${boardId}/members/${memberId}`,
  );
};

/*
 * =========================================================
 * 카드 담당자
 * =========================================================
 */

/**
 * 카드 담당자 목록 조회
 */
export const getCardAssignees = async (
  cardId: number,
): Promise<CardAssigneeResponse[]> => {
  const response = await api.get(
    `/cards/${cardId}/assignees`,
  );

  return response.data.data;
};

/**
 * 카드 담당자 추가
 */
export const addCardAssignee = async (
  cardId: number,
  data: CardAssigneeAddRequest,
): Promise<CardAssigneeResponse> => {
  const response = await api.post(
    `/cards/${cardId}/assignees`,
    data,
  );

  return response.data.data;
};

/**
 * 카드 담당자 제거
 */
export const removeCardAssignee = async (
  cardId: number,
  userId: number,
): Promise<void> => {
  await api.delete(
    `/cards/${cardId}/assignees/${userId}`,
  );
};
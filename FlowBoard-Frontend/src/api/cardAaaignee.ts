import { api } from "@/api/axios";

export type BoardRole =
  | "OWNER"
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

export const getBoardMembers = async (
  boardId: number,
): Promise<BoardMemberResponse[]> => {
  const response = await api.get(
    `/boards/${boardId}/members`,
  );

  return response.data.data;
};

export const getCardAssignees = async (
  cardId: number,
): Promise<CardAssigneeResponse[]> => {
  const response = await api.get(
    `/cards/${cardId}/assignees`,
  );

  return response.data.data;
};

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

export const removeCardAssignee = async (
  cardId: number,
  userId: number,
): Promise<void> => {
  await api.delete(
    `/cards/${cardId}/assignees/${userId}`,
  );
};
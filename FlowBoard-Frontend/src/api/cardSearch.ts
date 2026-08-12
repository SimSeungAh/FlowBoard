import type { BoardRole } from "@/api/board";
import { api } from "@/api/axios";

export type CardDueDateFilter =
  | "OVERDUE"
  | "TODAY"
  | "UPCOMING"
  | "NO_DUE_DATE";

export interface CardAssigneeResponse {
  id: number;
  cardId: number;
  userId: number;
  email: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagResponse {
  id: number;
  boardId: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardSearchResponse {
  id: number;
  columnId: number;
  createdById: number;
  createdByNickname: string;
  title: string;
  description: string | null;
  rank: string;
  dueDate: string | null;
  assignees: CardAssigneeResponse[];
  tags: TagResponse[];
  createdAt: string;
  updatedAt: string;
}

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

export interface CardSearchParams {
  keyword?: string;
  assigneeId?: number;
  tagId?: number;
  dueDateFilter?: CardDueDateFilter;
}

export const searchCards = async (
  boardId: number,
  params: CardSearchParams,
): Promise<CardSearchResponse[]> => {
  const response = await api.get(`/boards/${boardId}/cards/search`, {
    params,
  });

  return response.data.data;
};

export const getBoardMembers = async (
  boardId: number,
): Promise<BoardMemberResponse[]> => {
  const response = await api.get(`/boards/${boardId}/members`);

  return response.data.data;
};

export const getBoardTags = async (boardId: number): Promise<TagResponse[]> => {
  const response = await api.get(`/boards/${boardId}/tags`);

  return response.data.data;
};

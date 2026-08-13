import { api } from "@/api/axios";

export interface CardResponse {
  id: number;
  columnId: number;
  createdById: number;
  createdByNickname: string;
  title: string;
  description: string | null;
  rank: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardCreateRequest {
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

export const createCard = async (
  boardId: number,
  columnId: number,
  data: CardCreateRequest,
): Promise<CardResponse> => {
  const response = await api.post(`/boards/${boardId}/columns/${columnId}/cards`, data);

  return response.data.data;
};

export const moveCard = async (cardId: number, data: CardMoveRequest): Promise<CardResponse> => {
  const response = await api.patch(`/cards/${cardId}/move`, data);

  return response.data.data;
};

import { api } from "@/api/axios";
import type { BoardColumnResponse } from "@/api/board";

export interface BoardColumnCreateRequest {
  title: string;
}

export interface BoardColumnUpdateRequest {
  title: string;
}

export interface BoardColumnReorderRequest {
  columnIds: number[];
}

export const getBoardColumns = async (
  boardId: number,
): Promise<BoardColumnResponse[]> => {
  const response = await api.get(`/boards/${boardId}/columns`);

  return response.data.data;
};

export const createBoardColumn = async (
  boardId: number,
  data: BoardColumnCreateRequest,
): Promise<BoardColumnResponse> => {
  const response = await api.post(`/boards/${boardId}/columns`, data);

  return response.data.data;
};

export const updateBoardColumn = async (
  boardId: number,
  columnId: number,
  data: BoardColumnUpdateRequest,
): Promise<BoardColumnResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/columns/${columnId}`,
    data,
  );

  return response.data.data;
};

export const reorderBoardColumns = async (
  boardId: number,
  data: BoardColumnReorderRequest,
): Promise<BoardColumnResponse[]> => {
  const response = await api.patch(
    `/boards/${boardId}/columns/reorder`,
    data,
  );

  return response.data.data;
};

export const deleteBoardColumn = async (
  boardId: number,
  columnId: number,
): Promise<void> => {
  await api.delete(`/boards/${boardId}/columns/${columnId}`);
};
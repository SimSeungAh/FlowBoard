import { api } from "@/api/axios";

export type BoardRole = "OWNER" | "MEMBER" | "VIEWER";

export interface BoardColumnResponse {
  id: number;
  title: string;
  position: number;
}

export interface BoardDetailResponse {
  id: number;
  title: string;
  description: string | null;
  backgroundColor: string | null;
  ownerId: number;
  ownerNickname: string;
  myRole: BoardRole;
  columns: BoardColumnResponse[];
  createdAt: string;
  updatedAt: string;
}

export const getBoardDetail = async (
  boardId: number,
): Promise<BoardDetailResponse> => {
  const response = await api.get(`/boards/${boardId}`);

  return response.data.data;
};

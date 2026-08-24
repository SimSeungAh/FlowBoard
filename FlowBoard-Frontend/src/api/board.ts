import { api } from "@/api/axios";

export type BoardRole = "OWNER" | "MEMBER" | "VIEWER";

export interface BoardCreateRequest {
  title: string;
  description?: string | null;
}

export interface BoardResponse {
  id: number;
  title: string;
  description: string | null;
  backgroundColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardListResponse {
  id: number;
  title: string;
  description: string | null;
  backgroundColor: string | null;
  ownerId: number;
  ownerNickname: string;
  myRole: BoardRole;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumnResponse {
  id: number;
  title: string;
  position: number;
  completionColumn: boolean;
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

export const getMyBoards = async (): Promise<BoardListResponse[]> => {
  const response = await api.get("/boards");

  return response.data.data;
};

export const createBoard = async (data: BoardCreateRequest): Promise<BoardResponse> => {
  const response = await api.post("/boards", data);

  return response.data.data;
};

export const getBoardDetail = async (boardId: number): Promise<BoardDetailResponse> => {
  const response = await api.get(`/boards/${boardId}`);

  return response.data.data;
};

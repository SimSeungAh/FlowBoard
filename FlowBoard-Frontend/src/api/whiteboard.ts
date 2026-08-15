import { api } from "@/api/axios";

export type WhiteboardTool = "PEN" | "ERASER";

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStrokeCreateRequest {
  clientStrokeId: string;
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
}

export interface WhiteboardStrokeResponse {
  id: number;
  boardId: number;
  userId: number;
  userNickname: string;
  clientStrokeId: string;
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
  createdAt: string;
  updatedAt: string;
}

export const getWhiteboardStrokes = async (
  boardId: number,
): Promise<WhiteboardStrokeResponse[]> => {
  const response = await api.get(`/boards/${boardId}/whiteboard/strokes`);

  return response.data.data;
};

export const createWhiteboardStroke = async (
  boardId: number,
  data: WhiteboardStrokeCreateRequest,
): Promise<WhiteboardStrokeResponse> => {
  const response = await api.post(`/boards/${boardId}/whiteboard/strokes`, data);

  return response.data.data;
};

export const deleteWhiteboardStroke = async (boardId: number, strokeId: number): Promise<void> => {
  await api.delete(`/boards/${boardId}/whiteboard/strokes/${strokeId}`);
};

export const clearWhiteboard = async (boardId: number): Promise<void> => {
  await api.delete(`/boards/${boardId}/whiteboard/strokes`);
};

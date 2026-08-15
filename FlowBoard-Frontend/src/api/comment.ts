import { api } from "@/api/axios";

export interface CommentResponse {
  id: number;
  cardId: number;
  userId: number;
  userNickname: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentCreateRequest {
  content: string;
}

export interface CommentUpdateRequest {
  content: string;
}

export const getComments = async (
  cardId: number,
): Promise<CommentResponse[]> => {
  const response = await api.get(
    `/cards/${cardId}/comments`,
  );

  return response.data.data;
};

export const createComment = async (
  cardId: number,
  data: CommentCreateRequest,
): Promise<CommentResponse> => {
  const response = await api.post(
    `/cards/${cardId}/comments`,
    data,
  );

  return response.data.data;
};

export const updateComment = async (
  commentId: number,
  data: CommentUpdateRequest,
): Promise<CommentResponse> => {
  const response = await api.patch(
    `/comments/${commentId}`,
    data,
  );

  return response.data.data;
};

export const deleteComment = async (
  commentId: number,
): Promise<void> => {
  await api.delete(
    `/comments/${commentId}`,
  );
};
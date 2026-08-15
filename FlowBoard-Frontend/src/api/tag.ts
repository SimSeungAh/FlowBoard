import { api } from "@/api/axios";

export interface TagResponse {
  id: number;
  boardId: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagCreateRequest {
  name: string;
  color: string;
}

export interface TagUpdateRequest {
  name: string;
  color: string;
}

export const getBoardTags = async (
  boardId: number,
): Promise<TagResponse[]> => {
  const response = await api.get(
    `/boards/${boardId}/tags`,
  );

  return response.data.data;
};

export const createTag = async (
  boardId: number,
  data: TagCreateRequest,
): Promise<TagResponse> => {
  const response = await api.post(
    `/boards/${boardId}/tags`,
    data,
  );

  return response.data.data;
};

export const updateTag = async (
  tagId: number,
  data: TagUpdateRequest,
): Promise<TagResponse> => {
  const response = await api.patch(
    `/tags/${tagId}`,
    data,
  );

  return response.data.data;
};

export const deleteTag = async (
  tagId: number,
): Promise<void> => {
  await api.delete(
    `/tags/${tagId}`,
  );
};

export const getCardTags = async (
  cardId: number,
): Promise<TagResponse[]> => {
  const response = await api.get(
    `/cards/${cardId}/tags`,
  );

  return response.data.data;
};

export const addTagToCard = async (
  cardId: number,
  tagId: number,
): Promise<TagResponse> => {
  const response = await api.post(
    `/cards/${cardId}/tags/${tagId}`,
  );

  return response.data.data;
};

export const removeTagFromCard = async (
  cardId: number,
  tagId: number,
): Promise<void> => {
  await api.delete(
    `/cards/${cardId}/tags/${tagId}`,
  );
};
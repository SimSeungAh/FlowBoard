import { api } from "@/api/axios";

export interface ChecklistItemResponse {
  id: number;
  checklistId: number;
  content: string;
  checked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistResponse {
  id: number;
  cardId: number;
  title: string;
  position: number;
  items: ChecklistItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistCreateRequest {
  title: string;
}

export interface ChecklistUpdateRequest {
  title: string;
}

export interface ChecklistItemCreateRequest {
  content: string;
}

export interface ChecklistItemUpdateRequest {
  content: string;
}

export const getChecklists = async (
  cardId: number,
): Promise<ChecklistResponse[]> => {
  const response = await api.get(
    `/cards/${cardId}/checklists`,
  );

  return response.data.data;
};

export const createChecklist = async (
  cardId: number,
  data: ChecklistCreateRequest,
): Promise<ChecklistResponse> => {
  const response = await api.post(
    `/cards/${cardId}/checklists`,
    data,
  );

  return response.data.data;
};

export const updateChecklist = async (
  checklistId: number,
  data: ChecklistUpdateRequest,
): Promise<ChecklistResponse> => {
  const response = await api.patch(
    `/checklists/${checklistId}`,
    data,
  );

  return response.data.data;
};

export const deleteChecklist = async (
  checklistId: number,
): Promise<void> => {
  await api.delete(
    `/checklists/${checklistId}`,
  );
};

export const createChecklistItem = async (
  checklistId: number,
  data: ChecklistItemCreateRequest,
): Promise<ChecklistItemResponse> => {
  const response = await api.post(
    `/checklists/${checklistId}/items`,
    data,
  );

  return response.data.data;
};

export const updateChecklistItem = async (
  itemId: number,
  data: ChecklistItemUpdateRequest,
): Promise<ChecklistItemResponse> => {
  const response = await api.patch(
    `/checklist-items/${itemId}`,
    data,
  );

  return response.data.data;
};

export const toggleChecklistItem = async (
  itemId: number,
): Promise<ChecklistItemResponse> => {
  const response = await api.patch(
    `/checklist-items/${itemId}/toggle`,
  );

  return response.data.data;
};

export const deleteChecklistItem = async (
  itemId: number,
): Promise<void> => {
  await api.delete(
    `/checklist-items/${itemId}`,
  );
};
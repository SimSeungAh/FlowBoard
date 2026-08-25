import { api } from "@/api/axios";

export type ActivityType =
  | "BOARD_CREATED"
  | "BOARD_UPDATED"
  | "MEMBER_INVITED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED"
  | "CARD_CREATED"
  | "CARD_UPDATED"
  | "CARD_MOVED"
  | "CARD_DELETED"
  | "CARD_ASSIGNEE_ADDED"
  | "CARD_ASSIGNEE_REMOVED"
  | "COMMENT_CREATED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED"
  | "TAG_CREATED"
  | "TAG_UPDATED"
  | "TAG_DELETED"
  | "CARD_TAG_ADDED"
  | "CARD_TAG_REMOVED"
  | "CHECKLIST_CREATED"
  | "CHECKLIST_UPDATED"
  | "CHECKLIST_DELETED"
  | "CHECKLIST_ITEM_CREATED"
  | "CHECKLIST_ITEM_UPDATED"
  | "CHECKLIST_ITEM_TOGGLED"
  | "CHECKLIST_ITEM_DELETED"
  | "WHITEBOARD_CREATED"
  | "WHITEBOARD_UPDATED"
  | "WHITEBOARD_DELETED"
  | "WHITEBOARD_DEFAULT_CHANGED"
  | "WHITEBOARD_STROKE_CREATED"
  | "WHITEBOARD_CLEARED";

export interface ActivityLogResponse {
  id: number;
  boardId: number;
  actorId: number;
  actorNickname: string;
  type: ActivityType;
  targetId: number | null;
  targetName: string | null;
  description: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface GetBoardActivitiesParams {
  page?: number;
  size?: number;
}

export const getBoardActivities = async (
  boardId: number,
  params: GetBoardActivitiesParams = {},
): Promise<PageResponse<ActivityLogResponse>> => {
  const response = await api.get(`/boards/${boardId}/activities`, {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });

  return response.data.data;
};

import { api } from "@/api/axios";

export type BoardPresenceSection =
  | "DASHBOARD"
  | "SCHEDULE"
  | "KANBAN"
  | "REQUIREMENT"
  | "SEARCH"
  | "TEST_CASE"
  | "SECURITY_REVIEW"
  | "WHITEBOARD"
  | "ACTIVITY"
  | "MEMBERS"
  | "OTHER";

export interface BoardPresenceHeartbeatRequest {
  section: BoardPresenceSection;
  whiteboardId?: number | null;
}

export interface BoardPresenceResponse {
  userId: number;
  nickname: string;
  section: BoardPresenceSection;
  whiteboardId: number | null;
  whiteboardTitle: string | null;
  lastSeenAt: number;
}

export const sendBoardPresenceHeartbeat = async (
  boardId: number,
  data: BoardPresenceHeartbeatRequest,
): Promise<void> => {
  await api.post(`/boards/${boardId}/presence/heartbeat`, data);
};

export const getBoardPresence = async (boardId: number): Promise<BoardPresenceResponse[]> => {
  const response = await api.get(`/boards/${boardId}/presence`);
  return response.data.data;
};

import { api } from "@/api/axios";

export type WhiteboardTool = "PEN" | "ERASER";
export type WhiteboardGridType = "NONE" | "GRID" | "DOT";

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardWorkspaceResponse {
  id: number;
  boardId: number;
  title: string;
  description: string | null;
  position: number;
  defaultWhiteboard: boolean;
  backgroundColor: string;
  gridEnabled: boolean;
  gridType: WhiteboardGridType;
  gridSize: number;
  gridOpacity: number;
  canvasWidth: number;
  canvasHeight: number;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardWorkspaceCreateRequest {
  title: string;
  description?: string | null;
}

export interface WhiteboardWorkspaceUpdateRequest {
  title: string;
  description?: string | null;
}

export interface WhiteboardWorkspaceAppearanceRequest {
  backgroundColor: string;
  gridEnabled?: boolean;
  gridType: WhiteboardGridType;
  gridSize: number;
  gridOpacity: number;
}

export interface WhiteboardWorkspaceCanvasSizeRequest {
  width: number;
  height: number;
}

export interface WhiteboardWorkspaceReorderRequest {
  whiteboardIds: number[];
}

export interface WhiteboardStrokeCreateRequest {
  clientStrokeId: string;
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
}

export type WhiteboardObjectType =
  | "STICKY_NOTE"
  | "TEXT"
  | "RECTANGLE"
  | "ELLIPSE"
  | "ARROW"
  | "IMAGE";

export interface WhiteboardObjectResponse {
  id: number;
  whiteboardId: number;
  createdById: number;
  createdByNickname: string;
  clientObjectId: string;
  type: WhiteboardObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string | null;
  fillColor: string | null;
  strokeColor: string | null;
  strokeWidth: number | null;
  fontSize: number | null;
  zIndex: number;
  layerName: string | null;
  visible: boolean;
  locked: boolean;
  propertiesJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardObjectCreateRequest {
  clientObjectId: string;
  type: WhiteboardObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string | null;
  fillColor?: string | null;
  strokeColor?: string | null;
  strokeWidth?: number | null;
  fontSize?: number | null;
  zIndex?: number | null;
  propertiesJson?: string | null;
}

export interface WhiteboardObjectUpdateRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string | null;
  fillColor?: string | null;
  strokeColor?: string | null;
  strokeWidth?: number | null;
  fontSize?: number | null;
  zIndex?: number | null;
  propertiesJson?: string | null;
}

export interface WhiteboardObjectLayerRequest {
  zIndex: number;
}

export interface WhiteboardObjectLayerMetadataRequest {
  layerName?: string | null;
  visible: boolean;
}

export interface WhiteboardObjectLayerReorderRequest {
  objectIds: number[];
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

export const getWhiteboards = async (boardId: number): Promise<WhiteboardWorkspaceResponse[]> => {
  const response = await api.get(`/boards/${boardId}/whiteboards`);
  return response.data.data;
};

export const getDefaultWhiteboard = async (
  boardId: number,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.get(`/boards/${boardId}/whiteboards/default`);
  return response.data.data;
};

export const getWhiteboard = async (
  boardId: number,
  whiteboardId: number,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.get(`/boards/${boardId}/whiteboards/${whiteboardId}`);
  return response.data.data;
};

export const createWhiteboard = async (
  boardId: number,
  data: WhiteboardWorkspaceCreateRequest,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.post(`/boards/${boardId}/whiteboards`, data);
  return response.data.data;
};

export const updateWhiteboard = async (
  boardId: number,
  whiteboardId: number,
  data: WhiteboardWorkspaceUpdateRequest,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.patch(`/boards/${boardId}/whiteboards/${whiteboardId}`, data);
  return response.data.data;
};

export const updateWhiteboardAppearance = async (
  boardId: number,
  whiteboardId: number,
  data: WhiteboardWorkspaceAppearanceRequest,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/appearance`,
    data,
  );
  return response.data.data;
};

export const updateWhiteboardCanvasSize = async (
  boardId: number,
  whiteboardId: number,
  data: WhiteboardWorkspaceCanvasSizeRequest,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/canvas-size`,
    data,
  );
  return response.data.data;
};

export const updateWhiteboardLock = async (
  boardId: number,
  whiteboardId: number,
  locked: boolean,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.patch(`/boards/${boardId}/whiteboards/${whiteboardId}/lock`, null, {
    params: { locked },
  });
  return response.data.data;
};

export const setDefaultWhiteboard = async (
  boardId: number,
  whiteboardId: number,
): Promise<WhiteboardWorkspaceResponse> => {
  const response = await api.patch(`/boards/${boardId}/whiteboards/${whiteboardId}/default`);
  return response.data.data;
};

export const reorderWhiteboards = async (
  boardId: number,
  data: WhiteboardWorkspaceReorderRequest,
): Promise<WhiteboardWorkspaceResponse[]> => {
  const response = await api.patch(`/boards/${boardId}/whiteboards/reorder`, data);
  return response.data.data;
};

export const deleteWhiteboard = async (boardId: number, whiteboardId: number): Promise<void> => {
  await api.delete(`/boards/${boardId}/whiteboards/${whiteboardId}`);
};

export const getWhiteboardWorkspaceStrokes = async (
  boardId: number,
  whiteboardId: number,
): Promise<WhiteboardStrokeResponse[]> => {
  const response = await api.get(`/boards/${boardId}/whiteboards/${whiteboardId}/strokes`);
  return response.data.data;
};

export const createWhiteboardWorkspaceStroke = async (
  boardId: number,
  whiteboardId: number,
  data: WhiteboardStrokeCreateRequest,
): Promise<WhiteboardStrokeResponse> => {
  const response = await api.post(`/boards/${boardId}/whiteboards/${whiteboardId}/strokes`, data);
  return response.data.data;
};

export const deleteWhiteboardWorkspaceStroke = async (
  boardId: number,
  whiteboardId: number,
  strokeId: number,
): Promise<void> => {
  await api.delete(`/boards/${boardId}/whiteboards/${whiteboardId}/strokes/${strokeId}`);
};

export const clearWhiteboardWorkspace = async (
  boardId: number,
  whiteboardId: number,
): Promise<void> => {
  await api.delete(`/boards/${boardId}/whiteboards/${whiteboardId}/strokes`);
};

export const getWhiteboardObjects = async (
  boardId: number,
  whiteboardId: number,
): Promise<WhiteboardObjectResponse[]> => {
  const response = await api.get(`/boards/${boardId}/whiteboards/${whiteboardId}/objects`);
  return response.data.data;
};

export const createWhiteboardObject = async (
  boardId: number,
  whiteboardId: number,
  data: WhiteboardObjectCreateRequest,
): Promise<WhiteboardObjectResponse> => {
  const response = await api.post(`/boards/${boardId}/whiteboards/${whiteboardId}/objects`, data);
  return response.data.data;
};

export const updateWhiteboardObject = async (
  boardId: number,
  whiteboardId: number,
  objectId: number,
  data: WhiteboardObjectUpdateRequest,
): Promise<WhiteboardObjectResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}`,
    data,
  );
  return response.data.data;
};

export const updateWhiteboardObjectLayer = async (
  boardId: number,
  whiteboardId: number,
  objectId: number,
  data: WhiteboardObjectLayerRequest,
): Promise<WhiteboardObjectResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}/layer`,
    data,
  );
  return response.data.data;
};

export const updateWhiteboardObjectLayerMetadata = async (
  boardId: number,
  whiteboardId: number,
  objectId: number,
  data: WhiteboardObjectLayerMetadataRequest,
): Promise<WhiteboardObjectResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}/layer-meta`,
    data,
  );
  return response.data.data;
};

export const reorderWhiteboardObjectLayers = async (
  boardId: number,
  whiteboardId: number,
  data: WhiteboardObjectLayerReorderRequest,
): Promise<WhiteboardObjectResponse[]> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/objects/layers/reorder`,
    data,
  );
  return response.data.data;
};

export const updateWhiteboardObjectLock = async (
  boardId: number,
  whiteboardId: number,
  objectId: number,
  locked: boolean,
): Promise<WhiteboardObjectResponse> => {
  const response = await api.patch(
    `/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}/lock`,
    null,
    { params: { locked } },
  );
  return response.data.data;
};


export const uploadWhiteboardImage = async (
  boardId: number,
  whiteboardId: number,
  file: File,
): Promise<WhiteboardObjectResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/boards/${boardId}/whiteboards/${whiteboardId}/images`,
    formData,
  );

  return response.data.data;
};

export const getWhiteboardImageBlob = async (
  boardId: number,
  whiteboardId: number,
  objectId: number,
): Promise<Blob> => {
  const response = await api.get(
    `/boards/${boardId}/whiteboards/${whiteboardId}/images/${objectId}/content`,
    { responseType: "blob" },
  );

  return response.data;
};

export const deleteWhiteboardObject = async (
  boardId: number,
  whiteboardId: number,
  objectId: number,
): Promise<void> => {
  await api.delete(`/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}`);
};

/* 기존 단일 화이트보드 호환 API */
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

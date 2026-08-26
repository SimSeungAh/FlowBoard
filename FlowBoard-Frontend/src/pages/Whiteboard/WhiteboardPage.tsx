import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";
import { sendBoardPresenceHeartbeat } from "@/api/presence";
import {
  clearWhiteboardWorkspace,
  createWhiteboard,
  createWhiteboardObject,
  createWhiteboardWorkspaceStroke,
  deleteWhiteboard,
  deleteWhiteboardObject,
  deleteWhiteboardWorkspaceStroke,
  getWhiteboards,
  getWhiteboardImageBlob,
  getWhiteboardObjects,
  getWhiteboardWorkspaceStrokes,
  reorderWhiteboards,
  reorderWhiteboardObjectLayers,
  setDefaultWhiteboard,
  updateWhiteboard,
  updateWhiteboardAppearance,
  updateWhiteboardCanvasSize,
  updateWhiteboardLock,
  updateWhiteboardObject,
  updateWhiteboardObjectLayerMetadata,
  updateWhiteboardObjectLock,
  uploadWhiteboardImage,
  type WhiteboardGridType,
  type WhiteboardObjectResponse,
  type WhiteboardObjectType,
  type WhiteboardPoint,
  type WhiteboardStrokeCreateRequest,
  type WhiteboardStrokeResponse,
  type WhiteboardTool,
  type WhiteboardWorkspaceResponse,
} from "@/api/whiteboard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import {
  connectWhiteboardWebSocket,
  type WhiteboardConnectionState,
  type WhiteboardWebSocketConnection,
} from "@/services/whiteboardWebSocket";

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 700;
const MIN_CANVAS_WIDTH = 800;
const MIN_CANVAS_HEIGHT = 500;
const MAX_CANVAS_WIDTH = 6000;
const MAX_CANVAS_HEIGHT = 4000;

const DEFAULT_PEN_COLOR = "#111827";

const DEFAULT_PEN_LINE_WIDTH = 4;
const DEFAULT_ERASER_LINE_WIDTH = 28;

const STICKY_WIDTH = 220;
const STICKY_HEIGHT = 150;
const DEFAULT_STICKY_COLOR = "#FEF3C7";
const DEFAULT_STICKY_BORDER_COLOR = "#F59E0B";

const TEXT_WIDTH = 280;
const TEXT_HEIGHT = 84;
const DEFAULT_TEXT_COLOR = "#0F172A";
const DEFAULT_TEXT_FONT_SIZE = 24;
const DEFAULT_STICKY_FONT_SIZE = 14;

const SHAPE_WIDTH = 180;
const SHAPE_HEIGHT = 110;
const ARROW_WIDTH = 220;
const ARROW_HEIGHT = 70;
const DEFAULT_SHAPE_FILL = "#DBEAFE";
const DEFAULT_SHAPE_STROKE = "#2563EB";
const DEFAULT_SHAPE_STROKE_WIDTH = 2;

const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif"]);

const LIVE_OBJECT_SEND_INTERVAL_MS = 33;
const LIVE_CURSOR_SEND_INTERVAL_MS = 50;
const REMOTE_CURSOR_TTL_MS = 4500;

const STROKE_CHUNK_POINT_LIMIT = 800;
const MIN_POINT_DISTANCE = 2;

/*
 * 펜/부분 지우개 LIVE 좌표 전송은 약 30fps로 제한합니다.
 * 실제 내 Canvas 렌더링은 pointermove마다 즉시 처리합니다.
 */
const LIVE_STROKE_SEND_INTERVAL_MS = 33;

/*
 * LIVE_END 직후 REST 저장 이벤트가 도착하기 전에 임시 선을 바로 지우면
 * 상대 화면에서 잠깐 선이 사라졌다 다시 나타나는 깜빡임이 생길 수 있습니다.
 * 확정 STROKE_CREATED가 도착할 시간을 조금 주고 임시 선을 제거합니다.
 */
const LIVE_STROKE_END_GRACE_MS = 1200;

/*
 * 선 지우기 모드에서
 * 실제 선에서 몇 px 정도 떨어진 클릭까지 허용할지 결정합니다.
 */
const STROKE_HIT_TOLERANCE = 10;

type EraserMode = "PIXEL" | "STROKE";

type WhiteboardInteractionTool =
  | WhiteboardTool
  | "SELECT"
  | "HAND"
  | "STICKY"
  | "TEXT"
  | "RECTANGLE"
  | "ELLIPSE"
  | "ARROW";

interface DrawableStroke {
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
}

interface ActiveStroke extends DrawableStroke {
  gestureId: string;
  hasSavedChunk: boolean;
  liveStrokeId: string;
  lastLiveSentAt: number;
  lastLiveSentPoint: WhiteboardPoint;
}

interface UndoGesture {
  gestureId: string;
  strokeIds: number[];
}

interface RedoGesture {
  strokes: WhiteboardStrokeResponse[];
}

interface PanSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
}

interface ObjectDragSession {
  pointerId: number;
  objectId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

interface ObjectResizeSession {
  pointerId: number;
  objectId: number;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
}

interface CanvasResizeSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
}

interface RemoteCursor {
  sourceClientId: string;
  userId: number;
  nickname: string;
  x: number;
  y: number;
  updatedAt: number;
}

interface CreateStrokeMutationVariables {
  request: WhiteboardStrokeCreateRequest;
  gestureId: string;
}

const drawDot = (context: CanvasRenderingContext2D, stroke: DrawableStroke) => {
  const point = stroke.points[0];

  if (!point) {
    return;
  }

  context.save();

  context.globalCompositeOperation = stroke.tool === "ERASER" ? "destination-out" : "source-over";

  context.fillStyle = stroke.color;

  context.beginPath();

  context.arc(point.x, point.y, stroke.lineWidth / 2, 0, Math.PI * 2);

  context.fill();

  context.restore();
};

const drawStroke = (context: CanvasRenderingContext2D, stroke: DrawableStroke) => {
  if (stroke.points.length === 0) {
    return;
  }

  if (stroke.points.length === 1) {
    drawDot(context, stroke);

    return;
  }

  const firstPoint = stroke.points[0];

  if (!firstPoint) {
    return;
  }

  context.save();

  context.globalCompositeOperation = stroke.tool === "ERASER" ? "destination-out" : "source-over";

  context.strokeStyle = stroke.color;

  context.lineWidth = stroke.lineWidth;

  context.lineCap = "round";

  context.lineJoin = "round";

  context.beginPath();

  context.moveTo(firstPoint.x, firstPoint.y);

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();

  context.restore();
};

const drawSegment = (
  context: CanvasRenderingContext2D,
  from: WhiteboardPoint,
  to: WhiteboardPoint,
  tool: WhiteboardTool,
  color: string,
  lineWidth: number,
) => {
  context.save();

  context.globalCompositeOperation = tool === "ERASER" ? "destination-out" : "source-over";

  context.strokeStyle = color;

  context.lineWidth = lineWidth;

  context.lineCap = "round";

  context.lineJoin = "round";

  context.beginPath();

  context.moveTo(from.x, from.y);

  context.lineTo(to.x, to.y);

  context.stroke();

  context.restore();
};

const getCanvasPoint = (
  canvas: HTMLCanvasElement,
  event: ReactPointerEvent<HTMLCanvasElement>,
): WhiteboardPoint => {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;

  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,

    y: (event.clientY - rect.top) * scaleY,
  };
};

const getPointDistance = (first: WhiteboardPoint, second: WhiteboardPoint) =>
  Math.hypot(second.x - first.x, second.y - first.y);

/*
 * 점 P와 선분 AB 사이의 최단거리
 *
 * 클릭한 위치가 실제 Stroke에 얼마나 가까운지
 * 판정하기 위해 사용합니다.
 */
const getPointToSegmentDistance = (
  point: WhiteboardPoint,
  start: WhiteboardPoint,
  end: WhiteboardPoint,
) => {
  const segmentX = end.x - start.x;

  const segmentY = end.y - start.y;

  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    return getPointDistance(point, start);
  }

  const projection =
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared;

  const clampedProjection = Math.max(0, Math.min(1, projection));

  const closestPoint: WhiteboardPoint = {
    x: start.x + clampedProjection * segmentX,

    y: start.y + clampedProjection * segmentY,
  };

  return getPointDistance(point, closestPoint);
};

const isStrokeHit = (point: WhiteboardPoint, stroke: WhiteboardStrokeResponse) => {
  if (stroke.tool !== "PEN" || stroke.points.length === 0) {
    return false;
  }

  const hitDistance = stroke.lineWidth / 2 + STROKE_HIT_TOLERANCE;

  if (stroke.points.length === 1) {
    const firstPoint = stroke.points[0];

    if (!firstPoint) {
      return false;
    }

    return getPointDistance(point, firstPoint) <= hitDistance;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previousPoint = stroke.points[index - 1];

    const currentPoint = stroke.points[index];

    if (!previousPoint || !currentPoint) {
      continue;
    }

    if (getPointToSegmentDistance(point, previousPoint, currentPoint) <= hitDistance) {
      return true;
    }
  }

  return false;
};

/*
 * 가장 위에 그려진 선부터 찾습니다.
 *
 * strokes는 서버에서 생성 순서대로 오기 때문에
 * 뒤에서부터 검사하면 가장 최근 PEN Stroke가 먼저 선택됩니다.
 */
const findStrokeAtPoint = (point: WhiteboardPoint, strokes: WhiteboardStrokeResponse[]) => {
  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    const stroke = strokes[index];

    if (stroke && isStrokeHit(point, stroke)) {
      return stroke;
    }
  }

  return null;
};

const drawSelectionOutline = (
  context: CanvasRenderingContext2D,
  stroke: WhiteboardStrokeResponse,
) => {
  if (stroke.points.length === 0) {
    return;
  }

  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const padding = Math.max(10, stroke.lineWidth);

  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  context.save();
  context.strokeStyle = "#2563EB";
  context.lineWidth = 2;
  context.setLineDash([8, 6]);
  context.strokeRect(minX, minY, Math.max(12, maxX - minX), Math.max(12, maxY - minY));
  context.restore();
};

const clampZoom = (value: number) => Math.min(2, Math.max(0.5, value));

const getConnectionLabel = (state: WhiteboardConnectionState) => {
  switch (state) {
    case "connected":
      return "실시간 연결됨";

    case "connecting":
      return "실시간 연결 중...";

    case "disconnected":
      return "실시간 연결 끊김";
  }
};

const getConnectionClassName = (state: WhiteboardConnectionState) => {
  switch (state) {
    case "connected":
      return "bg-emerald-50 text-emerald-700";

    case "connecting":
      return "bg-amber-50 text-amber-700";

    case "disconnected":
      return "bg-red-50 text-red-700";
  }
};

const appendStrokeIfMissing = (
  current: WhiteboardStrokeResponse[],
  incomingStroke: WhiteboardStrokeResponse,
) => {
  const alreadyExists = current.some(
    (stroke) =>
      stroke.id === incomingStroke.id || stroke.clientStrokeId === incomingStroke.clientStrokeId,
  );

  if (alreadyExists) {
    return current;
  }

  return [...current, incomingStroke];
};

const getRemoteLiveStrokeKey = (sourceClientId: string, liveStrokeId: string) =>
  `${sourceClientId}:${liveStrokeId}`;

const getCanvasPatternStyle = (whiteboard: WhiteboardWorkspaceResponse | null) => {
  const gridType = whiteboard?.gridType ?? (whiteboard?.gridEnabled ? "GRID" : "NONE");
  const gridSize = whiteboard?.gridSize ?? 24;
  const gridOpacity = whiteboard?.gridOpacity ?? 0.12;
  const alpha = Math.min(0.5, Math.max(0.03, gridOpacity));
  const lineColor = `rgba(100,116,139,${alpha})`;

  if (gridType === "DOT") {
    return {
      backgroundImage: `radial-gradient(circle, ${lineColor} 1.3px, transparent 1.4px)`,
      backgroundSize: `${gridSize}px ${gridSize}px`,
    };
  }

  if (gridType === "GRID") {
    return {
      backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
      backgroundSize: `${gridSize}px ${gridSize}px`,
    };
  }

  return {
    backgroundImage: "none",
    backgroundSize: "auto",
  };
};

const REMOTE_CURSOR_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#EA580C",
  "#059669",
  "#0891B2",
  "#4F46E5",
  "#65A30D",
];

const getCursorColor = (userId: number) =>
  REMOTE_CURSOR_COLORS[Math.abs(userId) % REMOTE_CURSOR_COLORS.length] ?? "#2563EB";

const getDefaultLayerName = (object: WhiteboardObjectResponse) => {
  const typeLabel: Record<WhiteboardObjectType, string> = {
    STICKY_NOTE: "스티키",
    TEXT: "텍스트",
    RECTANGLE: "사각형",
    ELLIPSE: "원",
    ARROW: "화살표",
    IMAGE: "이미지",
  };

  const content = object.content?.trim();

  if (content) {
    const singleLine = content.replace(/\s+/g, " ");
    return singleLine.length > 22 ? `${singleLine.slice(0, 22)}…` : singleLine;
  }

  return `${typeLabel[object.type]} #${object.id}`;
};

const getLayerTypeIcon = (type: WhiteboardObjectType) => {
  switch (type) {
    case "STICKY_NOTE":
      return "▤";
    case "TEXT":
      return "T";
    case "RECTANGLE":
      return "▭";
    case "ELLIPSE":
      return "○";
    case "ARROW":
      return "→";
    case "IMAGE":
      return "▧";
  }
};

const isTextEditingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
};

function WhiteboardImageContent({
  boardId,
  whiteboardId,
  objectId,
  alt,
}: {
  boardId: number;
  whiteboardId: number;
  objectId: number;
  alt: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setFailed(false);

    void getWhiteboardImageBlob(boardId, whiteboardId, objectId)
      .then((blob) => {
        if (disposed) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true);
        }
      });

    return () => {
      disposed = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [boardId, objectId, whiteboardId]);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 px-4 text-center text-[11px] font-semibold text-slate-500">
        이미지를 불러오지 못했습니다.
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[11px] font-semibold text-slate-400">
        이미지 불러오는 중…
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      draggable={false}
      className="pointer-events-none h-full w-full select-none object-contain"
    />
  );
}

export default function WhiteboardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const queryClient = useQueryClient();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const activeStrokeRef = useRef<ActiveStroke | null>(null);

  const activePointerIdRef = useRef<number | null>(null);

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const saveErrorShownRef = useRef(false);

  const undoHistoryRef = useRef<UndoGesture[]>([]);

  const redoHistoryRef = useRef<RedoGesture[]>([]);

  const panSessionRef = useRef<PanSession | null>(null);

  const objectDragSessionRef = useRef<ObjectDragSession | null>(null);

  const objectResizeSessionRef = useRef<ObjectResizeSession | null>(null);

  const canvasResizeSessionRef = useRef<CanvasResizeSession | null>(null);

  const composingObjectIdsRef = useRef<Set<number>>(new Set());

  /*
   * 현재 선택된 화이트보드의 STOMP 연결입니다.
   *
   * REST 저장과 별개로 스티키 텍스트/이동을 즉시 전파할 때 사용합니다.
   */
  const whiteboardConnectionRef = useRef<WhiteboardWebSocketConnection | null>(null);

  /*
   * 같은 원격 클라이언트에서 늦게 도착한 LIVE 이벤트가
   * 더 최신 화면을 덮어쓰지 않도록 마지막 sequence를 기억합니다.
   */
  const remoteLiveSequenceRef = useRef<Map<string, number>>(new Map());

  /*
   * pointermove는 매우 자주 발생하므로 네트워크 전송만 약 30fps로 제한합니다.
   * 내 화면의 이동은 매 pointermove마다 즉시 반영됩니다.
   */
  const lastLiveMoveSentAtRef = useRef<Map<number, number>>(new Map());

  const lastLiveResizeSentAtRef = useRef<Map<number, number>>(new Map());

  const lastCursorSentAtRef = useRef(0);

  /*
   * 다른 사용자가 현재 그리고 있는 펜/부분 지우개 Stroke입니다.
   * DB 저장 전의 임시 화면 상태이므로 React state에서만 관리합니다.
   */
  const [remoteLiveStrokes, setRemoteLiveStrokes] = useState<Record<string, DrawableStroke>>({});

  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});

  const remoteLiveStrokeRemovalTimersRef = useRef<Map<string, number>>(new Map());

  const [undoGestureCount, setUndoGestureCount] = useState(0);

  const [redoGestureCount, setRedoGestureCount] = useState(0);

  const [queuedSaveCount, setQueuedSaveCount] = useState(0);

  const [isUndoing, setIsUndoing] = useState(false);

  const [isRedoing, setIsRedoing] = useState(false);

  const [deletingStrokeId, setDeletingStrokeId] = useState<number | null>(null);

  const [tool, setTool] = useState<WhiteboardInteractionTool>("PEN");

  const [selectedStrokeId, setSelectedStrokeId] = useState<number | null>(null);

  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);

  const [layersOpen, setLayersOpen] = useState(true);

  const [draggedLayerId, setDraggedLayerId] = useState<number | null>(null);

  const [layerRenameId, setLayerRenameId] = useState<number | null>(null);

  const [layerRenameDraft, setLayerRenameDraft] = useState("");

  const [canvasSizeDraft, setCanvasSizeDraft] = useState<{ width: number; height: number } | null>(null);

  const [objectDrafts, setObjectDrafts] = useState<Record<number, string>>({});

  const [deletingObjectId, setDeletingObjectId] = useState<number | null>(null);

  const [zoom, setZoom] = useState(1);

  const [isPanning, setIsPanning] = useState(false);

  const [eraserMode, setEraserMode] = useState<EraserMode>("PIXEL");

  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);

  const [penLineWidth, setPenLineWidth] = useState(DEFAULT_PEN_LINE_WIDTH);

  const [eraserLineWidth, setEraserLineWidth] = useState(DEFAULT_ERASER_LINE_WIDTH);

  const [stickyColor, setStickyColor] = useState(DEFAULT_STICKY_COLOR);

  const [stickyFontSize, setStickyFontSize] = useState(DEFAULT_STICKY_FONT_SIZE);

  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);

  const [textFontSize, setTextFontSize] = useState(DEFAULT_TEXT_FONT_SIZE);

  const [shapeFillColor, setShapeFillColor] = useState(DEFAULT_SHAPE_FILL);

  const [shapeStrokeColor, setShapeStrokeColor] = useState(DEFAULT_SHAPE_STROKE);

  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(DEFAULT_SHAPE_STROKE_WIDTH);

  const [connectionState, setConnectionState] = useState<WhiteboardConnectionState>("connecting");

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [selectedWhiteboardId, setSelectedWhiteboardId] = useState<number | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [workspaceTitle, setWorkspaceTitle] = useState("");

  const [workspaceDescription, setWorkspaceDescription] = useState("");

  const [workspaceBackgroundColor, setWorkspaceBackgroundColor] = useState("#FFFFFF");

  const [workspaceGridEnabled, setWorkspaceGridEnabled] = useState(true);

  const [workspaceGridType, setWorkspaceGridType] = useState<WhiteboardGridType>("GRID");

  const [workspaceGridSize, setWorkspaceGridSize] = useState(24);

  const [workspaceGridOpacity, setWorkspaceGridOpacity] = useState(0.12);

  const [workspaceCanvasWidth, setWorkspaceCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH);

  const [workspaceCanvasHeight, setWorkspaceCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT);

  const boardQueryKey = ["boards", boardId] as const;

  const whiteboardsQueryKey = ["whiteboards", boardId] as const;

  const whiteboardQueryKey = ["whiteboard", boardId, selectedWhiteboardId, "strokes"] as const;

  const whiteboardObjectsQueryKey = [
    "whiteboard",
    boardId,
    selectedWhiteboardId,
    "objects",
  ] as const;

  const syncUndoGestureCount = useCallback(() => {
    setUndoGestureCount(undoHistoryRef.current.length);
  }, []);

  const syncRedoGestureCount = useCallback(() => {
    setRedoGestureCount(redoHistoryRef.current.length);
  }, []);

  const clearRedoHistory = useCallback(() => {
    redoHistoryRef.current = [];

    syncRedoGestureCount();
  }, [syncRedoGestureCount]);

  const clearUndoHistory = useCallback(() => {
    undoHistoryRef.current = [];
    redoHistoryRef.current = [];

    syncUndoGestureCount();
    syncRedoGestureCount();
    setSelectedStrokeId(null);
    setSelectedObjectId(null);
  }, [syncRedoGestureCount, syncUndoGestureCount]);

  const registerStrokeForGesture = useCallback(
    (gestureId: string, strokeId: number) => {
      const history = undoHistoryRef.current;

      const existingGesture = history.find((gesture) => gesture.gestureId === gestureId);

      if (existingGesture) {
        if (!existingGesture.strokeIds.includes(strokeId)) {
          existingGesture.strokeIds.push(strokeId);
        }

        clearRedoHistory();
        syncUndoGestureCount();

        return;
      }

      history.push({
        gestureId,

        strokeIds: [strokeId],
      });

      clearRedoHistory();
      syncUndoGestureCount();
    },
    [clearRedoHistory, syncUndoGestureCount],
  );

  const removeStrokeFromUndoHistory = useCallback(
    (strokeId: number) => {
      const nextHistory = undoHistoryRef.current
        .map((gesture) => ({
          ...gesture,

          strokeIds: gesture.strokeIds.filter((id) => id !== strokeId),
        }))
        .filter((gesture) => gesture.strokeIds.length > 0);

      undoHistoryRef.current = nextHistory;

      syncUndoGestureCount();
    },
    [syncUndoGestureCount],
  );

  const {
    data: board,
    isLoading: isBoardLoading,
    isError: isBoardError,
    refetch: refetchBoard,
  } = useQuery({
    queryKey: boardQueryKey,

    queryFn: () => getBoardDetail(boardId),

    enabled: isValidBoardId,
  });

  const {
    data: whiteboards = [],
    isLoading: isWhiteboardsLoading,
    isError: isWhiteboardsError,
    refetch: refetchWhiteboards,
  } = useQuery({
    queryKey: whiteboardsQueryKey,

    queryFn: () => getWhiteboards(boardId),

    enabled: isValidBoardId,
  });

  const selectedWhiteboard = useMemo(
    () => whiteboards.find((whiteboard) => whiteboard.id === selectedWhiteboardId) ?? null,
    [selectedWhiteboardId, whiteboards],
  );

  const canvasWidth =
    canvasSizeDraft?.width ?? selectedWhiteboard?.canvasWidth ?? DEFAULT_CANVAS_WIDTH;

  const canvasHeight =
    canvasSizeDraft?.height ?? selectedWhiteboard?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT;

  useEffect(() => {
    if (whiteboards.length === 0) {
      setSelectedWhiteboardId(null);
      return;
    }

    const selectedStillExists = whiteboards.some(
      (whiteboard) => whiteboard.id === selectedWhiteboardId,
    );

    if (selectedStillExists) {
      return;
    }

    const defaultWhiteboard =
      whiteboards.find((whiteboard) => whiteboard.defaultWhiteboard) ?? whiteboards[0];

    setSelectedWhiteboardId(defaultWhiteboard?.id ?? null);
  }, [selectedWhiteboardId, whiteboards]);

  useEffect(() => {
    if (!isValidBoardId || selectedWhiteboardId === null) {
      return;
    }

    let disposed = false;

    const heartbeat = async () => {
      try {
        await sendBoardPresenceHeartbeat(boardId, {
          section: "WHITEBOARD",
          whiteboardId: selectedWhiteboardId,
        });

        if (!disposed) {
          void queryClient.invalidateQueries({ queryKey: ["board", boardId, "presence"] });
        }
      } catch {
        // Presence는 보조 기능이므로 Redis 장애가 화이트보드 편집을 막지 않습니다.
      }
    };

    void heartbeat();
    const timerId = window.setInterval(() => void heartbeat(), 25_000);

    return () => {
      disposed = true;
      window.clearInterval(timerId);
    };
  }, [boardId, isValidBoardId, queryClient, selectedWhiteboardId]);

  const {
    data: strokes = [],
    isLoading: isStrokesLoading,
    isError: isStrokesError,
    refetch: refetchStrokes,
  } = useQuery({
    queryKey: whiteboardQueryKey,

    queryFn: () => getWhiteboardWorkspaceStrokes(boardId, selectedWhiteboardId as number),

    enabled: isValidBoardId && selectedWhiteboardId !== null,
  });

  const {
    data: objects = [],
    isLoading: isObjectsLoading,
    isError: isObjectsError,
    refetch: refetchObjects,
  } = useQuery({
    queryKey: whiteboardObjectsQueryKey,

    queryFn: () => getWhiteboardObjects(boardId, selectedWhiteboardId as number),

    enabled: isValidBoardId && selectedWhiteboardId !== null,
  });

  const stickyNotes = useMemo(
    () => objects.filter((object) => object.type === "STICKY_NOTE" && object.visible !== false),
    [objects],
  );

  const textObjects = useMemo(
    () => objects.filter((object) => object.type === "TEXT" && object.visible !== false),
    [objects],
  );

  const shapeObjects = useMemo(
    () =>
      objects.filter(
        (object) =>
          object.visible !== false &&
          (object.type === "RECTANGLE" || object.type === "ELLIPSE" || object.type === "ARROW"),
      ),
    [objects],
  );

  const imageObjects = useMemo(
    () => objects.filter((object) => object.type === "IMAGE" && object.visible !== false),
    [objects],
  );

  const orderedLayers = useMemo(
    () => [...objects].sort((left, right) => right.zIndex - left.zIndex || right.id - left.id),
    [objects],
  );

  const selectedStroke = useMemo(
    () => strokes.find((stroke) => stroke.id === selectedStrokeId) ?? null,
    [selectedStrokeId, strokes],
  );

  useEffect(() => {
    if (selectedStrokeId !== null && !selectedStroke) {
      setSelectedStrokeId(null);
    }
  }, [selectedStroke, selectedStrokeId]);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  useEffect(() => {
    if (selectedObjectId !== null && !selectedObject) {
      setSelectedObjectId(null);
    }
  }, [selectedObject, selectedObjectId]);

  const canManageWorkspace = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const canEdit = Boolean(canManageWorkspace && !selectedWhiteboard?.locked);

  const isViewer = board?.myRole === "VIEWER";

  const createStrokeMutation = useMutation({
    mutationFn: ({ request }: CreateStrokeMutationVariables) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return createWhiteboardWorkspaceStroke(boardId, selectedWhiteboardId, request);
    },

    onSuccess: (savedStroke, variables) => {
      saveErrorShownRef.current = false;

      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
        appendStrokeIfMissing(current, savedStroke),
      );

      registerStrokeForGesture(variables.gestureId, savedStroke.id);
    },

    onError: async () => {
      if (!saveErrorShownRef.current) {
        saveErrorShownRef.current = true;

        toast.error("일부 선을 저장하지 못했습니다. 저장된 화이트보드를 다시 동기화합니다.");
      }

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    },
  });

  const clearWhiteboardMutation = useMutation({
    mutationFn: () => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return clearWhiteboardWorkspace(boardId, selectedWhiteboardId);
    },

    onSuccess: () => {
      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, []);

      clearUndoHistory();

      toast.success("드로잉을 초기화했습니다.");
    },

    onError: () => {
      toast.error("화이트보드를 초기화하지 못했습니다.");
    },
  });

  const createObjectMutation = useMutation({
    mutationFn: ({
      x,
      y,
      type,
    }: {
      x: number;
      y: number;
      type: WhiteboardObjectType;
    }) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      const isSticky = type === "STICKY_NOTE";
      const isText = type === "TEXT";
      const isArrow = type === "ARROW";
      const isShape = type === "RECTANGLE" || type === "ELLIPSE" || isArrow;

      return createWhiteboardObject(boardId, selectedWhiteboardId, {
        clientObjectId: crypto.randomUUID(),
        type,
        x,
        y,
        width: isText ? TEXT_WIDTH : isSticky ? STICKY_WIDTH : isArrow ? ARROW_WIDTH : SHAPE_WIDTH,
        height: isText
          ? TEXT_HEIGHT
          : isSticky
            ? STICKY_HEIGHT
            : isArrow
              ? ARROW_HEIGHT
              : SHAPE_HEIGHT,
        rotation: 0,
        content: isText || isSticky ? "" : null,
        fillColor: isSticky ? stickyColor : isText || isArrow ? null : shapeFillColor,
        strokeColor: isSticky
          ? DEFAULT_STICKY_BORDER_COLOR
          : isText
            ? textColor
            : isShape
              ? shapeStrokeColor
              : null,
        strokeWidth: isSticky ? 1 : isText ? null : isShape ? shapeStrokeWidth : null,
        fontSize: isText ? textFontSize : isSticky ? stickyFontSize : null,
        propertiesJson: isArrow ? JSON.stringify({ arrowHead: "end" }) : null,
      });
    },

    onSuccess: (createdObject) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        (current = []) => {
          const exists = current.some((object) => object.id === createdObject.id);
          return exists
            ? current.map((object) => (object.id === createdObject.id ? createdObject : object))
            : [...current, createdObject];
        },
      );

      setSelectedStrokeId(null);
      setSelectedObjectId(createdObject.id);
      setTool("SELECT");

      const label: Record<WhiteboardObjectType, string> = {
        STICKY_NOTE: "스티키 노트",
        TEXT: "텍스트",
        RECTANGLE: "사각형",
        ELLIPSE: "원",
        ARROW: "화살표",
        IMAGE: "이미지",
      };
      toast.success(`${label[createdObject.type]}를 추가했습니다.`);
    },

    onError: () => {
      toast.error("화이트보드 항목을 추가하지 못했습니다.");
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return uploadWhiteboardImage(boardId, selectedWhiteboardId, file);
    },

    onSuccess: (createdObject) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        (current = []) => {
          const exists = current.some((object) => object.id === createdObject.id);
          return exists
            ? current.map((object) => (object.id === createdObject.id ? createdObject : object))
            : [...current, createdObject];
        },
      );

      setSelectedStrokeId(null);
      setSelectedObjectId(createdObject.id);
      setTool("SELECT");
      toast.success("이미지를 화이트보드에 추가했습니다.");
    },

    onError: () => {
      toast.error("이미지를 추가하지 못했습니다. PNG/JPG/GIF, 10MB 이하인지 확인해주세요.");
    },
  });

  const handleImageFileChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error("PNG, JPG, GIF 이미지만 추가할 수 있습니다.");
        return;
      }

      if (file.size <= 0 || file.size > MAX_IMAGE_FILE_BYTES) {
        toast.error("이미지는 10MB 이하만 추가할 수 있습니다.");
        return;
      }

      uploadImageMutation.mutate(file);
    },
    [uploadImageMutation],
  );

  const updateObjectMutation = useMutation({
    mutationFn: (object: WhiteboardObjectResponse) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return updateWhiteboardObject(boardId, selectedWhiteboardId, object.id, {
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
        content: object.content,
        fillColor: object.fillColor,
        strokeColor: object.strokeColor,
        strokeWidth: object.strokeWidth,
        fontSize: object.fontSize,
        zIndex: object.zIndex,
        propertiesJson: object.propertiesJson,
      });
    },

    onSuccess: (updatedObject) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        (current = []) =>
          current.map((object) => (object.id === updatedObject.id ? updatedObject : object)),
      );
    },

    onError: async () => {
      toast.error("화이트보드 항목을 저장하지 못했습니다.");
      await queryClient.invalidateQueries({ queryKey: whiteboardObjectsQueryKey });
    },
  });

  const deleteObjectMutation = useMutation({
    mutationFn: (objectId: number) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return deleteWhiteboardObject(boardId, selectedWhiteboardId, objectId);
    },

    onSuccess: (_, objectId) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        (current = []) => current.filter((object) => object.id !== objectId),
      );

      setSelectedObjectId((current) => (current === objectId ? null : current));
    },

    onError: async () => {
      toast.error("선택한 항목을 삭제하지 못했습니다.");
      await queryClient.invalidateQueries({ queryKey: whiteboardObjectsQueryKey });
    },
  });

  const createWhiteboardMutation = useMutation({
    mutationFn: ({ title, description }: { title: string; description: string | null }) =>
      createWhiteboard(boardId, {
        title,
        description,
      }),

    onSuccess: async (createdWhiteboard) => {
      await queryClient.invalidateQueries({
        queryKey: whiteboardsQueryKey,
      });

      clearUndoHistory();
      setSelectedWhiteboardId(createdWhiteboard.id);
      setCreateModalOpen(false);
      setWorkspaceTitle("");
      setWorkspaceDescription("");
      toast.success(`"${createdWhiteboard.title}" 화이트보드를 만들었습니다.`);
    },

    onError: () => {
      toast.error("화이트보드를 만들지 못했습니다.");
    },
  });

  const updateWhiteboardMutation = useMutation({
    mutationFn: async ({
      whiteboardId,
      title,
      description,
      backgroundColor,
      gridType,
      gridSize,
      gridOpacity,
      canvasWidth: nextCanvasWidth,
      canvasHeight: nextCanvasHeight,
    }: {
      whiteboardId: number;
      title: string;
      description: string | null;
      backgroundColor: string;
      gridType: WhiteboardGridType;
      gridSize: number;
      gridOpacity: number;
      canvasWidth: number;
      canvasHeight: number;
    }) => {
      await updateWhiteboard(boardId, whiteboardId, {
        title,
        description,
      });

      await updateWhiteboardAppearance(boardId, whiteboardId, {
        backgroundColor,
        gridEnabled: gridType !== "NONE",
        gridType,
        gridSize,
        gridOpacity,
      });

      return updateWhiteboardCanvasSize(boardId, whiteboardId, {
        width: nextCanvasWidth,
        height: nextCanvasHeight,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: whiteboardsQueryKey,
      });

      setSettingsModalOpen(false);
      toast.success("화이트보드 설정을 저장했습니다.");
    },

    onError: () => {
      toast.error("화이트보드 설정을 저장하지 못했습니다.");
    },
  });

  const updateCanvasSizeMutation = useMutation({
    mutationFn: ({ width, height }: { width: number; height: number }) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return updateWhiteboardCanvasSize(boardId, selectedWhiteboardId, { width, height });
    },

    onSuccess: (updatedWhiteboard) => {
      queryClient.setQueryData<WhiteboardWorkspaceResponse[]>(whiteboardsQueryKey, (current = []) =>
        current.map((whiteboard) =>
          whiteboard.id === updatedWhiteboard.id ? updatedWhiteboard : whiteboard,
        ),
      );
      setCanvasSizeDraft(null);
      toast.success(`캔버스 크기를 ${updatedWhiteboard.canvasWidth} × ${updatedWhiteboard.canvasHeight}(으)로 변경했습니다.`);
    },

    onError: () => {
      setCanvasSizeDraft(null);
      toast.error("캔버스 크기를 변경하지 못했습니다.");
    },
  });

  const updateLayerMetadataMutation = useMutation({
    mutationFn: ({
      objectId,
      layerName,
      visible,
    }: {
      objectId: number;
      layerName: string | null;
      visible: boolean;
    }) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return updateWhiteboardObjectLayerMetadata(
        boardId,
        selectedWhiteboardId,
        objectId,
        { layerName, visible },
      );
    },

    onSuccess: (updatedObject) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey, (current = []) =>
        current.map((object) => (object.id === updatedObject.id ? updatedObject : object)),
      );
    },

    onError: async () => {
      toast.error("레이어 설정을 변경하지 못했습니다.");
      await queryClient.invalidateQueries({ queryKey: whiteboardObjectsQueryKey });
    },
  });

  const reorderLayersMutation = useMutation({
    mutationFn: (objectIds: number[]) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return reorderWhiteboardObjectLayers(boardId, selectedWhiteboardId, { objectIds });
    },

    onSuccess: (reorderedObjects) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        reorderedObjects,
      );
    },

    onError: async () => {
      toast.error("레이어 순서를 변경하지 못했습니다.");
      await queryClient.invalidateQueries({ queryKey: whiteboardObjectsQueryKey });
    },
  });

  const updateWhiteboardLockMutation = useMutation({
    mutationFn: ({ whiteboardId, locked }: { whiteboardId: number; locked: boolean }) =>
      updateWhiteboardLock(boardId, whiteboardId, locked),

    onSuccess: (updatedWhiteboard) => {
      queryClient.setQueryData<WhiteboardWorkspaceResponse[]>(whiteboardsQueryKey, (current = []) =>
        current.map((whiteboard) =>
          whiteboard.id === updatedWhiteboard.id ? updatedWhiteboard : whiteboard,
        ),
      );

      if (updatedWhiteboard.locked) {
        cancelActiveDrawing();
        objectDragSessionRef.current = null;
        objectResizeSessionRef.current = null;
        setTool("HAND");
      }

      toast.success(updatedWhiteboard.locked ? "화이트보드를 잠갔습니다." : "화이트보드 잠금을 해제했습니다.");
    },

    onError: () => {
      toast.error("화이트보드 잠금 상태를 변경하지 못했습니다.");
    },
  });

  const updateObjectLockMutation = useMutation({
    mutationFn: ({ objectId, locked }: { objectId: number; locked: boolean }) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return updateWhiteboardObjectLock(boardId, selectedWhiteboardId, objectId, locked);
    },

    onSuccess: (updatedObject) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey, (current = []) =>
        current.map((object) => (object.id === updatedObject.id ? updatedObject : object)),
      );
      toast.success(updatedObject.locked ? "객체를 잠갔습니다." : "객체 잠금을 해제했습니다.");
    },

    onError: () => {
      toast.error("객체 잠금 상태를 변경하지 못했습니다.");
    },
  });

  const defaultWhiteboardMutation = useMutation({
    mutationFn: (whiteboardId: number) => setDefaultWhiteboard(boardId, whiteboardId),

    onSuccess: async (updatedWhiteboard) => {
      await queryClient.invalidateQueries({
        queryKey: whiteboardsQueryKey,
      });

      toast.success(`"${updatedWhiteboard.title}"을 기본 화이트보드로 지정했습니다.`);
    },

    onError: () => {
      toast.error("기본 화이트보드를 변경하지 못했습니다.");
    },
  });

  const reorderWhiteboardsMutation = useMutation({
    mutationFn: (whiteboardIds: number[]) =>
      reorderWhiteboards(boardId, {
        whiteboardIds,
      }),

    onSuccess: (reorderedWhiteboards) => {
      queryClient.setQueryData<WhiteboardWorkspaceResponse[]>(
        whiteboardsQueryKey,
        reorderedWhiteboards,
      );
    },

    onError: async () => {
      toast.error("화이트보드 순서를 변경하지 못했습니다.");
      await queryClient.invalidateQueries({
        queryKey: whiteboardsQueryKey,
      });
    },
  });

  const deleteWhiteboardMutation = useMutation({
    mutationFn: async (whiteboardId: number) => {
      /*
       * 현재 백엔드는 whiteboard_strokes가 Whiteboard를 참조하므로
       * 삭제 전에 현재 작업 공간의 Stroke를 안전하게 비웁니다.
       */
      await clearWhiteboardWorkspace(boardId, whiteboardId);
      await deleteWhiteboard(boardId, whiteboardId);
    },

    onSuccess: async () => {
      clearUndoHistory();
      setSelectedWhiteboardId(null);
      setDeleteDialogOpen(false);
      setSettingsModalOpen(false);

      await queryClient.invalidateQueries({
        queryKey: whiteboardsQueryKey,
      });

      toast.success("화이트보드를 삭제했습니다.");
    },

    onError: () => {
      toast.error("화이트보드를 삭제하지 못했습니다.");
    },
  });

  const enqueueStrokeSave = (stroke: DrawableStroke, gestureId: string) => {
    if (stroke.points.length === 0) {
      return;
    }

    const request: WhiteboardStrokeCreateRequest = {
      clientStrokeId: crypto.randomUUID(),

      tool: stroke.tool,

      color: stroke.color,

      lineWidth: stroke.lineWidth,

      points: stroke.points.map((point) => ({
        x: point.x,

        y: point.y,
      })),
    };

    setQueuedSaveCount((count) => count + 1);

    const saveTask = saveQueueRef.current.then(async () => {
      await createStrokeMutation.mutateAsync({
        request,
        gestureId,
      });
    });

    saveQueueRef.current = saveTask
      .catch(() => {
        // mutation onError에서 처리
      })
      .finally(() => {
        setQueuedSaveCount((count) => Math.max(0, count - 1));
      });
  };

  const cancelActiveDrawing = () => {
    const canvas = canvasRef.current;

    const pointerId = activePointerIdRef.current;
    const panPointerId = panSessionRef.current?.pointerId ?? null;

    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }

    if (canvas && panPointerId !== null && canvas.hasPointerCapture(panPointerId)) {
      canvas.releasePointerCapture(panPointerId);
    }

    const activeStroke = activeStrokeRef.current;

    if (activeStroke) {
      whiteboardConnectionRef.current?.sendLiveStrokeEnd(activeStroke.liveStrokeId);
    }

    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    panSessionRef.current = null;
    setIsPanning(false);
  };

  const handleDeleteWholeStroke = async (point: WhiteboardPoint) => {
    if (!canEdit || deletingStrokeId !== null || isUndoing) {
      return;
    }

    const targetStroke = findStrokeAtPoint(point, strokes);

    if (!targetStroke) {
      toast.info("지울 선을 클릭해주세요.");

      return;
    }

    setDeletingStrokeId(targetStroke.id);

    try {
      /*
       * 앞에서 저장 대기 중인 그림이 있으면
       * 먼저 서버 저장을 마칩니다.
       */
      await saveQueueRef.current;

      if (selectedWhiteboardId === null) {
        return;
      }

      await deleteWhiteboardWorkspaceStroke(boardId, selectedWhiteboardId, targetStroke.id);

      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
        current.filter((stroke) => stroke.id !== targetStroke.id),
      );

      removeStrokeFromUndoHistory(targetStroke.id);
      clearRedoHistory();
      setSelectedStrokeId((current) => (current === targetStroke.id ? null : current));
    } catch {
      toast.error("선을 삭제하지 못했습니다.");

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    } finally {
      setDeletingStrokeId(null);
    }
  };

  const handleDeleteSelectedStroke = useCallback(async () => {
    if (!canEdit || selectedStrokeId === null || deletingStrokeId !== null || isUndoing) {
      return;
    }

    if (selectedWhiteboardId === null) {
      return;
    }

    setDeletingStrokeId(selectedStrokeId);

    try {
      await saveQueueRef.current;

      await deleteWhiteboardWorkspaceStroke(boardId, selectedWhiteboardId, selectedStrokeId);

      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
        current.filter((stroke) => stroke.id !== selectedStrokeId),
      );

      removeStrokeFromUndoHistory(selectedStrokeId);
      clearRedoHistory();
      setSelectedStrokeId(null);
    } catch {
      toast.error("선택한 선을 삭제하지 못했습니다.");

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    } finally {
      setDeletingStrokeId(null);
    }
  }, [
    boardId,
    canEdit,
    clearRedoHistory,
    deletingStrokeId,
    isUndoing,
    queryClient,
    removeStrokeFromUndoHistory,
    selectedStrokeId,
    selectedWhiteboardId,
    whiteboardQueryKey,
  ]);

  const handleDeleteSelectedObject = useCallback(async () => {
    if (
      !canEdit ||
      selectedObjectId === null ||
      deleteObjectMutation.isPending ||
      selectedObject?.locked
    ) {
      return;
    }

    setDeletingObjectId(selectedObjectId);

    try {
      await deleteObjectMutation.mutateAsync(selectedObjectId);
    } finally {
      setDeletingObjectId(null);
    }
  }, [canEdit, deleteObjectMutation, selectedObject, selectedObjectId]);

  const updateObjectInCache = useCallback(
    (objectId: number, updater: (object: WhiteboardObjectResponse) => WhiteboardObjectResponse) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        (current = []) =>
          current.map((object) => (object.id === objectId ? updater(object) : object)),
      );
    },
    [queryClient, whiteboardObjectsQueryKey],
  );

  const handleObjectContentChange = useCallback(
    (objectId: number, content: string) => {
      /*
       * textarea 자체는 local draft만 변경합니다.
       * 그래서 React Query 캐시가 입력 도중 value를 재주입하지 않아
       * 기존 한글 IME 중복 입력 문제를 그대로 방지할 수 있습니다.
       */
      setObjectDrafts((current) => ({
        ...current,
        [objectId]: content,
      }));

      const currentObject =
        queryClient
          .getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey)
          ?.find((object) => object.id === objectId) ?? null;

      if (!canEdit || currentObject?.locked || composingObjectIdsRef.current.has(objectId)) {
        return;
      }

      /*
       * 조합 중이 아닌 완성된 문자열은 DB 저장을 기다리지 않고
       * WebSocket으로 상대 사용자에게 즉시 전파합니다.
       *
       * 실제 영구 저장은 blur 때 기존 REST PATCH로 한 번 수행합니다.
       */
      whiteboardConnectionRef.current?.sendLiveEdit(objectId, content);
    },
    [canEdit, queryClient, whiteboardObjectsQueryKey],
  );

  const handleObjectContentBlur = useCallback(
    (objectId: number, content: string) => {
      composingObjectIdsRef.current.delete(objectId);

      const currentObjects =
        queryClient.getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey) ?? [];
      const object = currentObjects.find((item) => item.id === objectId);

      setObjectDrafts((current) => {
        if (!(objectId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[objectId];

        return next;
      });

      if (!object || !canEdit || object.locked) {
        return;
      }

      /*
       * composition이 끝나자마자 blur가 발생하는 경우까지 포함해
       * 상대 화면에 최종 문자열을 한 번 더 보장합니다.
       */
      whiteboardConnectionRef.current?.sendLiveEdit(objectId, content);

      const updatedObject: WhiteboardObjectResponse = {
        ...object,
        content,
      };

      /*
       * blur 직후 draft를 제거해도 화면 내용이 되돌아가지 않도록
       * 캐시는 최종 문자열로 한 번만 동기화합니다.
       */
      updateObjectInCache(objectId, () => updatedObject);
      updateObjectMutation.mutate(updatedObject);
    },
    [canEdit, queryClient, updateObjectInCache, updateObjectMutation, whiteboardObjectsQueryKey],
  );

  const handleObjectDragStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, object: WhiteboardObjectResponse) => {
      if (!canEdit || tool !== "SELECT" || object.locked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      setSelectedStrokeId(null);
      setSelectedObjectId(object.id);

      objectDragSessionRef.current = {
        pointerId: event.pointerId,
        objectId: object.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: object.x,
        startY: object.y,
      };
    },
    [canEdit, tool],
  );

  const handleObjectDragMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = objectDragSessionRef.current;

      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      const currentObjects =
        queryClient.getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey) ?? [];
      const object = currentObjects.find((item) => item.id === session.objectId);

      if (!object) {
        return;
      }

      const deltaX = (event.clientX - session.startClientX) / zoom;
      const deltaY = (event.clientY - session.startClientY) / zoom;
      const nextX = Math.min(canvasWidth - object.width, Math.max(0, session.startX + deltaX));
      const nextY = Math.min(canvasHeight - object.height, Math.max(0, session.startY + deltaY));

      updateObjectInCache(object.id, (current) => ({
        ...current,
        x: nextX,
        y: nextY,
      }));

      /*
       * 상대 화면은 드래그 종료를 기다리지 않고 따라오게 합니다.
       * pointermove 자체는 매 프레임 발생하므로 전송만 약 30fps로 제한합니다.
       */
      const now = performance.now();
      const lastSentAt = lastLiveMoveSentAtRef.current.get(object.id) ?? 0;

      if (now - lastSentAt >= 33) {
        lastLiveMoveSentAtRef.current.set(object.id, now);
        whiteboardConnectionRef.current?.sendLiveMove(object.id, nextX, nextY);
      }
    },
    [canvasHeight, canvasWidth, queryClient, updateObjectInCache, whiteboardObjectsQueryKey, zoom],
  );

  const finishObjectDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = objectDragSessionRef.current;

      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      objectDragSessionRef.current = null;

      const currentObjects =
        queryClient.getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey) ?? [];
      const object = currentObjects.find((item) => item.id === session.objectId);

      if (object) {
        /*
         * throttle 사이에 손을 놓았어도 상대 화면이 최종 좌표를
         * 즉시 받도록 마지막 위치를 한 번 더 전송합니다.
         */
        whiteboardConnectionRef.current?.sendLiveMove(object.id, object.x, object.y);
        lastLiveMoveSentAtRef.current.delete(object.id);

        /*
         * 실시간 전파와 별도로 최종 위치는 REST PATCH로 영구 저장합니다.
         */
        updateObjectMutation.mutate(object);
      }
    },
    [queryClient, updateObjectMutation, whiteboardObjectsQueryKey],
  );

  const getObjectMinimumSize = useCallback((object: WhiteboardObjectResponse) => {
    if (object.type === "STICKY_NOTE") {
      return { width: 140, height: 90 };
    }

    if (object.type === "TEXT") {
      return { width: 80, height: 40 };
    }

    if (object.type === "ARROW") {
      return { width: 80, height: 36 };
    }

    if (object.type === "IMAGE") {
      return { width: 80, height: 60 };
    }

    return { width: 50, height: 50 };
  }, []);

  const handleObjectResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, object: WhiteboardObjectResponse) => {
      if (!canEdit || tool !== "SELECT" || object.locked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setSelectedStrokeId(null);
      setSelectedObjectId(object.id);

      objectResizeSessionRef.current = {
        pointerId: event.pointerId,
        objectId: object.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startWidth: object.width,
        startHeight: object.height,
      };
    },
    [canEdit, tool],
  );

  const handleObjectResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = objectResizeSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      const currentObjects =
        queryClient.getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey) ?? [];
      const object = currentObjects.find((item) => item.id === session.objectId);
      if (!object || object.locked) {
        return;
      }

      const minimum = getObjectMinimumSize(object);
      const deltaX = (event.clientX - session.startClientX) / zoom;
      const deltaY = (event.clientY - session.startClientY) / zoom;

      let nextWidth: number;
      let nextHeight: number;

      if (object.type === "IMAGE") {
        const aspectRatio = Math.max(0.01, session.startWidth / session.startHeight);
        const widthScale = 1 + deltaX / Math.max(1, session.startWidth);
        const heightScale = 1 + deltaY / Math.max(1, session.startHeight);
        let scale = Math.abs(deltaX) >= Math.abs(deltaY) ? widthScale : heightScale;

        const minimumScale = Math.max(
          minimum.width / session.startWidth,
          minimum.height / session.startHeight,
        );
        const maximumScale = Math.min(
          (canvasWidth - object.x) / session.startWidth,
          (canvasHeight - object.y) / session.startHeight,
        );

        scale = Math.min(maximumScale, Math.max(minimumScale, scale));
        nextWidth = session.startWidth * scale;
        nextHeight = nextWidth / aspectRatio;
      } else {
        nextWidth = Math.min(
          canvasWidth - object.x,
          Math.max(minimum.width, session.startWidth + deltaX),
        );
        nextHeight = Math.min(
          canvasHeight - object.y,
          Math.max(minimum.height, session.startHeight + deltaY),
        );
      }

      updateObjectInCache(object.id, (current) => ({
        ...current,
        width: nextWidth,
        height: nextHeight,
      }));

      const now = performance.now();
      const lastSentAt = lastLiveResizeSentAtRef.current.get(object.id) ?? 0;
      if (now - lastSentAt >= LIVE_OBJECT_SEND_INTERVAL_MS) {
        lastLiveResizeSentAtRef.current.set(object.id, now);
        whiteboardConnectionRef.current?.sendLiveResize(object.id, nextWidth, nextHeight);
      }
    },
    [canvasHeight, canvasWidth, getObjectMinimumSize, queryClient, updateObjectInCache, whiteboardObjectsQueryKey, zoom],
  );

  const finishObjectResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = objectResizeSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      objectResizeSessionRef.current = null;
      const currentObjects =
        queryClient.getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey) ?? [];
      const object = currentObjects.find((item) => item.id === session.objectId);

      if (object && !object.locked) {
        whiteboardConnectionRef.current?.sendLiveResize(object.id, object.width, object.height);
        lastLiveResizeSentAtRef.current.delete(object.id);
        updateObjectMutation.mutate(object);
      }
    },
    [queryClient, updateObjectMutation, whiteboardObjectsQueryKey],
  );

  const applySelectedObjectStyle = useCallback(
    (patch: Partial<Pick<WhiteboardObjectResponse, "fillColor" | "strokeColor" | "strokeWidth" | "fontSize">>) => {
      if (!canEdit || !selectedObject || selectedObject.locked) {
        return;
      }

      const updated = { ...selectedObject, ...patch };
      updateObjectInCache(selectedObject.id, () => updated);
      updateObjectMutation.mutate(updated);
    },
    [canEdit, selectedObject, updateObjectInCache, updateObjectMutation],
  );

  const handleCanvasResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canEdit || updateCanvasSizeMutation.isPending) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      canvasResizeSessionRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startWidth: canvasWidth,
        startHeight: canvasHeight,
      };
    },
    [canEdit, canvasHeight, canvasWidth, updateCanvasSizeMutation.isPending],
  );

  const handleCanvasResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = canvasResizeSessionRef.current;

      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      const nextWidth = Math.min(
        MAX_CANVAS_WIDTH,
        Math.max(
          MIN_CANVAS_WIDTH,
          Math.round(session.startWidth + (event.clientX - session.startClientX) / zoom),
        ),
      );
      const nextHeight = Math.min(
        MAX_CANVAS_HEIGHT,
        Math.max(
          MIN_CANVAS_HEIGHT,
          Math.round(session.startHeight + (event.clientY - session.startClientY) / zoom),
        ),
      );

      setCanvasSizeDraft({ width: nextWidth, height: nextHeight });
    },
    [zoom],
  );

  const finishCanvasResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = canvasResizeSessionRef.current;

      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      canvasResizeSessionRef.current = null;

      const size = canvasSizeDraft ?? { width: canvasWidth, height: canvasHeight };
      updateCanvasSizeMutation.mutate(size);
    },
    [canvasHeight, canvasSizeDraft, canvasWidth, updateCanvasSizeMutation],
  );

  const commitLayerRename = useCallback(
    (object: WhiteboardObjectResponse) => {
      if (!canEdit) {
        return;
      }

      const normalized = layerRenameDraft.trim();
      updateLayerMetadataMutation.mutate({
        objectId: object.id,
        layerName: normalized || null,
        visible: object.visible !== false,
      });
      setLayerRenameId(null);
      setLayerRenameDraft("");
    },
    [canEdit, layerRenameDraft, updateLayerMetadataMutation],
  );

  const handleLayerDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, targetId: number) => {
      event.preventDefault();

      if (!canEdit || draggedLayerId === null || draggedLayerId === targetId) {
        setDraggedLayerId(null);
        return;
      }

      const topFirst = [...orderedLayers];
      const sourceIndex = topFirst.findIndex((object) => object.id === draggedLayerId);
      const targetIndex = topFirst.findIndex((object) => object.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) {
        setDraggedLayerId(null);
        return;
      }

      const [moved] = topFirst.splice(sourceIndex, 1);
      if (!moved) {
        setDraggedLayerId(null);
        return;
      }

      topFirst.splice(targetIndex, 0, moved);
      setDraggedLayerId(null);

      // 서버 API는 낮은 zIndex(맨 뒤) → 높은 zIndex(맨 앞) 순서를 받습니다.
      reorderLayersMutation.mutate(topFirst.map((object) => object.id).reverse());
    },
    [canEdit, draggedLayerId, orderedLayers, reorderLayersMutation],
  );

  const handleUndo = useCallback(async () => {
    if (!canEdit || isUndoing || isRedoing) {
      return;
    }

    if (activeStrokeRef.current) {
      return;
    }

    setIsUndoing(true);

    try {
      await saveQueueRef.current;

      const history = undoHistoryRef.current;
      const gesture = history[history.length - 1];

      if (!gesture || gesture.strokeIds.length === 0 || selectedWhiteboardId === null) {
        return;
      }

      const currentStrokes =
        queryClient.getQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey) ?? [];

      const snapshot = gesture.strokeIds
        .map((strokeId) => currentStrokes.find((stroke) => stroke.id === strokeId))
        .filter((stroke): stroke is WhiteboardStrokeResponse => Boolean(stroke));

      undoHistoryRef.current = history.slice(0, -1);
      syncUndoGestureCount();

      for (const strokeId of [...gesture.strokeIds].reverse()) {
        await deleteWhiteboardWorkspaceStroke(boardId, selectedWhiteboardId, strokeId);

        queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
          current.filter((stroke) => stroke.id !== strokeId),
        );
      }

      if (snapshot.length > 0) {
        redoHistoryRef.current.push({
          strokes: snapshot,
        });
        syncRedoGestureCount();
      }

      setSelectedStrokeId(null);
    } catch {
      toast.error("실행 취소 중 문제가 발생했습니다. 화이트보드를 다시 동기화합니다.");

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    } finally {
      setIsUndoing(false);
    }
  }, [
    boardId,
    canEdit,
    isRedoing,
    isUndoing,
    queryClient,
    selectedWhiteboardId,
    syncRedoGestureCount,
    syncUndoGestureCount,
    whiteboardQueryKey,
  ]);

  const handleRedo = useCallback(async () => {
    if (!canEdit || isUndoing || isRedoing || selectedWhiteboardId === null) {
      return;
    }

    if (activeStrokeRef.current) {
      return;
    }

    const redoGesture = redoHistoryRef.current[redoHistoryRef.current.length - 1];

    if (!redoGesture || redoGesture.strokes.length === 0) {
      return;
    }

    setIsRedoing(true);

    try {
      await saveQueueRef.current;

      const restoredStrokes: WhiteboardStrokeResponse[] = [];

      for (const stroke of redoGesture.strokes) {
        const restored = await createWhiteboardWorkspaceStroke(boardId, selectedWhiteboardId, {
          clientStrokeId: crypto.randomUUID(),
          tool: stroke.tool,
          color: stroke.color,
          lineWidth: stroke.lineWidth,
          points: stroke.points.map((point) => ({
            x: point.x,
            y: point.y,
          })),
        });

        restoredStrokes.push(restored);

        queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
          appendStrokeIfMissing(current, restored),
        );
      }

      redoHistoryRef.current = redoHistoryRef.current.slice(0, -1);
      syncRedoGestureCount();

      if (restoredStrokes.length > 0) {
        undoHistoryRef.current.push({
          gestureId: crypto.randomUUID(),
          strokeIds: restoredStrokes.map((stroke) => stroke.id),
        });
        syncUndoGestureCount();
      }
    } catch {
      toast.error("다시 실행 중 문제가 발생했습니다. 화이트보드를 다시 동기화합니다.");

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    } finally {
      setIsRedoing(false);
    }
  }, [
    boardId,
    canEdit,
    isRedoing,
    isUndoing,
    queryClient,
    selectedWhiteboardId,
    syncRedoGestureCount,
    syncUndoGestureCount,
    whiteboardQueryKey,
  ]);

  useEffect(() => {
    if (!isValidBoardId || selectedWhiteboardId === null) {
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");

    const currentStrokeQueryKey = [
      "whiteboard",
      boardId,
      selectedWhiteboardId,
      "strokes",
    ] as const;

    const currentObjectQueryKey = [
      "whiteboard",
      boardId,
      selectedWhiteboardId,
      "objects",
    ] as const;

    remoteLiveSequenceRef.current.clear();
    lastLiveMoveSentAtRef.current.clear();

    for (const timerId of remoteLiveStrokeRemovalTimersRef.current.values()) {
      window.clearTimeout(timerId);
    }

    remoteLiveStrokeRemovalTimersRef.current.clear();
    setRemoteLiveStrokes({});

    const connection = connectWhiteboardWebSocket({
      boardId,
      whiteboardId: selectedWhiteboardId,

      onConnectionStateChange: setConnectionState,

      onEvent: (event) => {
        if (event.type === "WORKSPACE_UPDATED" && event.workspace) {
          const updatedWorkspace = event.workspace;
          queryClient.setQueryData<WhiteboardWorkspaceResponse[]>(whiteboardsQueryKey, (current = []) =>
            current.map((whiteboard) =>
              whiteboard.id === updatedWorkspace.id ? updatedWorkspace : whiteboard,
            ),
          );

          if (updatedWorkspace.locked) {
            const canvas = canvasRef.current;
            const pointerId = activePointerIdRef.current;
            if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
              canvas.releasePointerCapture(pointerId);
            }
            activeStrokeRef.current = null;
            activePointerIdRef.current = null;
            objectDragSessionRef.current = null;
            objectResizeSessionRef.current = null;
          }
          return;
        }

        if (event.type === "CURSOR_MOVED" && event.cursor) {
          const cursor = event.cursor;
          setRemoteCursors((current) => ({
            ...current,
            [cursor.sourceClientId]: {
              ...cursor,
              updatedAt: Date.now(),
            },
          }));
          return;
        }

        if (
          (event.type === "STROKE_LIVE_START" ||
            event.type === "STROKE_LIVE_APPEND" ||
            event.type === "STROKE_LIVE_END") &&
          event.liveStroke
        ) {
          const liveStroke = event.liveStroke;
          const remoteKey = getRemoteLiveStrokeKey(
            liveStroke.sourceClientId,
            liveStroke.liveStrokeId,
          );
          const sequenceKey = `${liveStroke.sourceClientId}:STROKE:${liveStroke.liveStrokeId}`;
          const lastSequence = remoteLiveSequenceRef.current.get(sequenceKey) ?? -1;

          if (liveStroke.sequence <= lastSequence) {
            return;
          }

          remoteLiveSequenceRef.current.set(sequenceKey, liveStroke.sequence);

          if (event.type === "STROKE_LIVE_START") {
            const oldTimer = remoteLiveStrokeRemovalTimersRef.current.get(remoteKey);

            if (oldTimer !== undefined) {
              window.clearTimeout(oldTimer);
              remoteLiveStrokeRemovalTimersRef.current.delete(remoteKey);
            }

            if (
              liveStroke.tool === null ||
              liveStroke.color === null ||
              liveStroke.lineWidth === null ||
              liveStroke.points.length === 0
            ) {
              return;
            }

            setRemoteLiveStrokes((current) => ({
              ...current,
              [remoteKey]: {
                tool: liveStroke.tool as WhiteboardTool,
                color: liveStroke.color as string,
                lineWidth: liveStroke.lineWidth as number,
                points: liveStroke.points,
              },
            }));

            return;
          }

          if (event.type === "STROKE_LIVE_APPEND") {
            if (liveStroke.points.length === 0) {
              return;
            }

            setRemoteLiveStrokes((current) => {
              const existing = current[remoteKey];

              if (!existing) {
                return current;
              }

              return {
                ...current,
                [remoteKey]: {
                  ...existing,
                  points: [...existing.points, ...liveStroke.points],
                },
              };
            });

            return;
          }

          if (event.type === "STROKE_LIVE_END") {
            const oldTimer = remoteLiveStrokeRemovalTimersRef.current.get(remoteKey);

            if (oldTimer !== undefined) {
              window.clearTimeout(oldTimer);
            }

            const timerId = window.setTimeout(() => {
              setRemoteLiveStrokes((current) => {
                if (!(remoteKey in current)) {
                  return current;
                }

                const next = { ...current };
                delete next[remoteKey];
                return next;
              });

              remoteLiveStrokeRemovalTimersRef.current.delete(remoteKey);
              remoteLiveSequenceRef.current.delete(sequenceKey);
            }, LIVE_STROKE_END_GRACE_MS);

            remoteLiveStrokeRemovalTimersRef.current.set(remoteKey, timerId);
            return;
          }
        }

        if (event.type === "STROKE_CREATED" && event.stroke) {
          queryClient.setQueryData<WhiteboardStrokeResponse[]>(
            currentStrokeQueryKey,
            (current = []) =>
            appendStrokeIfMissing(current, event.stroke as WhiteboardStrokeResponse),
          );

          return;
        }

        if (event.type === "STROKE_DELETED" && event.strokeId !== null) {
          const deletedStrokeId = event.strokeId;

          queryClient.setQueryData<WhiteboardStrokeResponse[]>(
            currentStrokeQueryKey,
            (current = []) => current.filter((stroke) => stroke.id !== deletedStrokeId),
          );

          removeStrokeFromUndoHistory(deletedStrokeId);

          return;
        }

        if (event.type === "CLEARED") {
          const canvas = canvasRef.current;
          const pointerId = activePointerIdRef.current;

          if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId);
          }

          activeStrokeRef.current = null;
          activePointerIdRef.current = null;

          for (const timerId of remoteLiveStrokeRemovalTimersRef.current.values()) {
            window.clearTimeout(timerId);
          }

          remoteLiveStrokeRemovalTimersRef.current.clear();
          setRemoteLiveStrokes({});

          queryClient.setQueryData<WhiteboardStrokeResponse[]>(currentStrokeQueryKey, []);
          clearUndoHistory();
          return;
        }

        if (event.type === "OBJECT_CREATED" && event.object) {
          const createdObject = event.object;

          queryClient.setQueryData<WhiteboardObjectResponse[]>(
            currentObjectQueryKey,
            (current = []) => {
              const exists = current.some((object) => object.id === createdObject.id);

              if (exists) {
                return current.map((object) =>
                  object.id === createdObject.id ? createdObject : object,
                );
              }

              return [...current, createdObject].sort(
                (left, right) => left.zIndex - right.zIndex || left.id - right.id,
              );
            },
          );

          return;
        }

        if (event.type === "OBJECT_UPDATED" && event.object) {
          const updatedObject = event.object;

          queryClient.setQueryData<WhiteboardObjectResponse[]>(
            currentObjectQueryKey,
            (current = []) => {
              const exists = current.some((object) => object.id === updatedObject.id);

              if (!exists) {
                return [...current, updatedObject].sort(
                  (left, right) => left.zIndex - right.zIndex || left.id - right.id,
                );
              }

              return current
                .map((object) => (object.id === updatedObject.id ? updatedObject : object))
                .sort((left, right) => left.zIndex - right.zIndex || left.id - right.id);
            },
          );

          return;
        }

        if (
          (event.type === "OBJECT_LIVE_EDIT" ||
            event.type === "OBJECT_LIVE_MOVE" ||
            event.type === "OBJECT_LIVE_RESIZE") &&
          event.liveObject
        ) {
          const liveObject = event.liveObject;
          const sequenceKey = `${liveObject.sourceClientId}:${event.type}:${liveObject.objectId}`;
          const lastSequence = remoteLiveSequenceRef.current.get(sequenceKey) ?? -1;

          /*
           * 같은 송신자의 오래된 패킷이 뒤늦게 도착하면 무시합니다.
           */
          if (liveObject.sequence <= lastSequence) {
            return;
          }

          remoteLiveSequenceRef.current.set(sequenceKey, liveObject.sequence);

          if (event.type === "OBJECT_LIVE_EDIT" && liveObject.content !== null) {
            queryClient.setQueryData<WhiteboardObjectResponse[]>(
              currentObjectQueryKey,
              (current = []) =>
                current.map((object) =>
                  object.id === liveObject.objectId
                    ? {
                        ...object,
                        content: liveObject.content as string,
                      }
                    : object,
                ),
            );

            return;
          }

          if (
            event.type === "OBJECT_LIVE_MOVE" &&
            liveObject.x !== null &&
            liveObject.y !== null
          ) {
            queryClient.setQueryData<WhiteboardObjectResponse[]>(
              currentObjectQueryKey,
              (current = []) =>
                current.map((object) =>
                  object.id === liveObject.objectId
                    ? {
                        ...object,
                        x: liveObject.x as number,
                        y: liveObject.y as number,
                      }
                    : object,
                ),
            );

            return;
          }
     

          if (
            event.type === "OBJECT_LIVE_RESIZE" &&
            liveObject.width !== null &&
            liveObject.height !== null
          ) {
            queryClient.setQueryData<WhiteboardObjectResponse[]>(
              currentObjectQueryKey,
              (current = []) =>
                current.map((object) =>
                  object.id === liveObject.objectId
                    ? {
                        ...object,
                        width: liveObject.width as number,
                        height: liveObject.height as number,
                      }
                    : object,
                ),
            );

            return;
          }
        }

        if (event.type === "OBJECT_DELETED" && event.objectId !== null) {
          const deletedObjectId = event.objectId;

          queryClient.setQueryData<WhiteboardObjectResponse[]>(
            currentObjectQueryKey,
            (current = []) => current.filter((object) => object.id !== deletedObjectId),
          );

          setSelectedObjectId((current) => (current === deletedObjectId ? null : current));

          setObjectDrafts((current) => {
            if (!(deletedObjectId in current)) {
              return current;
            }

            const next = { ...current };
            delete next[deletedObjectId];
            return next;
          });

          composingObjectIdsRef.current.delete(deletedObjectId);
        }
      },

      onError: (error) => {
        console.error("[Whiteboard WebSocket]", error);
      },
    });

    whiteboardConnectionRef.current = connection;

    return () => {
      if (whiteboardConnectionRef.current === connection) {
        whiteboardConnectionRef.current = null;
      }

      remoteLiveSequenceRef.current.clear();
      lastLiveMoveSentAtRef.current.clear();
      lastLiveResizeSentAtRef.current.clear();
      setRemoteCursors({});

      for (const timerId of remoteLiveStrokeRemovalTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }

      remoteLiveStrokeRemovalTimersRef.current.clear();
      setRemoteLiveStrokes({});
      connection.disconnect();
    };
  }, [
    boardId,
    clearUndoHistory,
    isValidBoardId,
    queryClient,
    removeStrokeFromUndoHistory,
    selectedWhiteboardId,
  ]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const threshold = Date.now() - REMOTE_CURSOR_TTL_MS;
      setRemoteCursors((current) => {
        const entries = Object.entries(current).filter(([, cursor]) => cursor.updatedAt >= threshold);
        if (entries.length === Object.keys(current).length) {
          return current;
        }
        return Object.fromEntries(entries);
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      drawStroke(context, stroke);
    }

    for (const liveStroke of Object.values(remoteLiveStrokes)) {
      drawStroke(context, liveStroke);
    }

    /*
     * 원격 LIVE 이벤트 때문에 Canvas 전체가 다시 그려지는 순간에도
     * 내가 아직 그리고 있는 로컬 Stroke가 사라지지 않도록 복원합니다.
     */
    const activeStroke = activeStrokeRef.current;

    if (activeStroke) {
      drawStroke(context, activeStroke);
    }

    if (selectedStroke) {
      drawSelectionOutline(context, selectedStroke);
    }
  }, [canvasHeight, canvasWidth, remoteLiveStrokes, selectedStroke, strokes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) {
        return;
      }

      const commandKey = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const isUndoShortcut = commandKey && !event.shiftKey && key === "z";
      const isRedoShortcut =
        (commandKey && event.shiftKey && key === "z") || (commandKey && key === "y");
      const isDeleteShortcut = event.key === "Delete" || event.key === "Backspace";

      if (isUndoShortcut) {
        if (!canEdit || undoHistoryRef.current.length === 0 || activeStrokeRef.current) {
          return;
        }

        event.preventDefault();
        void handleUndo();
        return;
      }

      if (isRedoShortcut) {
        if (!canEdit || redoHistoryRef.current.length === 0 || activeStrokeRef.current) {
          return;
        }

        event.preventDefault();
        void handleRedo();
        return;
      }

      if (isDeleteShortcut && tool === "SELECT") {
        if (!canEdit) {
          return;
        }

        if (selectedObjectId !== null) {
          event.preventDefault();
          void handleDeleteSelectedObject();
          return;
        }

        if (selectedStrokeId !== null) {
          event.preventDefault();
          void handleDeleteSelectedStroke();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canEdit,
    handleDeleteSelectedObject,
    handleDeleteSelectedStroke,
    handleRedo,
    handleUndo,
    selectedObjectId,
    selectedStrokeId,
    tool,
  ]);

  const getCurrentStyle = () => ({
    color: tool === "PEN" ? penColor : "#FFFFFF",

    lineWidth: tool === "PEN" ? penLineWidth : eraserLineWidth,
  });

  const changeZoom = useCallback(
    (nextValue: number) => {
      const nextZoom = clampZoom(nextValue);
      const viewport = viewportRef.current;

      if (!viewport || nextZoom === zoom) {
        setZoom(nextZoom);
        return;
      }

      const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
      const centerY = viewport.scrollTop + viewport.clientHeight / 2;
      const ratio = nextZoom / zoom;

      setZoom(nextZoom);

      window.requestAnimationFrame(() => {
        viewport.scrollLeft = centerX * ratio - viewport.clientWidth / 2;
        viewport.scrollTop = centerY * ratio - viewport.clientHeight / 2;
      });
    },
    [zoom],
  );

  const fitCanvasToViewport = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const horizontalPadding = 48;
    const verticalPadding = 48;
    const widthScale = (viewport.clientWidth - horizontalPadding) / canvasWidth;
    const heightScale = (viewport.clientHeight - verticalPadding) / canvasHeight;

    changeZoom(Math.min(1, widthScale, heightScale));

    window.requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }, [canvasHeight, canvasWidth, changeZoom]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      !isValidBoardId ||
      isStrokesLoading ||
      isStrokesError ||
      isUndoing ||
      isRedoing ||
      deletingStrokeId !== null
    ) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    if (tool === "HAND") {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      canvas.setPointerCapture(event.pointerId);
      panSessionRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startScrollLeft: viewport.scrollLeft,
        startScrollTop: viewport.scrollTop,
      };
      setIsPanning(true);
      return;
    }

    const firstPoint = getCanvasPoint(canvas, event);

    if (tool === "SELECT") {
      const targetStroke = findStrokeAtPoint(firstPoint, strokes);
      setSelectedObjectId(null);
      setSelectedStrokeId(targetStroke?.id ?? null);
      return;
    }

    if (!canEdit) {
      return;
    }

    if (tool === "STICKY") {
      const x = Math.min(canvasWidth - STICKY_WIDTH, Math.max(0, firstPoint.x - STICKY_WIDTH / 2));
      const y = Math.min(
        canvasHeight - STICKY_HEIGHT,
        Math.max(0, firstPoint.y - STICKY_HEIGHT / 2),
      );

      setSelectedStrokeId(null);
      setSelectedObjectId(null);
      createObjectMutation.mutate({ x, y, type: "STICKY_NOTE" });
      return;
    }

    if (tool === "TEXT") {
      const x = Math.min(canvasWidth - TEXT_WIDTH, Math.max(0, firstPoint.x - TEXT_WIDTH / 2));
      const y = Math.min(
        canvasHeight - TEXT_HEIGHT,
        Math.max(0, firstPoint.y - TEXT_HEIGHT / 2),
      );

      setSelectedStrokeId(null);
      setSelectedObjectId(null);
      createObjectMutation.mutate({ x, y, type: "TEXT" });
      return;
    }

    if (tool === "RECTANGLE" || tool === "ELLIPSE" || tool === "ARROW") {
      const width = tool === "ARROW" ? ARROW_WIDTH : SHAPE_WIDTH;
      const height = tool === "ARROW" ? ARROW_HEIGHT : SHAPE_HEIGHT;
      const x = Math.min(canvasWidth - width, Math.max(0, firstPoint.x - width / 2));
      const y = Math.min(canvasHeight - height, Math.max(0, firstPoint.y - height / 2));

      setSelectedStrokeId(null);
      setSelectedObjectId(null);
      createObjectMutation.mutate({ x, y, type: tool });
      return;
    }

    /*
     * 선 지우기 모드는 그림을 시작하지 않고
     * 클릭한 위치에서 가장 가까운 PEN Stroke를 찾아
     * 전체 삭제합니다.
     */
    if (tool === "ERASER" && eraserMode === "STROKE") {
      void handleDeleteWholeStroke(firstPoint);

      return;
    }

    if (tool !== "PEN" && tool !== "ERASER") {
      return;
    }

    setSelectedStrokeId(null);
    setSelectedObjectId(null);

    const { color, lineWidth } = getCurrentStyle();

    canvas.setPointerCapture(event.pointerId);

    activePointerIdRef.current = event.pointerId;

    const gestureId = crypto.randomUUID();
    const liveStrokeId = crypto.randomUUID();
    const now = performance.now();

    activeStrokeRef.current = {
      gestureId,

      tool,

      color,

      lineWidth,

      points: [firstPoint],

      hasSavedChunk: false,

      liveStrokeId,

      lastLiveSentAt: now,

      lastLiveSentPoint: firstPoint,
    };

    whiteboardConnectionRef.current?.sendLiveStrokeStart(
      liveStrokeId,
      tool,
      color,
      lineWidth,
      [firstPoint],
    );
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const cursorCanvas = canvasRef.current;
    const cursorNow = performance.now();

    if (
      cursorCanvas &&
      cursorNow - lastCursorSentAtRef.current >= LIVE_CURSOR_SEND_INTERVAL_MS
    ) {
      const cursorPoint = getCanvasPoint(cursorCanvas, event);
      lastCursorSentAtRef.current = cursorNow;
      whiteboardConnectionRef.current?.sendCursor(cursorPoint.x, cursorPoint.y);
    }

    const panSession = panSessionRef.current;

    if (panSession && panSession.pointerId === event.pointerId) {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const deltaX = event.clientX - panSession.startClientX;
      const deltaY = event.clientY - panSession.startClientY;

      viewport.scrollLeft = panSession.startScrollLeft - deltaX;
      viewport.scrollTop = panSession.startScrollTop - deltaY;
      return;
    }

    if (!canEdit) {
      return;
    }

    const activeStroke = activeStrokeRef.current;

    if (!activeStroke) {
      return;
    }

    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const previousPoint = activeStroke.points[activeStroke.points.length - 1];

    if (!previousPoint) {
      return;
    }

    const currentPoint = getCanvasPoint(canvas, event);

    if (getPointDistance(previousPoint, currentPoint) < MIN_POINT_DISTANCE) {
      return;
    }

    drawSegment(
      context,
      previousPoint,
      currentPoint,
      activeStroke.tool,
      activeStroke.color,
      activeStroke.lineWidth,
    );

    const nextPoints = [...activeStroke.points, currentPoint];
    const now = performance.now();

    let nextActiveStroke: ActiveStroke = {
      ...activeStroke,
      points: nextPoints,
    };

    if (now - activeStroke.lastLiveSentAt >= LIVE_STROKE_SEND_INTERVAL_MS) {
      whiteboardConnectionRef.current?.sendLiveStrokeAppend(activeStroke.liveStrokeId, [currentPoint]);

      nextActiveStroke = {
        ...nextActiveStroke,
        lastLiveSentAt: now,
        lastLiveSentPoint: currentPoint,
      };
    }

    activeStrokeRef.current = nextActiveStroke;

    if (nextPoints.length >= STROKE_CHUNK_POINT_LIMIT) {
      enqueueStrokeSave(
        {
          tool: activeStroke.tool,

          color: activeStroke.color,

          lineWidth: activeStroke.lineWidth,

          points: nextPoints,
        },
        activeStroke.gestureId,
      );

      activeStrokeRef.current = {
        gestureId: activeStroke.gestureId,

        tool: activeStroke.tool,

        color: activeStroke.color,

        lineWidth: activeStroke.lineWidth,

        points: [currentPoint],

        hasSavedChunk: true,

        liveStrokeId: activeStroke.liveStrokeId,

        lastLiveSentAt: nextActiveStroke.lastLiveSentAt,

        lastLiveSentPoint: nextActiveStroke.lastLiveSentPoint,
      };
    }
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const panSession = panSessionRef.current;

    if (panSession && panSession.pointerId === event.pointerId) {
      const canvas = canvasRef.current;

      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      panSessionRef.current = null;
      setIsPanning(false);
      return;
    }

    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const canvas = canvasRef.current;

    const activeStroke = activeStrokeRef.current;

    if (activeStroke) {
      const finalPoint = activeStroke.points[activeStroke.points.length - 1];

      if (
        finalPoint &&
        getPointDistance(activeStroke.lastLiveSentPoint, finalPoint) > 0.01
      ) {
        whiteboardConnectionRef.current?.sendLiveStrokeAppend(activeStroke.liveStrokeId, [finalPoint]);
      }

      whiteboardConnectionRef.current?.sendLiveStrokeEnd(activeStroke.liveStrokeId);
    }

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;

    activeStrokeRef.current = null;

    if (!canEdit || !canvas || !activeStroke) {
      return;
    }

    const { points, hasSavedChunk, gestureId, ...strokeStyle } = activeStroke;

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      if (hasSavedChunk) {
        return;
      }

      const context = canvas.getContext("2d");

      if (context) {
        drawDot(context, {
          ...strokeStyle,
          points,
        });
      }

      enqueueStrokeSave(
        {
          ...strokeStyle,
          points,
        },
        gestureId,
      );

      return;
    }

    enqueueStrokeSave(
      {
        ...strokeStyle,
        points,
      },
      gestureId,
    );
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const panSession = panSessionRef.current;

    if (panSession && panSession.pointerId === event.pointerId) {
      const canvas = canvasRef.current;

      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      panSessionRef.current = null;
      setIsPanning(false);
      return;
    }

    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    const canvas = canvasRef.current;

    const activeStroke = activeStrokeRef.current;

    if (activeStroke) {
      const finalPoint = activeStroke.points[activeStroke.points.length - 1];

      if (
        finalPoint &&
        getPointDistance(activeStroke.lastLiveSentPoint, finalPoint) > 0.01
      ) {
        whiteboardConnectionRef.current?.sendLiveStrokeAppend(activeStroke.liveStrokeId, [finalPoint]);
      }

      whiteboardConnectionRef.current?.sendLiveStrokeEnd(activeStroke.liveStrokeId);
    }

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;

    activeStrokeRef.current = null;

    if (canEdit && activeStroke && activeStroke.points.length > 1) {
      enqueueStrokeSave(
        {
          tool: activeStroke.tool,

          color: activeStroke.color,

          lineWidth: activeStroke.lineWidth,

          points: activeStroke.points,
        },
        activeStroke.gestureId,
      );
    }
  };

  const handleSelectWhiteboard = async (whiteboardId: number) => {
    if (whiteboardId === selectedWhiteboardId) {
      return;
    }

    cancelActiveDrawing();

    try {
      await saveQueueRef.current;
    } finally {
      clearUndoHistory();
      setSelectedWhiteboardId(whiteboardId);
    }
  };

  const openCreateModal = () => {
    setWorkspaceTitle("");
    setWorkspaceDescription("");
    setCreateModalOpen(true);
  };

  const openSettingsModal = () => {
    if (!selectedWhiteboard) {
      return;
    }

    setWorkspaceTitle(selectedWhiteboard.title);
    setWorkspaceDescription(selectedWhiteboard.description ?? "");
    setWorkspaceBackgroundColor(selectedWhiteboard.backgroundColor || "#FFFFFF");
    const nextGridType = selectedWhiteboard.gridType ?? (selectedWhiteboard.gridEnabled ? "GRID" : "NONE");
    setWorkspaceGridType(nextGridType);
    setWorkspaceGridEnabled(nextGridType !== "NONE");
    setWorkspaceGridSize(selectedWhiteboard.gridSize ?? 24);
    setWorkspaceGridOpacity(selectedWhiteboard.gridOpacity ?? 0.12);
    setWorkspaceCanvasWidth(selectedWhiteboard.canvasWidth ?? DEFAULT_CANVAS_WIDTH);
    setWorkspaceCanvasHeight(selectedWhiteboard.canvasHeight ?? DEFAULT_CANVAS_HEIGHT);
    setSettingsModalOpen(true);
  };

  const handleCreateWhiteboard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = workspaceTitle.trim();

    if (!title || !canManageWorkspace) {
      return;
    }

    createWhiteboardMutation.mutate({
      title,
      description: workspaceDescription.trim() || null,
    });
  };

  const handleSaveWorkspaceSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWhiteboard || !canManageWorkspace) {
      return;
    }

    const title = workspaceTitle.trim();

    if (!title) {
      toast.error("화이트보드 이름을 입력해주세요.");
      return;
    }

    updateWhiteboardMutation.mutate({
      whiteboardId: selectedWhiteboard.id,
      title,
      description: workspaceDescription.trim() || null,
      backgroundColor: workspaceBackgroundColor,
      gridType: workspaceGridType,
      gridSize: workspaceGridSize,
      gridOpacity: workspaceGridOpacity,
      canvasWidth: workspaceCanvasWidth,
      canvasHeight: workspaceCanvasHeight,
    });
  };

  const handleSetDefaultWhiteboard = () => {
    if (!selectedWhiteboard || !canManageWorkspace || selectedWhiteboard.defaultWhiteboard) {
      return;
    }

    defaultWhiteboardMutation.mutate(selectedWhiteboard.id);
  };

  const handleMoveWhiteboard = (direction: -1 | 1) => {
    if (!selectedWhiteboard || !canManageWorkspace || reorderWhiteboardsMutation.isPending) {
      return;
    }

    const ordered = [...whiteboards].sort((a, b) => a.position - b.position);
    const currentIndex = ordered.findIndex((whiteboard) => whiteboard.id === selectedWhiteboard.id);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    const next = [...ordered];
    const [moved] = next.splice(currentIndex, 1);

    if (!moved) {
      return;
    }

    next.splice(targetIndex, 0, moved);

    reorderWhiteboardsMutation.mutate(next.map((whiteboard) => whiteboard.id));
  };

  const handleDeleteWhiteboard = async () => {
    if (!selectedWhiteboard || !canManageWorkspace || whiteboards.length <= 1) {
      return;
    }

    cancelActiveDrawing();

    try {
      await saveQueueRef.current;
      await deleteWhiteboardMutation.mutateAsync(selectedWhiteboard.id);
    } catch {
      // mutation onError에서 처리
    }
  };

  const handleClearWhiteboard = async () => {
    if (!canEdit) {
      return;
    }

    cancelActiveDrawing();

    try {
      await saveQueueRef.current;

      await clearWhiteboardMutation.mutateAsync();

      setClearDialogOpen(false);
    } catch {
      // mutation onError에서 처리
    }
  };

  const handleRetry = async () => {
    await Promise.all([refetchBoard(), refetchWhiteboards(), refetchStrokes(), refetchObjects()]);
  };

  if (!isValidBoardId) {
    return (
      <section className="flow-page">
        <div className="max-w-2xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-xl font-bold text-[var(--flow-text)]">
            화이트보드를 열 수 없습니다.
          </h1>

          <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
            올바른 보드 주소인지 확인해주세요.
          </p>
        </div>
      </section>
    );
  }

  const isLoading =
    isBoardLoading ||
    isWhiteboardsLoading ||
    (selectedWhiteboardId !== null && (isStrokesLoading || isObjectsLoading));

  const isError = isBoardError || isWhiteboardsError || isStrokesError || isObjectsError;

  const isSaving = queuedSaveCount > 0;

  const canUndo =
    canEdit && undoGestureCount > 0 && !isUndoing && !isRedoing && deletingStrokeId === null;

  const canRedo =
    canEdit && redoGestureCount > 0 && !isUndoing && !isRedoing && deletingStrokeId === null;

  const canDeleteSelected =
    canEdit &&
    (selectedStrokeId !== null || (selectedObjectId !== null && !selectedObject?.locked)) &&
    deletingStrokeId === null &&
    deletingObjectId === null &&
    !isUndoing &&
    !isRedoing;

  const isBusy =
    isUndoing ||
    isRedoing ||
    deletingStrokeId !== null ||
    deletingObjectId !== null ||
    createObjectMutation.isPending ||
    uploadImageMutation.isPending;

  const orderedWhiteboards = [...whiteboards].sort((a, b) => a.position - b.position);

  const selectedWhiteboardIndex = selectedWhiteboard
    ? orderedWhiteboards.findIndex((whiteboard) => whiteboard.id === selectedWhiteboard.id)
    : -1;

  const canvasCursorClass =
    tool === "HAND"
      ? isPanning
        ? "cursor-grabbing"
        : "cursor-grab"
      : tool === "SELECT"
        ? "cursor-default"
        : !canEdit
          ? "cursor-default"
          : tool === "ERASER" && eraserMode === "STROKE"
            ? "cursor-pointer"
            : "cursor-crosshair";

  return (
    <>
      <LoadingOverlay open={isLoading} text="화이트보드를 불러오는 중..." />

      <Modal
        open={createModalOpen}
        title="새 화이트보드"
        size="md"
        closeOnBackdrop={!createWhiteboardMutation.isPending}
        closeOnEsc={!createWhiteboardMutation.isPending}
        onClose={() => {
          if (!createWhiteboardMutation.isPending) {
            setCreateModalOpen(false);
          }
        }}
      >
        <form className="space-y-5" onSubmit={handleCreateWhiteboard}>
          <Input
            label="화이트보드 이름"
            required
            maxLength={100}
            value={workspaceTitle}
            placeholder="예: 로그인 UX 플로우"
            disabled={createWhiteboardMutation.isPending}
            onChange={(event) => setWorkspaceTitle(event.target.value)}
          />

          <div>
            <label
              htmlFor="whiteboard-create-description"
              className="text-xs font-semibold text-[var(--flow-text-secondary)]"
            >
              설명
            </label>

            <textarea
              id="whiteboard-create-description"
              rows={4}
              maxLength={500}
              value={workspaceDescription}
              placeholder="이 화이트보드에서 다룰 내용을 간단히 적어주세요."
              disabled={createWhiteboardMutation.isPending}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              className="mt-1.5 w-full resize-none rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--flow-text)] transition-[border-color,box-shadow] outline-none placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary-500)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--flow-gray-100)]"
            />

            <p className="mt-1 text-[10px] text-[var(--flow-text-placeholder)]">
              {workspaceDescription.length}/500
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--flow-border)] pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={createWhiteboardMutation.isPending}
              onClick={() => setCreateModalOpen(false)}
            >
              취소
            </Button>

            <Button
              type="submit"
              loading={createWhiteboardMutation.isPending}
              disabled={!workspaceTitle.trim()}
            >
              만들기
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={settingsModalOpen}
        title="화이트보드 설정"
        size="md"
        closeOnBackdrop={!updateWhiteboardMutation.isPending}
        closeOnEsc={!updateWhiteboardMutation.isPending}
        onClose={() => {
          if (!updateWhiteboardMutation.isPending) {
            setSettingsModalOpen(false);
          }
        }}
      >
        <form className="space-y-5" onSubmit={handleSaveWorkspaceSettings}>
          <Input
            label="화이트보드 이름"
            required
            maxLength={100}
            value={workspaceTitle}
            disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
            onChange={(event) => setWorkspaceTitle(event.target.value)}
          />

          <div>
            <label
              htmlFor="whiteboard-settings-description"
              className="text-xs font-semibold text-[var(--flow-text-secondary)]"
            >
              설명
            </label>
            <textarea
              id="whiteboard-settings-description"
              rows={3}
              maxLength={500}
              value={workspaceDescription}
              disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              className="mt-1.5 w-full resize-none rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--flow-text)] outline-none focus:border-[var(--flow-primary-500)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--flow-gray-100)]"
            />
          </div>

          <div className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-4">
            <p className="text-[11px] font-bold text-[var(--flow-text-secondary)]">캔버스 배경</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={workspaceBackgroundColor}
                disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                onChange={(event) => setWorkspaceBackgroundColor(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1 disabled:cursor-not-allowed"
                aria-label="캔버스 배경색"
              />
              <span className="font-mono text-[11px] font-semibold text-[var(--flow-text-muted)]">
                {workspaceBackgroundColor.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--flow-text-secondary)]">캔버스 크기</p>
                <p className="mt-1 text-[10px] text-[var(--flow-text-muted)]">
                  화이트보드별 작업 영역 크기를 저장합니다. 캔버스 오른쪽 아래 손잡이로도 조절할 수 있습니다.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
                {workspaceCanvasWidth} × {workspaceCanvasHeight}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "기본", width: 1200, height: 700 },
                { label: "FHD", width: 1920, height: 1080 },
                { label: "QHD", width: 2560, height: 1440 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                  onClick={() => {
                    setWorkspaceCanvasWidth(preset.width);
                    setWorkspaceCanvasHeight(preset.height);
                  }}
                  className="h-10 rounded-lg border border-[var(--flow-border-strong)] bg-white text-[11px] font-bold text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-primary-50)] hover:text-[var(--flow-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
                너비(px)
                <input
                  type="number"
                  min={MIN_CANVAS_WIDTH}
                  max={MAX_CANVAS_WIDTH}
                  value={workspaceCanvasWidth}
                  disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                  onChange={(event) =>
                    setWorkspaceCanvasWidth(
                      Math.min(MAX_CANVAS_WIDTH, Math.max(MIN_CANVAS_WIDTH, Number(event.target.value) || MIN_CANVAS_WIDTH)),
                    )
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] font-semibold text-[var(--flow-text)] outline-none focus:border-[var(--flow-primary-500)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                />
              </label>
              <label className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
                높이(px)
                <input
                  type="number"
                  min={MIN_CANVAS_HEIGHT}
                  max={MAX_CANVAS_HEIGHT}
                  value={workspaceCanvasHeight}
                  disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                  onChange={(event) =>
                    setWorkspaceCanvasHeight(
                      Math.min(MAX_CANVAS_HEIGHT, Math.max(MIN_CANVAS_HEIGHT, Number(event.target.value) || MIN_CANVAS_HEIGHT)),
                    )
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] font-semibold text-[var(--flow-text)] outline-none focus:border-[var(--flow-primary-500)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--flow-text-secondary)]">배경 패턴</p>
                <p className="mt-1 text-[10px] text-[var(--flow-text-muted)]">
                  빈 화면, 사각 격자, 점 그리드 중에서 선택합니다.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
                {workspaceGridEnabled ? "패턴 사용" : "빈 화면"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["NONE", "GRID", "DOT"] as WhiteboardGridType[]).map((gridType) => (
                <button
                  key={gridType}
                  type="button"
                  disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                  onClick={() => {
                    setWorkspaceGridType(gridType);
                    setWorkspaceGridEnabled(gridType !== "NONE");
                  }}
                  className={[
                    "h-10 rounded-lg border text-[11px] font-bold transition-colors",
                    workspaceGridType === gridType
                      ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]"
                      : "border-[var(--flow-border-strong)] bg-white text-[var(--flow-text-muted)] hover:bg-[var(--flow-gray-50)]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  ].join(" ")}
                >
                  {gridType === "NONE" ? "없음" : gridType === "GRID" ? "격자" : "점"}
                </button>
              ))}
            </div>

            {workspaceGridType !== "NONE" && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
                  <span className="flex justify-between gap-2">
                    <span>간격</span>
                    <strong className="text-[var(--flow-text-secondary)]">{workspaceGridSize}px</strong>
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={64}
                    step={4}
                    value={workspaceGridSize}
                    disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                    onChange={(event) => setWorkspaceGridSize(Number(event.target.value))}
                    className="mt-2 w-full accent-[var(--flow-primary)]"
                  />
                </label>

                <label className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
                  <span className="flex justify-between gap-2">
                    <span>농도</span>
                    <strong className="text-[var(--flow-text-secondary)]">
                      {Math.round(workspaceGridOpacity * 100)}%
                    </strong>
                  </span>
                  <input
                    type="range"
                    min={0.05}
                    max={0.4}
                    step={0.01}
                    value={workspaceGridOpacity}
                    disabled={!canManageWorkspace || updateWhiteboardMutation.isPending}
                    onChange={(event) => setWorkspaceGridOpacity(Number(event.target.value))}
                    className="mt-2 w-full accent-[var(--flow-primary)]"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--flow-border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--flow-text-secondary)]">기본 화이트보드</p>
                <p className="mt-1 text-[10px] leading-5 text-[var(--flow-text-muted)]">
                  화이트보드 메뉴에 처음 들어왔을 때 기본으로 열리는 작업 공간입니다.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={selectedWhiteboard?.defaultWhiteboard ? "outline" : "primary"}
                disabled={
                  !canManageWorkspace ||
                  !selectedWhiteboard ||
                  selectedWhiteboard.defaultWhiteboard ||
                  defaultWhiteboardMutation.isPending
                }
                loading={defaultWhiteboardMutation.isPending}
                onClick={handleSetDefaultWhiteboard}
              >
                {selectedWhiteboard?.defaultWhiteboard ? "현재 기본" : "기본으로 지정"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--flow-border)] p-4">
            <p className="text-[11px] font-bold text-[var(--flow-text-secondary)]">탭 순서</p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  !canManageWorkspace || selectedWhiteboardIndex <= 0 || reorderWhiteboardsMutation.isPending
                }
                onClick={() => handleMoveWhiteboard(-1)}
              >
                ← 왼쪽
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  !canManageWorkspace ||
                  selectedWhiteboardIndex < 0 ||
                  selectedWhiteboardIndex >= orderedWhiteboards.length - 1 ||
                  reorderWhiteboardsMutation.isPending
                }
                onClick={() => handleMoveWhiteboard(1)}
              >
                오른쪽 →
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--flow-border)] pt-4">
            <Button
              type="button"
              variant="danger"
              disabled={!canManageWorkspace || whiteboards.length <= 1 || deleteWhiteboardMutation.isPending}
              onClick={() => setDeleteDialogOpen(true)}
            >
              화이트보드 삭제
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateWhiteboardMutation.isPending}
                onClick={() => setSettingsModalOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                loading={updateWhiteboardMutation.isPending}
                disabled={!canManageWorkspace || !workspaceTitle.trim()}
              >
                설정 저장
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="화이트보드 삭제"
        description={`"${selectedWhiteboard?.title ?? "화이트보드"}" 작업 공간과 안에 저장된 모든 선과 스티키 노트를 삭제할까요? 다른 화이트보드에는 영향을 주지 않습니다.`}
        confirmText="삭제"
        cancelText="취소"
        loading={deleteWhiteboardMutation.isPending}
        onConfirm={handleDeleteWhiteboard}
        onCancel={() => {
          if (!deleteWhiteboardMutation.isPending) {
            setDeleteDialogOpen(false);
          }
        }}
      />

      <ConfirmDialog
        open={clearDialogOpen}
        title="드로잉 초기화"
        description={`"${selectedWhiteboard?.title ?? "현재 화이트보드"}"에 저장된 모든 펜 선과 지우개 기록이 삭제됩니다. 스티키 노트는 유지되며 되돌릴 수 없습니다.`}
        confirmText="드로잉 초기화"
        cancelText="취소"
        loading={clearWhiteboardMutation.isPending}
        onConfirm={handleClearWhiteboard}
        onCancel={() => setClearDialogOpen(false)}
      />

      <section className="flex min-h-[calc(100vh-var(--flow-header-height)-48px)] w-full flex-col">
        {/* Page header */}
        <div className="shrink-0 px-8 pt-8 pb-7">
          <div className="flex items-end justify-between gap-10 max-[1199px]:items-start">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--flow-primary)]">
                {board ? board.title : `Board #${boardId}`}
              </p>

              <h1 className="mt-2 text-[26px] font-bold tracking-[-0.03em] text-[var(--flow-text)]">
                화이트보드
              </h1>

              <p className="mt-2 max-w-[760px] text-[13px] leading-7 text-[var(--flow-text-muted)]">
                {isViewer
                  ? "VIEWER 권한으로 참여 중입니다. 다른 참여자의 드로잉과 변경사항을 실시간으로 확인할 수 있습니다."
                  : "기획 스케치, UI 아이디어, 구조 설계, 테스트 흐름처럼 말로 설명하기 어려운 내용을 자유롭게 그리고 공유하세요."}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5">
              {board && (
                <span
                  className={[
                    "inline-flex h-8 items-center rounded-lg px-3 whitespace-nowrap",
                    "text-[11px] font-bold",
                    isViewer
                      ? "bg-[var(--flow-gray-100)] text-[var(--flow-text-muted)]"
                      : "bg-[var(--flow-primary-50)] text-[var(--flow-primary)]",
                  ].join(" ")}
                >
                  {board.myRole}
                </span>
              )}

              <span
                className={[
                  "inline-flex h-8 items-center gap-2 rounded-lg px-3 whitespace-nowrap",
                  "text-[11px] font-semibold",
                  getConnectionClassName(connectionState),
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    connectionState === "connected"
                      ? "bg-emerald-500"
                      : connectionState === "connecting"
                        ? "bg-amber-500"
                        : "bg-red-500",
                  ].join(" ")}
                />

                {getConnectionLabel(connectionState)}
              </span>

              <span className="text-[12px] whitespace-nowrap text-[var(--flow-text-muted)]">
                {isSaving
                  ? `저장 중 ${queuedSaveCount}개`
                  : deletingStrokeId !== null
                    ? "선 삭제 중"
                    : `선 ${strokes.length.toLocaleString()}개 · 스티키 ${stickyNotes.length.toLocaleString()}개 · 텍스트 ${textObjects.length.toLocaleString()}개`}
              </span>
            </div>
          </div>

          {isViewer && (
            <div className="mt-6 rounded-[var(--flow-radius-lg)] bg-[var(--flow-gray-100)] px-5 py-4">
              <p className="text-[13px] font-semibold text-[var(--flow-text-secondary)]">
                읽기 전용 화이트보드
              </p>

              <p className="mt-1 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                VIEWER는 화이트보드를 수정할 수 없지만, 다른 참여자의 그림과 변경사항은 실시간으로
                확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Whiteboard workspace tabs */}
        <div className="shrink-0 px-8 pb-5">
          <div className="overflow-hidden rounded-[var(--flow-radius-xl)] border border-[var(--flow-border)] bg-white shadow-[var(--flow-shadow-xs)]">
            <div className="flex items-center gap-2 border-b border-[var(--flow-border)] px-4 py-3">
              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex min-w-max items-center gap-2">
                  {orderedWhiteboards.map((whiteboard) => {
                    const active = whiteboard.id === selectedWhiteboardId;

                    return (
                      <button
                        key={whiteboard.id}
                        type="button"
                        disabled={isSaving || isBusy}
                        onClick={() => void handleSelectWhiteboard(whiteboard.id)}
                        className={[
                          "inline-flex h-9 max-w-[220px] items-center gap-2 rounded-lg border px-3 text-[11px] font-bold transition-colors",
                          active
                            ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]"
                            : "border-[var(--flow-border)] bg-white text-[var(--flow-text-muted)] hover:bg-[var(--flow-gray-50)] hover:text-[var(--flow-text)]",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        ].join(" ")}
                        title={whiteboard.title}
                      >
                        {whiteboard.defaultWhiteboard && (
                          <span aria-label="기본 화이트보드" title="기본 화이트보드">
                            ★
                          </span>
                        )}

                        <span className="truncate">{whiteboard.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {canManageWorkspace && (
                <div className="flex shrink-0 items-center gap-2 border-l border-[var(--flow-border)] pl-3">
                  <Button type="button" size="sm" variant="outline" onClick={openCreateModal}>
                    + 새 화이트보드
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!selectedWhiteboard}
                    onClick={openSettingsModal}
                  >
                    설정
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={selectedWhiteboard?.locked ? "primary" : "outline"}
                    disabled={!selectedWhiteboard || updateWhiteboardLockMutation.isPending}
                    loading={updateWhiteboardLockMutation.isPending}
                    onClick={() => {
                      if (selectedWhiteboard) {
                        updateWhiteboardLockMutation.mutate({
                          whiteboardId: selectedWhiteboard.id,
                          locked: !selectedWhiteboard.locked,
                        });
                      }
                    }}
                  >
                    {selectedWhiteboard?.locked ? "🔓 잠금 해제" : "🔒 잠금"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex min-h-[64px] items-center justify-between gap-5 px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[14px] font-bold text-[var(--flow-text)]">
                    {selectedWhiteboard?.title ?? "화이트보드 선택 중"}
                  </h2>

                  {selectedWhiteboard?.defaultWhiteboard && (
                    <span className="shrink-0 rounded-full bg-[var(--flow-primary-50)] px-2 py-0.5 text-[8px] font-bold text-[var(--flow-primary-700)]">
                      기본
                    </span>
                  )}

                  {selectedWhiteboard?.locked && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold text-amber-700">
                      🔒 잠김
                    </span>
                  )}
                </div>

                <p className="mt-1 truncate text-[10px] text-[var(--flow-text-muted)]">
                  {selectedWhiteboard?.description ||
                    "설명이 없습니다. 설정에서 이 작업 공간의 목적을 기록할 수 있습니다."}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-[9px] font-semibold text-[var(--flow-text-placeholder)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full border border-[var(--flow-border-strong)]"
                    style={{ backgroundColor: selectedWhiteboard?.backgroundColor ?? "#FFFFFF" }}
                  />
                  배경
                </span>

                <span>{selectedWhiteboard?.gridType === "DOT" ? "DOT" : selectedWhiteboard?.gridType === "GRID" ? "GRID" : "PLAIN"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="shrink-0 px-8 pb-6">
          <div className="rounded-[var(--flow-radius-xl)] bg-white p-6 shadow-[var(--flow-shadow-xs)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              {/* Interaction tools */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={tool === "SELECT" ? "primary" : "outline"}
                  aria-pressed={tool === "SELECT"}
                  disabled={isBusy}
                  onClick={() => setTool("SELECT")}
                >
                  선택
                </Button>

                <Button
                  type="button"
                  variant={tool === "HAND" ? "primary" : "outline"}
                  aria-pressed={tool === "HAND"}
                  disabled={isBusy}
                  onClick={() => setTool("HAND")}
                >
                  손
                </Button>

                <Button
                  type="button"
                  variant={tool === "PEN" ? "primary" : "outline"}
                  aria-pressed={tool === "PEN"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("PEN")}
                >
                  펜
                </Button>

                <Button
                  type="button"
                  variant={tool === "ERASER" ? "primary" : "outline"}
                  aria-pressed={tool === "ERASER"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("ERASER")}
                >
                  지우개
                </Button>

                <Button
                  type="button"
                  variant={tool === "STICKY" ? "primary" : "outline"}
                  aria-pressed={tool === "STICKY"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("STICKY")}
                >
                  스티키
                </Button>

                <Button
                  type="button"
                  variant={tool === "TEXT" ? "primary" : "outline"}
                  aria-pressed={tool === "TEXT"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("TEXT")}
                >
                  텍스트
                </Button>

                <Button
                  type="button"
                  variant={tool === "RECTANGLE" ? "primary" : "outline"}
                  aria-pressed={tool === "RECTANGLE"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("RECTANGLE")}
                >
                  사각형
                </Button>

                <Button
                  type="button"
                  variant={tool === "ELLIPSE" ? "primary" : "outline"}
                  aria-pressed={tool === "ELLIPSE"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("ELLIPSE")}
                >
                  원
                </Button>

                <Button
                  type="button"
                  variant={tool === "ARROW" ? "primary" : "outline"}
                  aria-pressed={tool === "ARROW"}
                  disabled={!canEdit || isBusy}
                  onClick={() => setTool("ARROW")}
                >
                  화살표
                </Button>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEdit || isBusy || uploadImageMutation.isPending}
                  loading={uploadImageMutation.isPending}
                  onClick={() => imageInputRef.current?.click()}
                >
                  이미지
                </Button>

                {tool === "SELECT" && (selectedStrokeId !== null || selectedObjectId !== null) && (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={!canDeleteSelected}
                    onClick={() =>
                      void (selectedObjectId !== null
                        ? handleDeleteSelectedObject()
                        : handleDeleteSelectedStroke())
                    }
                  >
                    선택 항목 삭제
                  </Button>
                )}
              </div>

              <span className="hidden h-7 w-px bg-[var(--flow-border)] min-[1180px]:block" />

              {/* Tool options */}
              {tool === "PEN" && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span>색상</span>
                    <input
                      type="color"
                      value={penColor}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setPenColor(event.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1 disabled:cursor-not-allowed"
                    />
                  </label>
                  <label className="flex min-w-[180px] items-center gap-3 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span className="whitespace-nowrap">굵기 {penLineWidth}px</span>
                    <input
                      type="range"
                      min={1}
                      max={24}
                      step={1}
                      value={penLineWidth}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setPenLineWidth(Number(event.target.value))}
                      className="w-28 accent-[var(--flow-primary)]"
                    />
                  </label>
                </div>
              )}

              {tool === "ERASER" && (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center rounded-xl bg-[var(--flow-gray-100)] p-1">
                    <button
                      type="button"
                      disabled={!canEdit || isBusy}
                      onClick={() => setEraserMode("PIXEL")}
                      className={[
                        "h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors",
                        eraserMode === "PIXEL"
                          ? "bg-white text-[var(--flow-primary)] shadow-[var(--flow-shadow-xs)]"
                          : "text-[var(--flow-text-muted)]",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      ].join(" ")}
                    >
                      부분 지우기
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit || isBusy}
                      onClick={() => setEraserMode("STROKE")}
                      className={[
                        "h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors",
                        eraserMode === "STROKE"
                          ? "bg-white text-[var(--flow-primary)] shadow-[var(--flow-shadow-xs)]"
                          : "text-[var(--flow-text-muted)]",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      ].join(" ")}
                    >
                      선 전체 지우기
                    </button>
                  </div>
                  {eraserMode === "PIXEL" && (
                    <label className="flex min-w-[190px] items-center gap-3 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                      <span className="whitespace-nowrap">굵기 {eraserLineWidth}px</span>
                      <input
                        type="range"
                        min={8}
                        max={80}
                        step={2}
                        value={eraserLineWidth}
                        disabled={!canEdit || isBusy}
                        onChange={(event) => setEraserLineWidth(Number(event.target.value))}
                        className="w-28 accent-[var(--flow-primary)]"
                      />
                    </label>
                  )}
                </div>
              )}

              {tool === "STICKY" && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span>배경</span>
                    <input
                      type="color"
                      value={stickyColor}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setStickyColor(event.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1"
                    />
                  </label>
                  <label className="flex min-w-[190px] items-center gap-3 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span className="whitespace-nowrap">글자 {stickyFontSize}px</span>
                    <input
                      type="range"
                      min={11}
                      max={32}
                      value={stickyFontSize}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setStickyFontSize(Number(event.target.value))}
                      className="w-28 accent-[var(--flow-primary)]"
                    />
                  </label>
                </div>
              )}

              {tool === "TEXT" && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span>글자색</span>
                    <input
                      type="color"
                      value={textColor}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setTextColor(event.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1"
                    />
                  </label>
                  <label className="flex min-w-[190px] items-center gap-3 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span className="whitespace-nowrap">크기 {textFontSize}px</span>
                    <input
                      type="range"
                      min={12}
                      max={72}
                      value={textFontSize}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setTextFontSize(Number(event.target.value))}
                      className="w-28 accent-[var(--flow-primary)]"
                    />
                  </label>
                </div>
              )}

              {(tool === "RECTANGLE" || tool === "ELLIPSE" || tool === "ARROW") && (
                <div className="flex flex-wrap items-center gap-4">
                  {tool !== "ARROW" && (
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                      <span>채우기</span>
                      <input
                        type="color"
                        value={shapeFillColor}
                        disabled={!canEdit || isBusy}
                        onChange={(event) => setShapeFillColor(event.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1"
                      />
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span>선</span>
                    <input
                      type="color"
                      value={shapeStrokeColor}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setShapeStrokeColor(event.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1"
                    />
                  </label>
                  <label className="flex min-w-[170px] items-center gap-3 text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    <span className="whitespace-nowrap">선 {shapeStrokeWidth}px</span>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={shapeStrokeWidth}
                      disabled={!canEdit || isBusy}
                      onChange={(event) => setShapeStrokeWidth(Number(event.target.value))}
                      className="w-24 accent-[var(--flow-primary)]"
                    />
                  </label>
                </div>
              )}

              {tool === "SELECT" && selectedObject && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-3 py-2">
                  <span className="text-[10px] font-bold text-[var(--flow-text-secondary)]">
                    {selectedObject.locked ? "🔒 잠긴 객체" : "선택 객체"}
                  </span>

                  {(selectedObject.type === "STICKY_NOTE" || selectedObject.type === "TEXT") && (
                    <>
                      <label className="flex items-center gap-2 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                        <span>글자</span>
                        <input
                          type="range"
                          min={selectedObject.type === "TEXT" ? 12 : 11}
                          max={selectedObject.type === "TEXT" ? 72 : 32}
                          value={selectedObject.fontSize ?? (selectedObject.type === "TEXT" ? 24 : 14)}
                          disabled={!canEdit || selectedObject.locked}
                          onChange={(event) => applySelectedObjectStyle({ fontSize: Number(event.target.value) })}
                          className="w-24 accent-[var(--flow-primary)]"
                        />
                        <span>{selectedObject.fontSize ?? (selectedObject.type === "TEXT" ? 24 : 14)}px</span>
                      </label>
                      <input
                        type="color"
                        value={
                          selectedObject.type === "STICKY_NOTE"
                            ? selectedObject.fillColor ?? DEFAULT_STICKY_COLOR
                            : selectedObject.strokeColor ?? DEFAULT_TEXT_COLOR
                        }
                        disabled={!canEdit || selectedObject.locked}
                        onChange={(event) =>
                          applySelectedObjectStyle(
                            selectedObject.type === "STICKY_NOTE"
                              ? { fillColor: event.target.value }
                              : { strokeColor: event.target.value },
                          )
                        }
                        className="h-7 w-9 cursor-pointer rounded-md border border-[var(--flow-border-strong)] bg-white p-1"
                        aria-label="선택 객체 색상"
                      />
                    </>
                  )}

                  {(selectedObject.type === "RECTANGLE" ||
                    selectedObject.type === "ELLIPSE" ||
                    selectedObject.type === "ARROW") && (
                    <>
                      {selectedObject.type !== "ARROW" && (
                        <input
                          type="color"
                          value={selectedObject.fillColor ?? DEFAULT_SHAPE_FILL}
                          disabled={!canEdit || selectedObject.locked}
                          onChange={(event) => applySelectedObjectStyle({ fillColor: event.target.value })}
                          className="h-7 w-9 cursor-pointer rounded-md border border-[var(--flow-border-strong)] bg-white p-1"
                          aria-label="도형 채우기 색상"
                        />
                      )}
                      <input
                        type="color"
                        value={selectedObject.strokeColor ?? DEFAULT_SHAPE_STROKE}
                        disabled={!canEdit || selectedObject.locked}
                        onChange={(event) => applySelectedObjectStyle({ strokeColor: event.target.value })}
                        className="h-7 w-9 cursor-pointer rounded-md border border-[var(--flow-border-strong)] bg-white p-1"
                        aria-label="도형 선 색상"
                      />
                    </>
                  )}

                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedObject.locked ? "primary" : "outline"}
                      loading={updateObjectLockMutation.isPending}
                      disabled={updateObjectLockMutation.isPending}
                      onClick={() =>
                        updateObjectLockMutation.mutate({
                          objectId: selectedObject.id,
                          locked: !selectedObject.locked,
                        })
                      }
                    >
                      {selectedObject.locked ? "🔓 객체 잠금 해제" : "🔒 객체 잠금"}
                    </Button>
                  )}
                </div>
              )}

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
                <div className="flex items-center rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-1">
                  <button
                    type="button"
                    aria-label="축소"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-bold text-[var(--flow-text-secondary)] transition-colors hover:bg-white hover:text-[var(--flow-primary)]"
                    onClick={() => changeZoom(zoom - 0.1)}
                  >
                    −
                  </button>

                  <button
                    type="button"
                    className="h-8 min-w-[58px] rounded-lg px-2 text-[10px] font-bold text-[var(--flow-text-secondary)] transition-colors hover:bg-white hover:text-[var(--flow-primary)]"
                    onClick={() => changeZoom(1)}
                    title="100%로 보기"
                  >
                    {Math.round(zoom * 100)}%
                  </button>

                  <button
                    type="button"
                    aria-label="확대"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-bold text-[var(--flow-text-secondary)] transition-colors hover:bg-white hover:text-[var(--flow-primary)]"
                    onClick={() => changeZoom(zoom + 0.1)}
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className="ml-1 h-8 rounded-lg px-2.5 text-[10px] font-bold text-[var(--flow-text-muted)] transition-colors hover:bg-white hover:text-[var(--flow-primary)]"
                    onClick={fitCanvasToViewport}
                  >
                    맞춤
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!canUndo}
                  onClick={() => void handleUndo()}
                >
                  {isUndoing ? "실행 취소 중..." : "↶ 실행 취소"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!canRedo}
                  onClick={() => void handleRedo()}
                >
                  {isRedoing ? "다시 실행 중..." : "↷ 다시 실행"}
                </Button>

                <span className="hidden rounded-lg bg-[var(--flow-gray-100)] px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap text-[var(--flow-text-muted)] min-[1380px]:inline-flex">
                  Ctrl+Z / Ctrl+Y
                </span>

                <Button
                  type="button"
                  variant="danger"
                  disabled={
                    !canEdit || strokes.length === 0 || clearWhiteboardMutation.isPending || isBusy
                  }
                  onClick={() => setClearDialogOpen(true)}
                >
                  드로잉 초기화
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--flow-border)] pt-5">
              <p className="text-[12px] leading-6 text-[var(--flow-text-muted)]">
                {tool === "SELECT"
                  ? selectedObjectId !== null
                    ? "스티키 노트가 선택되었습니다. 상단 손잡이로 이동하거나 Delete 키로 삭제할 수 있습니다."
                    : selectedStrokeId !== null
                      ? "선이 선택되었습니다. Delete 키 또는 ‘선택 항목 삭제’ 버튼으로 지울 수 있습니다."
                      : "선택 도구로 선이나 스티키 노트를 선택할 수 있습니다."
                  : tool === "HAND"
                    ? "캔버스를 드래그해 작업 공간을 이동할 수 있습니다."
                    : tool === "STICKY"
                      ? "캔버스에서 원하는 위치를 클릭하면 스티키 노트가 생성됩니다."
                      : tool === "ERASER"
                        ? eraserMode === "PIXEL"
                          ? `지우개를 움직인 부분만 지웁니다. 지우개 굵기 ${eraserLineWidth}px`
                          : "지우고 싶은 선을 클릭하면 해당 선 전체가 삭제됩니다."
                        : `펜으로 자유롭게 그릴 수 있습니다. 기본 굵기 ${penLineWidth}px`}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--flow-text-placeholder)]">
                {canEdit && undoGestureCount > 0 && (
                  <span className="whitespace-nowrap">
                    실행 취소 가능{" "}
                    <strong className="font-semibold text-[var(--flow-text-secondary)]">
                      {undoGestureCount}
                    </strong>
                    회
                  </span>
                )}

                {canEdit && redoGestureCount > 0 && (
                  <span className="whitespace-nowrap">
                    다시 실행 가능{" "}
                    <strong className="font-semibold text-[var(--flow-text-secondary)]">
                      {redoGestureCount}
                    </strong>
                    회
                  </span>
                )}

                {isSaving && (
                  <span className="inline-flex items-center gap-2 font-semibold whitespace-nowrap text-[var(--flow-primary)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                    저장 대기 {queuedSaveCount}개
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {tool === "ERASER" && eraserMode === "STROKE" && canEdit && (
          <div className="shrink-0 px-8 pb-6">
            <div className="rounded-[var(--flow-radius-lg)] bg-[var(--flow-primary-50)] px-5 py-4">
              <p className="text-[13px] font-semibold text-[var(--flow-primary)]">
                선 전체 지우기 모드
              </p>

              <p className="mt-1 text-[12px] leading-6 text-[var(--flow-text-muted)]">
                캔버스에서 지우고 싶은 선을 클릭하세요. 선이 겹쳐 있으면 가장 최근에 그린 선부터
                선택됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="min-h-0 flex-1 px-8 pb-8">
          {isError ? (
            <Card className="max-w-2xl">
              <div className="flex flex-col items-start gap-5">
                <div>
                  <h2 className="text-lg font-bold text-[var(--flow-text)]">
                    화이트보드를 불러오지 못했습니다.
                  </h2>

                  <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                    보드 접근 권한, 로그인 상태와 백엔드 실행 여부를 확인한 뒤 다시 시도해주세요.
                  </p>
                </div>

                <Button type="button" variant="outline" onClick={() => void handleRetry()}>
                  다시 불러오기
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-[var(--flow-radius-xl)] bg-white shadow-[var(--flow-shadow-sm)]">
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <div
                  ref={viewportRef}
                  className="min-h-0 flex-1 overflow-auto bg-[var(--flow-gray-100)] p-5"
                >
                <div className="flex min-h-full min-w-full items-start justify-center">
                  <div
                    className="relative shrink-0"
                    style={{
                      width: canvasWidth * zoom,
                      height: canvasHeight * zoom,
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={canvasWidth}
                      height={canvasHeight}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={finishStroke}
                      onPointerCancel={handlePointerCancel}
                      aria-label={`${selectedWhiteboard?.title ?? `보드 ${boardId}`} 화이트보드`}
                      aria-disabled={!canEdit}
                      className={[
                        "absolute top-0 left-0 touch-none rounded-[var(--flow-radius-md)]",
                        "border border-[var(--flow-border)]",
                        "shadow-[var(--flow-shadow-xs)]",
                        canvasCursorClass,
                      ].join(" ")}
                      style={{
                        width: canvasWidth,
                        height: canvasHeight,
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        backgroundColor: selectedWhiteboard?.backgroundColor ?? "#FFFFFF",
                        ...getCanvasPatternStyle(selectedWhiteboard),
                      }}
                    />

                    <div
                      className="pointer-events-none absolute top-0 left-0"
                      style={{
                        width: canvasWidth,
                        height: canvasHeight,
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                      }}
                    >
                      {stickyNotes.map((object) => {
                        const selected = object.id === selectedObjectId;

                        return (
                          <div
                            key={object.id}
                            className={[
                              "pointer-events-auto absolute overflow-hidden rounded-xl shadow-md transition-shadow",
                              selected && tool === "SELECT"
                                ? "ring-2 ring-[var(--flow-primary)] ring-offset-2"
                                : "",
                            ].join(" ")}
                            style={{
                              left: object.x,
                              top: object.y,
                              width: object.width,
                              height: object.height,
                              zIndex: object.zIndex + 10,
                              backgroundColor: object.fillColor ?? DEFAULT_STICKY_COLOR,
                              border: `${object.strokeWidth ?? 1}px solid ${
                                object.strokeColor ?? DEFAULT_STICKY_BORDER_COLOR
                              }`,
                              transform: `rotate(${object.rotation}deg)`,
                            }}
                            onPointerDown={(event) => {
                              event.stopPropagation();

                              if (tool === "SELECT") {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);
                              }
                            }}
                          >
                            <button
                              type="button"
                              aria-label="스티키 노트 이동"
                              title={
                                canEdit && tool === "SELECT" && !object.locked
                                  ? "드래그해서 스티키 노트 이동"
                                  : object.locked
                                    ? "잠긴 객체입니다."
                                    : "선택 도구에서 이동할 수 있습니다."
                              }
                              className={[
                                "flex h-8 w-full items-center justify-between border-b px-3 text-left",
                                "border-black/10 bg-black/[0.035]",
                                canEdit && tool === "SELECT" && !object.locked
                                  ? "cursor-grab active:cursor-grabbing"
                                  : "cursor-default",
                              ].join(" ")}
                              onPointerDown={(event) => handleObjectDragStart(event, object)}
                              onPointerMove={handleObjectDragMove}
                              onPointerUp={finishObjectDrag}
                              onPointerCancel={finishObjectDrag}
                            >
                              <span className="text-[11px] font-bold text-slate-700">메모</span>

                              <span className="text-[10px] font-semibold text-slate-500">
                                {object.locked ? "🔒 " : ""}{object.createdByNickname}
                              </span>
                            </button>

                            <textarea
                              value={objectDrafts[object.id] ?? object.content ?? ""}
                              readOnly={!canEdit || object.locked}
                              maxLength={10000}
                              placeholder={canEdit && !object.locked ? "메모를 입력하세요" : "내용 없음"}
                              aria-label="스티키 노트 내용"
                              className={[
                                "w-full resize-none bg-transparent px-3 py-2.5",
                                "text-[13px] leading-6 text-slate-800 outline-none placeholder:text-slate-500/70",
                                !canEdit || object.locked ? "cursor-default" : "",
                              ].join(" ")}
                              style={{
                                height: "calc(100% - 32px)",
                                fontSize: object.fontSize ?? 14,
                              }}
                              onFocus={() => {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);

                                setObjectDrafts((current) => {
                                  if (object.id in current) {
                                    return current;
                                  }

                                  return {
                                    ...current,
                                    [object.id]: object.content ?? "",
                                  };
                                });
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              onCompositionStart={() => {
                                composingObjectIdsRef.current.add(object.id);
                              }}
                              onCompositionEnd={(event) => {
                                composingObjectIdsRef.current.delete(object.id);
                                handleObjectContentChange(object.id, event.currentTarget.value);
                              }}
                              onChange={(event) =>
                                handleObjectContentChange(object.id, event.target.value)
                              }
                              onBlur={(event) =>
                                handleObjectContentBlur(object.id, event.currentTarget.value)
                              }
                            />

                            {selected && tool === "SELECT" && canEdit && !object.locked && (
                              <button
                                type="button"
                                aria-label="스티키 노트 크기 조절"
                                title="드래그해서 크기 조절"
                                className="absolute right-1 bottom-1 z-30 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded border border-slate-400/40 bg-white/90 text-[10px] font-bold text-slate-600 shadow-sm"
                                onPointerDown={(event) => handleObjectResizeStart(event, object)}
                                onPointerMove={handleObjectResizeMove}
                                onPointerUp={finishObjectResize}
                                onPointerCancel={finishObjectResize}
                              >
                                ◢
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {textObjects.map((object) => {
                        const selected = object.id === selectedObjectId;

                        return (
                          <div
                            key={object.id}
                            className={[
                              "pointer-events-auto absolute overflow-visible rounded-md",
                              selected && tool === "SELECT"
                                ? "ring-2 ring-[var(--flow-primary)] ring-offset-2"
                                : "",
                            ].join(" ")}
                            style={{
                              left: object.x,
                              top: object.y,
                              width: object.width,
                              height: object.height,
                              zIndex: object.zIndex + 10,
                              transform: `rotate(${object.rotation}deg)`,
                            }}
                            onPointerDown={(event) => {
                              event.stopPropagation();

                              if (tool === "SELECT") {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);
                              }
                            }}
                          >
                            {selected && tool === "SELECT" && canEdit && !object.locked && (
                              <button
                                type="button"
                                aria-label="텍스트 이동"
                                title="드래그해서 텍스트 이동"
                                className="absolute -top-7 left-1/2 z-20 flex h-6 -translate-x-1/2 cursor-grab items-center rounded-md border border-[var(--flow-border)] bg-white px-2 text-[11px] font-bold text-[var(--flow-text-muted)] shadow-sm active:cursor-grabbing"
                                onPointerDown={(event) => handleObjectDragStart(event, object)}
                                onPointerMove={handleObjectDragMove}
                                onPointerUp={finishObjectDrag}
                                onPointerCancel={finishObjectDrag}
                              >
                                이동
                              </button>
                            )}

                            <textarea
                              value={objectDrafts[object.id] ?? object.content ?? ""}
                              readOnly={!canEdit || object.locked}
                              maxLength={10000}
                              placeholder={canEdit && !object.locked ? "텍스트를 입력하세요" : "내용 없음"}
                              aria-label="화이트보드 텍스트 내용"
                              className={[
                                "h-full w-full resize-none overflow-hidden bg-transparent p-1 leading-tight outline-none",
                                "placeholder:text-slate-400/70",
                                !canEdit || object.locked ? "cursor-default" : "",
                              ].join(" ")}
                              style={{
                                color: object.strokeColor ?? DEFAULT_TEXT_COLOR,
                                fontSize: object.fontSize ?? 24,
                                fontWeight: 600,
                              }}
                              onFocus={() => {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);

                                setObjectDrafts((current) => {
                                  if (object.id in current) {
                                    return current;
                                  }

                                  return {
                                    ...current,
                                    [object.id]: object.content ?? "",
                                  };
                                });
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              onCompositionStart={() => {
                                composingObjectIdsRef.current.add(object.id);
                              }}
                              onCompositionEnd={(event) => {
                                composingObjectIdsRef.current.delete(object.id);
                                handleObjectContentChange(object.id, event.currentTarget.value);
                              }}
                              onChange={(event) =>
                                handleObjectContentChange(object.id, event.target.value)
                              }
                              onBlur={(event) =>
                                handleObjectContentBlur(object.id, event.currentTarget.value)
                              }
                            />

                            {object.locked && (
                              <span className="pointer-events-none absolute -top-6 right-0 rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                                🔒 잠김
                              </span>
                            )}

                            {selected && tool === "SELECT" && canEdit && !object.locked && (
                              <button
                                type="button"
                                aria-label="텍스트 박스 크기 조절"
                                title="드래그해서 텍스트 박스 크기 조절"
                                className="absolute -right-1 -bottom-1 z-30 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded border border-[var(--flow-border-strong)] bg-white text-[10px] font-bold text-[var(--flow-text-muted)] shadow-sm"
                                onPointerDown={(event) => handleObjectResizeStart(event, object)}
                                onPointerMove={handleObjectResizeMove}
                                onPointerUp={finishObjectResize}
                                onPointerCancel={finishObjectResize}
                              >
                                ◢
                              </button>
                            )}
                          </div>
                        );
                      })}


                      {shapeObjects.map((object) => {
                        const selected = object.id === selectedObjectId;
                        const strokeColor = object.strokeColor ?? DEFAULT_SHAPE_STROKE;
                        const strokeWidth = object.strokeWidth ?? DEFAULT_SHAPE_STROKE_WIDTH;

                        return (
                          <div
                            key={object.id}
                            className={[
                              "pointer-events-auto absolute overflow-visible",
                              selected && tool === "SELECT"
                                ? "ring-2 ring-[var(--flow-primary)] ring-offset-2"
                                : "",
                            ].join(" ")}
                            style={{
                              left: object.x,
                              top: object.y,
                              width: object.width,
                              height: object.height,
                              zIndex: object.zIndex + 10,
                              transform: `rotate(${object.rotation}deg)`,
                            }}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              if (tool === "SELECT") {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);
                              }
                            }}
                          >
                            {object.type === "ARROW" ? (
                              <svg
                                viewBox={`0 0 ${Math.max(1, object.width)} ${Math.max(1, object.height)}`}
                                className="h-full w-full overflow-visible"
                                aria-label="화살표"
                              >
                                <line
                                  x1="4"
                                  y1={object.height / 2}
                                  x2={Math.max(8, object.width - 18)}
                                  y2={object.height / 2}
                                  stroke={strokeColor}
                                  strokeWidth={strokeWidth}
                                  strokeLinecap="round"
                                />
                                <polygon
                                  points={`${Math.max(8, object.width - 20)},${Math.max(4, object.height / 2 - 10)} ${Math.max(8, object.width - 2)},${object.height / 2} ${Math.max(8, object.width - 20)},${Math.min(object.height - 4, object.height / 2 + 10)}`}
                                  fill={strokeColor}
                                />
                              </svg>
                            ) : (
                              <div
                                className="h-full w-full"
                                style={{
                                  borderRadius: object.type === "ELLIPSE" ? "9999px" : "12px",
                                  backgroundColor: object.fillColor ?? DEFAULT_SHAPE_FILL,
                                  border: `${strokeWidth}px solid ${strokeColor}`,
                                }}
                              />
                            )}

                            {object.locked && (
                              <span className="pointer-events-none absolute -top-6 right-0 rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                                🔒 잠김
                              </span>
                            )}

                            {selected && tool === "SELECT" && canEdit && !object.locked && (
                              <>
                                <button
                                  type="button"
                                  aria-label="도형 이동"
                                  title="드래그해서 이동"
                                  className="absolute -top-7 left-1/2 z-30 flex h-6 -translate-x-1/2 cursor-grab items-center rounded-md border border-[var(--flow-border)] bg-white px-2 text-[10px] font-bold text-[var(--flow-text-muted)] shadow-sm active:cursor-grabbing"
                                  onPointerDown={(event) => handleObjectDragStart(event, object)}
                                  onPointerMove={handleObjectDragMove}
                                  onPointerUp={finishObjectDrag}
                                  onPointerCancel={finishObjectDrag}
                                >
                                  이동
                                </button>
                                <button
                                  type="button"
                                  aria-label="도형 크기 조절"
                                  title="드래그해서 크기 조절"
                                  className="absolute -right-1 -bottom-1 z-30 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded border border-[var(--flow-border-strong)] bg-white text-[10px] font-bold text-[var(--flow-text-muted)] shadow-sm"
                                  onPointerDown={(event) => handleObjectResizeStart(event, object)}
                                  onPointerMove={handleObjectResizeMove}
                                  onPointerUp={finishObjectResize}
                                  onPointerCancel={finishObjectResize}
                                >
                                  ◢
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {imageObjects.map((object) => {
                        const selected = object.id === selectedObjectId;

                        return (
                          <div
                            key={object.id}
                            className={[
                              "pointer-events-auto absolute overflow-hidden rounded-lg bg-white shadow-sm",
                              selected && tool === "SELECT"
                                ? "ring-2 ring-[var(--flow-primary)] ring-offset-2"
                                : "",
                            ].join(" ")}
                            style={{
                              left: object.x,
                              top: object.y,
                              width: object.width,
                              height: object.height,
                              zIndex: object.zIndex + 10,
                              transform: `rotate(${object.rotation}deg)`,
                            }}
                            onPointerDown={(event) => {
                              event.stopPropagation();

                              if (tool === "SELECT") {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);
                              }
                            }}
                          >
                            <WhiteboardImageContent
                              boardId={boardId}
                              whiteboardId={selectedWhiteboardId as number}
                              objectId={object.id}
                              alt={object.content || `화이트보드 이미지 ${object.id}`}
                            />

                            {object.locked && (
                              <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-amber-50/95 px-2 py-1 text-[9px] font-bold text-amber-700 shadow-sm">
                                🔒 잠김
                              </span>
                            )}

                            {selected && tool === "SELECT" && canEdit && !object.locked && (
                              <>
                                <button
                                  type="button"
                                  aria-label="이미지 이동"
                                  title="드래그해서 이미지 이동"
                                  className="absolute top-2 left-1/2 z-30 flex h-6 -translate-x-1/2 cursor-grab items-center rounded-md border border-[var(--flow-border)] bg-white/95 px-2 text-[10px] font-bold text-[var(--flow-text-muted)] shadow-sm active:cursor-grabbing"
                                  onPointerDown={(event) => handleObjectDragStart(event, object)}
                                  onPointerMove={handleObjectDragMove}
                                  onPointerUp={finishObjectDrag}
                                  onPointerCancel={finishObjectDrag}
                                >
                                  이동
                                </button>
                                <button
                                  type="button"
                                  aria-label="이미지 크기 조절"
                                  title="드래그해서 이미지 크기 조절"
                                  className="absolute right-1 bottom-1 z-30 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded border border-[var(--flow-border-strong)] bg-white/95 text-[10px] font-bold text-[var(--flow-text-muted)] shadow-sm"
                                  onPointerDown={(event) => handleObjectResizeStart(event, object)}
                                  onPointerMove={handleObjectResizeMove}
                                  onPointerUp={finishObjectResize}
                                  onPointerCancel={finishObjectResize}
                                >
                                  ◢
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {Object.values(remoteCursors).map((cursor) => {
                        const color = getCursorColor(cursor.userId);
                        return (
                          <div
                            key={cursor.sourceClientId}
                            className="pointer-events-none absolute z-[999]"
                            style={{ left: cursor.x, top: cursor.y }}
                          >
                            <div
                              className="h-0 w-0 border-t-[6px] border-r-[10px] border-b-[6px] border-t-transparent border-b-transparent"
                              style={{ borderRightColor: color, transform: "rotate(-35deg)" }}
                            />
                            <span
                              className="ml-3 inline-flex -translate-y-1 rounded-md px-2 py-1 text-[9px] font-bold whitespace-nowrap text-white shadow-sm"
                              style={{ backgroundColor: color }}
                            >
                              {cursor.nickname}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        aria-label="캔버스 크기 조절"
                        title="드래그해서 캔버스 작업 영역 크기 조절"
                        className="absolute -right-3 -bottom-3 z-[1000] flex h-7 w-7 cursor-nwse-resize items-center justify-center rounded-lg border border-[var(--flow-primary-300)] bg-white text-[12px] font-black text-[var(--flow-primary)] shadow-md"
                        onPointerDown={handleCanvasResizeStart}
                        onPointerMove={handleCanvasResizeMove}
                        onPointerUp={finishCanvasResize}
                        onPointerCancel={finishCanvasResize}
                      >
                        ◢
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <aside
                className={[
                  "shrink-0 border-l border-[var(--flow-border)] bg-white transition-[width] duration-200",
                  layersOpen ? "w-[286px]" : "w-[48px]",
                ].join(" ")}
              >
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--flow-border)] px-3">
                    {layersOpen && (
                      <div>
                        <p className="text-[11px] font-bold text-[var(--flow-text)]">레이어</p>
                        <p className="text-[9px] text-[var(--flow-text-placeholder)]">객체 {objects.length}개</p>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={layersOpen ? "레이어 패널 닫기" : "레이어 패널 열기"}
                      title={layersOpen ? "레이어 패널 닫기" : "레이어 패널 열기"}
                      className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-[var(--flow-text-muted)] hover:bg-[var(--flow-gray-100)]"
                      onClick={() => setLayersOpen((current) => !current)}
                    >
                      {layersOpen ? "→" : "←"}
                    </button>
                  </div>

                  {layersOpen && (
                    <>
                      <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {orderedLayers.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[var(--flow-border-strong)] px-3 py-8 text-center text-[10px] leading-5 text-[var(--flow-text-placeholder)]">
                            스티키·텍스트·도형·이미지를 추가하면
                            <br />
                            여기에 레이어가 표시됩니다.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {orderedLayers.map((object) => {
                              const selected = object.id === selectedObjectId;
                              const isRenaming = layerRenameId === object.id;
                              const layerName = object.layerName?.trim() || getDefaultLayerName(object);

                              return (
                                <div
                                  key={object.id}
                                  draggable={canEdit && !reorderLayersMutation.isPending}
                                  onDragStart={() => setDraggedLayerId(object.id)}
                                  onDragEnd={() => setDraggedLayerId(null)}
                                  onDragOver={(event) => {
                                    if (canEdit) {
                                      event.preventDefault();
                                    }
                                  }}
                                  onDrop={(event) => handleLayerDrop(event, object.id)}
                                  onClick={() => {
                                    setTool("SELECT");
                                    setSelectedStrokeId(null);
                                    setSelectedObjectId(object.id);
                                  }}
                                  className={[
                                    "group flex min-h-10 items-center gap-1.5 rounded-lg border px-1.5 py-1 transition-colors",
                                    selected
                                      ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)]"
                                      : "border-transparent hover:border-[var(--flow-border)] hover:bg-[var(--flow-gray-50)]",
                                    draggedLayerId === object.id ? "opacity-40" : "",
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "flex h-7 w-5 shrink-0 items-center justify-center text-[11px] text-[var(--flow-text-placeholder)]",
                                      canEdit ? "cursor-grab active:cursor-grabbing" : "",
                                    ].join(" ")}
                                    title="드래그해서 레이어 순서 변경"
                                  >
                                    ⋮⋮
                                  </span>

                                  <button
                                    type="button"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] hover:bg-white"
                                    title={object.visible === false ? "레이어 표시" : "레이어 숨기기"}
                                    disabled={!canEdit || updateLayerMetadataMutation.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateLayerMetadataMutation.mutate({
                                        objectId: object.id,
                                        layerName: object.layerName,
                                        visible: object.visible === false,
                                      });
                                    }}
                                  >
                                    {object.visible === false ? "○" : "◉"}
                                  </button>

                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--flow-gray-100)] text-[11px] font-black text-[var(--flow-text-secondary)]">
                                    {getLayerTypeIcon(object.type)}
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    {isRenaming ? (
                                      <input
                                        autoFocus
                                        value={layerRenameDraft}
                                        maxLength={120}
                                        className="h-7 w-full rounded-md border border-[var(--flow-primary-300)] bg-white px-2 text-[10px] font-semibold text-[var(--flow-text)] outline-none"
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => setLayerRenameDraft(event.target.value)}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            commitLayerRename(object);
                                          } else if (event.key === "Escape") {
                                            setLayerRenameId(null);
                                            setLayerRenameDraft("");
                                          }
                                        }}
                                        onBlur={() => commitLayerRename(object)}
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        className={[
                                          "block w-full truncate text-left text-[10px] font-semibold",
                                          object.visible === false
                                            ? "text-[var(--flow-text-placeholder)] line-through"
                                            : "text-[var(--flow-text-secondary)]",
                                        ].join(" ")}
                                        title={`${layerName} · 더블클릭해서 이름 변경`}
                                        onDoubleClick={(event) => {
                                          event.stopPropagation();
                                          if (!canEdit) {
                                            return;
                                          }
                                          setLayerRenameId(object.id);
                                          setLayerRenameDraft(object.layerName ?? getDefaultLayerName(object));
                                        }}
                                      >
                                        {layerName}
                                      </button>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] hover:bg-white"
                                    title={object.locked ? "객체 잠금 해제" : "객체 잠금"}
                                    disabled={!canEdit || updateObjectLockMutation.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateObjectLockMutation.mutate({
                                        objectId: object.id,
                                        locked: !object.locked,
                                      });
                                    }}
                                  >
                                    {object.locked ? "🔒" : "🔓"}
                                  </button>

                                  <button
                                    type="button"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px] font-bold text-[var(--flow-text-placeholder)] hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                    title="레이어 삭제"
                                    disabled={!canEdit || object.locked || deleteObjectMutation.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedStrokeId(null);
                                      setSelectedObjectId(object.id);
                                      setDeletingObjectId(object.id);
                                      deleteObjectMutation.mutate(object.id, {
                                        onSettled: () => setDeletingObjectId(null),
                                      });
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 border-t border-[var(--flow-border)] px-3 py-2.5">
                        <p className="text-[9px] leading-4 text-[var(--flow-text-placeholder)]">
                          위에 있을수록 앞에 표시됩니다. 드래그로 순서를 바꾸고 ◉ 버튼으로 숨길 수 있습니다.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </aside>
              </div>

              <footer className="flex min-h-[58px] shrink-0 items-center justify-between gap-6 border-t border-[var(--flow-border)] bg-white px-5 py-3.5">
                <p className="min-w-0 text-[11px] leading-5 text-[var(--flow-text-muted)]">
                  {strokes.length === 0 && stickyNotes.length === 0 && textObjects.length === 0
                    ? canEdit
                      ? "아직 저장된 내용이 없습니다. 펜으로 그리거나 스티키·텍스트·이미지를 추가해보세요."
                      : "아직 저장된 내용이 없습니다."
                    : tool === "STICKY"
                      ? "캔버스를 클릭하면 새 스티키 노트를 추가할 수 있습니다."
                      : tool === "TEXT"
                        ? "캔버스를 클릭하면 새 텍스트를 추가할 수 있습니다."
                        : tool === "ERASER" && eraserMode === "STROKE"
                        ? "지우고 싶은 선을 클릭하면 선 전체가 삭제됩니다."
                        : "펜·스티키·텍스트 변경은 실시간으로 반영되며 최종 상태는 서버에 저장됩니다."}
                </p>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-[11px] whitespace-nowrap text-[var(--flow-text-placeholder)]">
                    {canvasWidth} × {canvasHeight}
                  </span>

                  <span className="text-[11px] font-semibold whitespace-nowrap text-[var(--flow-text-muted)]">
                    Zoom {Math.round(zoom * 100)}%
                  </span>

                  {isViewer && (
                    <span className="text-[11px] font-semibold whitespace-nowrap text-[var(--flow-text-muted)]">
                      VIEWER · 읽기 전용
                    </span>
                  )}
                </div>
              </footer>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

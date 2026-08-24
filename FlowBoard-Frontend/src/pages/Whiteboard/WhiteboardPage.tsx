import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";
import {
  clearWhiteboardWorkspace,
  createWhiteboard,
  createWhiteboardObject,
  createWhiteboardWorkspaceStroke,
  deleteWhiteboard,
  deleteWhiteboardObject,
  deleteWhiteboardWorkspaceStroke,
  getWhiteboards,
  getWhiteboardObjects,
  getWhiteboardWorkspaceStrokes,
  reorderWhiteboards,
  setDefaultWhiteboard,
  updateWhiteboard,
  updateWhiteboardAppearance,
  updateWhiteboardObject,
  type WhiteboardObjectResponse,
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
} from "@/services/whiteboardWebSocket";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

const DEFAULT_PEN_COLOR = "#111827";

const PEN_LINE_WIDTH = 4;
const ERASER_LINE_WIDTH = 28;

const STICKY_WIDTH = 220;
const STICKY_HEIGHT = 150;
const DEFAULT_STICKY_COLOR = "#FEF3C7";
const DEFAULT_STICKY_BORDER_COLOR = "#F59E0B";

const STROKE_CHUNK_POINT_LIMIT = 800;
const MIN_POINT_DISTANCE = 2;

/*
 * 선 지우기 모드에서
 * 실제 선에서 몇 px 정도 떨어진 클릭까지 허용할지 결정합니다.
 */
const STROKE_HIT_TOLERANCE = 10;

type EraserMode = "PIXEL" | "STROKE";

type WhiteboardInteractionTool = WhiteboardTool | "SELECT" | "HAND" | "STICKY";

interface DrawableStroke {
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
}

interface ActiveStroke extends DrawableStroke {
  gestureId: string;
  hasSavedChunk: boolean;
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

const isTextEditingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
};

export default function WhiteboardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const queryClient = useQueryClient();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const activeStrokeRef = useRef<ActiveStroke | null>(null);

  const activePointerIdRef = useRef<number | null>(null);

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const saveErrorShownRef = useRef(false);

  const undoHistoryRef = useRef<UndoGesture[]>([]);

  const redoHistoryRef = useRef<RedoGesture[]>([]);

  const panSessionRef = useRef<PanSession | null>(null);

  const objectDragSessionRef = useRef<ObjectDragSession | null>(null);

  const composingStickyIdsRef = useRef<Set<number>>(new Set());

  const [undoGestureCount, setUndoGestureCount] = useState(0);

  const [redoGestureCount, setRedoGestureCount] = useState(0);

  const [queuedSaveCount, setQueuedSaveCount] = useState(0);

  const [isUndoing, setIsUndoing] = useState(false);

  const [isRedoing, setIsRedoing] = useState(false);

  const [deletingStrokeId, setDeletingStrokeId] = useState<number | null>(null);

  const [tool, setTool] = useState<WhiteboardInteractionTool>("PEN");

  const [selectedStrokeId, setSelectedStrokeId] = useState<number | null>(null);

  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);

  const [stickyDrafts, setStickyDrafts] = useState<Record<number, string>>({});

  const [deletingObjectId, setDeletingObjectId] = useState<number | null>(null);

  const [zoom, setZoom] = useState(1);

  const [isPanning, setIsPanning] = useState(false);

  const [eraserMode, setEraserMode] = useState<EraserMode>("PIXEL");

  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);

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
    () => objects.filter((object) => object.type === "STICKY_NOTE"),
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

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

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
    mutationFn: ({ x, y }: { x: number; y: number }) => {
      if (selectedWhiteboardId === null) {
        return Promise.reject(new Error("선택된 화이트보드가 없습니다."));
      }

      return createWhiteboardObject(boardId, selectedWhiteboardId, {
        clientObjectId: crypto.randomUUID(),
        type: "STICKY_NOTE",
        x,
        y,
        width: STICKY_WIDTH,
        height: STICKY_HEIGHT,
        rotation: 0,
        content: "",
        fillColor: DEFAULT_STICKY_COLOR,
        strokeColor: DEFAULT_STICKY_BORDER_COLOR,
        strokeWidth: 1,
        fontSize: 14,
        propertiesJson: null,
      });
    },

    onSuccess: (createdObject) => {
      queryClient.setQueryData<WhiteboardObjectResponse[]>(
        whiteboardObjectsQueryKey,
        (current = []) => [...current, createdObject],
      );

      setSelectedStrokeId(null);
      setSelectedObjectId(createdObject.id);
      setTool("SELECT");
      toast.success("스티키 노트를 추가했습니다.");
    },

    onError: () => {
      toast.error("스티키 노트를 추가하지 못했습니다.");
    },
  });

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
      toast.error("스티키 노트를 저장하지 못했습니다.");
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
      gridEnabled,
    }: {
      whiteboardId: number;
      title: string;
      description: string | null;
      backgroundColor: string;
      gridEnabled: boolean;
    }) => {
      await updateWhiteboard(boardId, whiteboardId, {
        title,
        description,
      });

      return updateWhiteboardAppearance(boardId, whiteboardId, {
        backgroundColor,
        gridEnabled,
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
    if (!canEdit || selectedObjectId === null || deleteObjectMutation.isPending) {
      return;
    }

    setDeletingObjectId(selectedObjectId);

    try {
      await deleteObjectMutation.mutateAsync(selectedObjectId);
    } finally {
      setDeletingObjectId(null);
    }
  }, [canEdit, deleteObjectMutation, selectedObjectId]);

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

  const handleStickyContentChange = useCallback((objectId: number, content: string) => {
    /*
     * 한글 IME는 한 글자를 입력하는 동안 composition 상태를 유지합니다.
     * 이때 React Query 캐시를 매 키 입력마다 갱신하면 외부 store 업데이트로
     * textarea의 value가 다시 주입되어 조합 중인 글자가 중복되거나 깨질 수 있습니다.
     *
     * 입력 중에는 로컬 draft만 변경하고, 포커스를 잃을 때 한 번만
     * React Query 캐시와 서버에 반영합니다.
     */
    setStickyDrafts((current) => ({
      ...current,
      [objectId]: content,
    }));
  }, []);

  const handleStickyContentBlur = useCallback(
    (objectId: number, content: string) => {
      composingStickyIdsRef.current.delete(objectId);

      const currentObjects =
        queryClient.getQueryData<WhiteboardObjectResponse[]>(whiteboardObjectsQueryKey) ?? [];
      const object = currentObjects.find((item) => item.id === objectId);

      setStickyDrafts((current) => {
        if (!(objectId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[objectId];

        return next;
      });

      if (!object || !canEdit) {
        return;
      }

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

  const handleStickyDragStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, object: WhiteboardObjectResponse) => {
      if (!canEdit || tool !== "SELECT") {
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

  const handleStickyDragMove = useCallback(
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
      const nextX = Math.min(CANVAS_WIDTH - object.width, Math.max(0, session.startX + deltaX));
      const nextY = Math.min(CANVAS_HEIGHT - object.height, Math.max(0, session.startY + deltaY));

      updateObjectInCache(object.id, (current) => ({
        ...current,
        x: nextX,
        y: nextY,
      }));
    },
    [queryClient, updateObjectInCache, whiteboardObjectsQueryKey, zoom],
  );

  const finishStickyDrag = useCallback(
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
        updateObjectMutation.mutate(object);
      }
    },
    [queryClient, updateObjectMutation, whiteboardObjectsQueryKey],
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

    const currentQueryKey = ["whiteboard", boardId, selectedWhiteboardId, "strokes"] as const;

    const disconnect = connectWhiteboardWebSocket({
      boardId,
      whiteboardId: selectedWhiteboardId,

      onConnectionStateChange: setConnectionState,

      onEvent: (event) => {
        if (event.type === "STROKE_CREATED" && event.stroke) {
          queryClient.setQueryData<WhiteboardStrokeResponse[]>(currentQueryKey, (current = []) =>
            appendStrokeIfMissing(current, event.stroke as WhiteboardStrokeResponse),
          );

          return;
        }

        if (event.type === "STROKE_DELETED" && event.strokeId !== null) {
          const deletedStrokeId = event.strokeId;

          queryClient.setQueryData<WhiteboardStrokeResponse[]>(currentQueryKey, (current = []) =>
            current.filter((stroke) => stroke.id !== deletedStrokeId),
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

          queryClient.setQueryData<WhiteboardStrokeResponse[]>(currentQueryKey, []);
          clearUndoHistory();
        }
      },

      onError: (error) => {
        console.error("[Whiteboard WebSocket]", error);
      },
    });

    return disconnect;
  }, [
    boardId,
    clearUndoHistory,
    isValidBoardId,
    queryClient,
    removeStrokeFromUndoHistory,
    selectedWhiteboardId,
  ]);

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

    if (selectedStroke) {
      drawSelectionOutline(context, selectedStroke);
    }
  }, [selectedStroke, strokes]);

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

    lineWidth: tool === "PEN" ? PEN_LINE_WIDTH : ERASER_LINE_WIDTH,
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
    const widthScale = (viewport.clientWidth - horizontalPadding) / CANVAS_WIDTH;
    const heightScale = (viewport.clientHeight - verticalPadding) / CANVAS_HEIGHT;

    changeZoom(Math.min(1, widthScale, heightScale));

    window.requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  }, [changeZoom]);

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
      const x = Math.min(CANVAS_WIDTH - STICKY_WIDTH, Math.max(0, firstPoint.x - STICKY_WIDTH / 2));
      const y = Math.min(
        CANVAS_HEIGHT - STICKY_HEIGHT,
        Math.max(0, firstPoint.y - STICKY_HEIGHT / 2),
      );

      setSelectedStrokeId(null);
      setSelectedObjectId(null);
      createObjectMutation.mutate({ x, y });
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

    activeStrokeRef.current = {
      gestureId: crypto.randomUUID(),

      tool,

      color,

      lineWidth,

      points: [firstPoint],

      hasSavedChunk: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
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

    activeStrokeRef.current = {
      ...activeStroke,

      points: nextPoints,
    };

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
    setWorkspaceGridEnabled(selectedWhiteboard.gridEnabled);
    setSettingsModalOpen(true);
  };

  const handleCreateWhiteboard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = workspaceTitle.trim();

    if (!title || !canEdit) {
      return;
    }

    createWhiteboardMutation.mutate({
      title,
      description: workspaceDescription.trim() || null,
    });
  };

  const handleSaveWorkspaceSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWhiteboard || !canEdit) {
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
      gridEnabled: workspaceGridEnabled,
    });
  };

  const handleSetDefaultWhiteboard = () => {
    if (!selectedWhiteboard || !canEdit || selectedWhiteboard.defaultWhiteboard) {
      return;
    }

    defaultWhiteboardMutation.mutate(selectedWhiteboard.id);
  };

  const handleMoveWhiteboard = (direction: -1 | 1) => {
    if (!selectedWhiteboard || !canEdit || reorderWhiteboardsMutation.isPending) {
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
    if (!selectedWhiteboard || !canEdit || whiteboards.length <= 1) {
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
    (selectedStrokeId !== null || selectedObjectId !== null) &&
    deletingStrokeId === null &&
    deletingObjectId === null &&
    !isUndoing &&
    !isRedoing;

  const isBusy =
    isUndoing ||
    isRedoing ||
    deletingStrokeId !== null ||
    deletingObjectId !== null ||
    createObjectMutation.isPending;

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
            disabled={!canEdit || updateWhiteboardMutation.isPending}
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
              disabled={!canEdit || updateWhiteboardMutation.isPending}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              className="mt-1.5 w-full resize-none rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--flow-text)] transition-[border-color,box-shadow] outline-none focus:border-[var(--flow-primary-500)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--flow-gray-100)]"
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-3">
              <span className="block text-[11px] font-bold text-[var(--flow-text-secondary)]">
                배경색
              </span>

              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={workspaceBackgroundColor}
                  disabled={!canEdit || updateWhiteboardMutation.isPending}
                  onChange={(event) => setWorkspaceBackgroundColor(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--flow-border-strong)] bg-white p-1 disabled:cursor-not-allowed"
                />

                <span className="font-mono text-[10px] font-semibold text-[var(--flow-text-muted)]">
                  {workspaceBackgroundColor.toUpperCase()}
                </span>
              </div>
            </label>

            <div className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-3">
              <span className="block text-[11px] font-bold text-[var(--flow-text-secondary)]">
                그리드
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={workspaceGridEnabled}
                disabled={!canEdit || updateWhiteboardMutation.isPending}
                onClick={() => setWorkspaceGridEnabled((current) => !current)}
                className={[
                  "mt-2 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[10px] font-bold transition-colors",
                  workspaceGridEnabled
                    ? "border-[var(--flow-primary-300)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]"
                    : "border-[var(--flow-border-strong)] bg-white text-[var(--flow-text-muted)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    workspaceGridEnabled ? "bg-[var(--flow-primary)]" : "bg-[var(--flow-gray-300)]",
                  ].join(" ")}
                />
                {workspaceGridEnabled ? "표시" : "숨김"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--flow-border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--flow-text-secondary)]">
                  기본 화이트보드
                </p>
                <p className="mt-1 text-[10px] leading-5 text-[var(--flow-text-muted)]">
                  화이트보드 메뉴에 처음 들어왔을 때 기본으로 열리는 작업 공간입니다.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant={selectedWhiteboard?.defaultWhiteboard ? "outline" : "primary"}
                disabled={
                  !canEdit ||
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
                  !canEdit || selectedWhiteboardIndex <= 0 || reorderWhiteboardsMutation.isPending
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
                  !canEdit ||
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
              disabled={!canEdit || whiteboards.length <= 1 || deleteWhiteboardMutation.isPending}
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
                disabled={!canEdit || !workspaceTitle.trim()}
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
                    : `선 ${strokes.length.toLocaleString()}개 · 스티키 ${stickyNotes.length.toLocaleString()}개`}
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

              {canEdit && (
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

                <span>{selectedWhiteboard?.gridEnabled ? "Grid ON" : "Grid OFF"}</span>
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

              {/* Pen color */}
              <label className="flex items-center gap-3 text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                <span className="whitespace-nowrap">펜 색상</span>

                <span className="relative flex h-10 w-10 overflow-hidden rounded-xl border border-[var(--flow-border-strong)] bg-white shadow-[var(--flow-shadow-xs)]">
                  <input
                    type="color"
                    value={penColor}
                    disabled={!canEdit || tool !== "PEN" || isBusy}
                    onChange={(event) => setPenColor(event.target.value)}
                    aria-label="펜 색상 선택"
                    className="absolute -inset-2 h-14 w-14 cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </span>

                <span
                  className="h-3 w-3 rounded-full border border-black/5"
                  style={{ backgroundColor: penColor }}
                />

                <span className="font-mono text-[11px] font-medium text-[var(--flow-text-muted)]">
                  {penColor.toUpperCase()}
                </span>
              </label>

              {/* Eraser mode */}
              {tool === "ERASER" && (
                <>
                  <span className="hidden h-7 w-px bg-[var(--flow-border)] min-[1180px]:block" />

                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-semibold whitespace-nowrap text-[var(--flow-text-secondary)]">
                      지우기 방식
                    </span>

                    <div className="flex items-center rounded-xl bg-[var(--flow-gray-100)] p-1">
                      <button
                        type="button"
                        disabled={!canEdit || isBusy}
                        onClick={() => setEraserMode("PIXEL")}
                        className={[
                          "h-8 rounded-lg px-3 text-[11px] font-semibold whitespace-nowrap transition-colors",
                          eraserMode === "PIXEL"
                            ? "bg-white text-[var(--flow-primary)] shadow-[var(--flow-shadow-xs)]"
                            : "text-[var(--flow-text-muted)] hover:text-[var(--flow-text)]",
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
                          "h-8 rounded-lg px-3 text-[11px] font-semibold whitespace-nowrap transition-colors",
                          eraserMode === "STROKE"
                            ? "bg-white text-[var(--flow-primary)] shadow-[var(--flow-shadow-xs)]"
                            : "text-[var(--flow-text-muted)] hover:text-[var(--flow-text)]",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        ].join(" ")}
                      >
                        선 전체 지우기
                      </button>
                    </div>
                  </div>
                </>
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
                          ? `지우개를 움직인 부분만 지웁니다. 지우개 굵기 ${ERASER_LINE_WIDTH}px`
                          : "지우고 싶은 선을 클릭하면 해당 선 전체가 삭제됩니다."
                        : `펜으로 자유롭게 그릴 수 있습니다. 기본 굵기 ${PEN_LINE_WIDTH}px`}
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
              <div
                ref={viewportRef}
                className="min-h-0 flex-1 overflow-auto bg-[var(--flow-gray-100)] p-5"
              >
                <div className="flex min-h-full min-w-full items-start justify-center">
                  <div
                    className="relative shrink-0"
                    style={{
                      width: CANVAS_WIDTH * zoom,
                      height: CANVAS_HEIGHT * zoom,
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
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
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        backgroundColor: selectedWhiteboard?.backgroundColor ?? "#FFFFFF",
                        backgroundImage: selectedWhiteboard?.gridEnabled
                          ? "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)"
                          : "none",
                        backgroundSize: "24px 24px",
                      }}
                    />

                    <div
                      className="pointer-events-none absolute top-0 left-0"
                      style={{
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
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
                                canEdit && tool === "SELECT"
                                  ? "드래그해서 스티키 노트 이동"
                                  : "선택 도구에서 이동할 수 있습니다."
                              }
                              className={[
                                "flex h-8 w-full items-center justify-between border-b px-3 text-left",
                                "border-black/10 bg-black/[0.035]",
                                canEdit && tool === "SELECT"
                                  ? "cursor-grab active:cursor-grabbing"
                                  : "cursor-default",
                              ].join(" ")}
                              onPointerDown={(event) => handleStickyDragStart(event, object)}
                              onPointerMove={handleStickyDragMove}
                              onPointerUp={finishStickyDrag}
                              onPointerCancel={finishStickyDrag}
                            >
                              <span className="text-[11px] font-bold text-slate-700">메모</span>

                              <span className="text-[10px] font-semibold text-slate-500">
                                {object.createdByNickname}
                              </span>
                            </button>

                            <textarea
                              value={stickyDrafts[object.id] ?? object.content ?? ""}
                              readOnly={!canEdit}
                              maxLength={10000}
                              placeholder={canEdit ? "메모를 입력하세요" : "내용 없음"}
                              aria-label="스티키 노트 내용"
                              className={[
                                "w-full resize-none bg-transparent px-3 py-2.5",
                                "text-[13px] leading-6 text-slate-800 outline-none placeholder:text-slate-500/70",
                                !canEdit ? "cursor-default" : "",
                              ].join(" ")}
                              style={{
                                height: "calc(100% - 32px)",
                                fontSize: object.fontSize ?? 14,
                              }}
                              onFocus={() => {
                                setSelectedStrokeId(null);
                                setSelectedObjectId(object.id);

                                setStickyDrafts((current) => {
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
                                composingStickyIdsRef.current.add(object.id);
                              }}
                              onCompositionEnd={(event) => {
                                composingStickyIdsRef.current.delete(object.id);
                                handleStickyContentChange(object.id, event.currentTarget.value);
                              }}
                              onChange={(event) =>
                                handleStickyContentChange(object.id, event.target.value)
                              }
                              onBlur={(event) =>
                                handleStickyContentBlur(object.id, event.currentTarget.value)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="flex min-h-[58px] shrink-0 items-center justify-between gap-6 border-t border-[var(--flow-border)] bg-white px-5 py-3.5">
                <p className="min-w-0 text-[11px] leading-5 text-[var(--flow-text-muted)]">
                  {strokes.length === 0 && stickyNotes.length === 0
                    ? canEdit
                      ? "아직 저장된 내용이 없습니다. 펜으로 그리거나 스티키 노트를 추가해보세요."
                      : "아직 저장된 내용이 없습니다."
                    : tool === "STICKY"
                      ? "캔버스를 클릭하면 새 스티키 노트를 추가할 수 있습니다."
                      : tool === "ERASER" && eraserMode === "STROKE"
                        ? "지우고 싶은 선을 클릭하면 선 전체가 삭제됩니다."
                        : "펜 드로잉은 실시간으로 반영되며 스티키 노트는 서버에 저장됩니다."}
                </p>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-[11px] whitespace-nowrap text-[var(--flow-text-placeholder)]">
                    {CANVAS_WIDTH} × {CANVAS_HEIGHT}
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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";
import {
  clearWhiteboard,
  createWhiteboardStroke,
  deleteWhiteboardStroke,
  getWhiteboardStrokes,
  type WhiteboardPoint,
  type WhiteboardStrokeCreateRequest,
  type WhiteboardStrokeResponse,
  type WhiteboardTool,
} from "@/api/whiteboard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import {
  connectWhiteboardWebSocket,
  type WhiteboardConnectionState,
} from "@/services/whiteboardWebSocket";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

const DEFAULT_PEN_COLOR = "#111827";

const PEN_LINE_WIDTH = 4;
const ERASER_LINE_WIDTH = 28;

const STROKE_CHUNK_POINT_LIMIT = 800;
const MIN_POINT_DISTANCE = 2;

/*
 * 선 지우기 모드에서
 * 실제 선에서 몇 px 정도 떨어진 클릭까지 허용할지 결정합니다.
 */
const STROKE_HIT_TOLERANCE = 10;

type EraserMode = "PIXEL" | "STROKE";

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

  const activeStrokeRef = useRef<ActiveStroke | null>(null);

  const activePointerIdRef = useRef<number | null>(null);

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const saveErrorShownRef = useRef(false);

  const undoHistoryRef = useRef<UndoGesture[]>([]);

  const [undoGestureCount, setUndoGestureCount] = useState(0);

  const [queuedSaveCount, setQueuedSaveCount] = useState(0);

  const [isUndoing, setIsUndoing] = useState(false);

  const [deletingStrokeId, setDeletingStrokeId] = useState<number | null>(null);

  const [tool, setTool] = useState<WhiteboardTool>("PEN");

  const [eraserMode, setEraserMode] = useState<EraserMode>("PIXEL");

  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);

  const [connectionState, setConnectionState] = useState<WhiteboardConnectionState>("connecting");

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const whiteboardQueryKey = ["whiteboard", boardId, "strokes"] as const;

  const boardQueryKey = ["boards", boardId] as const;

  const syncUndoGestureCount = useCallback(() => {
    setUndoGestureCount(undoHistoryRef.current.length);
  }, []);

  const clearUndoHistory = useCallback(() => {
    undoHistoryRef.current = [];

    syncUndoGestureCount();
  }, [syncUndoGestureCount]);

  const registerStrokeForGesture = useCallback(
    (gestureId: string, strokeId: number) => {
      const history = undoHistoryRef.current;

      const existingGesture = history.find((gesture) => gesture.gestureId === gestureId);

      if (existingGesture) {
        if (!existingGesture.strokeIds.includes(strokeId)) {
          existingGesture.strokeIds.push(strokeId);
        }

        syncUndoGestureCount();

        return;
      }

      history.push({
        gestureId,

        strokeIds: [strokeId],
      });

      syncUndoGestureCount();
    },
    [syncUndoGestureCount],
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
    data: strokes = [],
    isLoading: isStrokesLoading,
    isError: isStrokesError,
    refetch: refetchStrokes,
  } = useQuery({
    queryKey: whiteboardQueryKey,

    queryFn: () => getWhiteboardStrokes(boardId),

    enabled: isValidBoardId,
  });

  const canEdit = board?.myRole === "OWNER" || board?.myRole === "MEMBER";

  const isViewer = board?.myRole === "VIEWER";

  const createStrokeMutation = useMutation({
    mutationFn: ({ request }: CreateStrokeMutationVariables) =>
      createWhiteboardStroke(boardId, request),

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
    mutationFn: () => clearWhiteboard(boardId),

    onSuccess: () => {
      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, []);

      clearUndoHistory();

      toast.success("화이트보드를 초기화했습니다.");
    },

    onError: () => {
      toast.error("화이트보드를 초기화하지 못했습니다.");
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

    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }

    activeStrokeRef.current = null;

    activePointerIdRef.current = null;
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

      await deleteWhiteboardStroke(boardId, targetStroke.id);

      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
        current.filter((stroke) => stroke.id !== targetStroke.id),
      );

      removeStrokeFromUndoHistory(targetStroke.id);
    } catch {
      toast.error("선을 삭제하지 못했습니다.");

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    } finally {
      setDeletingStrokeId(null);
    }
  };

  const handleUndo = useCallback(async () => {
    if (!canEdit || isUndoing) {
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

      if (!gesture || gesture.strokeIds.length === 0) {
        return;
      }

      undoHistoryRef.current = history.slice(0, -1);

      syncUndoGestureCount();

      const strokeIds = [...gesture.strokeIds].reverse();

      for (const strokeId of strokeIds) {
        await deleteWhiteboardStroke(boardId, strokeId);

        queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
          current.filter((stroke) => stroke.id !== strokeId),
        );
      }
    } catch {
      toast.error("실행 취소 중 문제가 발생했습니다. 화이트보드를 다시 동기화합니다.");

      await queryClient.invalidateQueries({
        queryKey: whiteboardQueryKey,
      });
    } finally {
      setIsUndoing(false);
    }
  }, [boardId, canEdit, isUndoing, queryClient, syncUndoGestureCount, whiteboardQueryKey]);

  useEffect(() => {
    if (!isValidBoardId) {
      return;
    }

    const currentQueryKey = ["whiteboard", boardId, "strokes"] as const;

    const disconnect = connectWhiteboardWebSocket({
      boardId,

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
  }, [boardId, clearUndoHistory, isValidBoardId, queryClient, removeStrokeFromUndoHistory]);

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
  }, [strokes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";

      if (!isUndoShortcut) {
        return;
      }

      if (isTextEditingTarget(event.target)) {
        return;
      }

      if (!canEdit || undoHistoryRef.current.length === 0 || activeStrokeRef.current) {
        return;
      }

      event.preventDefault();

      void handleUndo();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canEdit, handleUndo]);

  const getCurrentStyle = () => ({
    color: tool === "PEN" ? penColor : "#FFFFFF",

    lineWidth: tool === "PEN" ? PEN_LINE_WIDTH : ERASER_LINE_WIDTH,
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      !canEdit ||
      !isValidBoardId ||
      isStrokesLoading ||
      isStrokesError ||
      isUndoing ||
      deletingStrokeId !== null
    ) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const firstPoint = getCanvasPoint(canvas, event);

    /*
     * 선 지우기 모드는 그림을 시작하지 않고
     * 클릭한 위치에서 가장 가까운 PEN Stroke를 찾아
     * 전체 삭제합니다.
     */
    if (tool === "ERASER" && eraserMode === "STROKE") {
      void handleDeleteWholeStroke(firstPoint);

      return;
    }

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
    await Promise.all([refetchBoard(), refetchStrokes()]);
  };

  if (!isValidBoardId) {
    return (
      <section className="w-full max-w-4xl px-6 py-10">
        <Card>
          <h1 className="text-xl font-bold text-slate-900">화이트보드를 열 수 없습니다.</h1>

          <p className="mt-2 text-sm text-slate-500">올바른 보드 ID가 필요합니다.</p>
        </Card>
      </section>
    );
  }

  const isLoading = isBoardLoading || isStrokesLoading;

  const isError = isBoardError || isStrokesError;

  const isSaving = queuedSaveCount > 0;

  const canUndo = canEdit && undoGestureCount > 0 && !isUndoing && deletingStrokeId === null;

  const isBusy = isUndoing || deletingStrokeId !== null;

  const canvasCursorClass = !canEdit
    ? "cursor-default"
    : tool === "ERASER" && eraserMode === "STROKE"
      ? "cursor-pointer"
      : "cursor-crosshair";

  return (
    <>
      <LoadingOverlay open={isLoading} text="화이트보드를 불러오는 중..." />

      <ConfirmDialog
        open={clearDialogOpen}
        title="화이트보드 전체 초기화"
        description="현재 화이트보드에 저장된 모든 선이 삭제됩니다. 다른 참여자의 화면에서도 즉시 초기화되며 되돌릴 수 없습니다."
        confirmText="전체 초기화"
        cancelText="취소"
        loading={clearWhiteboardMutation.isPending}
        onConfirm={handleClearWhiteboard}
        onCancel={() => setClearDialogOpen(false)}
      />

      <section className="flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              {board ? board.title : `Board #${boardId}`}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">화이트보드</h1>

            <p className="mt-2 text-sm text-slate-500">
              {isViewer
                ? "VIEWER 권한으로 참여 중입니다. 화이트보드는 조회만 할 수 있습니다."
                : "펜으로 그리고, 지우개 방식을 선택하거나 Ctrl+Z로 마지막 작업을 실행 취소할 수 있습니다."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {board && (
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isViewer ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"
                }`}
              >
                {board.myRole}
              </span>
            )}

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${getConnectionClassName(
                connectionState,
              )}`}
            >
              {getConnectionLabel(connectionState)}
            </span>

            <span className="text-sm text-slate-500">
              {isSaving
                ? `선 저장 중... (${queuedSaveCount})`
                : deletingStrokeId !== null
                  ? "선 삭제 중..."
                  : `저장된 선 ${strokes.length.toLocaleString()}개`}
            </span>
          </div>
        </div>

        {isViewer && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">읽기 전용 화이트보드</p>

            <p className="mt-1 text-xs text-slate-500">
              VIEWER는 다른 참여자의 그림과 변경사항을 실시간으로 볼 수 있지만, 화이트보드를 수정할
              수 없습니다.
            </p>
          </div>
        )}

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={tool === "PEN" ? "primary" : "outline"}
              aria-pressed={tool === "PEN"}
              disabled={!canEdit || isBusy}
              onClick={() => setTool("PEN")}
            >
              PEN
            </Button>

            <Button
              type="button"
              variant={tool === "ERASER" ? "primary" : "outline"}
              aria-pressed={tool === "ERASER"}
              disabled={!canEdit || isBusy}
              onClick={() => setTool("ERASER")}
            >
              ERASER
            </Button>

            {tool === "ERASER" && (
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  disabled={!canEdit || isBusy}
                  onClick={() => setEraserMode("PIXEL")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    eraserMode === "PIXEL"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  부분 지우기
                </button>

                <button
                  type="button"
                  disabled={!canEdit || isBusy}
                  onClick={() => setEraserMode("STROKE")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    eraserMode === "STROKE"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  선 지우기
                </button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={!canUndo}
              onClick={() => void handleUndo()}
            >
              {isUndoing ? "실행 취소 중..." : "↶ 실행 취소"}
            </Button>

            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
              Ctrl + Z
            </span>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              펜 색상
              <input
                type="color"
                value={penColor}
                disabled={!canEdit || tool === "ERASER" || isBusy}
                onChange={(event) => setPenColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="펜 색상 선택"
              />
            </label>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-slate-400">
                {tool === "ERASER"
                  ? eraserMode === "PIXEL"
                    ? `부분 지우기 · ${ERASER_LINE_WIDTH}px`
                    : "선 지우기 · 클릭"
                  : `PEN · ${PEN_LINE_WIDTH}px`}
              </span>

              <Button
                type="button"
                variant="danger"
                disabled={
                  !canEdit || strokes.length === 0 || clearWhiteboardMutation.isPending || isBusy
                }
                onClick={() => setClearDialogOpen(true)}
              >
                전체 초기화
              </Button>
            </div>
          </div>
        </Card>

        {tool === "ERASER" && eraserMode === "STROKE" && canEdit && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-800">선 지우기 모드</p>

            <p className="mt-1 text-xs leading-5 text-blue-600">
              캔버스에서 지우고 싶은 선을 클릭하세요. 겹친 경우 가장 최근에 그린 선이 먼저
              삭제됩니다.
            </p>
          </div>
        )}

        {isError ? (
          <Card>
            <div className="flex flex-col items-start gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  화이트보드를 불러오지 못했습니다.
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  보드 접근 권한, 로그인 상태와 백엔드 실행 여부를 확인한 뒤 다시 시도해주세요.
                </p>
              </div>

              <Button type="button" variant="outline" onClick={() => void handleRetry()}>
                다시 불러오기
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-auto bg-slate-100 p-4">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerCancel={handlePointerCancel}
                aria-label={`보드 ${boardId} 화이트보드`}
                aria-disabled={!canEdit}
                className={`h-auto w-full min-w-[900px] touch-none rounded-lg border border-slate-200 bg-white shadow-sm ${canvasCursorClass}`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">
                {strokes.length === 0
                  ? canEdit
                    ? "아직 저장된 선이 없습니다. 캔버스에 바로 그려보세요."
                    : "아직 저장된 선이 없습니다."
                  : tool === "ERASER" && eraserMode === "STROKE"
                    ? "지우고 싶은 선을 클릭하면 선 전체가 삭제됩니다."
                    : "저장된 선을 불러왔습니다. 다른 참여자의 변경사항도 실시간으로 반영됩니다."}
              </p>

              <div className="flex items-center gap-3">
                {canEdit && undoGestureCount > 0 && (
                  <span className="text-xs text-slate-400">
                    실행 취소 가능 {undoGestureCount}회
                  </span>
                )}

                {isSaving && (
                  <span className="text-xs font-medium text-blue-600">
                    저장 대기 {queuedSaveCount}개
                  </span>
                )}

                {isViewer && (
                  <span className="text-xs font-medium text-slate-500">VIEWER · 읽기 전용</span>
                )}
              </div>
            </div>
          </Card>
        )}
      </section>
    </>
  );
}

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import { getBoardDetail } from "@/api/board";
import {
  clearWhiteboard,
  createWhiteboardStroke,
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

interface DrawableStroke {
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
}

interface ActiveStroke extends DrawableStroke {
  hasSavedChunk: boolean;
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

  const [queuedSaveCount, setQueuedSaveCount] = useState(0);

  const [tool, setTool] = useState<WhiteboardTool>("PEN");

  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);

  const [connectionState, setConnectionState] = useState<WhiteboardConnectionState>("connecting");

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const whiteboardQueryKey = ["whiteboard", boardId, "strokes"] as const;

  const boardQueryKey = ["boards", boardId] as const;

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
    mutationFn: (data: WhiteboardStrokeCreateRequest) => createWhiteboardStroke(boardId, data),

    onSuccess: (savedStroke) => {
      saveErrorShownRef.current = false;

      queryClient.setQueryData<WhiteboardStrokeResponse[]>(whiteboardQueryKey, (current = []) =>
        appendStrokeIfMissing(current, savedStroke),
      );
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

      toast.success("화이트보드를 초기화했습니다.");
    },

    onError: () => {
      toast.error("화이트보드를 초기화하지 못했습니다.");
    },
  });

  const enqueueStrokeSave = (stroke: DrawableStroke) => {
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
      await createStrokeMutation.mutateAsync(request);
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
        }
      },

      onError: (error) => {
        console.error("[Whiteboard WebSocket]", error);
      },
    });

    return disconnect;
  }, [boardId, isValidBoardId, queryClient]);

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

  const getCurrentStyle = () => ({
    color: tool === "PEN" ? penColor : "#FFFFFF",

    lineWidth: tool === "PEN" ? PEN_LINE_WIDTH : ERASER_LINE_WIDTH,
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || !isValidBoardId || isStrokesLoading || isStrokesError) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const firstPoint = getCanvasPoint(canvas, event);

    const { color, lineWidth } = getCurrentStyle();

    canvas.setPointerCapture(event.pointerId);

    activePointerIdRef.current = event.pointerId;

    activeStrokeRef.current = {
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
      enqueueStrokeSave({
        tool: activeStroke.tool,

        color: activeStroke.color,

        lineWidth: activeStroke.lineWidth,

        points: nextPoints,
      });

      activeStrokeRef.current = {
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

    const { points, hasSavedChunk, ...strokeStyle } = activeStroke;

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

      enqueueStrokeSave({
        ...strokeStyle,
        points,
      });

      return;
    }

    enqueueStrokeSave({
      ...strokeStyle,
      points,
    });
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
      enqueueStrokeSave({
        tool: activeStroke.tool,

        color: activeStroke.color,

        lineWidth: activeStroke.lineWidth,

        points: activeStroke.points,
      });
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
                : "펜과 지우개로 자유롭게 그리고, 저장된 그림은 참여자와 실시간으로 동기화됩니다."}
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
                : `저장된 선 ${strokes.length.toLocaleString()}개`}
            </span>
          </div>
        </div>

        {isViewer && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">읽기 전용 화이트보드</p>

            <p className="mt-1 text-xs text-slate-500">
              VIEWER는 다른 참여자의 그림과 변경사항을 실시간으로 볼 수 있지만, 선을 그리거나
              지우거나 전체 초기화할 수 없습니다.
            </p>
          </div>
        )}

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={tool === "PEN" ? "primary" : "outline"}
              aria-pressed={tool === "PEN"}
              disabled={!canEdit}
              onClick={() => setTool("PEN")}
            >
              PEN
            </Button>

            <Button
              type="button"
              variant={tool === "ERASER" ? "primary" : "outline"}
              aria-pressed={tool === "ERASER"}
              disabled={!canEdit}
              onClick={() => setTool("ERASER")}
            >
              ERASER
            </Button>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              펜 색상
              <input
                type="color"
                value={penColor}
                disabled={!canEdit || tool === "ERASER"}
                onChange={(event) => setPenColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="펜 색상 선택"
              />
            </label>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-slate-400">
                PEN {PEN_LINE_WIDTH}
                px · ERASER {ERASER_LINE_WIDTH}
                px
              </span>

              <Button
                type="button"
                variant="danger"
                disabled={!canEdit || strokes.length === 0 || clearWhiteboardMutation.isPending}
                onClick={() => setClearDialogOpen(true)}
              >
                전체 초기화
              </Button>
            </div>
          </div>
        </Card>

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
                className={`h-auto w-full min-w-[900px] touch-none rounded-lg border border-slate-200 bg-white shadow-sm ${
                  canEdit ? "cursor-crosshair" : "cursor-default"
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">
                {strokes.length === 0
                  ? canEdit
                    ? "아직 저장된 선이 없습니다. 캔버스에 바로 그려보세요."
                    : "아직 저장된 선이 없습니다."
                  : "저장된 선을 불러왔습니다. 다른 참여자의 변경사항도 실시간으로 반영됩니다."}
              </p>

              {isSaving && (
                <span className="text-xs font-medium text-blue-600">
                  저장 대기 {queuedSaveCount}개
                </span>
              )}

              {isViewer && (
                <span className="text-xs font-medium text-slate-500">VIEWER · 읽기 전용</span>
              )}
            </div>
          </Card>
        )}
      </section>
    </>
  );
}

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";

import {
  createWhiteboardStroke,
  getWhiteboardStrokes,
  type WhiteboardPoint,
  type WhiteboardStrokeCreateRequest,
  type WhiteboardStrokeResponse,
  type WhiteboardTool,
} from "@/api/whiteboard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

const DEFAULT_PEN_COLOR = "#111827";

const PEN_LINE_WIDTH = 4;
const ERASER_LINE_WIDTH = 28;

interface DrawableStroke {
  tool: WhiteboardTool;
  color: string;
  lineWidth: number;
  points: WhiteboardPoint[];
}

const drawDot = (context: CanvasRenderingContext2D, stroke: DrawableStroke) => {
  const point = stroke.points[0];

  if (!point) {
    return;
  }

  context.save();

  context.globalCompositeOperation =
    stroke.tool === "ERASER" ? "destination-out" : "source-over";

  context.fillStyle = stroke.color;

  context.beginPath();

  context.arc(point.x, point.y, stroke.lineWidth / 2, 0, Math.PI * 2);

  context.fill();

  context.restore();
};

const drawStroke = (
  context: CanvasRenderingContext2D,
  stroke: DrawableStroke,
) => {
  if (stroke.points.length === 0) {
    return;
  }

  if (stroke.points.length === 1) {
    drawDot(context, stroke);

    return;
  }

  context.save();

  context.globalCompositeOperation =
    stroke.tool === "ERASER" ? "destination-out" : "source-over";

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();

  context.moveTo(stroke.points[0].x, stroke.points[0].y);

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

  context.globalCompositeOperation =
    tool === "ERASER" ? "destination-out" : "source-over";

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

export default function WhiteboardPage() {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const queryClient = useQueryClient();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawingRef = useRef(false);

  const currentPointsRef = useRef<WhiteboardPoint[]>([]);

  const [tool, setTool] = useState<WhiteboardTool>("PEN");

  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR);

  const queryKey = ["whiteboard", boardId, "strokes"] as const;

  const {
    data: strokes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,

    queryFn: () => getWhiteboardStrokes(boardId),

    enabled: isValidBoardId,
  });

  const createStrokeMutation = useMutation({
    mutationFn: (data: WhiteboardStrokeCreateRequest) =>
      createWhiteboardStroke(boardId, data),

    onSuccess: (savedStroke) => {
      queryClient.setQueryData<WhiteboardStrokeResponse[]>(
        queryKey,
        (current = []) => {
          const alreadyExists = current.some(
            (stroke) => stroke.clientStrokeId === savedStroke.clientStrokeId,
          );

          if (alreadyExists) {
            return current;
          }

          return [...current, savedStroke];
        },
      );
    },

    onError: async () => {
      toast.error(
        "선을 저장하지 못했습니다. 저장된 화이트보드를 다시 불러옵니다.",
      );

      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

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
    if (!isValidBoardId || isLoading || isError) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);

    drawingRef.current = true;

    currentPointsRef.current = [getCanvasPoint(canvas, event)];
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
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

    const points = currentPointsRef.current;

    const previousPoint = points.at(-1);

    const currentPoint = getCanvasPoint(canvas, event);

    if (!previousPoint) {
      return;
    }

    const { color, lineWidth } = getCurrentStyle();

    drawSegment(context, previousPoint, currentPoint, tool, color, lineWidth);

    currentPointsRef.current = [...points, currentPoint];
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const points = currentPointsRef.current;

    drawingRef.current = false;

    currentPointsRef.current = [];

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (!canvas || points.length === 0) {
      return;
    }

    const { color, lineWidth } = getCurrentStyle();

    if (points.length === 1) {
      const context = canvas.getContext("2d");

      if (context) {
        drawDot(context, {
          tool,
          color,
          lineWidth,
          points,
        });
      }
    }

    createStrokeMutation.mutate({
      clientStrokeId: crypto.randomUUID(),

      tool,

      color,

      lineWidth,

      points,
    });
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;

    currentPointsRef.current = [];

    const canvas = canvasRef.current;

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    void refetch();
  };

  if (!isValidBoardId) {
    return (
      <section className="w-full max-w-4xl px-6 py-10">
        <Card>
          <h1 className="text-xl font-bold text-slate-900">
            화이트보드를 열 수 없습니다.
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            올바른 보드 ID가 필요합니다.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <>
      <LoadingOverlay open={isLoading} text="화이트보드를 불러오는 중..." />

      <section className="flex w-full max-w-7xl flex-col gap-5 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Board #{boardId}
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              화이트보드
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              펜과 지우개로 자유롭게 그리고, 완성한 선은 자동으로 저장됩니다.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            {createStrokeMutation.isPending
              ? "선 저장 중..."
              : `저장된 선 ${strokes.length.toLocaleString()}개`}
          </p>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant={tool === "PEN" ? "primary" : "outline"}
              aria-pressed={tool === "PEN"}
              onClick={() => setTool("PEN")}
            >
              PEN
            </Button>

            <Button
              type="button"
              variant={tool === "ERASER" ? "primary" : "outline"}
              aria-pressed={tool === "ERASER"}
              onClick={() => setTool("ERASER")}
            >
              ERASER
            </Button>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              펜 색상
              <input
                type="color"
                value={penColor}
                disabled={tool === "ERASER"}
                onChange={(event) => setPenColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="펜 색상 선택"
              />
            </label>

            <span className="ml-auto text-xs text-slate-400">
              PEN {PEN_LINE_WIDTH}
              px · ERASER {ERASER_LINE_WIDTH}
              px
            </span>
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
                  로그인 상태와 백엔드 실행 여부를 확인한 뒤 다시 시도해주세요.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void refetch()}
              >
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
                className="h-auto w-full min-w-[900px] touch-none cursor-crosshair rounded-lg border border-slate-200 bg-white shadow-sm"
                aria-label={`보드 ${boardId} 화이트보드`}
              />
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              {strokes.length === 0
                ? "아직 저장된 선이 없습니다. 캔버스에 바로 그려보세요."
                : "저장된 선을 불러왔습니다. 새로 그린 선은 마우스를 놓는 순간 저장됩니다."}
            </div>
          </Card>
        )}
      </section>
    </>
  );
}

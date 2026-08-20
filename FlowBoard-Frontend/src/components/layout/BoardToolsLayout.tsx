import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useParams } from "react-router";

import { getBoardDetail } from "@/api/board";
import { connectCardWebSocket, type CardConnectionState } from "@/services/cardWebSocket";

const getConnectionLabel = (state: CardConnectionState) => {
  switch (state) {
    case "connected":
      return "실시간 연결됨";
    case "connecting":
      return "실시간 연결 중";
    case "disconnected":
      return "실시간 연결 끊김";
  }
};

const getConnectionDotClassName = (state: CardConnectionState) => {
  switch (state) {
    case "connected":
      return "bg-[var(--flow-success)]";
    case "connecting":
      return "bg-[var(--flow-warning)]";
    case "disconnected":
      return "bg-[var(--flow-danger)]";
  }
};

const getPageLabel = (pathname: string, boardId: number) => {
  if (pathname === `/boards/${boardId}`) {
    return "칸반 보드";
  }
  if (pathname.endsWith("/search")) {
    return "작업 검색";
  }
  if (pathname.endsWith("/test-cases")) {
    return "테스트 케이스";
  }
  if (pathname.endsWith("/whiteboard")) {
    return "화이트보드";
  }
  if (pathname.endsWith("/activities")) {
    return "활동 기록";
  }
  if (pathname.endsWith("/members")) {
    return "팀원 및 권한";
  }

  return "보드";
};

export default function BoardToolsLayout() {
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [connectionState, setConnectionState] = useState<CardConnectionState>("connecting");

  const boardId = Number(boardIdParam);
  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const { data: board } = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: isValidBoardId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isValidBoardId) {
      return;
    }

    const disconnect = connectCardWebSocket({
      boardId,
      onConnectionStateChange: setConnectionState,
      onEvent: (event) => {
        /*
         * 일반 칸반 카드 목록 갱신
         */
        void queryClient.invalidateQueries({
          queryKey: ["board", boardId, "cards"],
        });

        /*
         * 테스트 케이스 전용 목록도 같은 Card 데이터를
         * 사용하므로 카드 변경 이벤트를 받으면 함께 갱신합니다.
         *
         * TEST_CASE가 아닌 카드 이벤트가 와도
         * 서버 조회 조건에서 걸러지므로 문제 없습니다.
         */
        void queryClient.invalidateQueries({
          queryKey: ["board", boardId, "test-cases"],
        });

        /*
         * 현재 카드 상세 패널이 열려 있다면
         * 그 카드의 상세 데이터도 최신화합니다.
         */
        if (event.type === "DELETED") {
          queryClient.removeQueries({
            queryKey: ["cards", event.cardId],
          });

          return;
        }

        void queryClient.invalidateQueries({
          queryKey: ["cards", event.cardId],
        });
      },
      onError: (error) => {
        console.error("[Card WebSocket]", error);
      },
    });

    return disconnect;
  }, [boardId, isValidBoardId, queryClient]);

  if (!boardIdParam || !isValidBoardId) {
    return (
      <div className="p-10">
        <div className="max-w-xl rounded-[var(--flow-radius-lg)] bg-white p-7 shadow-[var(--flow-shadow-sm)]">
          <h1 className="text-lg font-bold text-[var(--flow-text)]">보드를 찾을 수 없습니다.</h1>

          <p className="mt-2 text-sm leading-6 text-[var(--flow-text-muted)]">
            보드 주소를 다시 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  const pageLabel = getPageLabel(location.pathname, boardId);

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="sticky top-[var(--flow-header-height)] z-30 flex h-12 shrink-0 items-center justify-between border-b border-[var(--flow-border)] bg-white/95 px-6 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2 text-[11px]">
          <Link
            to="/boards"
            className="shrink-0 font-medium text-[var(--flow-text-placeholder)] transition-colors hover:text-[var(--flow-primary)]"
          >
            내 보드
          </Link>

          <span className="text-[var(--flow-gray-300)]">/</span>

          <Link
            to={`/boards/${boardId}`}
            className="max-w-[260px] truncate font-semibold text-[var(--flow-text-secondary)] transition-colors hover:text-[var(--flow-primary)]"
            title={board?.title || `Board #${boardId}`}
          >
            {board?.title || `Board #${boardId}`}
          </Link>

          <span className="text-[var(--flow-gray-300)]">/</span>

          <span className="shrink-0 font-bold text-[var(--flow-text)]">{pageLabel}</span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-2.5 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${getConnectionDotClassName(connectionState)} ${
              connectionState === "connecting" ? "animate-pulse" : ""
            }`}
          />

          <span className="text-[10px] font-semibold whitespace-nowrap text-[var(--flow-text-muted)]">
            {getConnectionLabel(connectionState)}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

import {
  useEffect,
  useState,
} from "react";
import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  Outlet,
  useParams,
} from "react-router";

import {
  connectCardWebSocket,
  type CardConnectionState,
} from "@/services/cardWebSocket";

const getConnectionLabel = (
  state: CardConnectionState,
) => {
  switch (state) {
    case "connected":
      return "실시간 연결";

    case "connecting":
      return "연결 중";

    case "disconnected":
      return "연결 끊김";
  }
};

const getConnectionDotClassName =
  (
    state: CardConnectionState,
  ) => {
    switch (state) {
      case "connected":
        return "bg-[var(--flow-success)]";

      case "connecting":
        return "bg-[var(--flow-warning)]";

      case "disconnected":
        return "bg-[var(--flow-danger)]";
    }
  };

export default function BoardToolsLayout() {
  const {
    boardId: boardIdParam,
  } = useParams<{
    boardId: string;
  }>();

  const queryClient =
    useQueryClient();

  const [
    connectionState,
    setConnectionState,
  ] =
    useState<CardConnectionState>(
      "connecting",
    );

  const boardId =
    Number(
      boardIdParam,
    );

  const isValidBoardId =
    Number.isInteger(
      boardId,
    ) &&
    boardId > 0;

  useEffect(() => {
    if (
      !isValidBoardId
    ) {
      return;
    }

    const disconnect =
      connectCardWebSocket({
        boardId,

        onConnectionStateChange:
          setConnectionState,

        onEvent: () => {
          void queryClient.invalidateQueries({
            queryKey: [
              "board",
              boardId,
              "cards",
            ],
          });
        },

        onError: (
          error,
        ) => {
          console.error(
            "[Card WebSocket]",
            error,
          );
        },
      });

    return disconnect;
  }, [
    boardId,
    isValidBoardId,
    queryClient,
  ]);

  if (
    !boardIdParam ||
    !isValidBoardId
  ) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">
            보드 정보를 확인할 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="sticky top-[var(--flow-header-height)] z-30 flex h-12 shrink-0 items-center justify-between border-b border-[var(--flow-border)] bg-white px-6">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/boards"
            className="font-medium text-[var(--flow-text-muted)] transition-colors hover:text-[var(--flow-primary-600)]"
          >
            내 보드
          </Link>

          <span className="text-[var(--flow-gray-300)]">
            /
          </span>

          <span className="font-semibold text-[var(--flow-text-secondary)]">
            Board #{boardId}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-2.5 py-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${getConnectionDotClassName(
              connectionState,
            )}`}
          />

          <span className="text-[10px] font-semibold text-[var(--flow-text-muted)]">
            {getConnectionLabel(
              connectionState,
            )}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
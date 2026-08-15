import {
  useEffect,
  useState,
} from "react";
import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  NavLink,
  Outlet,
  useParams,
} from "react-router";

import {
  connectCardWebSocket,
  type CardConnectionState,
} from "@/services/cardWebSocket";
import { cn } from "@/utils/cn";

interface BoardMenuItem {
  label: string;
  path: string;
  end?: boolean;
}

const getConnectionLabel = (
  state: CardConnectionState,
) => {
  switch (state) {
    case "connected":
      return "카드 실시간 연결";

    case "connecting":
      return "실시간 연결 중";

    case "disconnected":
      return "실시간 연결 끊김";
  }
};

const getConnectionDotClassName = (
  state: CardConnectionState,
) => {
  switch (state) {
    case "connected":
      return "bg-emerald-500";

    case "connecting":
      return "bg-amber-400";

    case "disconnected":
      return "bg-red-500";
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
    Number(boardIdParam);

  const isValidBoardId =
    Number.isInteger(
      boardId,
    ) &&
    boardId > 0;

  useEffect(() => {
    if (!isValidBoardId) {
      return;
    }

    const disconnect =
      connectCardWebSocket({
        boardId,

        onConnectionStateChange:
          setConnectionState,

        onEvent: () => {
          /*
           * 백엔드 이벤트는 트랜잭션 COMMIT 이후 전달됩니다.
           *
           * CREATED / UPDATED / DELETED / MOVED
           * 어느 이벤트가 오더라도 현재 보드의 카드 목록을
           * 다시 조회하면 서버의 최종 LexoRank 상태와 정확히 맞습니다.
           */
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
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">
            보드 정보를 확인할 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const basePath =
    `/boards/${boardId}`;

  const menuItems: BoardMenuItem[] =
    [
      {
        label: "보드",
        path: basePath,
        end: true,
      },
      {
        label: "카드 검색",
        path:
          `${basePath}/search`,
      },
      {
        label: "화이트보드",
        path:
          `${basePath}/whiteboard`,
      },
      {
        label: "활동 로그",
        path:
          `${basePath}/activities`,
      },
    ];

  return (
    <div className="flex w-full flex-col">
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center px-6">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {menuItems.map(
              (item) => (
                <NavLink
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  end={
                    item.end
                  }
                  className={({
                    isActive,
                  }) =>
                    cn(
                      "relative flex h-14 shrink-0 items-center px-4 text-sm font-medium transition-colors",
                      isActive
                        ? "text-blue-600"
                        : "text-slate-500 hover:text-slate-900",
                    )
                  }
                >
                  {({
                    isActive,
                  }) => (
                    <>
                      {
                        item.label
                      }

                      {isActive && (
                        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ),
            )}
          </div>

          <div className="ml-4 hidden shrink-0 items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:flex">
            <span
              className={`h-2 w-2 rounded-full ${getConnectionDotClassName(
                connectionState,
              )}`}
            />

            {getConnectionLabel(
              connectionState,
            )}
          </div>
        </div>
      </div>

      <main className="flex w-full justify-center">
        <Outlet />
      </main>
    </div>
  );
}
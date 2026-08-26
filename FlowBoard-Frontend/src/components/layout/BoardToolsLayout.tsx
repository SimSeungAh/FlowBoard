import { useEffect, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useParams } from "react-router";

import { getBoardDetail } from "@/api/board";
import {
  getBoardPresence,
  sendBoardPresenceHeartbeat,
  type BoardPresenceResponse,
  type BoardPresenceSection,
} from "@/api/presence";
import { connectCardWebSocket, type CardConnectionState } from "@/services/cardWebSocket";

const PRESENCE_HEARTBEAT_INTERVAL = 25_000;

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
  if (pathname === `/boards/${boardId}`) return "대시보드";
  if (pathname.endsWith("/kanban")) return "칸반 보드";
  if (pathname.endsWith("/requirements")) return "요구사항";
  if (pathname.endsWith("/schedule")) return "일정";
  if (pathname.endsWith("/search")) return "작업 검색";
  if (pathname.endsWith("/test-cases")) return "테스트 케이스";
  if (pathname.endsWith("/security-reviews")) return "보안 점검";
  if (pathname.endsWith("/release-checks")) return "릴리즈 체크";
  if (pathname.endsWith("/whiteboard")) return "화이트보드";
  if (pathname.endsWith("/activities")) return "활동 기록";
  if (pathname.endsWith("/members")) return "팀원 및 권한";
  return "보드";
};

const getPresenceSection = (pathname: string, boardId: number): BoardPresenceSection => {
  if (pathname === `/boards/${boardId}`) return "DASHBOARD";
  if (pathname.endsWith("/kanban")) return "KANBAN";
  if (pathname.endsWith("/requirements")) return "REQUIREMENT";
  if (pathname.endsWith("/schedule")) return "SCHEDULE";
  if (pathname.endsWith("/search")) return "SEARCH";
  if (pathname.endsWith("/test-cases")) return "TEST_CASE";
  if (pathname.endsWith("/security-reviews")) return "SECURITY_REVIEW";
  if (pathname.endsWith("/release-checks")) return "RELEASE_CHECK";
  if (pathname.endsWith("/whiteboard")) return "WHITEBOARD";
  if (pathname.endsWith("/activities")) return "ACTIVITY";
  if (pathname.endsWith("/members")) return "MEMBERS";
  return "OTHER";
};

const PRESENCE_LABEL: Record<BoardPresenceSection, string> = {
  DASHBOARD: "대시보드",
  SCHEDULE: "일정",
  KANBAN: "칸반 보드",
  REQUIREMENT: "요구사항",
  SEARCH: "작업 검색",
  TEST_CASE: "테스트 케이스",
  SECURITY_REVIEW: "보안 점검",
  RELEASE_CHECK: "릴리즈 체크",
  WHITEBOARD: "화이트보드",
  ACTIVITY: "활동 기록",
  MEMBERS: "팀원 및 권한",
  OTHER: "보드",
};

const getMemberLocationLabel = (member: BoardPresenceResponse) => {
  if (member.section === "WHITEBOARD" && member.whiteboardTitle) {
    return `화이트보드 · ${member.whiteboardTitle}`;
  }
  return PRESENCE_LABEL[member.section];
};

const getAvatarLabel = (nickname: string) => nickname.trim().slice(0, 1).toUpperCase() || "?";

export default function BoardToolsLayout() {
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<CardConnectionState>("connecting");

  const boardId = Number(boardIdParam);
  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;
  const currentPresenceSection = useMemo(
    () => getPresenceSection(location.pathname, boardId),
    [boardId, location.pathname],
  );

  const { data: board } = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId),
    enabled: isValidBoardId,
    staleTime: 30_000,
  });

  const { data: onlineMembers = [] } = useQuery({
    queryKey: ["board", boardId, "presence"],
    queryFn: () => getBoardPresence(boardId),
    enabled: isValidBoardId,
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: false,
  });

  /*
   * 화이트보드 화면은 선택한 whiteboardId까지 보내야 하므로
   * WhiteboardPage가 직접 heartbeat를 담당합니다.
   */
  useEffect(() => {
    if (!isValidBoardId || currentPresenceSection === "WHITEBOARD") {
      return;
    }

    let disposed = false;

    const heartbeat = async () => {
      try {
        await sendBoardPresenceHeartbeat(boardId, {
          section: currentPresenceSection,
          whiteboardId: null,
        });

        if (!disposed) {
          void queryClient.invalidateQueries({ queryKey: ["board", boardId, "presence"] });
        }
      } catch {
        // Presence는 보조 기능이므로 Redis 장애가 본 화면 사용을 막지 않습니다.
      }
    };

    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), PRESENCE_HEARTBEAT_INTERVAL);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [boardId, currentPresenceSection, isValidBoardId, queryClient]);

  useEffect(() => {
    if (!isValidBoardId) return;

    const disconnect = connectCardWebSocket({
      boardId,
      onConnectionStateChange: setConnectionState,
      onEvent: (event) => {
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "cards"] });
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "dashboard"] });
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "schedule"] });
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "requirements"] });
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "test-cases"] });
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "security-reviews"] });
        void queryClient.invalidateQueries({ queryKey: ["board", boardId, "release-checks"] });
        void queryClient.invalidateQueries({ queryKey: ["boards", boardId, "card-search"] });
        void queryClient.invalidateQueries({ queryKey: ["boards", boardId, "activities"] });

        if (event.type === "DELETED") {
          queryClient.removeQueries({ queryKey: ["cards", event.cardId] });
          return;
        }
        void queryClient.invalidateQueries({ queryKey: ["cards", event.cardId, "requirement"] });
        void queryClient.invalidateQueries({ queryKey: ["cards", event.cardId, "design-review"] });
        void queryClient.invalidateQueries({ queryKey: ["cards", event.cardId, "release-check"] });
        void queryClient.invalidateQueries({ queryKey: ["cards", event.cardId] });
      },
      onError: (error) => console.error("[Card WebSocket]", error),
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

        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--flow-border)] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[var(--flow-text-muted)] hover:bg-[var(--flow-gray-50)]">
              <span aria-hidden="true">👥</span>
              <span>{onlineMembers.length}명 접속</span>
              <div className="flex -space-x-1.5">
                {onlineMembers.slice(0, 4).map((member) => (
                  <span
                    key={member.userId}
                    title={`${member.nickname} · ${getMemberLocationLabel(member)}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--flow-primary-100)] text-[9px] font-extrabold text-[var(--flow-primary-700)]"
                  >
                    {getAvatarLabel(member.nickname)}
                  </span>
                ))}
              </div>
            </summary>

            <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-[var(--flow-border)] bg-white p-2 shadow-[var(--flow-shadow-lg)]">
              <p className="px-2 py-1.5 text-[11px] font-bold text-[var(--flow-text)]">
                현재 보드 접속자
              </p>
              {onlineMembers.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[var(--flow-text-muted)]">접속자가 없습니다.</p>
              ) : (
                <div className="space-y-1">
                  {onlineMembers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--flow-gray-50)]"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--flow-primary-100)] text-[10px] font-extrabold text-[var(--flow-primary-700)]">
                        {getAvatarLabel(member.nickname)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[var(--flow-text)]">
                          {member.nickname}
                        </p>
                        <p className="truncate text-[10px] text-[var(--flow-text-muted)]">
                          {getMemberLocationLabel(member)}
                        </p>
                      </div>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {currentPresenceSection !== "WHITEBOARD" && (
            <div
              className="flex items-center gap-2 rounded-full border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-2.5 py-1.5"
              aria-live="polite"
              title={getConnectionLabel(connectionState)}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  getConnectionDotClassName(connectionState),
                  connectionState === "connecting" ? "animate-pulse" : "",
                ].join(" ")}
              />
              <span className="text-[10px] font-semibold whitespace-nowrap text-[var(--flow-text-muted)]">
                {getConnectionLabel(connectionState)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

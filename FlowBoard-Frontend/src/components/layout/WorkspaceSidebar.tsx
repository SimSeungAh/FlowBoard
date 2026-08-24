import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { Link, NavLink } from "react-router";

import { getMyBoards } from "@/api/board";

import { cn } from "@/utils/cn";

type IconType =
  | "boards"
  | "dashboard"
  | "kanban"
  | "schedule"
  | "search"
  | "testcase"
  | "security"
  | "whiteboard"
  | "activity"
  | "members"
  | "settings";

interface NavigationItem {
  label: string;

  path: string;

  icon: IconType;

  end?: boolean;
}

interface WorkspaceSidebarProps {
  boardId: number | null;
}

const projectDotColors = ["#2563eb", "#f97316", "#8b5cf6", "#10b981", "#ec4899"];

function SidebarIcon({ type }: { type: IconType }) {
  const commonProps = {
    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",

    strokeWidth: 1.8,

    strokeLinecap: "round" as const,

    strokeLinejoin: "round" as const,
  };

  let content: ReactNode;

  switch (type) {
    case "boards":
      content = (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />

          <rect x="14" y="4" width="6" height="6" rx="1.5" />

          <rect x="4" y="14" width="6" height="6" rx="1.5" />

          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </>
      );

      break;

    case "dashboard":
      content = (
        <>
          <rect x="4" y="4" width="7" height="6" rx="1.5" />

          <rect x="13" y="4" width="7" height="10" rx="1.5" />

          <rect x="4" y="12" width="7" height="8" rx="1.5" />

          <rect x="13" y="16" width="7" height="4" rx="1.5" />
        </>
      );

      break;

    case "kanban":
      content = (
        <>
          <rect x="3.5" y="4" width="5" height="16" rx="1.5" />

          <rect x="9.5" y="4" width="5" height="11" rx="1.5" />

          <rect x="15.5" y="4" width="5" height="14" rx="1.5" />
        </>
      );

      break;

    case "schedule":
      content = (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />

          <path d="M8 3v4" />

          <path d="M16 3v4" />

          <path d="M4 10h16" />

          <path d="M8 14h3" />

          <path d="M14 14h2" />
        </>
      );

      break;

    case "search":
      content = (
        <>
          <circle cx="10.5" cy="10.5" r="5.5" />

          <path d="m15 15 4 4" />
        </>
      );

      break;

    case "testcase":
      content = (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2" />

          <path d="M9 4.5V3h6v1.5" />

          <path d="m8.5 10 1.5 1.5 3-3" />

          <path d="M8.5 15h7" />
        </>
      );

      break;

    case "security":
      content = (
        <>
          <path d="M12 3.5 19 6v5.2c0 4.2-2.7 7.5-7 9.3-4.3-1.8-7-5.1-7-9.3V6l7-2.5Z" />

          <path d="m9.3 12 1.7 1.7 3.8-4" />
        </>
      );

      break;

    case "whiteboard":
      content = (
        <>
          <rect x="3.5" y="4" width="17" height="13" rx="2" />

          <path d="M8 21h8" />

          <path d="m8 12 2-2 2 1.5 4-4" />
        </>
      );

      break;

    case "activity":
      content = <path d="M4 12h3l2-5 4 10 2-5h5" />;

      break;

    case "members":
      content = (
        <>
          <circle cx="9" cy="8" r="3" />

          <path d="M3.8 19c.7-3.2 2.6-4.8 5.2-4.8s4.5 1.6 5.2 4.8" />

          <circle cx="17" cy="9" r="2.3" />

          <path d="M15.6 14.5c2.8.1 4.5 1.5 4.9 4.1" />
        </>
      );

      break;

    case "settings":
      content = (
        <>
          <circle cx="12" cy="12" r="3" />

          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );

      break;
  }

  return (
    <svg {...commonProps} aria-hidden="true" className="h-[19px] w-[19px]">
      {content}
    </svg>
  );
}

function NavigationLink({ item }: { item: NavigationItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      title={item.label}
      className={({ isActive }) =>
        cn(
          "group flex min-h-10 items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors",

          isActive
            ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary)]"
            : "text-[var(--flow-text-secondary)] hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]",
        )
      }
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        <SidebarIcon type={item.icon} />
      </span>

      <span className="whitespace-nowrap">{item.label}</span>
    </NavLink>
  );
}

export default function WorkspaceSidebar({ boardId }: WorkspaceSidebarProps) {
  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],

    queryFn: getMyBoards,

    staleTime: 30_000,
  });

  const navigationItems: NavigationItem[] = [
    {
      label: "내 보드",

      path: "/boards",

      icon: "boards",

      end: true,
    },

    ...(boardId
      ? [
          {
            label: "대시보드",

            path: `/boards/${boardId}`,

            icon: "dashboard" as const,

            end: true,
          },

          {
            label: "일정",

            path: `/boards/${boardId}/schedule`,

            icon: "schedule" as const,
          },

          {
            label: "칸반 보드",

            path: `/boards/${boardId}/kanban`,

            icon: "kanban" as const,
          },

          {
            label: "작업 검색",

            path: `/boards/${boardId}/search`,

            icon: "search" as const,
          },

          {
            label: "테스트 케이스",

            path: `/boards/${boardId}/test-cases`,

            icon: "testcase" as const,
          },

          {
            label: "보안 점검",

            path: `/boards/${boardId}/security-reviews`,

            icon: "security" as const,
          },

          {
            label: "화이트보드",

            path: `/boards/${boardId}/whiteboard`,

            icon: "whiteboard" as const,
          },

          {
            label: "활동 기록",

            path: `/boards/${boardId}/activities`,

            icon: "activity" as const,
          },

          {
            label: "팀원 및 권한",

            path: `/boards/${boardId}/members`,

            icon: "members" as const,
          },
        ]
      : []),

    {
      label: "설정",

      path: "/mypage",

      icon: "settings",

      end: true,
    },
  ];

  const activeBoard = boardId ? boards.find((board) => board.id === boardId) : undefined;

  const otherBoards = boards.filter((board) => board.id !== boardId);

  const recentBoards = activeBoard ? [activeBoard, ...otherBoards].slice(0, 5) : boards.slice(0, 5);

  return (
    <aside className="sticky top-[var(--flow-header-height)] h-[calc(100vh-var(--flow-header-height))] w-[var(--flow-sidebar-width)] shrink-0 border-r border-[var(--flow-border)] bg-white">
      <div className="flex h-full min-h-0 flex-col px-3 py-5">
        <nav aria-label="작업 공간 메뉴" className="space-y-1">
          {navigationItems.map((item) => (
            <NavigationLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="my-5 h-px bg-[var(--flow-border)]" />

        <section className="min-h-0 flex-1">
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[11px] font-bold tracking-[0.06em] text-[var(--flow-text-placeholder)]">
              프로젝트
            </p>

            <Link
              to="/boards"
              aria-label="보드 목록 열기"
              title="보드 목록"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--flow-text-placeholder)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-primary)]"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14" />

                <path d="M5 12h14" />
              </svg>
            </Link>
          </div>

          {recentBoards.length > 0 ? (
            <div className="space-y-1">
              {recentBoards.map((board, index) => {
                const active = board.id === boardId;

                return (
                  <Link
                    key={board.id}
                    to={`/boards/${board.id}`}
                    className={cn(
                      "group flex min-h-9 items-center gap-3 rounded-[10px] px-3 py-2 text-[12px] font-medium transition-colors",

                      active
                        ? "bg-[var(--flow-gray-100)] text-[var(--flow-text)]"
                        : "text-[var(--flow-text-muted)] hover:bg-[var(--flow-gray-50)] hover:text-[var(--flow-text)]",
                    )}
                    title={board.title}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: active
                          ? "var(--flow-primary)"
                          : projectDotColors[index % projectDotColors.length],
                      }}
                    />

                    <span className="min-w-0 flex-1 truncate">{board.title}</span>

                    {board.myRole === "OWNER" && (
                      <span className="shrink-0 rounded-md bg-[var(--flow-gray-100)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--flow-text-placeholder)] group-hover:bg-white">
                        OWNER
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-[var(--flow-border-strong)] px-3 py-4 text-center">
              <p className="text-[11px] leading-5 text-[var(--flow-text-placeholder)]">
                참여 중인 보드가 없습니다.
              </p>
            </div>
          )}
        </section>

        <div className="mt-5 border-t border-[var(--flow-border)] pt-4">
          <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18V9" />

                <path d="M12 18V5" />

                <path d="M18 18v-6" />
              </svg>
            </span>

            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-[var(--flow-text-secondary)]">
                FlowBoard
              </p>

              <p className="truncate text-[10px] text-[var(--flow-text-placeholder)]">
                실시간 개발 협업 공간
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

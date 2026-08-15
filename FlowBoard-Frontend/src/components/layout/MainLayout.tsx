import type {
  ReactNode,
} from "react";
import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { cn } from "@/utils/cn";

type IconType =
  | "boards"
  | "user"
  | "kanban"
  | "search"
  | "whiteboard"
  | "activity";

interface SidebarItem {
  label: string;
  path: string;
  icon: IconType;
  end?: boolean;
}

const isWorkspacePath = (
  pathname: string,
) =>
  pathname === "/mypage" ||
  pathname === "/boards" ||
  pathname.startsWith(
    "/boards/",
  );

const getBoardIdFromPath = (
  pathname: string,
) => {
  const match =
    pathname.match(
      /^\/boards\/(\d+)/,
    );

  if (!match) {
    return null;
  }

  const boardId =
    Number(match[1]);

  if (
    !Number.isInteger(
      boardId,
    ) ||
    boardId <= 0
  ) {
    return null;
  }

  return boardId;
};

function SidebarIcon({
  type,
}: {
  type: IconType;
}) {
  const commonProps = {
    viewBox:
      "0 0 24 24",
    fill: "none",
    stroke:
      "currentColor",
    strokeWidth: 1.8,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
  };

  let content:
    ReactNode;

  switch (type) {
    case "boards":
      content = (
        <>
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
        </>
      );

      break;

    case "user":
      content = (
        <>
          <circle
            cx="12"
            cy="8"
            r="3"
          />
          <path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
        </>
      );

      break;

    case "kanban":
      content = (
        <>
          <rect
            x="3.5"
            y="4"
            width="5"
            height="16"
            rx="1.5"
          />
          <rect
            x="9.5"
            y="4"
            width="5"
            height="11"
            rx="1.5"
          />
          <rect
            x="15.5"
            y="4"
            width="5"
            height="14"
            rx="1.5"
          />
        </>
      );

      break;

    case "search":
      content = (
        <>
          <circle
            cx="10.5"
            cy="10.5"
            r="5.5"
          />
          <path d="m15 15 4 4" />
        </>
      );

      break;

    case "whiteboard":
      content = (
        <>
          <rect
            x="3.5"
            y="4"
            width="17"
            height="13"
            rx="2"
          />
          <path d="M8 21h8" />
          <path d="m9 12 2-2 2 1.5 3-3" />
        </>
      );

      break;

    case "activity":
      content = (
        <>
          <path d="M5 6h14" />
          <path d="M5 12h14" />
          <path d="M5 18h14" />
          <circle
            cx="7"
            cy="6"
            r=".75"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="7"
            cy="12"
            r=".75"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="7"
            cy="18"
            r=".75"
            fill="currentColor"
            stroke="none"
          />
        </>
      );

      break;
  }

  return (
    <svg
      {...commonProps}
      aria-hidden="true"
      className="h-[18px] w-[18px]"
    >
      {content}
    </svg>
  );
}

function SidebarLink({
  item,
}: {
  item: SidebarItem;
}) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({
        isActive,
      }) =>
        cn(
          [
            "group flex h-9 items-center gap-3",
            "rounded-lg px-3",
            "text-sm font-medium",
            "transition-colors",
          ],
          isActive
            ? [
                "bg-[var(--flow-primary-50)]",
                "text-[var(--flow-primary-700)]",
              ]
            : [
                "text-[var(--flow-text-secondary)]",
                "hover:bg-[var(--flow-gray-100)]",
                "hover:text-[var(--flow-text)]",
              ],
        )
      }
    >
      <SidebarIcon
        type={item.icon}
      />

      <span>
        {item.label}
      </span>
    </NavLink>
  );
}

export default function MainLayout() {
  const location =
    useLocation();

  const workspace =
    isWorkspacePath(
      location.pathname,
    );

  const boardId =
    getBoardIdFromPath(
      location.pathname,
    );

  /*
   * 랜딩 / 로그인 / 회원가입은
   * 기존 페이지 구조를 그대로 유지.
   */
  if (!workspace) {
    return (
      <div className="min-h-screen bg-white">
        <Header />

        <main className="flex w-full justify-center">
          <Outlet />
        </main>

        <Footer />
      </div>
    );
  }

  const workspaceItems: SidebarItem[] =
    [
      {
        label:
          "내 보드",
        path:
          "/boards",
        icon:
          "boards",
        end: true,
      },
      {
        label:
          "마이페이지",
        path:
          "/mypage",
        icon:
          "user",
        end: true,
      },
    ];

  const boardItems: SidebarItem[] =
    boardId
      ? [
          {
            label:
              "칸반 보드",
            path:
              `/boards/${boardId}`,
            icon:
              "kanban",
            end: true,
          },
          {
            label:
              "카드 검색",
            path:
              `/boards/${boardId}/search`,
            icon:
              "search",
          },
          {
            label:
              "화이트보드",
            path:
              `/boards/${boardId}/whiteboard`,
            icon:
              "whiteboard",
          },
          {
            label:
              "활동 로그",
            path:
              `/boards/${boardId}/activities`,
            icon:
              "activity",
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-[var(--flow-background)]">
      <Header />

      <div className="flex min-h-[calc(100vh-var(--flow-header-height))] w-full">
        <aside className="sticky top-[var(--flow-header-height)] h-[calc(100vh-var(--flow-header-height))] w-[var(--flow-sidebar-width)] shrink-0 border-r border-[var(--flow-border)] bg-white">
          <div className="flex h-full flex-col px-3 py-5">
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--flow-text-placeholder)]">
                Workspace
              </p>

              <nav className="mt-2 space-y-1">
                {workspaceItems.map(
                  (item) => (
                    <SidebarLink
                      key={
                        item.path
                      }
                      item={
                        item
                      }
                    />
                  ),
                )}
              </nav>
            </div>

            {boardId && (
              <div className="mt-6 border-t border-[var(--flow-border)] pt-5">
                <div className="flex items-center justify-between px-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--flow-text-placeholder)]">
                    Current Board
                  </p>

                  <span className="rounded bg-[var(--flow-gray-100)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--flow-text-muted)]">
                    #{boardId}
                  </span>
                </div>

                <nav className="mt-2 space-y-1">
                  {boardItems.map(
                    (item) => (
                      <SidebarLink
                        key={
                          item.path
                        }
                        item={
                          item
                        }
                      />
                    ),
                  )}
                </nav>
              </div>
            )}

            <div className="mt-auto border-t border-[var(--flow-border)] pt-4">
              <div className="rounded-lg bg-[var(--flow-gray-50)] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--flow-success)]" />

                  <p className="text-xs font-semibold text-[var(--flow-text-secondary)]">
                    FlowBoard
                  </p>
                </div>

                <p className="mt-1 text-[10px] leading-4 text-[var(--flow-text-muted)]">
                  실시간 협업 워크스페이스
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[var(--flow-background)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
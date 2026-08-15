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
            rx="1.5"
          />

          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1.5"
          />

          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1.5"
          />

          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1.5"
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
            r="3.2"
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

          <path d="m8 12 2-2 2 1.5 4-4" />
        </>
      );

      break;

    case "activity":
      content = (
        <path d="M4 12h3l2-5 4 10 2-5h5" />
      );

      break;
  }

  return (
    <svg
      {...commonProps}
      aria-hidden="true"
      className="h-[19px] w-[19px]"
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
            "group flex min-h-11 items-center gap-3",
            "rounded-xl px-3 py-2.5",
            "text-[13px] font-semibold",
            "transition-colors",
          ],
          isActive
            ? [
                "bg-[var(--flow-primary-50)]",
                "text-[var(--flow-primary)]",
              ]
            : [
                "text-[var(--flow-text-secondary)]",
                "hover:bg-[var(--flow-gray-100)]",
                "hover:text-[var(--flow-text)]",
              ],
        )
      }
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        <SidebarIcon
          type={item.icon}
        />
      </span>

      <span className="whitespace-nowrap">
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
   * 홈 / 로그인 / 회원가입
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

  const generalItems: SidebarItem[] =
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
              "작업 검색",
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
              "활동 기록",
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
          <div className="flex h-full flex-col px-4 py-6">
            <div>
              <p className="mb-3 px-3 text-[12px] font-semibold text-[var(--flow-text-muted)]">
                둘러보기
              </p>

              <nav className="space-y-1.5">
                {generalItems.map(
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
              <div className="mt-8 border-t border-[var(--flow-border)] pt-7">
                <div className="mb-3 flex items-center justify-between px-3">
                  <p className="text-[12px] font-semibold text-[var(--flow-text-muted)]">
                    보드 도구
                  </p>

                  <span className="text-[10px] font-medium text-[var(--flow-text-placeholder)]">
                    #{boardId}
                  </span>
                </div>

                <nav className="space-y-1.5">
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

            <div className="mt-auto px-3 pb-2">
              <div className="rounded-xl bg-[var(--flow-gray-50)] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--flow-success)]" />

                  <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    FlowBoard
                  </span>
                </div>

                <p className="mt-1 whitespace-nowrap text-[10px] text-[var(--flow-text-placeholder)]">
                  개발 협업 공간
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
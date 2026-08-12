import { NavLink, Outlet, useParams } from "react-router";

import { cn } from "@/utils/cn";

interface BoardToolMenu {
  label: string;
  description: string;
  path: string;
}

const boardToolMenus: BoardToolMenu[] = [
  {
    label: "카드 검색",
    description: "검색 및 필터",
    path: "search",
  },
  {
    label: "화이트보드",
    description: "실시간 드로잉",
    path: "whiteboard",
  },
  {
    label: "활동 로그",
    description: "보드 변경 기록",
    path: "activities",
  },
];

export default function BoardToolsLayout() {
  const { boardId } = useParams<{
    boardId: string;
  }>();

  const numericBoardId = Number(boardId);

  const isValidBoardId = Number.isInteger(numericBoardId) && numericBoardId > 0;

  return (
    <div className="flex w-full flex-col items-center">
      {isValidBoardId && (
        <div className="w-full border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Board #{numericBoardId}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  보드 도구
                </p>
              </div>

              <nav
                className="flex flex-wrap items-center gap-2"
                aria-label="보드 기능 메뉴"
              >
                {boardToolMenus.map((menu) => (
                  <NavLink
                    key={menu.path}
                    to={`/boards/${numericBoardId}/${menu.path}`}
                    className={({ isActive }) =>
                      cn(
                        "group rounded-lg border px-4 py-2.5 transition-colors",
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isActive
                              ? "text-blue-700"
                              : "text-slate-700 group-hover:text-slate-900",
                          )}
                        >
                          {menu.label}
                        </span>

                        <span
                          className={cn(
                            "mt-0.5 text-xs",
                            isActive ? "text-blue-500" : "text-slate-400",
                          )}
                        >
                          {menu.description}
                        </span>
                      </div>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}

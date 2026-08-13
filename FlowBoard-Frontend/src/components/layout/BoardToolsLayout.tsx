import { NavLink, Outlet, useParams } from "react-router";

import { cn } from "@/utils/cn";

interface BoardMenuItem {
  label: string;
  path: string;
  end?: boolean;
}

export default function BoardToolsLayout() {
  const { boardId } = useParams<{
    boardId: string;
  }>();

  if (!boardId) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">보드 정보를 확인할 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const basePath = `/boards/${boardId}`;

  const menuItems: BoardMenuItem[] = [
    {
      label: "보드",
      path: basePath,
      end: true,
    },
    {
      label: "카드 검색",
      path: `${basePath}/search`,
    },
    {
      label: "화이트보드",
      path: `${basePath}/whiteboard`,
    },
    {
      label: "활동 로그",
      path: `${basePath}/activities`,
    },
  ];

  return (
    <div className="flex w-full flex-col">
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex h-14 shrink-0 items-center px-4 text-sm font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}

                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex w-full justify-center">
        <Outlet />
      </main>
    </div>
  );
}

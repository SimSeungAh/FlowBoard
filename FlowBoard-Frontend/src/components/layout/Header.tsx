import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

import { getMyInfo, logout } from "@/api/auth";
import { getBoardDetail } from "@/api/board";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";

const isWorkspacePath = (pathname: string) =>
  pathname === "/mypage" || pathname === "/boards" || pathname.startsWith("/boards/");

const getBoardIdFromPath = (pathname: string) => {
  const match = pathname.match(/^\/boards\/(\d+)/);

  if (!match) {
    return null;
  }

  const boardId = Number(match[1]);

  return Number.isInteger(boardId) && boardId > 0 ? boardId : null;
};

function FlowBoardLogo() {
  return (
    <span className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-[10px] bg-[var(--flow-primary)] px-[7px] py-[7px] shadow-[var(--flow-shadow-sm)]">
      <span className="h-3 w-[4px] rounded-[2px] bg-white/70" />
      <span className="h-[21px] w-[4px] rounded-[2px] bg-white" />
      <span className="h-4 w-[4px] rounded-[2px] bg-white/90" />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UserIcon() {
  return (
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
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 19c.75-3.3 3-5 6.25-5s5.5 1.7 6.25 5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const isLogin = useAuthStore((state) => state.isLogin);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  const workspace = isWorkspacePath(location.pathname);
  const boardId = getBoardIdFromPath(location.pathname);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMyInfo,
    enabled: workspace && isLogin,
    staleTime: 60_000,
  });

  const { data: board } = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardDetail(boardId!),
    enabled: workspace && boardId !== null,
    staleTime: 30_000,
  });

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } finally {
      clearTokens();
      navigate("/login");
    }
  };

  if (!workspace) {
    const navClassName = ({ isActive }: { isActive: boolean }) =>
      cn(
        "rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors",
        isActive
          ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary)]"
          : "text-[var(--flow-text-secondary)] hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]",
      );

    return (
      <header className="sticky top-0 z-50 flex justify-center border-b border-[var(--flow-border)] bg-white/95 backdrop-blur-md">
        <div className="flex h-[var(--flow-header-height)] w-full max-w-[1320px] items-center justify-between px-10">
          <Link to="/" aria-label="FlowBoard 홈" className="flex items-center gap-3">
            <FlowBoardLogo />

            <span className="text-[21px] font-bold tracking-[-0.035em] text-[var(--flow-text)]">
              Flow<span className="text-[var(--flow-primary)]">Board</span>
            </span>
          </Link>

          <nav aria-label="주 메뉴" className="flex items-center gap-1">
            <NavLink to="/" end className={navClassName}>
              홈
            </NavLink>

            {isLogin ? (
              <>
                <NavLink to="/boards" className={navClassName}>
                  내 보드
                </NavLink>

                <NavLink to="/mypage" className={navClassName}>
                  마이페이지
                </NavLink>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)]"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClassName}>
                  로그인
                </NavLink>

                <Link
                  to="/signup"
                  className="ml-2 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--flow-primary)] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--flow-primary-700)]"
                >
                  시작하기
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    );
  }

  const displayName = me?.nickname?.trim() || "사용자";
  const initial = displayName.charAt(0).toUpperCase();
  const workspaceTitle = board?.title || (boardId ? `Board #${boardId}` : "내 보드");

  return (
    <header className="sticky top-0 z-50 h-[var(--flow-header-height)] border-b border-[var(--flow-border)] bg-white/95 backdrop-blur-md">
      <div className="flex h-full w-full items-center">
        <Link
          to="/boards"
          aria-label="FlowBoard 내 보드"
          className="flex h-full w-[var(--flow-sidebar-width)] shrink-0 items-center gap-3 border-r border-[var(--flow-border)] px-5"
        >
          <FlowBoardLogo />

          <span className="text-[19px] font-bold tracking-[-0.035em] text-[var(--flow-text)]">
            Flow<span className="text-[var(--flow-primary)]">Board</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-5 px-6">
          <button
            type="button"
            onClick={() => navigate(boardId ? `/boards/${boardId}` : "/boards")}
            className="flex max-w-[280px] min-w-[190px] items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--flow-gray-50)]"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--flow-success)]" />

            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                {boardId ? "현재 보드" : "작업 공간"}
              </span>
              <span className="block truncate text-[13px] font-bold text-[var(--flow-text)]">
                {workspaceTitle}
              </span>
            </span>

            {boardId && <ChevronDownIcon />}
          </button>

          <button
            type="button"
            onClick={() => navigate(boardId ? `/boards/${boardId}/search` : "/boards")}
            className="mx-auto flex h-10 w-full max-w-[470px] items-center gap-2.5 rounded-[10px] border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-3.5 text-left text-[12px] text-[var(--flow-text-placeholder)] transition-colors hover:border-[var(--flow-border-strong)] hover:bg-white"
          >
            <SearchIcon />
            <span className="min-w-0 flex-1 truncate">
              {boardId ? "작업, 태그, 담당자 검색..." : "보드 검색 및 작업 공간 열기"}
            </span>
            <span className="rounded-md border border-[var(--flow-border)] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[var(--flow-text-placeholder)]">
              검색
            </span>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              title="내 보드로 이동"
              aria-label="내 보드로 이동"
              onClick={() => navigate("/boards")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--flow-primary)] text-white shadow-[var(--flow-shadow-xs)] transition-colors hover:bg-[var(--flow-primary-700)]"
            >
              <PlusIcon />
            </button>

            <span className="mx-1 h-6 w-px bg-[var(--flow-border)]" />

            <button
              type="button"
              onClick={() => navigate("/mypage")}
              className="flex min-w-0 items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--flow-gray-50)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--flow-primary-50)] text-[12px] font-bold text-[var(--flow-primary)]">
                {initial || <UserIcon />}
              </span>

              <span className="hidden min-w-0 xl:block">
                <span className="block max-w-[110px] truncate text-[11px] font-bold text-[var(--flow-text)]">
                  {displayName}
                </span>
                <span className="block text-[9px] text-[var(--flow-text-placeholder)]">
                  FlowBoard 사용자
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[9px] px-2.5 py-2 text-[11px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

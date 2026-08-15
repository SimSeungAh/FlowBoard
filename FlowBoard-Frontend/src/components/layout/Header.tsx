import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";

import { logout } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";

const isWorkspacePath = (
  pathname: string,
) =>
  pathname === "/mypage" ||
  pathname === "/boards" ||
  pathname.startsWith(
    "/boards/",
  );

const getWorkspaceTitle = (
  pathname: string,
) => {
  if (
    pathname === "/mypage"
  ) {
    return "마이페이지";
  }

  if (
    /^\/boards\/\d+/.test(
      pathname,
    )
  ) {
    return "보드 작업";
  }

  if (
    pathname === "/boards"
  ) {
    return "내 보드";
  }

  return "FlowBoard";
};

function FlowBoardLogo() {
  return (
    <span className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-lg bg-[var(--flow-primary-600)] px-[7px] py-[7px] shadow-[var(--flow-shadow-xs)]">
      <span className="h-3 w-[5px] rounded-[2px] bg-white/75" />
      <span className="h-5 w-[5px] rounded-[2px] bg-white" />
      <span className="h-4 w-[5px] rounded-[2px] bg-white/90" />
    </span>
  );
}

export default function Header() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const isLogin =
    useAuthStore(
      (state) =>
        state.isLogin,
    );

  const refreshToken =
    useAuthStore(
      (state) =>
        state.refreshToken,
    );

  const clearTokens =
    useAuthStore(
      (state) =>
        state.clearTokens,
    );

  const workspace =
    isWorkspacePath(
      location.pathname,
    );

  const handleLogout =
    async () => {
      try {
        if (
          refreshToken
        ) {
          await logout(
            refreshToken,
          );
        }
      } finally {
        clearTokens();

        navigate(
          "/login",
        );
      }
    };

  /*
   * 처음 접속하는 랜딩페이지 쪽 Header.
   * 기존 디자인 느낌을 최대한 유지한다.
   */
  if (!workspace) {
    const navLinkClassName =
      ({
        isActive,
      }: {
        isActive: boolean;
      }) =>
        cn(
          [
            "rounded-lg px-3 py-2",
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
        );

    return (
      <header className="sticky top-0 z-50 flex justify-center border-b border-[var(--flow-border)] bg-white/95 backdrop-blur">
        <div className="flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label="FlowBoard 홈"
          >
            <FlowBoardLogo />

            <span className="text-xl font-bold tracking-tight text-[var(--flow-text)]">
              Flow
              <span className="text-[var(--flow-primary-600)]">
                Board
              </span>
            </span>
          </Link>

          <nav
            className="flex items-center gap-1"
            aria-label="주 메뉴"
          >
            <NavLink
              to="/"
              end
              className={
                navLinkClassName
              }
            >
              홈
            </NavLink>

            {isLogin ? (
              <>
                <NavLink
                  to="/boards"
                  className={
                    navLinkClassName
                  }
                >
                  내 보드
                </NavLink>

                <NavLink
                  to="/mypage"
                  className={
                    navLinkClassName
                  }
                >
                  마이페이지
                </NavLink>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)]"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={
                    navLinkClassName
                  }
                >
                  로그인
                </NavLink>

                <Link
                  to="/signup"
                  className="ml-2 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--flow-primary-600)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--flow-primary-700)]"
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

  /*
   * 로그인 후 Workspace Header
   */
  return (
    <header className="sticky top-0 z-50 h-[var(--flow-header-height)] border-b border-[var(--flow-border)] bg-white">
      <div className="flex h-full w-full items-center">
        <Link
          to="/"
          className="flex h-full w-[var(--flow-sidebar-width)] shrink-0 items-center gap-2.5 border-r border-[var(--flow-border)] px-5"
          aria-label="FlowBoard 홈"
        >
          <FlowBoardLogo />

          <span className="text-lg font-bold tracking-tight text-[var(--flow-text)]">
            Flow
            <span className="text-[var(--flow-primary-600)]">
              Board
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-between px-6">
          <div>
            <p className="text-xs font-medium text-[var(--flow-text-muted)]">
              Workspace
            </p>

            <h1 className="mt-0.5 text-sm font-bold text-[var(--flow-text)]">
              {getWorkspaceTitle(
                location.pathname,
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/boards"
              className={({
                isActive,
              }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]"
                    : "text-[var(--flow-text-secondary)] hover:bg-[var(--flow-gray-100)]",
                )
              }
            >
              내 보드
            </NavLink>

            <NavLink
              to="/mypage"
              className={({
                isActive,
              }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]"
                    : "text-[var(--flow-text-secondary)] hover:bg-[var(--flow-gray-100)]",
                )
              }
            >
              마이페이지
            </NavLink>

            <span className="mx-1 h-5 w-px bg-[var(--flow-border)]" />

            <button
              type="button"
              aria-label="마이페이지"
              onClick={() =>
                navigate(
                  "/mypage",
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)] transition-colors hover:bg-[var(--flow-primary-100)]"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle
                  cx="12"
                  cy="8"
                  r="3.25"
                />
                <path d="M5.75 19c.75-3.3 3-5 6.25-5s5.5 1.7 6.25 5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
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
  pathname.startsWith("/boards/");

function FlowBoardLogo() {
  return (
    <span className="flex h-10 w-10 items-end justify-center gap-[3px] rounded-xl bg-[var(--flow-primary)] px-[8px] py-[8px] shadow-[var(--flow-shadow-sm)]">
      <span className="h-3.5 w-[5px] rounded-[2px] bg-white/70" />
      <span className="h-6 w-[5px] rounded-[2px] bg-white" />
      <span className="h-[18px] w-[5px] rounded-[2px] bg-white/90" />
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
        if (refreshToken) {
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
   * 랜딩 / 로그인 / 회원가입 Header
   */
  if (!workspace) {
    const navClassName =
      ({
        isActive,
      }: {
        isActive: boolean;
      }) =>
        cn(
          "rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors",
          isActive
            ? "bg-[var(--flow-primary-50)] text-[var(--flow-primary)]"
            : "text-[var(--flow-text-secondary)] hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]",
        );

    return (
      <header className="sticky top-0 z-50 flex justify-center border-b border-[var(--flow-border)] bg-white/95 backdrop-blur-md">
        <div className="flex h-[var(--flow-header-height)] w-full max-w-[1320px] items-center justify-between px-10">
          <Link
            to="/"
            aria-label="FlowBoard 홈"
            className="flex items-center gap-3"
          >
            <FlowBoardLogo />

            <span className="text-[21px] font-bold tracking-[-0.035em] text-[var(--flow-text)]">
              Flow
              <span className="text-[var(--flow-primary)]">
                Board
              </span>
            </span>
          </Link>

          <nav
            aria-label="주 메뉴"
            className="flex items-center gap-1"
          >
            <NavLink
              to="/"
              end
              className={
                navClassName
              }
            >
              홈
            </NavLink>

            {isLogin ? (
              <>
                <NavLink
                  to="/boards"
                  className={
                    navClassName
                  }
                >
                  내 보드
                </NavLink>

                <NavLink
                  to="/mypage"
                  className={
                    navClassName
                  }
                >
                  마이페이지
                </NavLink>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="ml-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)]"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={
                    navClassName
                  }
                >
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

  /*
   * 로그인 후 작업 공간 Header
   */
  return (
    <header className="sticky top-0 z-50 h-[var(--flow-header-height)] border-b border-[var(--flow-border)] bg-white">
      <div className="flex h-full w-full items-center">
        <Link
          to="/"
          aria-label="FlowBoard 홈"
          className="flex h-full w-[var(--flow-sidebar-width)] shrink-0 items-center gap-3 border-r border-[var(--flow-border)] px-6"
        >
          <FlowBoardLogo />

          <span className="text-[19px] font-bold tracking-[-0.035em] text-[var(--flow-text)]">
            Flow
            <span className="text-[var(--flow-primary)]">
              Board
            </span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-between px-8">
          <div>
            <p className="text-[13px] font-semibold text-[var(--flow-text)]">
              개발의 모든 흐름을
              한곳에서
            </p>

            <p className="mt-0.5 text-[11px] text-[var(--flow-text-muted)]">
              기획부터 디자인, 구현,
              테스트와 배포까지
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/mypage",
                )
              }
              className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-[var(--flow-text-secondary)] transition-colors hover:bg-[var(--flow-gray-100)] hover:text-[var(--flow-text)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
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
                  <circle
                    cx="12"
                    cy="8"
                    r="3.25"
                  />

                  <path d="M5.75 19c.75-3.3 3-5 6.25-5s5.5 1.7 6.25 5" />
                </svg>
              </span>

              마이페이지
            </button>

            <span className="h-6 w-px bg-[var(--flow-border)]" />

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-[var(--flow-text-muted)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
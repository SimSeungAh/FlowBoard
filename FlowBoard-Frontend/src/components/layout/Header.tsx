import { Link, NavLink, useNavigate } from "react-router";

import { logout } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";

export default function Header() {
  const navigate = useNavigate();

  const isLogin = useAuthStore((state) => state.isLogin);

  const refreshToken = useAuthStore((state) => state.refreshToken);

  const clearTokens = useAuthStore((state) => state.clearTokens);

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

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    );

  return (
    <header className="sticky top-0 z-50 flex justify-center border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="FlowBoard 홈">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white shadow-sm shadow-blue-200">
            F
          </span>

          <span className="text-xl font-bold tracking-tight text-slate-950">
            Flow
            <span className="text-blue-600">Board</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="주 메뉴">
          <NavLink to="/" end className={navLinkClassName}>
            홈
          </NavLink>

          {isLogin ? (
            <>
              <NavLink to="/boards" className={navLinkClassName}>
                내 보드
              </NavLink>

              <NavLink to="/mypage" className={navLinkClassName}>
                마이페이지
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClassName}>
                로그인
              </NavLink>

              <Link
                to="/signup"
                className="ml-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
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

import { Link, useNavigate } from "react-router";

import { logout } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

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

  return (
    <header className="sticky top-0 z-50 flex justify-center border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 w-full max-w-7xl items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="FlowBoard 홈으로 이동"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            F
          </span>

          <span className="text-xl font-bold tracking-tight text-slate-900">
            Flow
            <span className="text-blue-600">Board</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm" aria-label="주 메뉴">
          <Link
            to="/"
            className="rounded-lg px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600"
          >
            홈
          </Link>

          {isLogin ? (
            <>
              <Link
                to="/mypage"
                className="rounded-lg px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600"
              >
                마이페이지
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-red-500"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600"
              >
                로그인
              </Link>

              <Link
                to="/signup"
                className="ml-1 rounded-lg bg-blue-600 px-3 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

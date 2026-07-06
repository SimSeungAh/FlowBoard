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
    <header className="flex justify-center border-b border-slate-200 bg-white">
      <div className="flex h-14 w-full max-w-4xl items-center justify-between px-6">
        <Link to="/" className="text-xl font-bold text-blue-600">
          Frontend Template
        </Link>

        <nav className="flex items-center gap-4 text-sm text-slate-700">
          <Link to="/" className="hover:text-blue-600">
            Home
          </Link>

          {isLogin ? (
            <>
              <Link to="/mypage" className="hover:text-blue-600">
                MyPage
              </Link>

              <button type="button" onClick={handleLogout} className="hover:text-blue-600">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-600">
                Login
              </Link>

              <Link to="/signup" className="hover:text-blue-600">
                Signup
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

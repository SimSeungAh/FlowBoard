import { Navigate, Outlet } from "react-router";

import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute() {
  const isLogin = useAuthStore((state) => state.isLogin);

  if (!isLogin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

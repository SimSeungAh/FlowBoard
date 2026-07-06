import { createBrowserRouter, RouterProvider } from "react-router";

import MainLayout from "@/components/layout/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import HomePage from "@/pages/Home/HomePage";
import LoginPage from "@/pages/Login/LoginPage";
import MyPage from "@/pages/MyPage/MyPage";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
import SignupPage from "@/pages/Signup/SignupPage";
import ProtectedRoute from "@/routes/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "signup",
        element: <SignupPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "mypage",
            element: <MyPage />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

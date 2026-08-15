import { createBrowserRouter, RouterProvider } from "react-router";

import BoardToolsLayout from "@/components/layout/BoardToolsLayout";
import MainLayout from "@/components/layout/MainLayout";
import ActivityPage from "@/pages/Activity/ActivityPage";
import BoardPage from "@/pages/Board/BoardPage";
import BoardsPage from "@/pages/Boards/BoardsPage";
import CardSearchPage from "@/pages/CardSearch/CardSearchPage";
import ErrorPage from "@/pages/ErrorPage";
import HomePage from "@/pages/Home/HomePage";
import LoginPage from "@/pages/Login/LoginPage";
import MyPage from "@/pages/MyPage/MyPage";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
import SignupPage from "@/pages/Signup/SignupPage";
import WhiteboardPage from "@/pages/Whiteboard/WhiteboardPage";
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
          {
            path: "boards",
            element: <BoardsPage />,
          },
          {
            path: "boards/:boardId",
            element: <BoardToolsLayout />,
            children: [
              {
                index: true,
                element: <BoardPage />,
              },
              {
                path: "search",
                element: <CardSearchPage />,
              },
              {
                path: "whiteboard",
                element: <WhiteboardPage />,
              },
              {
                path: "activities",
                element: <ActivityPage />,
              },
            ],
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

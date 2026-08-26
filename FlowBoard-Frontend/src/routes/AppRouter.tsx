import { createBrowserRouter, RouterProvider } from "react-router";

import BoardToolsLayout from "@/components/layout/BoardToolsLayout";
import MainLayout from "@/components/layout/MainLayout";

import ActivityPage from "@/pages/Activity/ActivityPage";
import BoardPage from "@/pages/Board/BoardPage";
import BoardMembersPage from "@/pages/BoardMembers/BoardMembersPage";
import BoardsPage from "@/pages/Boards/BoardsPage";
import CardSearchPage from "@/pages/CardSearch/CardSearchPage";
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import ErrorPage from "@/pages/ErrorPage";
import HomePage from "@/pages/Home/HomePage";
import LoginPage from "@/pages/Login/LoginPage";
import MyPage from "@/pages/MyPage/MyPage";
import RequirementsPage from "@/pages/Requirements/RequirementsPage";
import ReleaseChecksPage from "@/pages/ReleaseChecks/ReleaseChecksPage";
import SchedulePage from "@/pages/Schedule/SchedulePage";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";
import SecurityReviewsPage from "@/pages/SecurityReviews/SecurityReviewsPage";
import SignupPage from "@/pages/Signup/SignupPage";
import TestCasesPage from "@/pages/TestCases/TestCasesPage";
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

                element: <DashboardPage />,
              },

              {
                path: "kanban",

                element: <BoardPage />,
              },

              {
                path: "requirements",

                element: <RequirementsPage />,
              },

              {
                path: "schedule",

                element: <SchedulePage />,
              },

              {
                path: "search",

                element: <CardSearchPage />,
              },

              {
                path: "test-cases",

                element: <TestCasesPage />,
              },

              {
                path: "security-reviews",

                element: <SecurityReviewsPage />,
              },

              {
                path: "release-checks",

                element: <ReleaseChecksPage />,
              },

              {
                path: "whiteboard",

                element: <WhiteboardPage />,
              },

              {
                path: "activities",

                element: <ActivityPage />,
              },

              {
                path: "members",

                element: <BoardMembersPage />,
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

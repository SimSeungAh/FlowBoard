import { Outlet, useLocation } from "react-router";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import WorkspaceSidebar from "@/components/layout/WorkspaceSidebar";

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

export default function MainLayout() {
  const location = useLocation();
  const workspace = isWorkspacePath(location.pathname);
  const boardId = getBoardIdFromPath(location.pathname);

  if (!workspace) {
    return (
      <div className="min-h-screen bg-white">
        <Header />

        <main className="flex w-full justify-center">
          <Outlet />
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--flow-background)]">
      <Header />

      <div className="flex min-h-[calc(100vh-var(--flow-header-height))] w-full">
        <WorkspaceSidebar boardId={boardId} />

        <main className="min-w-0 flex-1 bg-[var(--flow-background)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Outlet } from "react-router";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="flex w-full justify-center">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

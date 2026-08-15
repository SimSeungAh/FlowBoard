import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            F
          </span>

          <span className="text-sm font-bold text-slate-900">
            Flow
            <span className="text-blue-600">Board</span>
          </span>
        </Link>

        <p className="text-xs text-slate-400">
          © 2026 FlowBoard. Real-time collaborative Kanban board.
        </p>
      </div>
    </footer>
  );
}

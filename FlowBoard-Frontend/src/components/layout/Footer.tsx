import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--flow-border)] bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--flow-primary)] text-xs font-bold text-white">
            F
          </span>

          <span className="text-sm font-bold text-[var(--flow-text)]">
            Flow
            <span className="text-[var(--flow-primary)]">Board</span>
          </span>
        </Link>

        <p className="text-xs text-[var(--flow-text-placeholder)]">
          © 2026 FlowBoard. Real-time collaborative Kanban board.
        </p>
      </div>
    </footer>
  );
}

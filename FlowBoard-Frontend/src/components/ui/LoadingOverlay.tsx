interface LoadingOverlayProps {
  open: boolean;
  text?: string;
}

export default function LoadingOverlay({ open, text = "로딩 중..." }: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-8 py-6 shadow-lg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

        <p className="text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

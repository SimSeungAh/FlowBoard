import Button from "@/components/ui/Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="mb-4 text-5xl">📭</div>

      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}

      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

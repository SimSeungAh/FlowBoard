import Button from "@/components/ui/Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--flow-border-strong)] bg-white px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--flow-primary-50)] text-[var(--flow-primary-600)]">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect
            x="4"
            y="4"
            width="6"
            height="16"
            rx="1.5"
          />

          <rect
            x="14"
            y="4"
            width="6"
            height="11"
            rx="1.5"
          />
        </svg>
      </div>

      <h2 className="mt-4 text-sm font-bold text-[var(--flow-text)]">
        {title}
      </h2>

      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-[var(--flow-text-muted)]">
          {description}
        </p>
      )}

      {actionLabel &&
        onAction && (
          <Button
            type="button"
            className="mt-5"
            onClick={
              onAction
            }
          >
            {actionLabel}
          </Button>
        )}
    </div>
  );
}
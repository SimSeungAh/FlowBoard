interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  pageBlockSize?: number;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  pageBlockSize = 10,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const currentBlock = Math.floor((page - 1) / pageBlockSize);

  const startPage = currentBlock * pageBlockSize + 1;

  const endPage = Math.min(startPage + pageBlockSize - 1, totalPages);

  const pages = Array.from(
    {
      length: endPage - startPage + 1,
    },
    (_, index) => startPage + index,
  );

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) {
      return;
    }

    onChange(targetPage);
  };

  const navigationButtonClassName = [
    "flex h-9 min-w-9 items-center justify-center",
    "rounded-lg border border-[var(--flow-border-strong)]",
    "bg-white px-3",
    "text-sm font-medium text-[var(--flow-text-secondary)]",
    "transition-colors",
    "hover:border-[var(--flow-primary-200)]",
    "hover:bg-[var(--flow-gray-50)]",
    "hover:text-[var(--flow-text)]",
    "disabled:cursor-not-allowed disabled:opacity-40",
  ].join(" ");

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="페이지네이션"
    >
      <button
        type="button"
        aria-label="첫 페이지로 이동"
        onClick={() => goToPage(1)}
        disabled={page === 1}
        className={navigationButtonClassName}
      >
        &lt;&lt;
      </button>

      <button
        type="button"
        aria-label="이전 페이지로 이동"
        onClick={() => goToPage(page - 1)}
        disabled={page === 1}
        className={navigationButtonClassName}
      >
        &lt;
      </button>

      {pages.map((pageNumber) => {
        const isCurrent = pageNumber === page;

        return (
          <button
            key={pageNumber}
            type="button"
            aria-label={`${pageNumber} 페이지로 이동`}
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => goToPage(pageNumber)}
            className={[
              "flex h-9 min-w-9 items-center justify-center",
              "rounded-lg border px-3",
              "text-sm font-semibold",
              "transition-[border-color,background-color,color,box-shadow]",
              isCurrent
                ? [
                    "border-[var(--flow-primary)]",
                    "bg-[var(--flow-primary)]",
                    "text-white",
                    "shadow-[var(--flow-shadow-xs)]",
                  ].join(" ")
                : [
                    "border-[var(--flow-border-strong)]",
                    "bg-white",
                    "text-[var(--flow-text-secondary)]",
                    "hover:border-[var(--flow-primary-200)]",
                    "hover:bg-[var(--flow-gray-50)]",
                    "hover:text-[var(--flow-text)]",
                  ].join(" "),
            ].join(" ")}
          >
            {pageNumber}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="다음 페이지로 이동"
        onClick={() => goToPage(page + 1)}
        disabled={page === totalPages}
        className={navigationButtonClassName}
      >
        &gt;
      </button>

      <button
        type="button"
        aria-label="마지막 페이지로 이동"
        onClick={() => goToPage(totalPages)}
        disabled={page === totalPages}
        className={navigationButtonClassName}
      >
        &gt;&gt;
      </button>
    </nav>
  );
}

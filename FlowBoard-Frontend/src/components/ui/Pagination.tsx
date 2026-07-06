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
  if (totalPages <= 1) return null;

  const currentBlock = Math.floor((page - 1) / pageBlockSize);
  const startPage = currentBlock * pageBlockSize + 1;
  const endPage = Math.min(startPage + pageBlockSize - 1, totalPages);

  const pages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) {
      return;
    }

    onChange(targetPage);
  };

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
        className="flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        &lt;&lt;
      </button>

      <button
        type="button"
        aria-label="이전 페이지로 이동"
        onClick={() => goToPage(page - 1)}
        disabled={page === 1}
        className="flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
            className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${
              isCurrent
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
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
        className="flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        &gt;
      </button>

      <button
        type="button"
        aria-label="마지막 페이지로 이동"
        onClick={() => goToPage(totalPages)}
        disabled={page === totalPages}
        className="flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        &gt;&gt;
      </button>
    </nav>
  );
}

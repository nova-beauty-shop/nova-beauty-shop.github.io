import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/lib/format';

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const itemClass = (active: boolean) =>
    `flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3 text-sm transition ${
      active ? 'bg-burgundy-700 text-ivory-50' : 'text-ink-700 hover:bg-ivory-200'
    }`;

  return (
    <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-2 pt-14">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="صفحه قبلی"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition hover:border-burgundy-700 hover:text-burgundy-700 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-current={item === page ? 'page' : undefined}
          className={itemClass(item === page)}
        >
          {formatNumber(item)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="صفحه بعدی"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition hover:border-burgundy-700 hover:text-burgundy-700 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </nav>
  );
}

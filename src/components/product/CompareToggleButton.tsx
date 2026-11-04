import { useEffect, useState } from 'react';
import { GitCompareArrows } from 'lucide-react';
import { useCompare } from '@/hooks/useCompare';

/**
 * Adds or removes a product from the comparison list (up to four products).
 * `variant="icon"` is the round button on product cards, `variant="full"` the labelled button on the product page.
 */
export default function CompareToggleButton({
  productId,
  productName,
  variant = 'icon',
  className = '',
}: {
  productId: string;
  productName: string;
  variant?: 'icon' | 'full';
  className?: string;
}) {
  const compare = useCompare();
  const [message, setMessage] = useState<string | null>(null);
  const selected = compare.has(productId);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  function handleClick() {
    const result = compare.toggle(productId);
    if (result === 'full') {
      setMessage(`حداکثر ${compare.max.toLocaleString('fa-IR')} محصول را می‌توان مقایسه کرد.`);
    }
  }

  const label = selected ? `حذف ${productName} از مقایسه` : `افزودن ${productName} به مقایسه`;

  if (variant === 'full') {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          aria-pressed={selected}
          className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition duration-300 ${
            selected
              ? 'border-burgundy-700 bg-burgundy-700 text-ivory-50'
              : 'border-burgundy-700/30 text-burgundy-700 hover:border-burgundy-700'
          }`}
        >
          <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          {selected ? 'در لیست مقایسه' : 'افزودن به مقایسه'}
        </button>
        <p role="status" className="mt-2 min-h-[1rem] text-xs text-warning-600">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className={`absolute ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={selected}
        aria-label={label}
        title={selected ? 'حذف از مقایسه' : 'افزودن به مقایسه'}
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-soft transition duration-300 hover:scale-110 ${
          selected ? 'bg-burgundy-700 text-ivory-50' : 'bg-ivory-50/95 text-burgundy-700'
        }`}
      >
        <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
      </button>
      {message && (
        <p
          role="status"
          className="absolute end-0 top-12 z-10 w-36 rounded-xl bg-ink-900 px-3 py-2 text-xs leading-relaxed text-ivory-50 shadow-lift"
        >
          {message}
        </p>
      )}
    </div>
  );
}

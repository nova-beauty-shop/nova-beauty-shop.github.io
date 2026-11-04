import { Star } from 'lucide-react';
import { formatRating } from '@/lib/format';

export default function Stars({ value, showValue = false }: { value: number; showValue?: boolean }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`امتیاز ${formatRating(value)} از ۵`}>
      <span className="inline-flex gap-0.5 text-gold-500">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill={index < rounded ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      {showValue && <span className="text-sm text-ink-700">{formatRating(value)}</span>}
    </span>
  );
}

import { Minus, Plus } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

export default function QuantityStepper({ value, max, onChange, label }: QuantityStepperProps) {
  const canDecrease = value > 1;
  const canIncrease = value < max;
  const buttonClass =
    'flex h-10 w-10 items-center justify-center text-ink-700 transition hover:text-burgundy-700 disabled:cursor-not-allowed disabled:text-ink-300';

  return (
    <div className="inline-flex items-center rounded-full border border-ink-300 bg-ivory-50" role="group" aria-label={label}>
      <button type="button" className={buttonClass} onClick={() => onChange(value - 1)} disabled={!canDecrease} aria-label="کاهش تعداد">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-medium" aria-live="polite">
        {formatNumber(value)}
      </span>
      <button type="button" className={buttonClass} onClick={() => onChange(value + 1)} disabled={!canIncrease} aria-label="افزایش تعداد">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

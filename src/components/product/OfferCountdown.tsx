import { Zap } from 'lucide-react';
import type { Countdown } from '@/hooks/useCountdown';

function two(value: number): string {
  return value.toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });
}

/** Display of a running "amazing offer" countdown. Renders nothing once the offer has ended. */
export default function OfferCountdown({ countdown, compact = false }: { countdown: Countdown; compact?: boolean }) {
  if (countdown.expired) return null;

  const clock = `${two(countdown.hours)}:${two(countdown.minutes)}:${two(countdown.seconds)}`;
  const spoken = `${countdown.days > 0 ? `${countdown.days.toLocaleString('fa-IR')} روز و ` : ''}${countdown.hours.toLocaleString('fa-IR')} ساعت و ${countdown.minutes.toLocaleString('fa-IR')} دقیقه`;

  return (
    <div
      role="timer"
      aria-label={`پیشنهاد شگفت‌انگیز؛ ${spoken} تا پایان`}
      className={`flex items-center justify-between gap-2 rounded-xl bg-gradient-to-l from-burgundy-800 to-burgundy-600 text-ivory-50 shadow-soft ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
      }`}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Zap className="h-3.5 w-3.5 text-gold-400" fill="currentColor" aria-hidden="true" />
        پیشنهاد شگفت‌انگیز
      </span>
      <span className="flex items-center gap-1.5 tabular-nums" dir="ltr" aria-hidden="true">
        {countdown.days > 0 && (
          <span className="rounded-md bg-ivory-50/15 px-1.5 py-0.5 font-medium">{`${countdown.days.toLocaleString('fa-IR')}d`}</span>
        )}
        <span className="rounded-md bg-ivory-50/15 px-1.5 py-0.5 font-medium">{clock}</span>
      </span>
    </div>
  );
}

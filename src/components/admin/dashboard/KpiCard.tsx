import type { LucideIcon } from 'lucide-react';

type Tone = 'default' | 'success' | 'warning';

const TONE_CLASSES: Record<Tone, string> = {
  default: 'border-ivory-300 bg-ivory-50',
  success: 'border-success-600/20 bg-success-100/50',
  warning: 'border-warning-600/30 bg-warning-100/60',
};

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <article className={`rounded-3xl border p-6 shadow-soft transition duration-300 hover:-translate-y-0.5 ${TONE_CLASSES[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-ink-700">{label}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ivory-200 text-burgundy-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-ink-900 md:text-3xl">{value}</p>
      <p className="mt-2 text-xs leading-[1.8] text-ink-500">{hint}</p>
    </article>
  );
}

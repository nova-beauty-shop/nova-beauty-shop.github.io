import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const TONE_STYLES = {
  success: 'bg-success-100 text-success-600',
  info: 'bg-ivory-200 text-ink-900',
  warning: 'bg-warning-100 text-warning-600',
  error: 'bg-error-100 text-error-600',
} as const;

export default function StatusBox({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof TONE_STYLES;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-4 rounded-2xl p-5 ${TONE_STYLES[tone]}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm leading-[1.8]">{children}</p>
      </div>
    </div>
  );
}

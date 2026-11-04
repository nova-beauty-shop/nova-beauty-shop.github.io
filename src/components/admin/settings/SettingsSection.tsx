import type { ReactNode } from 'react';

export function SettingsSection({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="space-y-8 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="space-y-2">
        <h2 className="text-xl">{title}</h2>
        <p className="text-sm leading-[1.8] text-ink-500">{description}</p>
      </div>
      {children}
      {footer}
    </section>
  );
}

export function FormField({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-900">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-[1.7] text-ink-500">{hint}</p>}
    </div>
  );
}

export function FormStatus({ status }: { status: { tone: 'success' | 'error'; text: string } | null }) {
  if (!status) return null;
  return (
    <p
      role={status.tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-3 text-sm ${
        status.tone === 'error' ? 'bg-error-100 text-error-600' : 'bg-success-100 text-success-600'
      }`}
    >
      {status.text}
    </p>
  );
}

export function ReadOnlyNotice({ message }: { message?: string }) {
  return (
    <p className="rounded-xl bg-ivory-200/70 px-4 py-3 text-sm text-ink-700">
      {message ?? 'دسترسی شما فقط مشاهده است. تغییر این بخش تنها برای مالک و مدیر فروشگاه امکان‌پذیر است.'}
    </p>
  );
}

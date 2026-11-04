import { useAdminAccess } from '@/hooks/useAdminAccess';
import Link from '@/components/common/Link';

/**
 * Small glass "✏️ ویرایش سریع" button for owners and managers. It renders nothing for everyone else, so it can be
 * dropped into any storefront section. The parent section must be `relative`.
 */
export default function QuickEditButton({
  to,
  label = 'ویرایش سریع',
  tone = 'light',
  className = 'end-3 top-3',
  inline = false,
}: {
  to: string;
  label?: string;
  tone?: 'light' | 'dark';
  /** Corner position classes, used when the button floats over a section. */
  className?: string;
  /** Render in the normal flow instead of floating over a corner. */
  inline?: boolean;
}) {
  const { canQuickEdit } = useAdminAccess();
  if (!canQuickEdit) return null;

  const toneClass =
    tone === 'dark'
      ? 'hero-glass text-ivory-50 hover:bg-ivory-50/30'
      : 'border border-ivory-300 bg-ivory-50/80 text-burgundy-800 shadow-soft backdrop-blur hover:bg-ivory-50';

  return (
    <Link
      to={to}
      aria-label={`${label}: ${to.includes('tab=') ? 'رفتن به بخش مربوطه در پنل مدیریت' : 'پنل مدیریت'}`}
      className={`${inline ? 'relative' : `absolute z-20 ${className}`} inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-medium transition duration-300 hover:scale-105 ${toneClass}`}
    >
      <span aria-hidden="true">✏️</span>
      {label}
    </Link>
  );
}

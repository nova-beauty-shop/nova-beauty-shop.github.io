import { useState } from 'react';
import { ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react';
import Link from '@/components/common/Link';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useCompare } from '@/hooks/useCompare';

export interface AdminQuickLink {
  label: string;
  to: string;
}

/** Fixed bar at the bottom of the page with one-click shortcuts into /admin, shown to owners and managers only. */
export default function AdminQuickBar({ links }: { links: AdminQuickLink[] }) {
  const { canQuickEdit, access } = useAdminAccess();
  const compare = useCompare();
  const [collapsed, setCollapsed] = useState(false);

  if (!canQuickEdit) return null;

  // Sit above the compare bar when it is showing.
  const position = compare.ids.length > 0 ? 'bottom-24' : 'bottom-4';

  return (
    <nav
      aria-label="دسترسی سریع مدیر"
      className={`fixed inset-x-0 ${position} z-30 flex justify-center px-4 transition-[bottom] duration-300`}
    >
      <div className="flex max-w-full items-center gap-1 rounded-full border border-ivory-300 bg-ink-900/90 p-1.5 text-ivory-50 shadow-lift backdrop-blur">
        <Link
          to="/admin"
          className="inline-flex h-9 flex-none items-center gap-2 rounded-full px-3 text-xs font-medium hover:bg-ivory-50/15"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          {collapsed ? 'پنل مدیریت' : access?.username || 'پنل مدیریت'}
        </Link>
        {!collapsed && (
          <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {links.map((item) => (
              <li key={item.to} className="flex-none">
                <Link to={item.to} className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-xs hover:bg-ivory-50/15">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'نمایش میان‌برها' : 'پنهان کردن میان‌برها'}
          aria-expanded={!collapsed}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full hover:bg-ivory-50/15"
        >
          {collapsed ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
}

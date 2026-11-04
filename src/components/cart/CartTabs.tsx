export type CartTabKey = 'cart' | 'saved';

/** Two tabs shared by the cart drawer and the cart page: current cart and "save for later". */
export default function CartTabs({
  active,
  onChange,
  cartCount,
  savedCount,
}: {
  active: CartTabKey;
  onChange: (tab: CartTabKey) => void;
  cartCount: number;
  savedCount: number;
}) {
  const tabs: { key: CartTabKey; label: string; count: number }[] = [
    { key: 'cart', label: 'سبد خرید', count: cartCount },
    { key: 'saved', label: 'لیست خرید بعدی', count: savedCount },
  ];

  return (
    <div role="tablist" aria-label="بخش‌های سبد خرید" className="flex gap-6 border-b border-ivory-300">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          id={`cart-tab-${tab.key}`}
          role="tab"
          type="button"
          aria-selected={active === tab.key}
          aria-controls={`cart-panel-${tab.key}`}
          onClick={() => onChange(tab.key)}
          className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm transition ${
            active === tab.key ? 'border-burgundy-700 font-medium text-burgundy-800' : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          {tab.label}
          <span className="ms-1.5 rounded-full bg-ivory-200 px-2 py-0.5 text-xs text-ink-700">{tab.count.toLocaleString('fa-IR')}</span>
        </button>
      ))}
    </div>
  );
}

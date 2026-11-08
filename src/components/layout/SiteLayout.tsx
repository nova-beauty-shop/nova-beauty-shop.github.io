import { useCallback, useState, type ReactNode } from 'react';
import CartDrawer from '@/components/layout/CartDrawer';
import CompareBar from '@/components/product/CompareBar';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useSiteTexts } from '@/hooks/useSiteTexts';
import { fillStoreTokens } from '@/lib/storeSettings';

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const store = useStoreSettings();
  const texts = useSiteTexts();

  return (
    <div className="flex min-h-screen flex-col w-full max-w-[100vw] overflow-x-hidden overflow-x-clip">
      {store.data && (
        <div className="bg-burgundy-800 px-4 py-2 text-center text-xs tracking-wide text-ivory-100">
          {fillStoreTokens(texts.announcement_banner, store.data)}
        </div>
      )}
      <Header onOpenCart={() => setCartOpen(true)} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CompareBar />
      <CartDrawer open={cartOpen} onClose={closeCart} />
    </div>
  );
}

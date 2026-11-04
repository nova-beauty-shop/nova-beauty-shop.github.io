import SiteLayout from '@/components/layout/SiteLayout';
import { AdminAccessProvider } from '@/context/AdminAccessContext';
import { AuthProvider } from '@/context/AuthContext';
import { CompareProvider } from '@/context/CompareContext';
import { ShopProvider } from '@/context/ShopContext';
import { isInfoPageSlug } from '@/content/infoPages';
import { useLocation } from '@/lib/navigation';
import AccountPage from '@/pages/AccountPage';
import AddressesPage from '@/pages/AddressesPage';
import AdminContentPage from '@/pages/AdminContentPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import AdminCustomerDetailPage from '@/pages/AdminCustomerDetailPage';
import AdminCustomersPage from '@/pages/AdminCustomersPage';
import AdminInfoPageEditPage from '@/pages/AdminInfoPageEditPage';
import AdminInfoPagesPage from '@/pages/AdminInfoPagesPage';
import AdminGatewaysPage from '@/pages/AdminGatewaysPage';
import AdminOrderDetailPage from '@/pages/AdminOrderDetailPage';
import AdminOrderInvoicePage from '@/pages/AdminOrderInvoicePage';
import AdminOrdersPage from '@/pages/AdminOrdersPage';
import AdminPaymentsPage from '@/pages/AdminPaymentsPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import AuthPage from '@/pages/AuthPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import HomePage from '@/pages/HomePage';
import InfoPage from '@/pages/InfoPage';
import NotFoundPage from '@/pages/NotFoundPage';
import OrderPage from '@/pages/OrderPage';
import OrdersPage from '@/pages/OrdersPage';
import ProductPage from '@/pages/ProductPage';
import ShopPage from '@/pages/ShopPage';
import WishlistPage from '@/pages/WishlistPage';

function Routes() {
  const { pathname } = useLocation();
  const productMatch = pathname.match(/^\/product\/([^/]+)\/?$/);
  const orderMatch = pathname.match(/^\/account\/orders\/([^/]+)\/?$/);
  const adminOrderMatch = pathname.match(/^\/admin\/orders\/([^/]+)\/?$/);
  const adminInvoiceMatch = pathname.match(/^\/admin\/orders\/([^/]+)\/invoice\/?$/);
  const adminCustomerMatch = pathname.match(/^\/admin\/customers\/([^/]+)\/?$/);
  const adminPageMatch = pathname.match(/^\/admin\/pages\/([^/]+)\/?$/);

  if (pathname === '/') return <HomePage />;
  if (pathname === '/shop' || pathname === '/shop/') return <ShopPage />;
  if (productMatch) return <ProductPage slug={decodeURIComponent(productMatch[1])} />;
  if (pathname === '/cart') return <CartPage />;
  if (pathname === '/checkout') return <CheckoutPage />;
  if (pathname === '/wishlist') return <WishlistPage />;
  if (pathname === '/login') return <AuthPage mode="login" />;
  if (pathname === '/register') return <AuthPage mode="register" />;
  if (pathname === '/account') return <AccountPage />;
  if (pathname === '/account/addresses') return <AddressesPage />;
  if (pathname === '/account/orders') return <OrdersPage />;
  if (pathname === '/admin' || pathname === '/admin/') return <AdminDashboardPage />;
  if (pathname === '/admin/payments') return <AdminPaymentsPage />;
  if (pathname === '/admin/gateways') return <AdminGatewaysPage />;
  if (pathname === '/admin/settings') return <AdminSettingsPage />;
  if (pathname === '/admin/content') return <AdminContentPage />;
  if (pathname === '/admin/orders' || pathname === '/admin/orders/') return <AdminOrdersPage />;
  if (pathname === '/admin/customers' || pathname === '/admin/customers/') return <AdminCustomersPage />;
  if (pathname === '/admin/pages' || pathname === '/admin/pages/') return <AdminInfoPagesPage />;
  if (adminPageMatch) {
    const pageSlug = decodeURIComponent(adminPageMatch[1]);
    return isInfoPageSlug(pageSlug) ? <AdminInfoPageEditPage slug={pageSlug} /> : <NotFoundPage />;
  }
  if (adminCustomerMatch) return <AdminCustomerDetailPage customerId={decodeURIComponent(adminCustomerMatch[1])} />;
  if (adminInvoiceMatch) return <AdminOrderInvoicePage orderId={decodeURIComponent(adminInvoiceMatch[1])} />;
  if (adminOrderMatch) return <AdminOrderDetailPage orderId={decodeURIComponent(adminOrderMatch[1])} />;
  if (orderMatch) return <OrderPage id={decodeURIComponent(orderMatch[1])} />;
  const infoSlug = pathname.slice(1);
  if (isInfoPageSlug(infoSlug)) return <InfoPage key={infoSlug} slug={infoSlug} />;
  return <NotFoundPage />;
}

function App() {
  return (
    <AuthProvider>
      <AdminAccessProvider>
        <ShopProvider>
          <CompareProvider>
            <SiteLayout>
              <Routes />
            </SiteLayout>
          </CompareProvider>
        </ShopProvider>
      </AdminAccessProvider>
    </AuthProvider>
  );
}

export default App;

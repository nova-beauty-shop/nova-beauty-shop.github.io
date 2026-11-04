import { ArrowRight, Printer } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import OrderInvoice from '@/components/admin/orders/OrderInvoice';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useAsync } from '@/hooks/useAsync';
import { fetchAdminOrderDetail } from '@/lib/adminOrders';

export default function AdminOrderInvoicePage({ orderId }: { orderId: string }) {
  return <AdminGate>{() => <InvoiceContent orderId={orderId} />}</AdminGate>;
}

function InvoiceContent({ orderId }: { orderId: string }) {
  const order = useAsync(() => fetchAdminOrderDetail(orderId), [orderId]);
  const store = useStoreSettings();
  const loading = order.loading || store.loading;
  const failed = order.error || store.error;

  return (
    <div className="container-nova py-12 md:py-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link to={order.data ? `/admin/orders/${order.data.id}` : '/admin/orders'} className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-burgundy-700">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          بازگشت به سفارش
        </Link>
        <button type="button" onClick={() => window.print()} disabled={!order.data || !store.data} className="btn-primary">
          <Printer className="h-4 w-4" aria-hidden="true" />
          چاپ فاکتور
        </button>
      </div>

      {loading && <SkeletonGrid count={1} />}
      {failed && <ErrorState onRetry={() => { order.retry(); store.retry(); }} />}
      {!loading && !failed && order.data === null && (
        <p className="rounded-2xl bg-ivory-200/60 p-8 text-center text-sm text-ink-500">این سفارش پیدا نشد.</p>
      )}
      {order.data && store.data && <OrderInvoice order={order.data} store={store.data} />}
    </div>
  );
}

import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import StatusBox from '@/components/common/StatusBox';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import ShaparakGatewayModal from '@/components/order/ShaparakGatewayModal';
import { useAsync } from '@/hooks/useAsync';
import { formatToman } from '@/lib/format';
import type { OrderDetail } from '@/lib/orders';
import { fetchPaymentGateways } from '@/lib/paymentGateways';

interface OnlinePaymentPanelProps {
  order: OrderDetail;
  onChanged: () => void;
}

export default function OnlinePaymentPanel({ order, onChanged }: OnlinePaymentPanelProps) {
  const gateways = useAsync(fetchPaymentGateways, [order.id]);
  const [modalOpen, setModalOpen] = useState(order.status === 'awaiting_payment');

  if (gateways.loading) return <SkeletonGrid count={1} />;
  if (gateways.error || !gateways.data) return <ErrorState onRetry={gateways.retry} />;

  if (order.status === 'paid') {
    return (
      <StatusBox tone="success" icon={CheckCircle} title="پرداخت آنلاین شما موفق بود">
        {order.paymentReference
          ? `کد پیگیری بانکی: ${order.paymentReference}. سفارش شما در صف آماده‌سازی قرار گرفت.`
          : 'سفارش شما در صف آماده‌سازی قرار گرفت.'}
      </StatusBox>
    );
  }

  const gateway = gateways.data.find((item) => item.provider === order.paymentProvider);
  if (!gateway) {
    return (
      <StatusBox tone="warning" icon={AlertCircle} title="این درگاه در حال حاضر فعال نیست">
        لطفاً با پشتیبانی تماس بگیرید تا وضعیت پرداخت سفارش شما بررسی شود.
      </StatusBox>
    );
  }

  const installmentNote =
    order.paymentInstallments === 4
      ? `۴ قسط ماهانه، هر قسط ${formatToman(Math.ceil(order.totalToman / 4))}`
      : 'پرداخت یک‌جا';

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="space-y-2">
        <h2 className="text-xl">پرداخت آنلاین</h2>
        <p className="text-sm text-ink-700">
          درگاه: {gateway.label} · {installmentNote}
        </p>
      </div>
      <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        ادامه پرداخت
      </button>

      {modalOpen && (
        <ShaparakGatewayModal
          orderId={order.id}
          gatewayLabel={gateway.label}
          amountToman={order.totalToman}
          installments={order.paymentInstallments}
          onPaid={() => {
            setModalOpen(false);
            onChanged();
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}

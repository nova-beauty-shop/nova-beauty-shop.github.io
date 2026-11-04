import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import StatusBox from '@/components/common/StatusBox';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import BankCardDetails from '@/components/order/BankCardDetails';
import ReceiptUploadForm from '@/components/order/ReceiptUploadForm';
import { useAsync } from '@/hooks/useAsync';
import type { OrderDetail } from '@/lib/orders';
import { fetchOrderReceipts, fetchPaymentSettings } from '@/lib/payments';

interface CardPaymentPanelProps {
  order: OrderDetail;
  userId: string;
  onChanged: () => void;
}

export default function CardPaymentPanel({ order, userId, onChanged }: CardPaymentPanelProps) {
  const data = useAsync(async () => {
    const [settings, receipts] = await Promise.all([fetchPaymentSettings(), fetchOrderReceipts(order.id)]);
    return { settings, receipts };
  }, [order.id, order.status]);

  if (data.loading) return <SkeletonGrid count={1} />;
  if (data.error || !data.data) return <ErrorState onRetry={data.retry} />;

  const { settings, receipts } = data.data;

  if (order.status === 'paid') {
    return (
      <StatusBox tone="success" icon={CheckCircle} title="پرداخت شما تأیید شد">
        سفارش شما در صف آماده‌سازی قرار گرفت.
      </StatusBox>
    );
  }

  if (order.status === 'pending_review') {
    return (
      <StatusBox tone="info" icon={Clock} title="رسید شما دریافت شد">
        رسید پرداخت در انتظار بررسی است. پس از تأیید، وضعیت سفارش به‌روز می‌شود.
      </StatusBox>
    );
  }

  const lastReceipt = receipts[0];
  const rejectedNote = lastReceipt?.status === 'rejected' ? lastReceipt : null;

  return (
    <section className="space-y-8 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="space-y-2">
        <h2 className="text-xl">پرداخت کارت به کارت</h2>
        <p className="text-sm text-ink-500">مبلغ را به کارت زیر واریز کنید، سپس مشخصات فیش را ثبت کنید.</p>
      </div>

      {!settings?.cardPaymentEnabled || !settings.cardNumber ? (
        <StatusBox tone="warning" icon={AlertCircle} title="پرداخت کارت به کارت در حال حاضر فعال نیست">
          برای دریافت اطلاعات حساب و ارسال رسید، لطفاً بعداً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.
        </StatusBox>
      ) : (
        <>
          <BankCardDetails settings={settings} amountToman={order.totalToman} />

          {rejectedNote && (
            <StatusBox tone="error" icon={AlertCircle} title="رسید قبلی تأیید نشد">
              {rejectedNote.reviewNote || 'لطفاً رسید صحیح پرداخت را دوباره بارگذاری کنید.'}
            </StatusBox>
          )}

          <ReceiptUploadForm orderId={order.id} userId={userId} onUploaded={onChanged} />
        </>
      )}
    </section>
  );
}

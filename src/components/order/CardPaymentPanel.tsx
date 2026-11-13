import { AlertCircle, CheckCircle, Clock, Receipt } from "lucide-react";
import StatusBox from "@/components/common/StatusBox";
import { ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import ReceiptPreview from "@/components/admin/payments/ReceiptPreview";
import BankCardDetails from "@/components/order/BankCardDetails";
import ReceiptUploadForm from "@/components/order/ReceiptUploadForm";
import { useAsync } from "@/hooks/useAsync";
import type { OrderDetail } from "@/lib/orders";
import { fetchOrderReceipts, fetchPaymentSettings } from "@/lib/payments";

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
  const activeReceipt = receipts.find((r) => r.status === "approved" || r.status === "pending") ?? null;

  if (order.status === "paid" || activeReceipt?.status === "approved") {
    return (
      <div className="space-y-4">
        <StatusBox tone="success" icon={CheckCircle} title="پرداخت شما تأیید شد">
          سفارش شما در صف آماده‌سازی قرار گرفت.
        </StatusBox>
        {activeReceipt?.storagePath && (
          <div className="rounded-3xl border border-ivory-300 bg-ivory-50 p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><Receipt className="h-4 w-4 text-burgundy-700" /> تصویر فیش تأییدشده شما:</p>
            <div className="max-w-xs"><ReceiptPreview storagePath={activeReceipt.storagePath} /></div>
          </div>
        )}
      </div>
    );
  }

  if (order.status === "pending_review" || activeReceipt?.status === "pending") {
    return (
      <div className="space-y-4">
        <StatusBox tone="info" icon={Clock} title="فیش پرداخت شما ثبت شد و در انتظار بررسی است">
          تصویر فیش و مشخصات واریز شما برای مدیریت ارسال شده است و پس از تأیید، وضعیت سفارش به‌روز می‌شود.
        </StatusBox>
        {activeReceipt?.storagePath && (
          <div className="rounded-3xl border border-ivory-300 bg-ivory-50 p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><Receipt className="h-4 w-4 text-burgundy-700" /> تصویر فیش واریزی ارسالی شما:</p>
            <div className="max-w-xs"><ReceiptPreview storagePath={activeReceipt.storagePath} /></div>
          </div>
        )}
      </div>
    );
  }

  const lastReceipt = receipts[0];
  const rejectedNote = lastReceipt?.status === "rejected" ? lastReceipt : null;

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
              {rejectedNote.reviewNote || "لطفاً رسید صحیح پرداخت را دوباره بارگذاری کنید."}
            </StatusBox>
          )}

          <ReceiptUploadForm orderId={order.id} userId={userId} onUploaded={onChanged} />
        </>
      )}
    </section>
  );
}
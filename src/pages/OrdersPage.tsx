import { useEffect, useState } from "react";
import { CheckCircle2, Receipt } from "lucide-react";
import RequireAuth from "@/components/account/RequireAuth";
import ReceiptPreview from "@/components/admin/payments/ReceiptPreview";
import Link from "@/components/common/Link";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import { formatDate, formatToman } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { fetchUserOrders } from "@/lib/orders";
import { supabase } from "@/lib/supabase";
import { resolveOrderDynamicTotals } from "@/lib/storeSettings";

export default function OrdersPage() {
  return <RequireAuth>{() => <OrdersContent />}</RequireAuth>;
}

function OrdersContent() {
  const orders = useAsync(fetchUserOrders, []);
  const [receiptMap, setReceiptMap] = useState<Record<string, string>>({});
  const [dynamicTotalMap, setDynamicTotalMap] = useState<Record<string, number>>({});
  const isSuccess = typeof window !== "undefined" && window.location.search.includes("success=true");

  useEffect(() => {
    async function loadUserReceipts() {
      if (!orders.data || orders.data.length === 0) return;
      const ids = orders.data.map((o) => o.id);
      const map: Record<string, string> = {};
      for (const id of ids) {
        try {
          const local = localStorage.getItem("nova_receipt_order_" + id);
          if (local) map[id] = local;
        } catch {}
      }
      const { data } = await supabase.from("payment_receipts").select("order_id, storage_path").in("order_id", ids);
      if (Array.isArray(data)) {
        for (const row of data as any[]) {
          if (row.order_id && row.storage_path && !map[row.order_id]) {
            map[row.order_id] = String(row.storage_path);
          }
        }
      }
      setReceiptMap(map);
      const { data: orderRows } = await supabase.from("orders").select("id, province, city, subtotal_toman, delivery_fee_toman, total_toman, items:order_items(quantity)").in("id", ids);
      if (Array.isArray(orderRows)) {
        const tMap: Record<string, number> = {};
        for (const r of orderRows as any[]) {
          const cnt = Array.isArray(r.items) ? r.items.reduce((s: number, it: any) => s + Number(it.quantity || 1), 0) : 1;
          const calc = resolveOrderDynamicTotals({ province: String(r.province || ""), city: String(r.city || ""), subtotalToman: Number(r.subtotal_toman || 0), dbDeliveryFeeToman: Number(r.delivery_fee_toman || 0), dbTotalToman: Number(r.total_toman || 0), itemCount: cnt });
          tMap[r.id] = calc.totalToman;
        }
        setDynamicTotalMap(tMap);
      }
    }
    void loadUserReceipts();
  }, [orders.data]);

  return (
    <div className="container-nova py-10 md:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">حساب کاربری</p>
          <h1 className="mt-2 text-2xl font-bold md:text-4xl">سفارش‌ها و فیش‌های من</h1>
        </div>
        <Link to="/shop" className="btn-outline">ادامه خرید</Link>
      </div>

      {isSuccess && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-success-600/30 bg-success-100 p-4 text-sm font-bold text-success-600 shadow-soft">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>سفارش و تصویر فیش واریزی شما با موفقیت ثبت شد و در حال بررسی است.</span>
        </div>
      )}

      <div className="mt-8">
        {orders.loading && <SkeletonGrid count={2} />}
        {orders.error && <ErrorState onRetry={orders.retry} />}
        {orders.data && orders.data.length === 0 && (
          <EmptyState title="هنوز سفارشی ثبت نکرده‌اید" description="محصولات مورد علاقه خود را از فروشگاه انتخاب کنید." action={<Link to="/shop" className="btn-primary">مشاهده فروشگاه</Link>} />
        )}
        {orders.data && orders.data.length > 0 && (
          <ul className="space-y-5">
            {orders.data.map((order) => {
              const rPath = receiptMap[order.id];
              return (
                <li key={order.id} className="rounded-3xl border border-ivory-300 bg-ivory-50 p-5 shadow-soft sm:p-6">
                  <div className="flex flex-col gap-3 border-b border-ivory-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-ink-900" dir="ltr">{order.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="rounded-full bg-ivory-200 px-3 py-1 text-xs font-bold text-ink-800">{ORDER_STATUS_LABELS[order.status]}</span>
                      <span className="font-bold text-burgundy-800">{formatToman(dynamicTotalMap[order.id] ?? order.totalToman)}</span>
                      <Link to={"/account/orders/" + order.id} className="btn-outline h-9 px-4 text-xs">جزئیات سفارش</Link>
                    </div>
                  </div>
                  {rPath && (
                    <div className="mt-4 rounded-2xl border border-ivory-300 bg-white p-3 sm:p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-burgundy-800"><Receipt className="h-4 w-4" /> تصویر فیش واریزی ثبت‌شده شما:</p>
                      <div className="max-w-xs"><ReceiptPreview storagePath={rPath} /></div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminWriteErrorMessage } from '@/lib/adminWriteErrors';
import {
  deleteCoupon,
  fetchCoupons,
  saveCoupon,
  setCouponActive,
  type AdminCoupon,
  type CouponDiscountType,
  type CouponInput,
} from '@/lib/adminCoupons';
import { parseIntegerInput } from '@/lib/digits';
import { formatNumber, formatToman } from '@/lib/format';

const CODE_PATTERN = /^[A-Z0-9_-]{3,20}$/;
const TEHRAN_OFFSET = '+03:30';

interface CouponDraft {
  id?: string;
  code: string;
  discountType: CouponDiscountType;
  discountText: string;
  minText: string;
  maxUsesText: string;
  startsDate: string;
  endsDate: string;
  isActive: boolean;
}

const EMPTY_DRAFT: CouponDraft = {
  code: '',
  discountType: 'percent',
  discountText: '',
  minText: '0',
  maxUsesText: '',
  startsDate: '',
  endsDate: '',
  isActive: true,
};

export default function CouponsManager({ canEdit }: { canEdit: boolean }) {
  const coupons = useAsync(fetchCoupons, []);
  const [editing, setEditing] = useState<CouponDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(item: AdminCoupon) {
    setError(null);
    try {
      await setCouponActive(item.id, !item.isActive);
      setNotice(item.isActive ? 'کد تخفیف غیرفعال شد.' : 'کد تخفیف فعال شد.');
      coupons.retry();
    } catch (cause) {
      setError(adminWriteErrorMessage(cause));
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteCoupon(id);
      setNotice('کد تخفیف حذف شد.');
      coupons.retry();
    } catch (cause) {
      setError(adminWriteErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl">کدهای تخفیف</h2>
          <p className="mt-1 text-sm text-ink-500">کد تخفیف درصدی یا مبلغ ثابت با شرایط اختیاری بسازید.</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={() => { setNotice(null); setEditing(EMPTY_DRAFT); }} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            کد جدید
          </button>
        )}
      </div>

      {notice && <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}

      {editing && (
        <CouponEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('کد تخفیف ذخیره شد.');
            coupons.retry();
          }}
        />
      )}

      {coupons.loading && <SkeletonGrid count={2} />}
      {coupons.error && <ErrorState onRetry={coupons.retry} />}
      {coupons.data && coupons.data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-ivory-300 p-8 text-center text-sm text-ink-500">هنوز کد تخفیفی ساخته نشده است.</p>
      )}
      {coupons.data && coupons.data.length > 0 && (
        <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
          {coupons.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-base font-semibold tracking-wide text-ink-900" dir="ltr">{item.code}</p>
                <p className="text-xs text-ink-500">
                  {describeDiscount(item)} · استفاده: {formatNumber(item.usedCount)}
                  {item.maxUses !== null ? ` از ${formatNumber(item.maxUses)}` : ''} · {item.isActive ? 'فعال' : 'غیرفعال'}
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void toggle(item)} className="btn-outline h-10 px-4 text-sm">
                    {item.isActive ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    {item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  </button>
                  <button type="button" onClick={() => { setNotice(null); setEditing(toDraft(item)); }} className="btn-outline h-10 px-4 text-sm">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    ویرایش
                  </button>
                  <button type="button" onClick={() => void remove(item.id)} className="btn-outline h-10 px-4 text-sm text-error-600">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    حذف
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describeDiscount(item: AdminCoupon): string {
  const value = item.discountType === 'percent' ? `${formatNumber(item.discountValue)} درصد تخفیف` : `${formatToman(item.discountValue)} تخفیف`;
  return item.minSubtotalToman > 0 ? `${value} برای خرید بالای ${formatToman(item.minSubtotalToman)}` : value;
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
}

function toDraft(item: AdminCoupon): CouponDraft {
  return {
    id: item.id,
    code: item.code,
    discountType: item.discountType,
    discountText: String(item.discountValue),
    minText: String(item.minSubtotalToman),
    maxUsesText: item.maxUses === null ? '' : String(item.maxUses),
    startsDate: toDateInput(item.startsAt),
    endsDate: toDateInput(item.endsAt),
    isActive: item.isActive,
  };
}

function toPayload(draft: CouponDraft): CouponInput | string {
  const code = draft.code.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return 'کد تخفیف باید ۳ تا ۲۰ نویسه از حروف انگلیسی بزرگ، عدد، خط تیره یا زیرخط باشد.';

  const discountValue = parseIntegerInput(draft.discountText);
  if (discountValue === null || discountValue <= 0) return 'مقدار تخفیف را به صورت عدد مثبت وارد کنید.';
  if (draft.discountType === 'percent' && discountValue > 100) return 'تخفیف درصدی نمی‌تواند بیشتر از ۱۰۰ باشد.';

  const minSubtotalToman = parseIntegerInput(draft.minText);
  if (minSubtotalToman === null || minSubtotalToman < 0) return 'حداقل مبلغ سفارش را به صورت عدد وارد کنید.';

  let maxUses: number | null = null;
  if (draft.maxUsesText.trim() !== '') {
    maxUses = parseIntegerInput(draft.maxUsesText);
    if (maxUses === null || maxUses <= 0) return 'سقف استفاده باید عدد مثبت باشد یا خالی بماند.';
  }

  if (draft.startsDate && draft.endsDate && draft.endsDate < draft.startsDate) {
    return 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.';
  }

  return {
    id: draft.id,
    code,
    discountType: draft.discountType,
    discountValue,
    minSubtotalToman,
    maxUses,
    startsAt: draft.startsDate ? `${draft.startsDate}T00:00:00${TEHRAN_OFFSET}` : null,
    endsAt: draft.endsDate ? `${draft.endsDate}T23:59:59${TEHRAN_OFFSET}` : null,
    isActive: draft.isActive,
  };
}

function CouponEditor({ initial, onSaved, onCancel }: { initial: CouponDraft; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const payload = toPayload(draft);
    if (typeof payload === 'string') {
      setStatus({ tone: 'error', text: payload });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveCoupon(payload);
      onSaved();
    } catch (cause) {
      setStatus({ tone: 'error', text: adminWriteErrorMessage(cause) });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
      <FormField id="c-code" label="کد تخفیف" hint="فقط حروف انگلیسی بزرگ، عدد، - و _">
        <input id="c-code" dir="ltr" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className="field font-mono tracking-wide text-start" />
      </FormField>
      <FormField id="c-type" label="نوع تخفیف">
        <select id="c-type" value={draft.discountType} onChange={(e) => setDraft({ ...draft, discountType: e.target.value as CouponDiscountType })} className="field">
          <option value="percent">درصدی</option>
          <option value="amount">مبلغ ثابت (تومان)</option>
        </select>
      </FormField>
      <FormField id="c-value" label={draft.discountType === 'percent' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'}>
        <input id="c-value" inputMode="numeric" value={draft.discountText} onChange={(e) => setDraft({ ...draft, discountText: e.target.value })} className="field" />
      </FormField>
      <FormField id="c-min" label="حداقل مبلغ سفارش (تومان)" hint="صفر یعنی بدون حداقل خرید">
        <input id="c-min" inputMode="numeric" value={draft.minText} onChange={(e) => setDraft({ ...draft, minText: e.target.value })} className="field" />
      </FormField>
      <FormField id="c-max" label="سقف تعداد استفاده" hint="خالی یعنی نامحدود">
        <input id="c-max" inputMode="numeric" value={draft.maxUsesText} onChange={(e) => setDraft({ ...draft, maxUsesText: e.target.value })} className="field" />
      </FormField>
      <label className="flex items-center gap-3 self-end text-sm text-ink-900">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="h-5 w-5 accent-burgundy-700" />
        فعال باشد
      </label>
      <FormField id="c-start" label="شروع اعتبار" hint="اختیاری">
        <input id="c-start" type="date" dir="ltr" value={draft.startsDate} onChange={(e) => setDraft({ ...draft, startsDate: e.target.value })} className="field text-start" />
      </FormField>
      <FormField id="c-end" label="پایان اعتبار" hint="اختیاری">
        <input id="c-end" type="date" dir="ltr" value={draft.endsDate} onChange={(e) => setDraft({ ...draft, endsDate: e.target.value })} className="field text-start" />
      </FormField>
      <FormStatus status={status} />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'در حال ذخیره...' : 'ذخیره کد تخفیف'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}

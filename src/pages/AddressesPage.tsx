import { useState } from 'react';
import AddressForm from '@/components/account/AddressForm';
import RequireAuth from '@/components/account/RequireAuth';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { deleteAddress, fetchAddresses, type Address } from '@/lib/addresses';

export default function AddressesPage() {
  return <RequireAuth>{() => <AddressesContent />}</RequireAuth>;
}

function AddressesContent() {
  const addresses = useAsync(fetchAddresses, []);
  const [adding, setAdding] = useState(false);

  return (
    <div className="container-nova py-12 md:py-16">
      <nav aria-label="مسیر صفحه" className="mb-6 text-sm text-ink-500">
        <Link to="/account" className="hover:text-burgundy-700">
          حساب کاربری
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-900">نشانی‌های من</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-ivory-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">نشانی‌ها</p>
          <h1 className="text-3xl md:text-4xl">نشانی‌های من</h1>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn-primary self-start md:self-auto">
            افزودن نشانی
          </button>
        )}
      </header>

      {adding && (
        <section className="mt-8 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
          <h2 className="mb-6 text-xl">نشانی جدید</h2>
          <AddressForm
            onSaved={() => {
              setAdding(false);
              addresses.retry();
            }}
            onCancel={() => setAdding(false)}
          />
        </section>
      )}

      <div className="mt-10">
        {addresses.loading && <SkeletonGrid count={2} />}
        {addresses.error && <ErrorState onRetry={addresses.retry} />}
        {addresses.data && addresses.data.length === 0 && (
          <EmptyState title="هنوز نشانی ثبت نکرده‌اید" description="نشانی خود را ذخیره کنید تا در زمان خرید سریع‌تر انتخاب کنید." />
        )}
        {addresses.data && addresses.data.length > 0 && (
          <ul className="grid gap-6 md:grid-cols-2">
            {addresses.data.map((address) => (
              <AddressCard key={address.id} address={address} onDeleted={addresses.retry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddressCard({ address, onDeleted }: { address: Address; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setFailed(false);
    try {
      await deleteAddress(address.id);
      onDeleted();
    } catch {
      setFailed(true);
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft">
      <div className="space-y-2 text-sm leading-[1.8] text-ink-700">
        <p className="text-base font-medium text-ink-900">{address.recipientName}</p>
        <p dir="ltr" className="text-start">
          {address.phone}
        </p>
        <p>
          {address.province}، {address.city}، {address.street}
        </p>
        <p dir="ltr" className="text-start text-ink-500">
          کد پستی: {address.postalCode}
        </p>
      </div>

      {failed && <p role="alert" className="text-sm text-error-600">حذف نشانی انجام نشد. دوباره تلاش کنید.</p>}

      <div className="mt-auto flex gap-3">
        {confirming ? (
          <>
            <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="btn-primary h-10 bg-error-600 hover:opacity-90">
              {deleting ? 'در حال حذف...' : 'تأیید حذف'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="btn-outline h-10">
              انصراف
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="btn-outline h-10">
            حذف نشانی
          </button>
        )}
      </div>
    </li>
  );
}

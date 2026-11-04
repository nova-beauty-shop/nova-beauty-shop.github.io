import { useState } from 'react';
import AddressForm from '@/components/account/AddressForm';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import type { Address } from '@/lib/addresses';

interface AddressPickerProps {
  addresses: Address[] | null;
  loading: boolean;
  error: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

export default function AddressPicker({ addresses, loading, error, selectedId, onSelect, onRetry }: AddressPickerProps) {
  const [adding, setAdding] = useState(false);

  if (loading) return <SkeletonGrid count={2} />;
  if (error) return <ErrorState onRetry={onRetry} />;

  const hasAddresses = Boolean(addresses && addresses.length > 0);
  const showForm = adding || !hasAddresses;

  return (
    <div className="space-y-6">
      {hasAddresses && (
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="sr-only">انتخاب نشانی</legend>
          {addresses?.map((address) => (
            <label
              key={address.id}
              className={`cursor-pointer rounded-2xl border p-5 text-sm leading-[1.8] transition ${
                selectedId === address.id
                  ? 'border-burgundy-700 bg-ivory-200/60 shadow-soft'
                  : 'border-ivory-300 bg-ivory-50 hover:border-gold-500'
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="shipping-address"
                  value={address.id}
                  checked={selectedId === address.id}
                  onChange={() => onSelect(address.id)}
                  className="mt-1.5 h-4 w-4 accent-burgundy-700"
                />
                <span className="space-y-1">
                  <span className="block font-medium text-ink-900">{address.recipientName}</span>
                  <span className="block text-ink-700">
                    {address.province}، {address.city}، {address.street}
                  </span>
                  <span dir="ltr" className="block text-start text-ink-500">
                    {address.phone}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {hasAddresses && !showForm && (
        <button type="button" onClick={() => setAdding(true)} className="btn-outline">
          افزودن نشانی جدید
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-ivory-300 bg-ivory-100 p-5 md:p-6">
          <h3 className="mb-5 text-base font-medium">{hasAddresses ? 'نشانی جدید' : 'نشانی ارسال را وارد کنید'}</h3>
          <AddressForm
            onSaved={() => {
              setAdding(false);
              onRetry();
            }}
            onCancel={hasAddresses ? () => setAdding(false) : undefined}
          />
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import AddressForm from "@/components/account/AddressForm";
import { ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import type { Address } from "@/lib/addresses";

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
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {hasAddresses && (
        <div role="radiogroup" aria-label="انتخاب نشانی" className="grid min-w-0 gap-3 md:grid-cols-2 sm:gap-4">
          {addresses?.map((address) => (
            <label
              key={address.id}
              className={`min-w-0 cursor-pointer rounded-xl border p-3.5 text-xs leading-[1.75] transition sm:rounded-2xl sm:p-4 sm:text-sm ${
                selectedId === address.id
                  ? "border-burgundy-700 bg-ivory-200/60 shadow-soft"
                  : "border-ivory-300 bg-ivory-50 hover:border-gold-500"
              }`}
            >
              <span className="flex items-start gap-2.5 sm:gap-3">
                <input
                  type="radio"
                  name="shipping-address"
                  value={address.id}
                  checked={selectedId === address.id}
                  onChange={() => onSelect(address.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-burgundy-700"
                />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate font-medium text-ink-900">{address.recipientName}</span>
                  <span className="block break-words text-ink-700">
                    {address.province}، {address.city}، {address.street}
                  </span>
                  <span dir="ltr" className="block text-start text-ink-500">
                    {address.phone}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {hasAddresses && !showForm && (
        <button type="button" onClick={() => setAdding(true)} className="btn-outline w-full sm:w-auto">
          افزودن نشانی جدید
        </button>
      )}

      {showForm && (
        <div className="min-w-0 rounded-xl border border-ivory-300 bg-ivory-100/80 p-3.5 sm:rounded-2xl sm:p-5 md:p-6">
          <h3 className="mb-3 text-sm font-medium sm:mb-4 sm:text-base">
            {hasAddresses ? "نشانی جدید" : "نشانی ارسال را وارد کنید"}
          </h3>
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

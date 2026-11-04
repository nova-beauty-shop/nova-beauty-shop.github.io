import { Check, Copy, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { formatToman } from '@/lib/format';
import type { PaymentSettings } from '@/lib/payments';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={() => void copy()} className="btn-outline">
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? 'کپی شد' : label}
    </button>
  );
}

interface BankCardDetailsProps {
  settings: PaymentSettings;
  amountToman: number;
}

export default function BankCardDetails({ settings, amountToman }: BankCardDetailsProps) {
  const cardDigits = settings.cardNumber.replace(/\s/g, '');
  const cardGrouped = cardDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
  const ibanDigits = settings.iban.replace(/\s/g, '');
  const ibanGrouped = ibanDigits.replace(/(.{4})(?=.)/g, '$1 ');

  return (
    <div className="space-y-6">
      <div className="relative mx-auto aspect-[1.6/1] w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-burgundy-900 to-burgundy-700 p-6 text-ivory-50 shadow-soft sm:mx-0">
        <div className="pointer-events-none absolute -end-12 -top-12 h-48 w-48 rounded-full bg-gold-500/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium">{settings.bankName || 'کارت بانکی'}</p>
            <CreditCard className="h-6 w-6 text-gold-500" aria-hidden="true" />
          </div>
          <div className="space-y-4">
            <div className="h-8 w-11 rounded-md bg-gradient-to-br from-gold-500 to-gold-600" aria-hidden="true" />
            <p dir="ltr" className="font-mono text-lg tracking-[0.2em] sm:text-xl">
              {cardGrouped}
            </p>
          </div>
          <div className="flex items-end justify-between gap-4 text-xs text-ivory-200">
            <p className="truncate">{settings.accountHolder}</p>
            <p dir="ltr" className="font-mono">
              {settings.accountNumber}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        {settings.iban && (
          <div className="sm:col-span-2">
            <dt className="text-ink-500">شماره شبا</dt>
            <dd className="mt-1 font-mono tracking-wider" dir="ltr">
              {ibanGrouped}
            </dd>
          </div>
        )}
        {settings.accountNumber && (
          <div>
            <dt className="text-ink-500">شماره حساب</dt>
            <dd className="mt-1 font-mono tracking-wider" dir="ltr">
              {settings.accountNumber}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap gap-3">
        <CopyButton value={cardDigits} label="کپی سریع شماره کارت" />
        {ibanDigits && <CopyButton value={ibanDigits} label="کپی شبا" />}
        <CopyButton value={String(amountToman)} label="کپی مبلغ دقیق سفارش" />
      </div>

      <p className="rounded-2xl bg-ivory-200/60 px-5 py-4 text-sm text-ink-900">
        مبلغ دقیق قابل پرداخت: <span className="font-bold">{formatToman(amountToman)}</span>
      </p>

      {settings.instructions && <p className="text-sm leading-[1.8] text-ink-700">{settings.instructions}</p>}
      {settings.paymentNotice && (
        <p className="rounded-xl bg-gold-500/15 px-4 py-3 text-sm leading-[1.8] text-ink-900">{settings.paymentNotice}</p>
      )}
    </div>
  );
}

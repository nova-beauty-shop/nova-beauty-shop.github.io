import { Upload, ImageIcon, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  PaymentError,
  RECEIPT_MAX_BYTES,
  RECEIPT_MIME_EXTENSIONS,
  uploadReceipt,
} from '@/lib/payments';

const RECEIPT_ERROR_MESSAGES: Record<string, string> = {
  receipt_already_submitted: 'برای این سفارش رسیدی در انتظار بررسی وجود دارد.',
  order_not_payable: 'این سفارش در حال حاضر قابل پرداخت نیست.',
  receipt_not_uploaded: 'فایل رسید کامل بارگذاری نشد. لطفاً دوباره تلاش کنید.',
  card_payment_disabled: 'پرداخت کارت به کارت در حال حاضر فعال نیست.',
  invalid_request: 'اطلاعات فیش معتبر نیست. لطفاً فیلدها را بررسی کنید.',
};

function receiptErrorMessage(error: unknown): string {
  if (error instanceof PaymentError) return RECEIPT_ERROR_MESSAGES[error.code] ?? 'ارسال رسید انجام نشد. لطفاً دوباره تلاش کنید.';
  if (error instanceof Error) {
    if (error.message === 'unsupported_file_type') return 'فقط فایل‌های JPG، PNG یا WebP پذیرفته می‌شوند.';
    if (error.message === 'file_too_large') return 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.';
  }
  return 'ارسال رسید انجام نشد. لطفاً دوباره تلاش کنید.';
}

const inputClass = 'field';

export default function ReceiptUploadForm({
  orderId,
  userId,
  onUploaded,
}: {
  orderId: string;
  userId: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [payerName, setPayerName] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [bankName, setBankName] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearFile() {
    setFile(null);
    setInputKey((key) => key + 1);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (selected && !RECEIPT_MIME_EXTENSIONS[selected.type]) {
      setError('فقط فایل‌های JPG، PNG یا WebP پذیرفته می‌شوند.');
      clearFile();
      return;
    }
    if (selected && selected.size > RECEIPT_MAX_BYTES) {
      setError('حجم فایل نباید بیشتر از ۵ مگابایت باشد.');
      clearFile();
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const details = {
      payerName: payerName.trim(),
      cardLast4: cardLast4.trim(),
      bankName: bankName.trim(),
      trackingCode: trackingCode.trim(),
    };
    if (!file) {
      setError('ابتدا تصویر فیش واریزی را انتخاب کنید.');
      return;
    }
    if (details.payerName.length < 2) {
      setError('نام واریزکننده را وارد کنید.');
      return;
    }
    if (!/^\d{4}$/.test(details.cardLast4)) {
      setError('چهار رقم آخر کارت مبدا را وارد کنید.');
      return;
    }
    if (details.trackingCode.length < 3) {
      setError('شماره پیگیری را وارد کنید.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await uploadReceipt(orderId, userId, file, details);
      setPayerName('');
      setCardLast4('');
      setBankName('');
      setTrackingCode('');
      clearFile();
      onUploaded();
    } catch (cause) {
      setError(receiptErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="receipt-payer" className="block text-sm font-medium text-ink-900">
            نام واریزکننده
          </label>
          <input id="receipt-payer" value={payerName} maxLength={100} onChange={(event) => setPayerName(event.target.value)} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="receipt-last4" className="block text-sm font-medium text-ink-900">
            ۴ رقم آخر کارت مبدا
          </label>
          <input
            id="receipt-last4"
            dir="ltr"
            inputMode="numeric"
            maxLength={4}
            value={cardLast4}
            onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
            className={`${inputClass} font-mono tracking-[0.3em]`}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="receipt-bank" className="block text-sm font-medium text-ink-900">
            نام بانک مبدا <span className="text-ink-500">(اختیاری)</span>
          </label>
          <input id="receipt-bank" value={bankName} maxLength={100} onChange={(event) => setBankName(event.target.value)} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="receipt-tracking" className="block text-sm font-medium text-ink-900">
            شماره پیگیری
          </label>
          <input
            id="receipt-tracking"
            dir="ltr"
            maxLength={60}
            value={trackingCode}
            onChange={(event) => setTrackingCode(event.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink-900">تصویر فیش واریزی</p>
        {previewUrl ? (
          <div className="relative overflow-hidden rounded-2xl border border-ivory-300 bg-ivory-200/60 p-3">
            <img src={previewUrl} alt="پیش‌نمایش فیش واریزی" className="mx-auto max-h-80 rounded-xl object-contain" />
            <button
              type="button"
              onClick={() => {
                setError(null);
                clearFile();
              }}
              disabled={submitting}
              aria-label="حذف تصویر انتخاب‌شده"
              className="absolute end-5 top-5 rounded-full bg-ink-900/80 p-2 text-ivory-50 transition hover:bg-ink-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="receipt-file"
            className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-gold-500 bg-ivory-200/40 p-8 text-center transition hover:bg-ivory-200/70"
          >
            <ImageIcon className="h-8 w-8 text-gold-600" aria-hidden="true" />
            <span className="text-sm font-medium text-ink-900">انتخاب تصویر از گوشی یا سیستم</span>
            <span className="text-xs text-ink-500">JPG، PNG یا WebP تا ۵ مگابایت</span>
          </label>
        )}
        <input
          key={inputKey}
          id="receipt-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={submitting}
          className="sr-only"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
        <Upload className="h-4 w-4" aria-hidden="true" />
        {submitting ? 'در حال ارسال رسید...' : 'ارسال رسید پرداخت'}
      </button>
    </form>
  );
}

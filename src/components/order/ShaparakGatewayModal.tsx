import { Lock, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { formatToman } from '@/lib/format';
import { PaymentError, completeOnlinePayment } from '@/lib/payments';

const SESSION_SECONDS = 10 * 60;
const OTP_DELAY_MS = 1200;

const GATEWAY_ERROR_MESSAGES: Record<string, string> = {
  order_not_payable: 'این سفارش دیگر در انتظار پرداخت نیست.',
  order_not_found: 'این سفارش در حساب شما پیدا نشد.',
  gateway_not_available: 'این درگاه در حال حاضر در دسترس نیست.',
};

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function isValidExpiry(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  return month >= 1 && month <= 12;
}

interface ShaparakGatewayModalProps {
  orderId: string;
  gatewayLabel: string;
  amountToman: number;
  installments: 1 | 4 | null;
  onPaid: (reference: string) => void;
  onClose: () => void;
}

export default function ShaparakGatewayModal({
  orderId,
  gatewayLabel,
  amountToman,
  installments,
  onPaid,
  onClose,
}: ShaparakGatewayModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv2, setCvv2] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = secondsLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [expired]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [busy, onClose]);

  function requestOtp() {
    if (otpSending || expired) return;
    setOtpSending(true);
    setError(null);
    window.setTimeout(() => {
      setOtp(String(Math.floor(100000 + Math.random() * 900000)));
      setOtpSending(false);
    }, OTP_DELAY_MS);
  }

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || expired) return;
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('شماره کارت باید ۱۶ رقم باشد.');
      return;
    }
    if (!isValidExpiry(expiry)) {
      setError('تاریخ انقضا را به صورت ماه/سال وارد کنید.');
      return;
    }
    if (!/^\d{3,4}$/.test(cvv2)) {
      setError('CVV2 باید ۳ یا ۴ رقم باشد.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('رمز پویا را وارد کنید یا روی درخواست رمز کلیک کنید.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reference = await completeOnlinePayment(orderId);
      onPaid(reference);
    } catch (cause) {
      const code = cause instanceof PaymentError ? cause.code : '';
      setError(GATEWAY_ERROR_MESSAGES[code] ?? 'پرداخت انجام نشد. لطفاً دوباره تلاش کنید.');
      setBusy(false);
    }
  }

  const minutes = Math.max(0, Math.floor(secondsLeft / 60)).toLocaleString('fa-IR', { minimumIntegerDigits: 2 });
  const seconds = Math.max(0, secondsLeft % 60).toLocaleString('fa-IR', { minimumIntegerDigits: 2 });
  const perInstallment = installments === 4 ? Math.ceil(amountToman / 4) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shaparak-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-ivory-50 shadow-soft"
      >
        <header className="flex items-center justify-between border-b border-ivory-300 bg-ivory-200/60 px-6 py-5">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs text-ink-500">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              اتصال امن به درگاه شاپرک
            </p>
            <h2 id="shaparak-title" className="text-lg">
              {gatewayLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن درگاه"
            className="rounded-full p-2 text-ink-700 transition hover:bg-ivory-300 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between rounded-2xl bg-ink-900 px-5 py-4 text-ivory-50">
            <div className="space-y-1">
              <p className="text-xs text-ivory-200">مبلغ قابل پرداخت</p>
              <p className="text-lg font-bold">{formatToman(amountToman)}</p>
              {perInstallment !== null && (
                <p className="text-xs text-ivory-200">
                  ۴ قسط ماهانه، هر قسط: {formatToman(perInstallment)}
                </p>
              )}
            </div>
            <div className="text-end">
              <p className="text-xs text-ivory-200">زمان باقی‌مانده</p>
              <p className={`font-mono text-xl tabular-nums ${expired ? 'text-error-100' : ''}`} dir="ltr">
                {minutes}:{seconds}
              </p>
            </div>
          </div>

          {expired ? (
            <div role="alert" className="space-y-4 rounded-2xl bg-error-100 p-5 text-sm text-error-600">
              <p>مهلت پرداخت این تراکنش به پایان رسیده است. سفارش شما همچنان در انتظار پرداخت است.</p>
              <button type="button" onClick={onClose} className="btn-outline">
                بستن
              </button>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="shaparak-card" className="block text-sm font-medium text-ink-900">
                  شماره کارت
                </label>
                <input
                  id="shaparak-card"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  dir="ltr"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                  className="field font-mono tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="shaparak-expiry" className="block text-sm font-medium text-ink-900">
                    تاریخ انقضا
                  </label>
                  <input
                    id="shaparak-expiry"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    dir="ltr"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                    className="field font-mono tracking-wider"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="shaparak-cvv2" className="block text-sm font-medium text-ink-900">
                    CVV2
                  </label>
                  <input
                    id="shaparak-cvv2"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    dir="ltr"
                    type="password"
                    maxLength={4}
                    value={cvv2}
                    onChange={(event) => setCvv2(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="field font-mono tracking-wider"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="shaparak-otp" className="block text-sm font-medium text-ink-900">
                  رمز پویا (OTP)
                </label>
                <div className="flex gap-3">
                  <input
                    id="shaparak-otp"
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="field font-mono tracking-[0.4em]"
                  />
                  <button type="button" onClick={requestOtp} disabled={otpSending} className="btn-outline shrink-0">
                    {otpSending ? 'در حال ارسال...' : 'درخواست رمز پویا'}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" disabled={busy} className="btn-primary flex-1">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'در حال تأیید پرداخت...' : 'پرداخت موفق'}
                </button>
                <button type="button" onClick={onClose} disabled={busy} className="btn-outline flex-1">
                  انصراف
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs leading-[1.8] text-ink-500">
            این صفحه در حالت آزمایشی اجرا می‌شود و هیچ مبلغی از حساب بانکی شما کسر نمی‌شود.
          </p>
        </div>
      </div>
    </div>
  );
}

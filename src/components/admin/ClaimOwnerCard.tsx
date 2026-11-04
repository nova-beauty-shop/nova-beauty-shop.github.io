import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminErrorMessage, claimFirstOwner } from '@/lib/adminSettings';

export default function ClaimOwnerCard({ onClaimed }: { onClaimed: () => void }) {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanUsername = username.trim().toLowerCase();
  const usernameInvalid = cleanUsername.length > 0 && !/^[a-z0-9_]{3,30}$/.test(cleanUsername);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || usernameInvalid) return;
    setBusy(true);
    setError(null);
    try {
      // One-click claim: the database function only succeeds while no owner exists, then locks forever.
      await claimFirstOwner(cleanUsername);
      onClaimed();
    } catch (cause) {
      setError(adminErrorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gold-500/15 text-burgundy-700">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-xl">فعال‌سازی مالک فروشگاه</h2>
          <p className="text-sm leading-[1.8] text-ink-500">
            هنوز مالکی برای این فروشگاه ثبت نشده است. با یک کلیک، حساب فعلی شما مالک فروشگاه می‌شود. این کار فقط یک بار امکان‌پذیر است و بعد از آن برای همیشه قفل می‌شود.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="owner-username" className="block text-sm font-medium text-ink-900">
            نام کاربری مدیر <span className="font-normal text-ink-500">(اختیاری)</span>
          </label>
          <input
            id="owner-username"
            type="text"
            dir="ltr"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="nova_owner"
            aria-invalid={usernameInvalid}
            className="field text-start"
          />
          <p className={`text-xs ${usernameInvalid ? 'text-error-600' : 'text-ink-500'}`}>
            فقط حروف انگلیسی کوچک، رقم و _ با ۳ تا ۳۰ نویسه. اگر خالی بگذارید، از ایمیل شما ساخته می‌شود.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || usernameInvalid} className="btn-primary w-full sm:w-auto">
          {busy ? 'در حال ثبت...' : 'ثبت به عنوان مالک فروشگاه'}
        </button>
      </form>
    </section>
  );
}

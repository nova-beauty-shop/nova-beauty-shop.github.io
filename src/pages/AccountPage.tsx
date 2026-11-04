import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfile, updateProfile, type Profile } from '@/lib/profile';
import { navigate } from '@/lib/navigation';

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/login?redirect=%2Faccount', { replace: true });
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="container-nova py-16">
        <SkeletonGrid count={1} />
      </div>
    );
  }

  return <AccountDetails user={user} onSignOut={signOut} />;
}

function AccountDetails({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const profile = useAsync(() => fetchProfile(user.id), [user.id]);

  return (
    <div className="container-nova py-12 md:py-16">
      <header className="flex flex-col gap-4 border-b border-ivory-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">حساب کاربری</p>
          <h1 className="text-3xl md:text-4xl">سلام، {profile.data?.fullName || 'کاربر نُوا'}</h1>
          <p dir="ltr" className="text-start text-sm text-ink-500">
            {user.email}
          </p>
        </div>
        <button type="button" onClick={() => void onSignOut()} className="btn-outline self-start md:self-auto">
          خروج از حساب
        </button>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
          <h2 className="text-xl">اطلاعات شخصی</h2>
          <div className="mt-6">
            {profile.loading && <SkeletonGrid count={1} />}
            {profile.error && <ErrorState onRetry={profile.retry} />}
            {profile.data && <ProfileForm key={user.id} initial={profile.data} userId={user.id} />}
          </div>
        </section>

        <aside className="h-fit space-y-4 rounded-3xl bg-ivory-200/60 p-6">
          <h2 className="text-lg">دسترسی سریع</h2>
          <Link to="/wishlist" className="block rounded-xl bg-ivory-50 px-4 py-3 text-sm transition hover:text-burgundy-700">
            علاقه‌مندی‌ها
          </Link>
          <Link to="/cart" className="block rounded-xl bg-ivory-50 px-4 py-3 text-sm transition hover:text-burgundy-700">
            سبد خرید
          </Link>
          <Link to="/account/orders" className="block rounded-xl bg-ivory-50 px-4 py-3 text-sm transition hover:text-burgundy-700">
            سفارش‌های من
          </Link>
          <Link to="/account/addresses" className="block rounded-xl bg-ivory-50 px-4 py-3 text-sm transition hover:text-burgundy-700">
            نشانی‌های من
          </Link>
        </aside>
      </div>
    </div>
  );
}

function ProfileForm({ initial, userId }: { initial: Profile; userId: string }) {
  const [form, setForm] = useState<Profile>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (form.fullName.trim().length < 2) {
      setStatus({ tone: 'error', text: 'لطفاً نام و نام خانوادگی خود را وارد کنید.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await updateProfile(userId, { fullName: form.fullName.trim(), phone: form.phone.trim() });
      setStatus({ tone: 'success', text: 'اطلاعات با موفقیت ذخیره شد.' });
    } catch {
      setStatus({ tone: 'error', text: 'ذخیره اطلاعات انجام نشد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-5">
      <div className="space-y-2">
        <label htmlFor="profile-name" className="block text-sm font-medium text-ink-900">
          نام و نام خانوادگی
        </label>
        <input
          id="profile-name"
          type="text"
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          className="field"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="profile-phone" className="block text-sm font-medium text-ink-900">
          شماره تماس
        </label>
        <input
          id="profile-phone"
          type="tel"
          dir="ltr"
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          className="field text-start"
        />
      </div>

      {status && (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm ${
            status.tone === 'error' ? 'bg-error-100 text-error-600' : 'bg-success-100 text-success-600'
          }`}
        >
          {status.text}
        </p>
      )}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
      </button>
    </form>
  );
}

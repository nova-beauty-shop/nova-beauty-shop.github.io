import { useState, type FormEvent } from 'react';
import Link from '@/components/common/Link';
import { useAuth } from '@/hooks/useAuth';
import { navigate, useLocation } from '@/lib/navigation';

type AuthMode = 'login' | 'register';

const MIN_PASSWORD_LENGTH = 8;

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { signIn, signUp } = useAuth();
  const { searchParams } = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('لطفاً یک ایمیل معتبر وارد کنید.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد.`);
      return;
    }
    if (isRegister && fullName.trim().length < 2) {
      setError('لطفاً نام و نام خانوادگی خود را وارد کنید.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    const result = isRegister
      ? await signUp({ fullName: fullName.trim(), email: trimmedEmail, password })
      : await signIn({ email: trimmedEmail, password });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.message) {
      setNotice(result.message);
      setPassword('');
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="container-nova flex justify-center py-16 md:py-24">
      <div className="w-full max-w-md rounded-3xl border border-ivory-300 bg-ivory-50 p-8 shadow-soft md:p-10">
        <p className="eyebrow">{isRegister ? 'عضویت رایگان' : 'ورود به حساب'}</p>
        <h1 className="mt-3 text-3xl">{isRegister ? 'ساخت حساب کاربری' : 'خوش آمدید'}</h1>
        <p className="mt-3 text-sm leading-[1.8] text-ink-500">
          {isRegister
            ? 'با ساخت حساب رایگان می‌توانید سفارش‌های خود را پیگیری کنید و آدرس‌های ذخیره‌شده داشته باشید.'
            : 'برای مشاهده سفارش‌ها و مدیریت حساب کاربری وارد شوید.'}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          {isRegister && (
            <div className="space-y-2">
              <label htmlFor="full-name" className="block text-sm font-medium text-ink-900">
                نام و نام خانوادگی
              </label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="field"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="auth-email" className="block text-sm font-medium text-ink-900">
              ایمیل
            </label>
            <input
              id="auth-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field text-start"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="auth-password" className="block text-sm font-medium text-ink-900">
              رمز عبور
            </label>
            <input
              id="auth-password"
              type="password"
              dir="ltr"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field text-start"
              required
            />
            {isRegister && <p className="text-xs text-ink-500">حداقل {MIN_PASSWORD_LENGTH} کاراکتر</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl border border-ivory-300 bg-white px-4 py-3 text-sm leading-7 text-ink-700">
              {notice}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'در حال انجام...' : isRegister ? 'ثبت‌نام' : 'ورود'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-ink-600">
          {isRegister ? 'قبلاً حساب دارید؟' : 'حساب کاربری ندارید؟'}{' '}
          <Link
            to={withRedirect(isRegister ? '/login' : '/register', searchParams.get('redirect'))}
            className="font-medium text-burgundy-700 underline-offset-4 hover:underline"
          >
            {isRegister ? 'وارد شوید' : 'ثبت‌نام رایگان'}
          </Link>
        </p>
      </div>
    </div>
  );
}

function safeRedirect(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

function withRedirect(path: string, redirect: string | null) {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
}

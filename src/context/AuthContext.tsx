import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthResult {
  error: string | null;
  message?: string | null;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<AuthResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const GENERIC_ERROR = 'ارتباط با سرویس ورود برقرار نشد. چند لحظه بعد دوباره تلاش کنید.';
const INVALID_CREDENTIALS = 'ایمیل یا رمز عبور صحیح نیست. اطلاعات را بررسی کنید.';
const EMAIL_NOT_CONFIRMED = 'ایمیل شما هنوز تأیید نشده است. صندوق ورودی و پوشه هرزنامه را بررسی کنید و روی لینک تأیید Supabase بزنید.';
const EMAIL_ALREADY_USED = 'با این ایمیل قبلاً حساب ساخته شده است. وارد شوید یا از گزینه بازیابی رمز استفاده کنید.';
const SIGN_UP_SUCCESS = 'حساب ساخته شد. برای فعال‌کردن آن، ایمیل خود را باز کنید و روی لینک تأیید Supabase بزنید؛ سپس به صفحه ورود برگردید.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signUp({ fullName, email, password }) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          console.error('sign up failed', { status: error.status, code: error.code, message: error.message });
          if (error.code === 'user_already_exists' || /already registered|already exists/i.test(error.message)) {
            return { error: EMAIL_ALREADY_USED };
          }
          if (error.status === 429) return { error: 'تعداد تلاش‌ها زیاد بوده است. چند دقیقه صبر کنید و دوباره امتحان کنید.' };
          if (error.status === 422) return { error: 'اطلاعات ثبت‌نام معتبر نیست. ایمیل و رمز عبور را بررسی کنید.' };
          return { error: GENERIC_ERROR };
        }
        if (data.session) return { error: null };
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          return { error: EMAIL_ALREADY_USED };
        }
        return { error: null, message: SIGN_UP_SUCCESS };
      },
      async signIn({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (!error) return { error: null };
        console.error('sign in failed', { status: error.status, code: error.code, message: error.message });
        if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
          return { error: EMAIL_NOT_CONFIRMED };
        }
        if (error.code === 'invalid_credentials' || error.status === 400) {
          return { error: INVALID_CREDENTIALS };
        }
        if (error.status === 429) return { error: 'تعداد تلاش‌های ورود زیاد بوده است. چند دقیقه صبر کنید.' };
        return { error: GENERIC_ERROR };
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('sign out failed', error);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

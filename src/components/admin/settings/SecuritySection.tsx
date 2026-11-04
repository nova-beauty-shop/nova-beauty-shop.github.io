import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { FormField, FormStatus, SettingsSection } from '@/components/admin/settings/SettingsSection';
import {
  ADMIN_ROLE_DESCRIPTIONS,
  ADMIN_ROLE_LABELS,
  adminErrorMessage,
  changeOwnPassword,
  type AdminAccess,
} from '@/lib/adminSettings';

const MIN_PASSWORD_LENGTH = 8;

export default function SecuritySection({ access }: { access: AdminAccess }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus({ tone: 'error', text: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.` });
      return;
    }
    if (password !== confirm) {
      setStatus({ tone: 'error', text: 'رمز عبور و تکرار آن یکسان نیستند.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await changeOwnPassword(password);
      setPassword('');
      setConfirm('');
      setStatus({ tone: 'success', text: 'رمز عبور حساب شما با موفقیت تغییر کرد.' });
    } catch (cause) {
      setStatus({ tone: 'error', text: adminErrorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title="امنیت حساب مدیریت"
      description="نقش شما و رمز عبور حساب کاربری‌تان در این بخش مدیریت می‌شود. رمز عبور هرگز در فروشگاه ذخیره یا نمایش داده نمی‌شود."
    >
      <div className="grid gap-4 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs text-ink-500">نام کاربری</p>
          <p className="font-medium text-ink-900" dir="ltr">
            {access.username}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-ink-500">نقش شما</p>
          <p className="flex items-center gap-2 font-medium text-ink-900">
            <ShieldCheck className="h-4 w-4 text-burgundy-700" aria-hidden="true" />
            {ADMIN_ROLE_LABELS[access.role]}
          </p>
        </div>
        <p className="text-sm leading-[1.8] text-ink-500 sm:col-span-2">{ADMIN_ROLE_DESCRIPTIONS[access.role]}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        <FormField id="security-password" label="رمز عبور جدید" hint={`حداقل ${MIN_PASSWORD_LENGTH} نویسه.`}>
          <input
            id="security-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field text-start"
          />
        </FormField>
        <FormField id="security-password-confirm" label="تکرار رمز عبور جدید">
          <input
            id="security-password-confirm"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="field text-start"
          />
        </FormField>

        <FormStatus status={status} />

        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="btn-primary">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {saving ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}

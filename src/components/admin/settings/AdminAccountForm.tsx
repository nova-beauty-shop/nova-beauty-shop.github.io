import { useState, type FormEvent } from 'react';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { ADMIN_ROLE_DESCRIPTIONS, ADMIN_ROLE_LABELS, adminErrorMessage, type AdminRole } from '@/lib/adminSettings';

export interface AdminAccountDraft {
  email?: string;
  username: string;
  role: AdminRole;
}

const ROLES: AdminRole[] = ['owner', 'manager', 'reviewer'];

export default function AdminAccountForm({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial: AdminAccountDraft;
  onSubmit: (draft: AdminAccountDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<AdminAccountDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        email: draft.email?.trim().toLowerCase(),
        username: draft.username.trim().toLowerCase(),
        role: draft.role,
      });
    } catch (cause) {
      setError(adminErrorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
      {mode === 'create' && (
        <FormField id="admin-email" label="ایمیل حساب کاربری" hint="کاربر باید قبلاً با همین ایمیل در سایت ثبت‌نام کرده باشد." className="sm:col-span-2">
          <input
            id="admin-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={draft.email ?? ''}
            onChange={(e) => setDraft((current) => ({ ...current, email: e.target.value }))}
            className="field text-start"
          />
        </FormField>
      )}
      <FormField id="admin-username" label="نام کاربری مدیر">
        <input
          id="admin-username"
          type="text"
          dir="ltr"
          autoComplete="off"
          value={draft.username}
          onChange={(e) => setDraft((current) => ({ ...current, username: e.target.value }))}
          className="field text-start"
        />
      </FormField>
      <FormField id="admin-role" label="نقش و دسترسی">
        <select
          id="admin-role"
          value={draft.role}
          onChange={(e) => setDraft((current) => ({ ...current, role: e.target.value as AdminRole }))}
          className="field"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ADMIN_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </FormField>
      <p className="text-sm leading-[1.8] text-ink-500 sm:col-span-2">{ADMIN_ROLE_DESCRIPTIONS[draft.role]}</p>

      <FormStatus status={error ? { tone: 'error', text: error } : null} />

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'در حال ذخیره...' : mode === 'create' ? 'افزودن مدیر' : 'ذخیره تغییرات'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}

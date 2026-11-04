import { useState } from 'react';
import { Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import AdminAccountForm, { type AdminAccountDraft } from '@/components/admin/settings/AdminAccountForm';
import { ReadOnlyNotice, SettingsSection } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  ADMIN_ROLE_LABELS,
  addAdmin,
  adminErrorMessage,
  fetchAdminAccounts,
  removeAdmin,
  updateAdmin,
  type AdminAccount,
  type AdminRole,
} from '@/lib/adminSettings';
import { formatDate } from '@/lib/format';

type PanelMode = { kind: 'idle' } | { kind: 'create' } | { kind: 'edit'; userId: string } | { kind: 'confirm-remove'; userId: string };

const ROLE_BADGE: Record<AdminRole, string> = {
  owner: 'bg-burgundy-700 text-ivory-50',
  manager: 'bg-gold-500/20 text-ink-900',
  reviewer: 'bg-ivory-200 text-ink-700',
};

export default function AdministratorsPanel({ canManage }: { canManage: boolean }) {
  const { user } = useAuth();
  const accounts = useAsync(fetchAdminAccounts, []);
  const [mode, setMode] = useState<PanelMode>({ kind: 'idle' });
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleCreate(draft: AdminAccountDraft) {
    await addAdmin(draft.email ?? '', draft.username, draft.role);
    setMode({ kind: 'idle' });
    setNotice('مدیر جدید با موفقیت افزوده شد.');
    accounts.retry();
  }

  async function handleUpdate(userId: string, draft: AdminAccountDraft) {
    await updateAdmin(userId, draft.username, draft.role);
    setMode({ kind: 'idle' });
    setNotice('تغییرات مدیر ذخیره شد.');
    accounts.retry();
  }

  async function handleRemove(userId: string) {
    if (removing) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeAdmin(userId);
      setMode({ kind: 'idle' });
      setNotice('دسترسی مدیر حذف شد.');
      accounts.retry();
    } catch (cause) {
      setRemoveError(adminErrorMessage(cause));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <SettingsSection
      title="مدیران فروشگاه"
      description="هر مدیر با حساب کاربری خودش وارد می‌شود و فقط به بخش‌های مجاز نقشش دسترسی دارد."
      footer={
        notice ? (
          <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">
            {notice}
          </p>
        ) : null
      }
    >
      {!canManage && <ReadOnlyNotice message="فقط مالک فروشگاه می‌تواند مدیران را اضافه، ویرایش یا حذف کند." />}

      {accounts.loading && <SkeletonGrid count={1} />}
      {accounts.error && <ErrorState onRetry={accounts.retry} />}

      {accounts.data && (
        <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
          {accounts.data.map((account) => {
            const isSelf = account.userId === user?.id;
            const editing = mode.kind === 'edit' && mode.userId === account.userId;
            const confirming = mode.kind === 'confirm-remove' && mode.userId === account.userId;
            return (
              <li key={account.userId} className="space-y-4 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900" dir="ltr">
                        {account.username}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs ${ROLE_BADGE[account.role]}`}>{ADMIN_ROLE_LABELS[account.role]}</span>
                      {isSelf && <span className="rounded-full border border-gold-500 px-3 py-0.5 text-xs text-ink-700">حساب شما</span>}
                    </div>
                    <p className="truncate text-sm text-ink-500" dir="ltr">
                      {account.email}
                    </p>
                    <p className="text-xs text-ink-500">افزوده‌شده: {formatDate(account.createdAt)}</p>
                  </div>

                  {canManage && !editing && !confirming && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setMode({ kind: 'edit', userId: account.userId })}
                        className="btn-outline h-10 px-4 text-sm"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        ویرایش
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveError(null);
                            setMode({ kind: 'confirm-remove', userId: account.userId });
                          }}
                          className="btn-outline h-10 px-4 text-sm text-error-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          حذف دسترسی
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {editing && (
                  <AdminAccountForm
                    mode="edit"
                    initial={{ username: account.username, role: account.role }}
                    onSubmit={(draft) => handleUpdate(account.userId, draft)}
                    onCancel={() => setMode({ kind: 'idle' })}
                  />
                )}

                {confirming && <RemoveConfirm account={account} busy={removing} error={removeError} onConfirm={() => void handleRemove(account.userId)} onCancel={() => setMode({ kind: 'idle' })} />}
              </li>
            );
          })}
        </ul>
      )}

      {canManage && accounts.data && mode.kind !== 'create' && (
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setMode({ kind: 'create' });
          }}
          className="btn-primary"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          افزودن مدیر جدید
        </button>
      )}

      {mode.kind === 'create' && (
        <AdminAccountForm
          mode="create"
          initial={{ email: '', username: '', role: 'reviewer' }}
          onSubmit={handleCreate}
          onCancel={() => setMode({ kind: 'idle' })}
        />
      )}

      <p className="flex items-center gap-2 text-xs text-ink-500">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        حداقل یک مالک فروشگاه همیشه باقی می‌ماند و مالک نمی‌تواند حساب خودش را حذف کند.
      </p>
    </SettingsSection>
  );
}

function RemoveConfirm({
  account,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  account: AdminAccount;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl bg-error-100 p-5">
      <p className="text-sm text-error-600">دسترسی مدیریتی «{account.username}» حذف شود؟ حساب کاربری او حذف نمی‌شود.</p>
      {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onConfirm} disabled={busy} className="btn-primary">
          {busy ? 'در حال حذف...' : 'تأیید حذف دسترسی'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="btn-outline">
          انصراف
        </button>
      </div>
    </div>
  );
}

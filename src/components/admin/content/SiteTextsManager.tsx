import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { FormStatus } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { catalogErrorMessage } from '@/lib/adminCatalog';
import {
  SITE_TEXT_DEFINITIONS,
  fetchSiteTextOverrides,
  resetSiteText,
  saveSiteText,
  type SiteTextDefinition,
} from '@/lib/siteTexts';

const GROUP_LABELS: Record<SiteTextDefinition['group'], string> = {
  announcement: 'نوار اعلان',
  home: 'صفحه نخست',
  trust: 'مزیت‌های فروشگاه (زیر صفحه نخست)',
};

export default function SiteTextsManager({ canEdit }: { canEdit: boolean }) {
  const overrides = useAsync(fetchSiteTextOverrides, []);
  const savedOverrides = overrides.data ?? {};

  return (
    <section className="space-y-8 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="space-y-2">
        <h2 className="text-xl">نوشته‌های سایت</h2>
        <p className="text-sm text-ink-500">
          متن‌های زیر را می‌توانید تغییر دهید. با بازگردانی، متن پیش‌فرض سایت دوباره نمایش داده می‌شود.
        </p>
      </div>

      {overrides.loading && <SkeletonGrid count={2} />}
      {overrides.error && <ErrorState onRetry={overrides.retry} />}
      {overrides.data && (
        <div className="space-y-10">
          {(Object.keys(GROUP_LABELS) as SiteTextDefinition['group'][]).map((group) => (
            <div key={group} className="space-y-4">
              <h3 className="text-base font-medium text-burgundy-700">{GROUP_LABELS[group]}</h3>
              <ul className="space-y-4">
                {SITE_TEXT_DEFINITIONS.filter((item) => item.group === group).map((item) => (
                  <SiteTextRow
                    key={item.key}
                    definition={item}
                    savedValue={savedOverrides[item.key]}
                    canEdit={canEdit}
                    onChanged={overrides.retry}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SiteTextRow({
  definition,
  savedValue,
  canEdit,
  onChanged,
}: {
  definition: SiteTextDefinition;
  savedValue: string | undefined;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const current = savedValue ?? definition.defaultValue;
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    setDraft(current);
  }, [current]);

  async function run(action: () => Promise<void>, successText: string) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus({ tone: 'success', text: successText });
      onChanged();
    } catch (cause) {
      setStatus({ tone: 'error', text: catalogErrorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  const key = definition.key;
  const dirty = draft.trim() !== current;
  const isCustom = savedValue !== undefined;

  return (
    <li className="space-y-3 rounded-2xl border border-ivory-300 p-5">
      <label htmlFor={`text-${key}`} className="block text-sm font-medium text-ink-900">
        {definition.label}
      </label>
      {definition.hint && <p className="text-xs text-ink-500">{definition.hint}</p>}
      <textarea
        id={`text-${key}`}
        rows={2}
        value={draft}
        disabled={!canEdit || busy}
        onChange={(event) => setDraft(event.target.value)}
        className="field min-h-[72px] resize-y leading-[1.8]"
      />
      <div className="flex flex-wrap items-center gap-3">
        {canEdit && (
          <button
            type="button"
            disabled={busy || !dirty || draft.trim() === ''}
            onClick={() => void run(() => saveSiteText(key, draft), 'متن ذخیره شد.')}
            className="btn-primary h-10 px-4 text-sm"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            ذخیره متن
          </button>
        )}
        {canEdit && isCustom && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => resetSiteText(key), 'متن پیش‌فرض بازگردانی شد.')}
            className="btn-outline h-10 px-4 text-sm"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            بازگردانی متن پیش‌فرض
          </button>
        )}
        {!isCustom && <span className="text-xs text-ink-500">متن پیش‌فرض سایت</span>}
      </div>
      <FormStatus status={status} />
    </li>
  );
}

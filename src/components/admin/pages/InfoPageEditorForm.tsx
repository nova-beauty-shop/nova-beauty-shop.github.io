import { useState, type ReactNode } from 'react';
import { Eye, Plus } from 'lucide-react';
import Link from '@/components/common/Link';
import InfoSectionDraftEditor from '@/components/admin/pages/InfoSectionDraftEditor';
import { INFO_PAGE_ERROR_MESSAGE, saveInfoPage } from '@/lib/infoPages';
import type { InfoPageContent, InfoPageStatus } from '@/lib/infoPages';
import { INFO_PAGE_LIMITS, emptySectionDraft, toPageDraft, toSaveInput, validatePageDraft } from '@/lib/infoPageDraft';
import type { PageDraft } from '@/lib/infoPageDraft';
import type { InfoPageSlug } from '@/types/info';

interface InfoPageEditorFormProps {
  slug: InfoPageSlug;
  initialContent: InfoPageContent;
  initialStatus: InfoPageStatus;
  canEdit: boolean;
}

interface Feedback {
  tone: 'success' | 'error';
  text: string;
}

export default function InfoPageEditorForm({ slug, initialContent, initialStatus, canEdit }: InfoPageEditorFormProps) {
  const [draft, setDraft] = useState<PageDraft>(() => toPageDraft(initialContent));
  const [status, setStatus] = useState<InfoPageStatus>(initialStatus);
  const [saving, setSaving] = useState<InfoPageStatus | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const setField = <K extends 'title' | 'lead' | 'seoTitle' | 'seoDescription'>(key: K, value: PageDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setSection = (index: number, next: PageDraft['sections'][number]) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => (sectionIndex === index ? next : section)),
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
  };

  const removeSection = (index: number) => {
    setDraft((current) => ({ ...current, sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index) }));
  };

  const addSection = () => {
    setDraft((current) => ({ ...current, sections: [...current.sections, emptySectionDraft()] }));
  };

  const save = async (target: InfoPageStatus) => {
    const problem = validatePageDraft(draft);
    if (problem) {
      setFeedback({ tone: 'error', text: problem });
      return;
    }
    setSaving(target);
    setFeedback(null);
    try {
      await saveInfoPage(toSaveInput(slug, draft, target));
      setStatus(target);
      setFeedback({
        tone: 'success',
        text:
          target === 'published'
            ? 'صفحه منتشر شد و اکنون برای همه نمایش داده می‌شود.'
            : 'پیش‌نویس ذخیره شد. تا زمان انتشار، مشتریان نسخه قبلی صفحه را می‌بینند.',
      });
    } catch {
      setFeedback({ tone: 'error', text: INFO_PAGE_ERROR_MESSAGE });
    } finally {
      setSaving(null);
    }
  };

  return (
    <fieldset disabled={!canEdit || saving !== null} className="contents">
      <div className="flex flex-col gap-4 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-500">وضعیت:</span>
          <span
            className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-medium ${
              status === 'published' ? 'bg-success-100 text-success-600' : 'bg-ivory-200 text-ink-700'
            }`}
          >
            {status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
          </span>
        </div>
        <Link
          to={`/${slug}`}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-ivory-300 px-4 text-sm text-ink-700 transition hover:border-gold-500 hover:text-burgundy-700"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          مشاهده صفحه در سایت
        </Link>
      </div>

      <section className="mt-6 space-y-5 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft">
        <h2 className="text-lg">متن اصلی صفحه</h2>
        <FieldLabel label="عنوان صفحه">
          <input className="field" maxLength={INFO_PAGE_LIMITS.title} value={draft.title} onChange={(event) => setField('title', event.target.value)} />
        </FieldLabel>
        <FieldLabel label="متن معرفی">
          <textarea
            className="field min-h-[96px] leading-[1.8]"
            maxLength={INFO_PAGE_LIMITS.lead}
            value={draft.lead}
            onChange={(event) => setField('lead', event.target.value)}
          />
          <CharCount value={draft.lead} max={INFO_PAGE_LIMITS.lead} />
        </FieldLabel>
      </section>

      <section className="mt-6 space-y-5 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft">
        <div>
          <h2 className="text-lg">تنظیمات سئو</h2>
          <p className="mt-1 text-sm text-ink-500">این مقادیر در عنوان مرورگر و نتایج جستجوی گوگل نمایش داده می‌شوند.</p>
        </div>
        <FieldLabel label="عنوان سئو">
          <input
            className="field"
            maxLength={INFO_PAGE_LIMITS.seoTitle}
            value={draft.seoTitle}
            onChange={(event) => setField('seoTitle', event.target.value)}
          />
          <CharCount value={draft.seoTitle} max={INFO_PAGE_LIMITS.seoTitle} />
        </FieldLabel>
        <FieldLabel label="توضیح سئو">
          <textarea
            className="field min-h-[96px] leading-[1.8]"
            maxLength={INFO_PAGE_LIMITS.seoDescription}
            value={draft.seoDescription}
            onChange={(event) => setField('seoDescription', event.target.value)}
          />
          <CharCount value={draft.seoDescription} max={INFO_PAGE_LIMITS.seoDescription} />
        </FieldLabel>
      </section>

      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg">بخش‌های صفحه</h2>
          <button
            type="button"
            onClick={addSection}
            disabled={draft.sections.length >= INFO_PAGE_LIMITS.sections}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-burgundy-700 px-4 text-sm text-ivory-50 transition hover:bg-burgundy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            افزودن بخش
          </button>
        </div>

        {draft.sections.length === 0 && (
          <p className="rounded-3xl border border-dashed border-ivory-300 p-8 text-center text-sm text-ink-500">
            این صفحه هنوز بخشی ندارد. با دکمه بالا اولین بخش را اضافه کنید.
          </p>
        )}

        {draft.sections.map((section, index) => (
          <InfoSectionDraftEditor
            key={index}
            index={index}
            count={draft.sections.length}
            draft={section}
            onChange={(next) => setSection(index, next)}
            onMove={(direction) => moveSection(index, direction)}
            onRemove={() => removeSection(index)}
          />
        ))}
      </div>

      {canEdit && (
        <div className="sticky bottom-0 z-10 mt-8 flex flex-col gap-4 border-t border-ivory-300 bg-ivory-100/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className={`text-sm ${feedback?.tone === 'error' ? 'text-error-600' : 'text-success-600'}`}>
            {feedback?.text ?? ''}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => save('draft')}
              className="btn-outline h-11 px-5"
            >
              {saving === 'draft' ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس'}
            </button>
            <button type="button" onClick={() => save('published')} className="btn-primary h-11 px-5">
              {saving === 'published' ? 'در حال انتشار…' : 'انتشار صفحه'}
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className="block text-left text-xs text-ink-500" dir="ltr">
      {value.length}/{max}
    </span>
  );
}

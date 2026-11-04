import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { INFO_PAGE_LIMITS } from '@/lib/infoPageDraft';
import type { SectionDraft } from '@/lib/infoPageDraft';

interface InfoSectionDraftEditorProps {
  index: number;
  count: number;
  draft: SectionDraft;
  onChange: (next: SectionDraft) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export default function InfoSectionDraftEditor({ index, count, draft, onChange, onMove, onRemove }: InfoSectionDraftEditorProps) {
  const update = (patch: Partial<SectionDraft>) => onChange({ ...draft, ...patch });

  return (
    <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-ink-500">بخش {index + 1}</p>
        <div className="flex gap-2">
          <IconButton label="انتقال به بالا" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="انتقال به پایین" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="حذف بخش" danger onClick={onRemove}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <FieldLabel label="عنوان بخش">
          <input
            className="field"
            maxLength={INFO_PAGE_LIMITS.heading}
            value={draft.heading}
            onChange={(event) => update({ heading: event.target.value })}
          />
        </FieldLabel>

        <FieldLabel label="پاراگراف‌ها" hint="برای جدا کردن پاراگراف‌ها یک خط خالی بگذارید.">
          <textarea
            className="field min-h-[120px] leading-[1.8]"
            value={draft.paragraphs}
            onChange={(event) => update({ paragraphs: event.target.value })}
          />
        </FieldLabel>

        <FieldLabel label="فهرست نکات" hint="هر نکته را در یک خط بنویسید.">
          <textarea
            className="field min-h-[96px] leading-[1.8]"
            value={draft.bullets}
            onChange={(event) => update({ bullets: event.target.value })}
          />
        </FieldLabel>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-ink-700">پرسش و پاسخ</p>
            <AddButton label="افزودن پرسش" onClick={() => update({ questions: [...draft.questions, { question: '', answer: '' }] })} />
          </div>
          {draft.questions.map((item, itemIndex) => (
            <div key={itemIndex} className="space-y-3 rounded-2xl bg-ivory-100 p-4">
              <div className="flex items-start gap-3">
                <input
                  className="field"
                  aria-label={`پرسش ${itemIndex + 1}`}
                  placeholder="پرسش"
                  value={item.question}
                  onChange={(event) =>
                    update({
                      questions: draft.questions.map((current, currentIndex) =>
                        currentIndex === itemIndex ? { ...current, question: event.target.value } : current,
                      ),
                    })
                  }
                />
                <IconButton label="حذف پرسش" danger onClick={() => update({ questions: draft.questions.filter((_, currentIndex) => currentIndex !== itemIndex) })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>
              <textarea
                className="field min-h-[96px] leading-[1.8]"
                aria-label={`پاسخ ${itemIndex + 1}`}
                placeholder="پاسخ"
                value={item.answer}
                onChange={(event) =>
                  update({
                    questions: draft.questions.map((current, currentIndex) =>
                      currentIndex === itemIndex ? { ...current, answer: event.target.value } : current,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-ink-700">کارت‌های اطلاعات</p>
            <AddButton label="افزودن کارت" onClick={() => update({ cards: [...draft.cards, { label: '', value: '' }] })} />
          </div>
          {draft.cards.map((item, itemIndex) => (
            <div key={itemIndex} className="grid gap-3 rounded-2xl bg-ivory-100 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
              <input
                className="field"
                aria-label={`عنوان کارت ${itemIndex + 1}`}
                placeholder="عنوان"
                value={item.label}
                onChange={(event) =>
                  update({
                    cards: draft.cards.map((current, currentIndex) =>
                      currentIndex === itemIndex ? { ...current, label: event.target.value } : current,
                    ),
                  })
                }
              />
              <input
                className="field"
                aria-label={`مقدار کارت ${itemIndex + 1}`}
                placeholder="مقدار"
                value={item.value}
                onChange={(event) =>
                  update({
                    cards: draft.cards.map((current, currentIndex) =>
                      currentIndex === itemIndex ? { ...current, value: event.target.value } : current,
                    ),
                  })
                }
              />
              <IconButton label="حذف کارت" danger onClick={() => update({ cards: draft.cards.filter((_, currentIndex) => currentIndex !== itemIndex) })}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FieldLabel({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-ivory-300 bg-ivory-50 px-3 text-sm text-ink-700 transition hover:border-gold-500 hover:text-burgundy-700"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function IconButton({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ivory-300 bg-ivory-50 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'text-error-600 hover:border-error-600' : 'text-ink-700 hover:border-gold-500 hover:text-burgundy-700'
      }`}
    >
      {children}
    </button>
  );
}

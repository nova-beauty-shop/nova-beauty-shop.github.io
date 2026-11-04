import { useState } from 'react';
import { EyeOff, Send, Trash2 } from 'lucide-react';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminWriteErrorMessage } from '@/lib/adminWriteErrors';
import {
  deleteQuestion,
  fetchAdminQuestions,
  hideQuestion,
  publishAnswer,
  type AdminQuestion,
  type QuestionFilter,
} from '@/lib/adminQuestions';
import { formatDate } from '@/lib/format';

const FILTERS: { id: QuestionFilter; label: string }[] = [
  { id: 'pending', label: 'بی‌پاسخ' },
  { id: 'published', label: 'منتشرشده' },
  { id: 'all', label: 'همه' },
];

const MAX_ANSWER_LENGTH = 2000;

export default function QuestionsManager({ canEdit }: { canEdit: boolean }) {
  const [filter, setFilter] = useState<QuestionFilter>('pending');
  const questions = useAsync(() => fetchAdminQuestions(filter), [filter]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function report(action: () => Promise<void>, success: string) {
    setError(null);
    setNotice(null);
    action()
      .then(() => {
        setNotice(success);
        questions.retry();
      })
      .catch((cause: unknown) => setError(adminWriteErrorMessage(cause)));
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div>
        <h2 className="text-xl">پرسش و پاسخ محصولات</h2>
        <p className="mt-1 text-sm text-ink-500">پرسش‌های مشتریان را پاسخ دهید تا پس از انتشار در صفحه محصول نمایش داده شود.</p>
      </div>

      <div role="group" aria-label="فیلتر پرسش‌ها" className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`h-10 rounded-full px-4 text-sm transition ${
              filter === item.id ? 'bg-burgundy-700 text-ivory-50' : 'bg-ivory-200 text-ink-700 hover:text-burgundy-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}

      {questions.loading && <SkeletonGrid count={2} />}
      {questions.error && <ErrorState onRetry={questions.retry} />}
      {questions.data && questions.data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-ivory-300 p-8 text-center text-sm text-ink-500">پرسشی در این بخش وجود ندارد.</p>
      )}
      {questions.data && questions.data.length > 0 && (
        <ul className="space-y-4">
          {questions.data.map((item) => (
            <QuestionCard
              key={item.id}
              item={item}
              canEdit={canEdit}
              onPublish={(answer) => report(() => publishAnswer(item.id, answer), 'پاسخ منتشر شد.')}
              onHide={() => report(() => hideQuestion(item.id), 'پاسخ از سایت پنهان شد.')}
              onDelete={() => report(() => deleteQuestion(item.id), 'پرسش حذف شد.')}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function QuestionCard({
  item,
  canEdit,
  onPublish,
  onHide,
  onDelete,
}: {
  item: AdminQuestion;
  canEdit: boolean;
  onPublish: (answer: string) => void;
  onHide: () => void;
  onDelete: () => void;
}) {
  const [answer, setAnswer] = useState(item.answer ?? '');
  const trimmed = answer.trim();
  const tooLong = trimmed.length > MAX_ANSWER_LENGTH;

  return (
    <li className="rounded-2xl border border-ivory-300 bg-ivory-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <span className="font-medium text-burgundy-700">{item.productName}</span>
        <span>
          {formatDate(item.createdAt)} · {item.isPublished ? 'منتشرشده' : 'بی‌پاسخ'}
        </span>
      </div>
      <p className="mt-3 font-medium text-ink-900">پرسش: {item.question}</p>

      {canEdit ? (
        <div className="mt-4 space-y-3">
          <label htmlFor={`answer-${item.id}`} className="text-sm font-medium text-ink-900">پاسخ شما</label>
          <textarea
            id={`answer-${item.id}`}
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="field"
            placeholder="پاسخ کوتاه و روشن بنویسید."
          />
          {tooLong && <p className="text-xs text-error-600">پاسخ نمی‌تواند بیشتر از ۲۰۰۰ نویسه باشد.</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={trimmed.length === 0 || tooLong}
              onClick={() => onPublish(trimmed)}
              className="btn-primary h-10 px-4 text-sm disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {item.isPublished ? 'به‌روزرسانی و انتشار' : 'انتشار پاسخ'}
            </button>
            {item.isPublished && (
              <button type="button" onClick={onHide} className="btn-outline h-10 px-4 text-sm">
                <EyeOff className="h-4 w-4" aria-hidden="true" />
                پنهان کردن
              </button>
            )}
            <button type="button" onClick={onDelete} className="btn-outline h-10 px-4 text-sm text-error-600">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              حذف
            </button>
          </div>
        </div>
      ) : (
        item.answer && <p className="mt-3 rounded-xl bg-ivory-200/60 p-4 text-sm text-ink-700">پاسخ: {item.answer}</p>
      )}
    </li>
  );
}

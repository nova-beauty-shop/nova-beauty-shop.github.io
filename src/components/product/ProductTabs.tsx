import { useState, type FormEvent } from 'react';
import { CheckCircle2, MessageCircleQuestion, ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from '@/components/common/Link';
import PriceHistoryChart from '@/components/product/PriceHistoryChart';
import Stars from '@/components/common/Stars';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  askProductQuestion,
  fetchPriceHistory,
  fetchProductQuestions,
  fetchReviews,
  QUESTION_MAX_LENGTH,
  QUESTION_MIN_LENGTH,
} from '@/lib/catalog';
import { formatDate } from '@/lib/format';
import { useLocation } from '@/lib/navigation';
import type { Product, Review } from '@/types/catalog';

type TabKey = 'description' | 'ingredients' | 'usage' | 'price' | 'reviews' | 'qa';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'description', label: 'توضیحات' },
  { key: 'ingredients', label: 'ترکیبات' },
  { key: 'usage', label: 'نحوه استفاده' },
  { key: 'price', label: 'تاریخچه قیمت' },
  { key: 'reviews', label: 'نظرات' },
  { key: 'qa', label: 'پرسش و پاسخ' },
];

export default function ProductTabs({ product }: { product: Product }) {
  const [active, setActive] = useState<TabKey>('description');
  const reviews = useAsync(() => fetchReviews(product.id), [product.id]);
  const questions = useAsync(() => fetchProductQuestions(product.id), [product.id]);
  // Only requested when the tab is opened.
  const priceHistory = useAsync(() => (active === 'price' ? fetchPriceHistory(product.id) : Promise.resolve(null)), [product.id, active === 'price']);

  const content: Record<'description' | 'ingredients' | 'usage', string> = {
    description: product.description,
    ingredients: product.ingredients,
    usage: product.usageInstructions,
  };

  function countFor(key: TabKey): string {
    if (key === 'reviews') return ` (${product.reviewCount.toLocaleString('fa-IR')})`;
    if (key === 'qa' && questions.data) return ` (${questions.data.length.toLocaleString('fa-IR')})`;
    return '';
  }

  return (
    <div>
      <div role="tablist" aria-label="اطلاعات محصول" className="flex gap-6 overflow-x-auto border-b border-ivory-300 [scrollbar-width:none]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            type="button"
            aria-selected={active === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActive(tab.key)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-4 text-sm transition ${
              active === tab.key ? 'border-burgundy-700 font-medium text-burgundy-800' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {tab.label}
            {countFor(tab.key)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="py-8">
        {(active === 'description' || active === 'ingredients' || active === 'usage') && (
          <p className="max-w-3xl whitespace-pre-line leading-[1.9] text-ink-700">{content[active]}</p>
        )}

        {active === 'price' && (
          <div className="max-w-4xl">
            {priceHistory.loading && <div className="skeleton h-72 w-full" />}
            {priceHistory.error && <ErrorState onRetry={priceHistory.retry} />}
            {priceHistory.data && <PriceHistoryChart points={priceHistory.data} currentPrice={product.priceToman} />}
          </div>
        )}

        {active === 'reviews' && (
          <div className="space-y-8">
            {reviews.loading && <SkeletonGrid count={2} />}
            {reviews.error && <ErrorState onRetry={reviews.retry} />}
            {reviews.data && reviews.data.length === 0 && (
              <EmptyState title="هنوز نظری ثبت نشده است" description="اولین نفری باشید که تجربه خود را از این محصول به اشتراک می‌گذارد." />
            )}
            {reviews.data?.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}

        {active === 'qa' && (
          <div className="max-w-3xl space-y-10">
            <AskQuestionForm productId={product.id} />
            {questions.loading && <SkeletonGrid count={2} />}
            {questions.error && <ErrorState onRetry={questions.retry} />}
            {questions.data && questions.data.length === 0 && (
              <EmptyState
                title="هنوز پرسشی پاسخ داده نشده است"
                description="اگر درباره این محصول سؤالی دارید، از فرم بالا بپرسید تا کارشناسان نُوا پاسخ دهند."
              />
            )}
            {questions.data && questions.data.length > 0 && (
              <ul className="space-y-6">
                {questions.data.map((item) => (
                  <li key={item.id} className="space-y-3 border-b border-ivory-300 pb-6 last:border-0">
                    <div className="flex items-start gap-3">
                      <MessageCircleQuestion className="mt-0.5 h-5 w-5 flex-none text-rose-600" aria-hidden="true" />
                      <div className="space-y-1">
                        <p className="font-medium text-ink-900">{item.question}</p>
                        <time dateTime={item.createdAt} className="text-xs text-ink-500">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                    </div>
                    {item.answer && (
                      <div className="ms-8 space-y-1 rounded-2xl bg-ivory-200/60 p-4">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-burgundy-700">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          پاسخ نُوا شاپ
                        </p>
                        <p className="whitespace-pre-line leading-[1.9] text-ink-700">{item.answer}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const hasPoints = review.pros.length > 0 || review.cons.length > 0;
  return (
    <article className="border-b border-ivory-300 pb-8 last:border-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">{review.authorName}</p>
          <Stars value={review.rating} />
        </div>
        <time dateTime={review.createdAt} className="text-xs text-ink-500">
          {formatDate(review.createdAt)}
        </time>
      </div>
      <p className="leading-[1.8] text-ink-700">{review.body}</p>

      {hasPoints && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {review.pros.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-success-100/70 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-success-600">
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                نقاط قوت
              </p>
              <ul className="space-y-1.5 text-sm text-ink-700">
                {review.pros.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-success-600" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.cons.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-error-100/70 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-error-600">
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                نقاط ضعف
              </p>
              <ul className="space-y-1.5 text-sm text-ink-700">
                {review.cons.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-error-600" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function AskQuestionForm({ productId }: { productId: string }) {
  const { user, loading } = useAuth();
  const { pathname, searchParams } = useLocation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const trimmed = text.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < QUESTION_MIN_LENGTH;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (trimmed.length < QUESTION_MIN_LENGTH) {
      setStatus({ tone: 'error', text: `پرسش باید حداقل ${QUESTION_MIN_LENGTH.toLocaleString('fa-IR')} نویسه باشد.` });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await askProductQuestion(productId, trimmed);
      setText('');
      setStatus({ tone: 'success', text: 'پرسش شما ثبت شد و پس از پاسخ کارشناسان در همین بخش نمایش داده می‌شود.' });
    } catch {
      setStatus({ tone: 'error', text: 'ثبت پرسش انجام نشد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="skeleton h-28 w-full" />;

  if (!user) {
    const current = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-ivory-200/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-[1.8] text-ink-700">برای پرسیدن سؤال درباره این محصول ابتدا وارد حساب کاربری خود شوید.</p>
        <Link to={`/login?redirect=${encodeURIComponent(current)}`} className="btn-primary h-10 px-5 text-sm">
          ورود / ثبت‌نام
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-2xl bg-ivory-200/60 p-5">
      <label htmlFor="question-text" className="block text-sm font-medium text-ink-900">
        سؤال خود را درباره این محصول بپرسید
      </label>
      <textarea
        id="question-text"
        rows={3}
        maxLength={QUESTION_MAX_LENGTH}
        value={text}
        disabled={sending}
        onChange={(event) => setText(event.target.value)}
        aria-describedby="question-hint"
        className="w-full rounded-2xl border border-ink-300 bg-ivory-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-burgundy-700 focus:outline-none focus:ring-2 focus:ring-burgundy-700/15"
        placeholder="مثلاً: آیا برای پوست حساس مناسب است؟"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="question-hint" className={`text-xs ${tooShort ? 'text-error-600' : 'text-ink-500'}`}>
          {`${trimmed.length.toLocaleString('fa-IR')} از ${QUESTION_MAX_LENGTH.toLocaleString('fa-IR')} نویسه · پرسش پس از پاسخ مدیر منتشر می‌شود.`}
        </p>
        <button type="submit" disabled={sending || trimmed.length === 0} className="btn-primary h-10 px-6 text-sm">
          {sending ? 'در حال ارسال...' : 'ثبت پرسش'}
        </button>
      </div>
      {status && (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm ${status.tone === 'error' ? 'bg-error-100 text-error-600' : 'bg-success-100 text-success-600'}`}
        >
          {status.text}
        </p>
      )}
    </form>
  );
}

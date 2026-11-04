import { useEffect } from 'react';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { INFO_PAGES, INFO_PAGE_ORDER } from '@/content/infoPages';
import { useAsync } from '@/hooks/useAsync';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { defaultInfoPageContent, fetchPublishedInfoPage } from '@/lib/infoPages';
import type { InfoPageContent } from '@/lib/infoPages';
import { fillStoreTokens } from '@/lib/storeSettings';
import type { StoreSettings } from '@/lib/storeSettings';
import type { InfoPageSlug, InfoSection } from '@/types/info';

interface InfoPageProps {
  slug: InfoPageSlug;
}

export default function InfoPage({ slug }: InfoPageProps) {
  const store = useStoreSettings();
  const settings = store.data;
  const published = useAsync(() => fetchPublishedInfoPage(slug), [slug]);
  const content: InfoPageContent | null = published.loading
    ? null
    : published.data ?? defaultInfoPageContent(slug);

  useSeo(content?.seoTitle, content?.seoDescription);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="container-nova py-12 md:py-16">
      <nav aria-label="صفحات راهنما" className="-mx-4 mb-10 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {INFO_PAGE_ORDER.map((item) => {
            const active = item === slug;
            return (
              <li key={item}>
                <Link
                  to={`/${item}`}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-10 items-center rounded-full border px-4 text-sm transition ${
                    active
                      ? 'border-burgundy-700 bg-burgundy-700 text-ivory-50'
                      : 'border-ivory-300 bg-ivory-50 text-ink-700 hover:border-gold-500 hover:text-burgundy-700'
                  }`}
                >
                  {INFO_PAGES[item].navLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {content && (
        <header className="max-w-2xl space-y-4">
          <p className="eyebrow">راهنمای نُوا</p>
          <h1 className="text-3xl md:text-4xl">{content.title}</h1>
          <p className="text-base leading-[1.8] text-ink-500">{content.lead}</p>
        </header>
      )}

      <div className="mt-12 grid max-w-4xl gap-6">
        {(store.loading || published.loading) && <SkeletonGrid count={2} />}
        {store.error && <ErrorState onRetry={store.retry} />}
        {settings &&
          content?.sections.map((section, index) => (
            <InfoSectionBlock key={`${index}-${section.heading}`} section={section} settings={settings} />
          ))}
      </div>
    </div>
  );
}

function useSeo(title: string | undefined, description: string | undefined) {
  useEffect(() => {
    if (title === undefined || description === undefined) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousTitle = document.title;
    const previousDescription = meta?.content ?? '';
    document.title = `${title} | نُوا شاپ`;
    if (meta) meta.content = description;
    return () => {
      document.title = previousTitle;
      if (meta) meta.content = previousDescription;
    };
  }, [title, description]);
}

function InfoSectionBlock({ section, settings }: { section: InfoSection; settings: StoreSettings }) {
  const fill = (text: string) => fillStoreTokens(text, settings);

  return (
    <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <h2 className="text-xl">{section.heading}</h2>

      {section.paragraphs?.map((paragraph, index) => (
        <p key={index} className="mt-4 leading-[1.9] text-ink-700">
          {fill(paragraph)}
        </p>
      ))}

      {section.bullets && (
        <ul className="mt-4 space-y-3 text-ink-700">
          {section.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-3 leading-[1.8]">
              <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
              <span>{fill(bullet)}</span>
            </li>
          ))}
        </ul>
      )}

      {section.questions && (
        <div className="mt-4 divide-y divide-ivory-300">
          {section.questions.map((item, index) => (
            <details key={index} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-900">
                {item.question}
                <span aria-hidden="true" className="text-gold-600 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-[1.9] text-ink-600">{fill(item.answer)}</p>
            </details>
          ))}
        </div>
      )}

      {section.cards && (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {section.cards.map((card, index) => (
            <div key={index} className="rounded-2xl bg-ivory-100 p-5">
              <dt className="text-sm text-ink-500">{card.label}</dt>
              <dd className="mt-1 text-lg font-medium text-ink-900" dir="auto">
                {fill(card.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

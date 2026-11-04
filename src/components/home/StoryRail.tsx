import { useCallback, useState } from 'react';
import QuickEditButton from '@/components/admin/QuickEditButton';
import StoryViewer from '@/components/home/StoryViewer';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { contentEditPath } from '@/lib/adminLinks';
import { useAsync } from '@/hooks/useAsync';
import { fetchStories } from '@/lib/catalog';

export default function StoryRail() {
  const stories = useAsync(fetchStories, []);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);
  const items = stories.data ?? [];
  const { canQuickEdit } = useAdminAccess();

  if (stories.error || (!stories.loading && items.length === 0)) {
    // Admins still get the edit button when there are no stories yet, so they can add the first one.
    if (!canQuickEdit) return null;
    return (
      <section aria-label="استوری‌ها" className="container-nova relative py-10">
        <p className="rounded-2xl border border-dashed border-ink-300 px-6 py-6 text-center text-sm text-ink-500">هنوز استوری‌ای ثبت نشده است.</p>
        <QuickEditButton to={contentEditPath('stories')} label="ویرایش سریع استوری‌ها" className="end-8 top-14 sm:end-10 lg:end-14" />
      </section>
    );
  }

  return (
    <section aria-label="استوری‌ها" className="container-nova relative py-10">
      <QuickEditButton to={contentEditPath('stories')} label="ویرایش سریع استوری‌ها" className="end-4 top-2 sm:end-6 lg:end-10" />
      {stories.loading ? (
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-20 w-20 flex-none rounded-full" />
          ))}
        </div>
      ) : (
        <ul className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((story, index) => (
            <li key={story.id} className="flex flex-none flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={`مشاهده استوری ${story.title}`}
                className="group rounded-full bg-gradient-to-br from-gold-400 via-rose-400 to-burgundy-700 p-[3px] transition duration-300 hover:scale-105"
              >
                <span className="block rounded-full border-[3px] border-ivory-100 p-0.5">
                  {story.mediaType === 'video' ? (
                    <video src={story.mediaUrl} muted preload="metadata" className="h-[68px] w-[68px] rounded-full object-cover md:h-20 md:w-20" />
                  ) : (
                    <img src={story.mediaUrl} alt="" className="h-[68px] w-[68px] rounded-full object-cover md:h-20 md:w-20" />
                  )}
                </span>
              </button>
              <span className="max-w-[6rem] truncate text-xs text-ink-700">{story.title}</span>
            </li>
          ))}
        </ul>
      )}
      {openIndex !== null && <StoryViewer stories={items} startIndex={openIndex} onClose={close} />}
    </section>
  );
}

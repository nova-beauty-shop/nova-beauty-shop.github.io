import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from '@/components/common/Link';
import type { Story } from '@/types/catalog';

const STORY_DURATION_MS = 6000;

export default function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const story = stories[index];
  const lastIndex = stories.length - 1;

  const goNext = () => (index >= lastIndex ? onClose() : setIndex(index + 1));
  const goPrev = () => index > 0 && setIndex(index - 1);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goNext();
      if (event.key === 'ArrowRight') goPrev();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  });

  useEffect(() => {
    setProgress(0);
    const started = performance.now();
    const timer = window.setInterval(() => {
      const ratio = Math.min((performance.now() - started) / STORY_DURATION_MS, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        window.clearInterval(timer);
        if (index >= lastIndex) onClose();
        else setIndex(index + 1);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [index, lastIndex, onClose]);

  if (!story) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={story.title} className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4">
      <div className="relative flex h-[min(88vh,760px)] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-ink-900 shadow-lift">
        <div className="absolute inset-x-4 top-4 z-10 flex gap-1.5">
          {stories.map((item, position) => (
            <div key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-ivory-50/30">
              <div
                className="h-full bg-ivory-50 transition-[width] duration-100"
                style={{
                  width: position < index ? '100%' : position === index ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-4 top-8 z-10 flex items-center justify-between text-ivory-50">
          <span className="text-sm font-medium drop-shadow">{story.title}</span>
          <button type="button" onClick={onClose} aria-label="بستن استوری" className="rounded-full bg-ink-900/40 p-1.5 hover:bg-ink-900/70">
            <X className="h-5 w-5" />
          </button>
        </div>

        {story.mediaType === 'video' ? (
          <video key={story.id} src={story.mediaUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        ) : (
          <img key={story.id} src={story.mediaUrl} alt={story.title} className="h-full w-full object-cover" />
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-900/80 to-transparent p-5">
          {story.linkUrl ? (
            <Link to={story.linkUrl} onClick={onClose} className="btn-primary bg-ivory-50 text-burgundy-800 hover:bg-gold-400 hover:text-ink-900">
              مشاهده محصولات
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={goPrev} disabled={index === 0} aria-label="استوری قبلی" className="rounded-full bg-ink-900/40 p-2 text-ivory-50 disabled:opacity-30">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button type="button" onClick={goNext} aria-label="استوری بعدی" className="rounded-full bg-ink-900/40 p-2 text-ivory-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

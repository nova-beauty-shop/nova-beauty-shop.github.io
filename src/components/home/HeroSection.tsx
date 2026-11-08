import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Link from '@/components/common/Link';
import type { Banner } from '@/types/catalog';

export const HERO_SLIDE_SECONDS = 5;
const SWIPE_DISTANCE = 48;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Timed hero slider. The progress bar is a CSS animation and the slide advances when it ends, so the
 * bar and the timer can never drift apart, and pausing is simply pausing the animation.
 */
export default function HeroSection({ banners }: { banners: Banner[] }) {
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const touchStart = useRef<number | null>(null);

  const current = count > 0 ? index % count : 0;
  const multiple = count > 1;
  const autoPlay = multiple && !reduced;
  const paused = hovered || focused || userPaused;

  // A slide may be removed in the admin panel while the page is open.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  const goTo = useCallback(
    (target: number) => {
      if (count === 0) return;
      setIndex(((target % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const previous = useCallback(() => goTo(current - 1), [goTo, current]);

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStart.current = event.touches[0]?.clientX ?? null;
    setHovered(true);
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    setHovered(false);
    const end = event.changedTouches[0]?.clientX;
    if (start === null || end === undefined || !multiple) return;
    const distance = end - start;
    if (Math.abs(distance) < SWIPE_DISTANCE) return;
    // The page is right to left: dragging towards the right reveals the next slide.
    if (distance > 0) next();
    else previous();
  }

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="اسلایدر معرفی ویژه"
      className="relative isolate overflow-hidden bg-burgundy-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative min-h-[560px] md:min-h-[660px]" aria-live={autoPlay && !paused ? 'off' : 'polite'}>
        {banners.map((banner, position) => {
          const active = position === current;
          return (
            <div
              key={banner.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`اسلاید ${(position + 1).toLocaleString('fa-IR')} از ${count.toLocaleString('fa-IR')}`}
              aria-hidden={!active}
              data-active={active}
              className="hero-slide absolute inset-0"
            >
              <div className="hero-drift absolute -inset-[4%] -z-20">
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt=""
                    loading={position === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="hero-img h-full w-auto object-cover"
                  />
                )}
              </div>
              <div className="absolute inset-0 -z-10 bg-gradient-to-l from-burgundy-900/85 via-burgundy-900/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-burgundy-900/55 to-transparent" />

              <div className="container-nova flex h-full min-h-[560px] items-center py-24 md:min-h-[660px]">
                <div className="hero-copy max-w-xl">
                  <div className="hero-float space-y-6">
                    {banner.eyebrow && <p className="text-sm tracking-wide text-gold-400">{banner.eyebrow}</p>}
                    <h1 className="text-4xl text-ivory-50 md:text-6xl">{banner.title}</h1>
                    {banner.subtitle && (
                      <p className="max-w-lg text-base leading-[1.8] text-ivory-200 md:text-lg">{banner.subtitle}</p>
                    )}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link
                        to={banner.ctaUrl || '/shop'}
                        tabIndex={active ? 0 : -1}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-burgundy-900 px-4 py-2 text-xs sm:text-sm font-bold shadow-md hover:bg-ivory-100 transition !w-auto !inline-flex !flex-none"
                      >
                        {banner.ctaLabel || 'مشاهده'}
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Link
                        to="/shop"
                        tabIndex={active ? 0 : -1}
                        className="btn-outline border-ivory-50/60 text-ivory-50 hover:border-ivory-50 hover:bg-ivory-50 hover:text-burgundy-800"
                      >
                        همه محصولات
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {multiple && (
        <>
          <button
            type="button"
            onClick={previous}
            aria-label="اسلاید قبلی"
            className="hero-glass absolute start-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-ivory-50 transition duration-300 hover:scale-105 hover:bg-ivory-50/30 md:flex lg:start-6"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="اسلاید بعدی"
            className="hero-glass absolute end-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-ivory-50 transition duration-300 hover:scale-105 hover:bg-ivory-50/30 md:flex lg:end-6"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
            <div className="hero-glass flex items-center gap-3 rounded-full px-4 py-2">
              <ul className="flex items-center gap-2" aria-label="انتخاب اسلاید">
                {banners.map((banner, position) => (
                  <li key={banner.id}>
                    <button
                      type="button"
                      onClick={() => goTo(position)}
                      aria-label={`رفتن به اسلاید ${(position + 1).toLocaleString('fa-IR')}`}
                      aria-current={position === current ? 'true' : undefined}
                      className="group flex h-6 items-center"
                    >
                      <span
                        className={`block h-2 rounded-full transition-all duration-500 ${
                          position === current ? 'w-7 bg-gold-400' : 'w-2 bg-ivory-50/60 group-hover:bg-ivory-50'
                        }`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
              {autoPlay && (
                <button
                  type="button"
                  onClick={() => setUserPaused((value) => !value)}
                  aria-label={userPaused ? 'ادامه پخش خودکار' : 'توقف پخش خودکار'}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ivory-50 transition hover:bg-ivory-50/20"
                >
                  {userPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>

          {autoPlay && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-ivory-50/15" aria-hidden="true">
              <div
                key={current}
                className="hero-progress-bar absolute start-0 top-0 h-full bg-gradient-to-l from-gold-400 to-gold-500"
                style={{
                  animationDuration: `${HERO_SLIDE_SECONDS}s`,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
                onAnimationEnd={next}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

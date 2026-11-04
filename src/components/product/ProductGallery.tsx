import { useState, type MouseEvent } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const current = images[index] ?? images[0];

  function handleMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse lg:gap-6">
      <div
        className="relative aspect-[4/5] flex-1 overflow-hidden rounded-3xl bg-ivory-200"
        onMouseMove={handleMove}
        onMouseLeave={() => setZoomed(false)}
      >
        {current && (
          <img
            src={current}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out"
            style={{
              transform: zoomed ? 'scale(2.2)' : 'scale(1)',
              transformOrigin: `${origin.x}% ${origin.y}%`,
              cursor: zoomed ? 'zoom-out' : 'zoom-in',
            }}
            onClick={() => setZoomed((value) => !value)}
          />
        )}
        <button
          type="button"
          onClick={() => setZoomed((value) => !value)}
          aria-pressed={zoomed}
          aria-label={zoomed ? 'خروج از بزرگ‌نمایی' : 'بزرگ‌نمایی تصویر'}
          className="absolute end-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full bg-ivory-50/95 text-burgundy-700 shadow-soft transition hover:scale-105"
        >
          {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
        </button>
      </div>

      {images.length > 1 && (
        <ul className="flex gap-3 md:w-20 md:flex-col">
          {images.map((image, position) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => {
                  setIndex(position);
                  setZoomed(false);
                }}
                aria-pressed={position === index}
                aria-label={`نمایش تصویر ${position + 1}`}
                className={`block aspect-[3/4] w-16 overflow-hidden rounded-xl border-2 transition md:w-20 ${
                  position === index ? 'border-burgundy-700' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

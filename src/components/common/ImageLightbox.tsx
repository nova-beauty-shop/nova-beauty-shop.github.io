import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-900/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="flex items-center justify-end gap-3 p-4">
        <button
          type="button"
          onClick={() => setZoomed((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-ivory-50/10 px-4 py-2 text-sm text-ivory-50 transition hover:bg-ivory-50/20"
        >
          {zoomed ? <ZoomOut className="h-4 w-4" aria-hidden="true" /> : <ZoomIn className="h-4 w-4" aria-hidden="true" />}
          {zoomed ? 'کوچک‌نمایی' : 'بزرگ‌نمایی'}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن تصویر"
          className="rounded-full bg-ivory-50/10 p-2 text-ivory-50 transition hover:bg-ivory-50/20"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4" onClick={onClose}>
        <img
          src={src}
          alt={alt}
          onClick={(event) => {
            event.stopPropagation();
            setZoomed((value) => !value);
          }}
          className={`mx-auto rounded-2xl bg-ivory-50 object-contain transition-all duration-300 ${
            zoomed ? 'max-w-none cursor-zoom-out' : 'max-h-[85vh] max-w-full cursor-zoom-in'
          }`}
        />
      </div>
    </div>
  );
}

import { useState } from 'react';
import ImageLightbox from '@/components/common/ImageLightbox';
import { useAsync } from '@/hooks/useAsync';
import { createReceiptUrl } from '@/lib/payments';

export default function ReceiptPreview({ storagePath }: { storagePath: string }) {
  const image = useAsync(() => createReceiptUrl(storagePath), [storagePath]);
  const [open, setOpen] = useState(false);

  if (image.loading) return <div className="skeleton aspect-[3/4] w-full rounded-2xl" />;
  if (image.error || !image.data) return <p className="p-4 text-sm text-error-600">نمایش تصویر فیش ممکن نشد.</p>;

  const src = image.data;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="بزرگ‌نمایی فیش واریزی"
        className="group block w-full overflow-hidden rounded-2xl bg-ivory-200"
      >
        <img
          src={src}
          alt="تصویر فیش واریزی"
          className="aspect-[3/4] w-full object-contain transition duration-300 group-hover:scale-[1.03]"
        />
      </button>
      {open && <ImageLightbox src={src} alt="تصویر فیش واریزی" onClose={() => setOpen(false)} />}
    </>
  );
}

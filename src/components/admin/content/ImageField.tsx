import { useState, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, Wand2, X } from 'lucide-react';
import { catalogErrorMessage, CATALOG_IMAGE_MAX_BYTES, uploadCatalogImage } from '@/lib/adminCatalog';
import { whiteBackgroundToPng } from '@/lib/imageBackground';

export default function ImageField({
  id,
  value,
  onChange,
  disabled,
  allowBackgroundRemoval = false,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Adds the "upload and remove the white background" button (for product photos). */
  allowBackgroundRemoval?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || processing;

  async function handleFile(event: ChangeEvent<HTMLInputElement>, removeBackground: boolean) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      let upload = file;
      if (removeBackground) {
        if (file.size > CATALOG_IMAGE_MAX_BYTES * 2 || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
          setError('فقط تصویر JPG، PNG یا WebP مجاز است و حجم آن نباید بیش از ۱۰ مگابایت باشد.');
          return;
        }
        setProcessing(true);
        try {
          upload = await whiteBackgroundToPng(file);
        } catch {
          setError('پردازش تصویر انجام نشد. تصویر دیگری را امتحان کنید یا بدون حذف پس‌زمینه بارگذاری کنید.');
          return;
        } finally {
          setProcessing(false);
        }
      }
      setUploading(true);
      onChange(await uploadCatalogImage(upload));
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-ivory-300 bg-[conic-gradient(#f3ece0_25%,#fdfbf7_0_50%,#f3ece0_0_75%,#fdfbf7_0)] bg-[length:16px_16px]">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-500">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="حذف تصویر"
              className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-ivory-50 transition hover:bg-ink-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <input
            id={id}
            type="url"
            dir="ltr"
            inputMode="url"
            placeholder="https://..."
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value.trim())}
            className="field text-start"
          />
          <div className="flex flex-wrap gap-2">
            <label
              className={`btn-outline h-10 cursor-pointer px-4 text-sm ${disabled || busy ? 'pointer-events-none opacity-60' : ''}`}
            >
              {uploading && !processing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
              {uploading && !processing ? 'در حال بارگذاری...' : 'بارگذاری تصویر از دستگاه'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void handleFile(event, false)} disabled={disabled || busy} />
            </label>
            {allowBackgroundRemoval && (
              <label
                className={`btn-primary h-10 cursor-pointer px-4 text-sm ${disabled || busy ? 'pointer-events-none opacity-60' : ''}`}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
                {processing ? 'در حال حذف پس‌زمینه...' : 'آپلود + حذف پس‌زمینه سفید (PNG)'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void handleFile(event, true)} disabled={disabled || busy} />
              </label>
            )}
          </div>
          {allowBackgroundRemoval && (
            <p className="text-xs leading-[1.7] text-ink-500">
              برای عکس‌هایی با زمینه سفید؛ زمینه سفید اطراف محصول شفاف می‌شود و نتیجه به‌صورت PNG ذخیره می‌شود.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-error-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

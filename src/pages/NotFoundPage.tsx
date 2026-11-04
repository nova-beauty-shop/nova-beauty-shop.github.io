import Link from '@/components/common/Link';

export default function NotFoundPage() {
  return (
    <div className="container-nova flex flex-col items-center gap-6 py-32 text-center">
      <p className="eyebrow">خطای ۴۰۴</p>
      <h1 className="text-4xl">صفحه مورد نظر پیدا نشد</h1>
      <p className="max-w-md text-ink-500">آدرس وارد شده وجود ندارد یا صفحه جابه‌جا شده است.</p>
      <Link to="/" className="btn-primary">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}

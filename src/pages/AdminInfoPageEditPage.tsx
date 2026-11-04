import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import InfoPageEditorForm from '@/components/admin/pages/InfoPageEditorForm';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { INFO_PAGES } from '@/content/infoPages';
import { useAsync } from '@/hooks/useAsync';
import { fetchAdminInfoPage } from '@/lib/infoPages';
import type { InfoPageSlug } from '@/types/info';

interface AdminInfoPageEditPageProps {
  slug: InfoPageSlug;
}

export default function AdminInfoPageEditPage({ slug }: AdminInfoPageEditPageProps) {
  return <AdminGate>{(access) => <InfoPageEditContent slug={slug} canEdit={access.role === 'owner' || access.role === 'manager'} />}</AdminGate>;
}

function InfoPageEditContent({ slug, canEdit }: { slug: InfoPageSlug; canEdit: boolean }) {
  const page = useAsync(() => fetchAdminInfoPage(slug), [slug]);

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="ویرایش صفحه راهنما"
        title={INFO_PAGES[slug].navLabel}
        description={
          canEdit
            ? 'متن و بخش‌های صفحه را ویرایش کنید. پیش‌نویس فقط برای شما دیده می‌شود و با انتشار، نسخه جدید برای مشتریان نمایش داده می‌شود.'
            : 'این صفحه را فقط مشاهده می‌کنید. برای ویرایش، دسترسی مدیر یا مالک لازم است.'
        }
      />

      <div className="mt-10">
        {page.loading && <SkeletonGrid count={3} />}
        {page.error && <ErrorState onRetry={page.retry} />}
        {page.data && (
          <InfoPageEditorForm
            key={slug}
            slug={slug}
            initialContent={page.data.content}
            initialStatus={page.data.status}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}

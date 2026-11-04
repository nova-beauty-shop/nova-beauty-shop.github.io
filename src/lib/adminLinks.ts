/** Deep link to a tab of the content manager in /admin, e.g. contentEditPath('banners'). */
export function contentEditPath(tab: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ tab, ...extra });
  return `/admin/content?${params.toString()}`;
}

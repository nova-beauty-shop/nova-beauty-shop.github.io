
const PROXY_PREFIX = "https://wsrv.nl/?url=";

export function resolveImageUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("/products/")) {
    return trimmed;
  }
  // If it is an external or Supabase storage image, route through fast unblocked CDN proxy
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.includes("wsrv.nl") || trimmed.includes("i0.wp.com")) {
      return trimmed;
    }
    return PROXY_PREFIX + encodeURIComponent(trimmed) + "&output=webp&q=85";
  }
  return trimmed;
}
